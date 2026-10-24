// পিআরডি §৫.৩ + §১২.৩ — মোবাইলই পরিচয়। এই মডিউলটাই একমাত্র জায়গা যেখানে
// Supabase Auth ছোঁয়া হয়; স্ক্রিনগুলো শুধু ফলাফল দেখে।
//
// নিয়ম:
//   • কোনো ফাংশনই কখনো throw করে না — ব্যর্থতা সবসময় { ok: false, error }।
//   • env না থাকলে (CI, অন্য মেশিন, অফলাইন) getSupabase() null, তাই প্রতিটি
//     ফাংশন 'no-client' ফেরত দেয়। কল করার দায়িত্ব স্ক্রিনের: ক্লায়েন্ট না
//     থাকলে সে ডেমো পথে যায়, অ্যাপ কখনো আটকে যায় না।
//   • অ্যাপে নম্বর 01XXXXXXXXX আকারে থাকে; সার্ভারে E.164 (+880…)।
//   • OTP পাঠানো ও যাচাই হয় dP Relay-এর মাধ্যমে Edge Function auth-otp-এ
//     (সিদ্ধান্ত CHC-D-023)। সেশন আসে ফাংশন থেকেই — ক্লায়েন্ট কেবল
//     setSession করে। dP Relay-এর কোনো সিক্রেট এখানে নেই।
import { getSupabase, type ব্যবহারকারীঢোকানো } from './supabase';

/** ওটিপি পাঠানো/যাচাইয়ের ফল — কোনো ব্যতিক্রম নয়, শুধু ফল। */
export interface ওটিপিফলাফল {
  ok: boolean;
  error?:
    | 'no-client'
    | 'invalid-phone'
    | 'send-failed'
    | 'verify-failed'
    | 'expired' // কোডের মেয়াদ শেষ (dP: otp_expired)
    | 'locked' // অনেকবার ভুল — কিছুক্ষণ অপেক্ষা (dP: otp_locked)
    | 'cooldown'; // খুব দ্রুত আবার পাঠানোর চেষ্টা (dP: resend_cooldown)
  user?: { id: string };
  /** পাঠানোর সফল উত্তরে dP-র সেশন মেয়াদ (unix seconds) — কুলডাউনের জন্য। */
  expiresAt?: number;
  /** locked/cooldown-এ কত সেকেন্ড অপেক্ষা করতে হবে (dP: retryAfterSec)। */
  retryAfterSec?: number;
}

const বাংলাদেশিমোবাইল = /^01[3-9]\d{8}$/;
const ফাংশন_পথ = '/functions/v1/auth-otp';

/**
 * 01XXXXXXXXX → +880XXXXXXXXX। ভুল নম্বর হলে null।
 * (শুধু স্পেস/ড্যাশ পরিষ্কার করা হয় — অন্য কিছু বদলানো হয় না।)
 */
export function toE164(phone: string): string | null {
  const পরিষ্কার = (phone || '').replace(/[\s-]/g, '');
  if (!বাংলাদেশিমোবাইল.test(পরিষ্কার)) return null;
  return '+880' + পরিষ্কার.slice(1);
}

/**
 * সত্যিকারের Auth পথ আছে কি না। getSupabase()-এর অলসতা অটুট রাখে —
 * ক্লায়েন্ট তৈরি হয় কেবল env থাকলে, এবং একবারই।
 */
export function hasAuthClient(): boolean {
  return getSupabase() !== null;
}

/**
 * ফাংশন ডাকার জন্য URL ও anon key। supabase.ts ক্লায়েন্টের ভেতরে ওগুলো
 * protected, তাই একই env vars এখানে সরাসরি পড়া হয় (দুটি লাইন, একই নাম)।
 */
function পরিবেশ(): { url: string; key: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

/** auth-otp ফাংশনের একক ডাক। নেটওয়ার্ক বিফল হলে null (অফলাইন)। */
async function ফাংশনডাক(পেলোড: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> } | null> {
  const env = পরিবেশ();
  if (!env) return null;
  try {
    const res = await fetch(env.url + ফাংশন_পথ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.key,
        Authorization: 'Bearer ' + env.key
      },
      body: JSON.stringify(পেলোড)
    });
    let data: Record<string, unknown> = {};
    try {
      const পার্স = await res.json();
      if (পার্স && typeof পার্স === 'object') data = পার্স as Record<string, unknown>;
    } catch {
      // অ-জেসন উত্তর — কোডই যথেষ্ট
    }
    return { status: res.status, data };
  } catch {
    return null;
  }
}

