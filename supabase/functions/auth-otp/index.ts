// ─────────────────────────────────────────────────────────────────────────────
// auth-otp — dP Relay OTP গেটওয়ে (সিদ্ধান্ত CHC-D-023)
//
// ক্লায়েন্ট → এই ফাংশন → dP Relay /v5/otp/{send,verify} → যাচাই হলে Supabase সেশন
//
// নিয়ম (লঙ্ঘন = রিভিউতে বাতিল):
//   • dP Relay-এর appId/appSecret কেবল ফাংশনের env-এ থাকে — কোডে বা রিপোতে নয়।
//   • OTP, টোকেন, সিক্রেট — কোনোটাই কখনো লগ করা হয় না (এই ফাইলে console.* নেই)।
//   • /v5/billing/* কখনো ডাকা হয় না — টপ-আপ মালিকের অপারেশন (CHC-D-026)।
//   • sessionId ক্লায়েন্টে ফেরত যায় না (সার্ভারের ভেতরের বিবরণ)।
//
// সেশন তৈরির পথ (Supabase-নথিভুক্ত): এই ফাংশনই একমাত্র জায়গা যেখানে
// service-role কী ব্যবহৃত হয় — admin দিয়ে ফোন-নির্ধারিত ইউজার get-or-create,
// তারপর generateLink(magiclink) → hashed_token → verifyOtp({token_hash})।
// এতে GoTrue-এর আসল সেশন (access+refresh) পাওয়া যায়, RLS-এর auth.uid() কাজ করে,
// এবং আমরা নিজেরা কোনো JWT সাইন করি না।
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_হেডার: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// E.164 বাংলাদেশি মোবাইল এবং ৪–৮ সংখ্যার কোড — dP Relay ডাকার আগেই যাচাই।
const নম্বর_নিয়ম = /^\+8801[3-9]\d{8}$/;
const ওটিপি_নিয়ম = /^\d{4,8}$/;

type dpফল = { status: number; data: Record<string, unknown> };

function উত্তর(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_হেডার, 'Content-Type': 'application/json' }
  });
}

/** dP Relay-এর একক ডাক। নেটওয়ার্ক বিফল হলে status 0 ও খালি data ফেরে। */
async function dpডাক(পথ: string, পেলোড: Record<string, unknown>): Promise<dpফল> {
  const base = Deno.env.get('DP_RELAY_API_BASE_URL');
  const appId = Deno.env.get('DP_RELAY_APP_ID');
  const appSecret = Deno.env.get('DP_RELAY_APP_SECRET');
  if (!base || !appId || !appSecret) return { status: 0, data: {} };
  try {
    const res = await fetch(base.replace(/\/+$/, '') + পথ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': appId,
        'X-App-Secret': appSecret
      },
      body: JSON.stringify(পেলোড)
    });
    let data: Record<string, unknown> = {};
    try {
      const পার্স = await res.json();
      if (পার্স && typeof পার্স === 'object') data = পার্স as Record<string, unknown>;
    } catch {
      // খালি/অ-জেসন উত্তর — কোডই যথেষ্ট
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: {} };
  }
}

/** dP-র ব্যর্থতা → ক্লায়েন্টের পরিষ্কার কোড (429/402/423 সহ)। */
function dpত্রুটি(ফল: dpফল, ফলব্যাক: string): Response {
  if (ফল.status === 0) return উত্তর(502, { ok: false, error: 'upstream-unreachable' });
  const কোড = typeof ফল.data.code === 'string' && ফল.data.code ? ফল.data.code : ফলব্যাক;
  const অপেক্ষা = typeof ফল.data.retryAfterSec === 'number' ? ফল.data.retryAfterSec : undefined;
  const স্থিতি = ফল.status === 423 || ফল.status === 429 || ফল.status === 402 ? ফল.status : 400;
  return উত্তর(স্থিতি, অপেক্ষা !== undefined ? { ok: false, error: কোড, retryAfterSec: অপেক্ষা } : { ok: false, error: কোড });
}

/**
 * ফোন-যাচাই সম্পন্ন হলে GoTrue সেশন।
 * ইউজার-পরিচয় ফোন থেকেই নির্ধারিত (একই ফোন = একই ইউজার), কোনো পাসওয়ার্ড সংরক্ষিত হয় না।
 * ব্যর্থ হলে null — ক্লায়েন্ট 'session-failed' দেখাবে।
 */
