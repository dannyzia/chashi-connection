// ─────────────────────────────────────────────────────────────────────────────
// send-fcm — FCM HTTP v1 পুশ পাঠানোর একমাত্র প্রবেশপথ (টাস্ক CHC-T-039)
//
// কে ডাকতে পারে (দুটি পথ, দুটোই যাচাই করা হয়):
//   • ভেতরের পথ — pg_net ট্রিগার। হেডার `x-push-secret` আবশ্যক, আর তা
//     public.push_config.trigger_secret-এর সমান হতে হবে (service-role কী দিয়ে
//     পড়া হয়)। কেন এই পথ: ট্রিগারকে service-role কী দিতে হলে সেই সর্বোচ্চ
//     ক্ষমতার ক্রেডেনশিয়াল একটি টেবিলে বসাতে হতো; পুশ-সীমিত একটি আলাদা সিক্রেট
//     least-privilege।
//   • অপারেটর পথ — `Authorization: Bearer <service role key>`।
//   দুটোর কোনোটিই না মিললে 401 — কোনো ব্যতিক্রম নেই।
//
// ⛔ নিয়ম (লঙ্ঘন = রিভিউতে বাতিল):
//   • সব নোটিফিকেশন টেক্সট বাংলা-শুধু, এবং নিচের নির্দিষ্ট মানচিত্র থেকেই আসে।
//   • কোনো টাকা/পেমেন্ট-সংক্রান্ত ধারণা নেই — প্ল্যাটফর্ম লেনদেন জানে না (§১.১)।
//   • FCM_SERVICE_ACCOUNT_JSON কখনো লগ করা হয় না, ফেরত দেওয়া হয় না।
//   • dry-run-এ OAuth-এর চেষ্টাও হয় না (env না থাকলে নেটওয়ার্ক ডাক শূন্য)।
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_হেডার: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type পুশধরণ = 'chat_message' | 'new_post';

/**
 * নোটিফিকেশন টেক্সটের একমাত্র উৎস (বাংলা-শুধু, §১৫.৩)।
 * `{{...}}` কেবল সার্ভারে প্রতিস্থাপিত হয়; ব্যবহারকারীর লেখা কখনো শিরোনাম নয়।
 */
const টেক্সট: Record<পুশধরণ, { শিরোনাম: string; শরীর: (p: Record<string, string>) => string }> = {
  chat_message: {
    শিরোনাম: 'চাষী কানেকশন',
    শরীর: (p) => `${p.sender || 'কেউ'} নতুন বার্তা পাঠিয়েছেন`
  },
  new_post: {
    শিরোনাম: 'চাষী কানেকশন',
    শরীর: (p) => `আপনার এলাকায় নতুন বিজ্ঞাপন: ${p.title || 'নতুন পোস্ট'}`
  }
};

type সার্ভিসঅ্যাকাউন্ট = { client_email: string; private_key: string; project_id: string };

function উত্তর(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_হেডার, 'Content-Type': 'application/json' }
  });
}

/** base64url — JWT-এর অংশগুলোর জন্য (padding ছাড়া, +/ → -_)। */
function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlলেখা(text: string): string {
  return base64url(new TextEncoder().encode(text));
}

/** PEM (PKCS#8) → CryptoKey। ব্যর্থ হলে null। */
async function কীআনুন(pem: string): Promise<CryptoKey | null> {
  try {
    const body = pem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s+/g, '');
    const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'pkcs8',
      raw,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch {
    return null;
  }
}

/**
 * OAuth 2.0 অ্যাক্সেস টোকেন (service-account JWT → token endpoint)।
 * যেকোনো ধাপে ব্যর্থ হলে null — ডাককারী সেটিকে 'send-failed' হিসেবেই দেখবে।
 */