function সংখ্যা(মান: unknown): number | undefined {
  return typeof মান === 'number' && Number.isFinite(মান) ? মান : undefined;
}

/**
 * OTP পাঠানোর অনুরোধ — dP Relay সংবাদ পাঠাবে।
 * সার্ভার গ্রহণ করলে ok:true এবং expiresAt (কুলডাউনের জন্য)।
 */
export async function sendOtp(phone: string): Promise<ওটিপিফলাফল> {
  if (!getSupabase()) return { ok: false, error: 'no-client' };
  const নম্বর = toE164(phone);
  if (!নম্বর) return { ok: false, error: 'invalid-phone' };

  const ফল = await ফাংশনডাক({ action: 'send', phone: নম্বর });
  if (!ফল) return { ok: false, error: 'send-failed' }; // নেটওয়ার্ক বিচ্ছিন্ন

  if (ফল.data.ok === true) return { ok: true, expiresAt: সংখ্যা(ফল.data.expiresAt) };

  if (ফল.status === 429) {
    return { ok: false, error: 'cooldown', retryAfterSec: সংখ্যা(ফল.data.retryAfterSec) };
  }
  if (ফল.data.error === 'invalid-phone') return { ok: false, error: 'invalid-phone' };
  return { ok: false, error: 'send-failed' };
}

/**
 * OTP যাচাই — ফাংশন dP Relay-এ যাচাই করে এবং সফল হলে Supabase সেশন দেয়।
 * এখানে কেবল setSession; তারপর user.id = auth.uid() (RLS-এর ভিত্তি)।
 */
export async function verifyOtp(phone: string, token: string): Promise<ওটিপিফলাফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, error: 'no-client' };
  const নম্বর = toE164(phone);
  if (!নম্বর) return { ok: false, error: 'invalid-phone' };
  const কোড = (token || '').trim();
  if (!/^\d{4,8}$/.test(কোড)) return { ok: false, error: 'verify-failed' };

  const ফল = await ফাংশনডাক({ action: 'verify', phone: নম্বর, otp: কোড });
  if (!ফল) return { ok: false, error: 'verify-failed' };

  if (ফল.data.ok === true) {
    const সেশন = ফল.data.session as { access_token?: string; refresh_token?: string } | undefined;
    const uid = (ফল.data.user as { id?: string } | undefined)?.id;
    if (!সেশন?.access_token || !সেশন.refresh_token || !uid) return { ok: false, error: 'verify-failed' };
    try {
      const { error } = await সার্ভার.auth.setSession({
        access_token: সেশন.access_token,
        refresh_token: সেশন.refresh_token
      });
      if (error) return { ok: false, error: 'verify-failed' };
    } catch {
      return { ok: false, error: 'verify-failed' };
    }
    return { ok: true, user: { id: uid } };
  }

  if (ফল.status === 423) {
    return { ok: false, error: 'locked', retryAfterSec: সংখ্যা(ফল.data.retryAfterSec) };
  }
  if (ফল.data.error === 'otp_expired') return { ok: false, error: 'expired' };
  return { ok: false, error: 'verify-failed' };
}

/** চলমান সেশনের uid, না থাকলে null। কখনো throw করে না। */
export async function getSessionUserId(): Promise<string | null> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return null;
  try {
    const { data } = await সার্ভার.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * সেশন শেষ — লগআউটে ডাকা হয় (CHC-T-018)। কখনো throw করে না।
 *
 * আগে global (সব ডিভাইস) চেষ্টা; ব্যর্থ হলে local — auth-js 2.118-এ local
 * scope নেটওয়ার্ক ব্যর্থ হলেও স্টোরেজ থেকে সেশন মুছে দেয়, তাই অফলাইনে
 * লগআউট করলেও ব্রাউজারে সেশন টিকে থাকে না। env নেই → false (ডেমো পথ)।
 */
export async function signOutSession(): Promise<boolean> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return false;
  try {
    const { error } = await সার্ভার.auth.signOut();
    if (!error) return true;
  } catch {
    // নেটওয়ার্ক/লক ব্যর্থতা — নিচের local ফলব্যাক
  }
  try {
    const { error } = await সার্ভার.auth.signOut({ scope: 'local' });
    return !error;
  } catch {
    return false;
  }
}