async function সেশনতৈরি(phone: string): Promise<{ session: Record<string, unknown>; userId: string } | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !serviceKey || !anonKey) return null;

  // ফোন থেকে নির্ধারিত অভ্যন্তরীণ ঠিকানা — কখনো পাঠানো হয় না, শুধু ইউজার শনাক্তকরণ।
  const ইমেইল = phone.slice(1) + '@otp.chashi.local';

  const অ্যাডমিন = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { error: তৈরিত্রুটি } = await অ্যাডমিন.auth.admin.createUser({
    email: ইমেইল,
    email_confirm: true,
    user_metadata: { phone }
  });
  // ইতিমধ্যে আছে = স্বাভাবিক (পুনরায় লগইন); অন্য ত্রুটি = সেশন হয়নি।
  if (তৈরিত্রুটি && তৈরিত্রুটি.code !== 'email_exists') return null;

  const { data: লিঙ্ক, error: লিঙ্কত্রুটি } = await অ্যাডমিন.auth.admin.generateLink({
    type: 'magiclink',
    email: ইমেইল
  });
  const hashed = লিঙ্ক?.properties?.hashed_token;
  if (লিঙ্কত্রুটি || !hashed) return null;

  const ক্লায়েন্ট = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: যাচাই, error: যাচাইত্রুটি } = await ক্লায়েন্ট.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashed
  });
  const session = যাচাই?.session;
  if (যাচাইত্রুটি || !session || !যাচাই.user) return null;

  return {
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type
    },
    userId: যাচাই.user.id
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_হেডার });
  if (req.method !== 'POST') return উত্তর(405, { ok: false, error: 'method-not-allowed' });

  let body: Record<string, unknown>;
  try {
    const পার্স = await req.json();
    if (!পার্স || typeof পার্স !== 'object') return উত্তর(400, { ok: false, error: 'bad-request' });
    body = পার্স as Record<string, unknown>;
  } catch {
    return উত্তর(400, { ok: false, error: 'bad-request' });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  // ⚠ dP Relay-এর env না থাকলে কিছুই ফাঁস না করে সাধারণ ত্রুটি (তত্ত্বাবধায়ক সেট করেন)।
  if (!Deno.env.get('DP_RELAY_API_BASE_URL') || !Deno.env.get('DP_RELAY_APP_ID') || !Deno.env.get('DP_RELAY_APP_SECRET')) {
    return উত্তর(500, { ok: false, error: 'config' });
  }
  if (!নম্বর_নিয়ম.test(phone)) return উত্তর(400, { ok: false, error: 'invalid-phone' });

  if (action === 'send') {
    const ফল = await dpডাক('/v5/otp/send', { phone });
    if (ফল.status !== 0 && ফল.status < 300 && ফল.data.ok !== false) {
      // sessionId ইচ্ছাকৃতভাবে বাদ — শুধু মেয়াদ।
      return উত্তর(200, { ok: true, expiresAt: typeof ফল.data.expiresAt === 'number' ? ফল.data.expiresAt : null });
    }
    return dpত্রুটি(ফল, 'send-failed');
  }

  if (action === 'verify') {
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
    if (!ওটিপি_নিয়ম.test(otp)) return উত্তর(400, { ok: false, error: 'invalid-otp' });

    const ফল = await dpডাক('/v5/otp/verify', { phone, otp });
    if (ফল.status !== 0 && ফল.status >= 400) return dpত্রুটি(ফল, 'verify-failed');
    if (ফল.status === 0) return dpত্রুটি(ফল, 'verify-failed');
    if (ফল.data.verified !== true) {
      const কোড = typeof ফল.data.code === 'string' && ফল.data.code ? ফল.data.code : 'invalid-otp';
      return উত্তর(401, { ok: false, error: কোড });
    }

    const সেশন = await সেশনতৈরি(phone);
    if (!সেশন) return উত্তর(502, { ok: false, error: 'session-failed' });
    return উত্তর(200, { ok: true, user: { id: সেশন.userId }, session: সেশন.session });
  }

  return উত্তর(400, { ok: false, error: 'bad-request' });
});