async function অ্যাক্সেসটোকেন(সা: সার্ভিসঅ্যাকাউন্ট): Promise<string | null> {
  const কী = await কীআনুন(সা.private_key);
  if (!কী) return null;
  const এখন = Math.floor(Date.now() / 1000);
  const header = base64urlলেখা(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64urlলেখা(
    JSON.stringify({
      iss: সা.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: এখন,
      exp: এখন + 3600
    })
  );
  try {
    const স্বাক্ষর = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      কী,
      new TextEncoder().encode(`${header}.${claim}`)
    );
    const jwt = `${header}.${claim}.${base64url(new Uint8Array(স্বাক্ষর))}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_হেডার });
  if (req.method !== 'POST') return উত্তর(405, { ok: false, error: 'method-not-allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return উত্তর(500, { ok: false, error: 'config' });

  const অ্যাডমিন = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  // ── অনুমোদন ───────────────────────────────────────────────────────────────
  const authz = (req.headers.get('Authorization') ?? '').trim();
  const পথসিক্রেট = (req.headers.get('x-push-secret') ?? '').trim();
  const অপারেটর = authz === `Bearer ${serviceKey}`;

  let ট্রিগারঅনুমোদিত = false;
  if (!অপারেটর && পথসিক্রেট) {
    const { data } = await অ্যাডমিন
      .from('push_config')
      .select('trigger_secret')
      .eq('id', 'default')
      .maybeSingle();
    const প্রত্যাশিত = (data?.trigger_secret ?? '').trim();
    // খালি প্রত্যাশিত মান কখনো মিলবে না — কনফিগ না থাকলে ভেতরের পথও বন্ধ।
    ট্রিগারঅনুমোদিত = প্রত্যাশিত !== '' && পথসিক্রেট === প্রত্যাশিত;
  }

  if (!অপারেটর && !ট্রিগারঅনুমোদিত) {
    return উত্তর(401, { ok: false, error: 'unauthorized' });
  }

  // ── অনুরোধ ────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    const পার্স = await req.json();
    if (!পার্স || typeof পার্স !== 'object') return উত্তর(400, { ok: false, error: 'bad-request' });
    body = পার্স as Record<string, unknown>;
  } catch {
    return উত্তর(400, { ok: false, error: 'bad-request' });
  }

  const লক্ষ্য = typeof body.target_user_id === 'string' ? body.target_user_id : '';
  const kind = body.kind as পুশধরণ;
  if (!/^[0-9a-f-]{36}$/i.test(লক্ষ্য)) return উত্তর(400, { ok: false, error: 'bad-target' });
  if (kind !== 'chat_message' && kind !== 'new_post') {
    return উত্তর(400, { ok: false, error: 'bad-kind' });
  }

  // সার্ভার-পার্শ্বের প্যারামিটার (ক্লায়েন্টের পাঠানো পাঠ্য নয়) — §১৫.৩।
  const প্যারাম: Record<string, string> = {};
  for (const চাবি of ['sender', 'title']) {
    const মান = body[`${চাবি}_param`] ?? (body.body_params as Record<string, unknown> | undefined)?.[চাবি];
    if (typeof মান === 'string' && মান.trim()) প্যারাম[চাবি] = মান.trim().slice(0, 60);
  }

  const রুটিং: Record<string, string> = { kind };
  if (typeof body.chat_id === 'string') রুটিং.chat_id = body.chat_id;
  if (typeof body.listing_id === 'string') রুটিং.listing_id = body.listing_id;

  // ── টোকেন ─────────────────────────────────────────────────────────────────
  const { data: সারি, error: টোকেনত্রুটি } = await অ্যাডমিন
    .from('device_tokens')
    .select('fcm_token')
    .eq('user_id', লক্ষ্য);

  if (টোকেনত্রুটি) return উত্তর(500, { ok: false, error: 'lookup-failed' });
  const টোকেনসমূহ = (সারি ?? [])
    .map((r: { fcm_token?: string }) => r.fcm_token)
    .filter((t): t is string => typeof t === 'string' && t.length > 0);

  if (টোকেনসমূহ.length === 0) return উত্তর(200, { ok: true, sent: 0, reason: 'no-tokens' });

  const মানচিত্র = টেক্সট[kind];
  const শিরোনাম = মানচিত্র.শিরোনাম;
  const শরীর = মানচিত্র.শরীর(প্যারাম);

  // ── dry-run: service-account নেই → OAuth-এর চেষ্টাও নয় ────────────────────
  const কাঁচাসা = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!কাঁচাসা) {
    return উত্তর(200, {
      dry_run: true,
      would_send: টোকেনসমূহ.length,
      // ব্যবহারকারীর বিষয়বস্তু প্লেসহোল্ডারে — শুধু আকৃতি প্রমাণের জন্য।
      payloads: [
        {
          token: '<token-1>',
          notification: { title: শিরোনাম, body: শরীর },
          data: রুটিং
        }
      ]
    });
  }

  let সা: সার্ভিসঅ্যাকাউন্ট;
  try {
    সা = JSON.parse(কাঁচাসা) as সার্ভিসঅ্যাকাউন্ট;
  } catch {
    return উত্তর(500, { ok: false, error: 'config' });
  }
  if (!সা?.client_email || !সা?.private_key || !সা?.project_id) {
    return উত্তর(500, { ok: false, error: 'config' });
  }

  const অ্যাক্সেস = await অ্যাক্সেসটোকেন(সা);
  if (!অ্যাক্সেস) return উত্তর(502, { ok: false, error: 'auth-failed' });

  // ── পাঠানো (প্রতি টোকেনে এক ডাক) ──────────────────────────────────────────
  let পাঠানো = 0;
  let ব্যর্থ = 0;
  for (const টোকেন of টোকেনসমূহ) {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${সা.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${অ্যাক্সেস}`
          },
          body: JSON.stringify({
            message: {
              token: টোকেন,
              notification: { title: শিরোনাম, body: শরীর },
              data: রুটিং,
              android: { priority: 'high' }
            }
          })
        }
      );
      if (res.ok) পাঠানো += 1;
      else ব্যর্থ += 1;
    } catch {
      ব্যর্থ += 1;
    }
  }

  return উত্তর(200, { ok: true, sent: পাঠানো, failed: ব্যর্থ, would_send: টোকেনসমূহ.length });
});