/** সারিতে ব্যবহারকারী-সারি লেখার ফল। 'সারি' মানে সার্ভারে পৌঁছায়নি → অফলাইন কিউ। */
export interface প্রোফাইলফল {
  ok: boolean;
  পথ: 'সংরক্ষিত' | 'সারি' | 'ব্যর্থ';
  error?: string;
}

/**
 * public.users-এ প্রথম লগইনের সারি। id অবশ্যই auth uid — RLS users_যোগ
 * (`with check (id = auth.uid())`) অন্য কিছু গ্রহণই করে না।
 *
 * আগের সারি থাকলে (আবার লগইন) → update: ফোন unique, তাই পুনরায় লগইনে নতুন
 * সারি হয় না, ত্রুটি-ব্যানারও দেখানো হয় না।
 *
 * ০০০০৫ (CHC-T-028): users-এর অনুমতি এখন কলাম-সীমিত — role/verified/phone/id
 * ক্লায়েন্ট নিজে লিখতে পারে না। তাই upsert ব্যবহার করা যায় না: তার
 * `on conflict do update` পাঠানো প্রতিটি কলামে UPDATE অনুমতি চায়, ফলে
 * verified/phone-সহ পুরো পেলোড গেলে 42501-এ ভেঙে পড়ে (সাইনআপই ব্যর্থ হতো)।
 * পথ: নতুন সারি → insert (verified বাদ; কলামের ডিফল্ট false), আগের সারি →
 * কেবল লিখনযোগ্য কলামে update। ফল একই, অনুমতির সীমা অটুট।
 *
 * নেটওয়ার্ক-স্তরের ব্যর্থতা (সার্ভারে পৌঁছায়নি, তাই PostgREST কোড নেই) →
 * পথ:'সারি' — ডাককারী সারিতেযোগ() করবে। সার্ভারের প্রকৃত ত্রুটি (কোড থাকে)
 * → পথ:'ব্যর্থ'।
 */
export async function প্রোফাইলসংরক্ষণ(সারি: ব্যবহারকারীঢোকানো & { id: string }): Promise<প্রোফাইলফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, পথ: 'ব্যর্থ', error: 'no-client' };
  const { verified: _যাচাইকৃত, ...প্রবেশ } = সারি;
  try {
    const { error: ঢোকানো } = await সার্ভার.from('users').insert(প্রবেশ as ব্যবহারকারীঢোকানো);
    if (!ঢোকানো) return { ok: true, পথ: 'সংরক্ষিত' };
    // 23505 = unique violation → এই uid-এর সারি আগেই আছে (ফের লগইন) → update।
    if (ঢোকানো.code === '23505') {
      const { id, phone: _ফোন, verified: _যাচাই, created_at: _সময়, ...হালনাগাদ } = সারি;
      const { error: লেখা } = await সার্ভার.from('users').update(হালনাগাদ).eq('id', id);
      if (!লেখা) return { ok: true, পথ: 'সংরক্ষিত' };
      if (!লেখা.code) return { ok: false, পথ: 'সারি', error: 'offline' };
      return { ok: false, পথ: 'ব্যর্থ', error: লেখা.code };
    }
    // PostgREST/Postgres ত্রুটিতে সবসময় একটি কোড থাকে; ফাঁকা কোড মানে
    // অনুরোধটি সার্ভার পর্যন্ত যায়নি (fetch ব্যর্থ) — অর্থাৎ অফলাইন।
    if (!ঢোকানো.code) return { ok: false, পথ: 'সারি', error: 'offline' };
    return { ok: false, পথ: 'ব্যর্থ', error: ঢোকানো.code };
  } catch {
    return { ok: false, পথ: 'সারি', error: 'offline' };
  }
}
