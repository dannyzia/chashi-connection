// পিআরডি §৫.৩ + §১২.৩ — মোবাইলই পরিচয়। এই মডিউলটাই একমাত্র জায়গা যেখানে
// Supabase Auth ছোঁয়া হয়; স্ক্রিনগুলো শুধু ফলাফল দেখে।
//
// নিয়ম:
//   • কোনো ফাংশনই কখনো throw করে না — ব্যর্থতা সবসময় { ok: false, error }।
//   • env না থাকলে (CI, অন্য মেশিন, অফলাইন) getSupabase() null, তাই প্রতিটি
//     ফাংশন 'no-client' ফেরত দেয়। কল করার দায়িত্ব স্ক্রিনের: ক্লায়েন্ট না
//     থাকলে সে ডেমো পথে যায়, অ্যাপ কখনো আটকে যায় না।
//   • অ্যাপে নম্বর 01XXXXXXXXX আকারে থাকে; Supabase চায় E.164 (+880…)।
import { getSupabase, type ব্যবহারকারীঢোকানো } from './supabase';

/** ওটিপি পাঠানো/যাচাইয়ের ফল — কোনো ব্যতিক্রম নয়, শুধু ফল। */
export interface ওটিপিফলাফল {
  ok: boolean;
  error?: 'no-client' | 'invalid-phone' | 'send-failed' | 'verify-failed';
  user?: { id: string };
}

const বাংলাদেশিমোবাইল = /^01[3-9]\d{8}$/;

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

/** OTP পাঠানোর অনুরোধ। সার্ভার গ্রহণ করলে ok:true (এখনো যাচাই হয়নি)। */
export async function sendOtp(phone: string): Promise<ওটিপিফলাফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, error: 'no-client' };
  const নম্বর = toE164(phone);
  if (!নম্বর) return { ok: false, error: 'invalid-phone' };
  try {
    const { error } = await সার্ভার.auth.signInWithOtp({ phone: নম্বর });
    if (error) return { ok: false, error: 'send-failed' };
    return { ok: true };
  } catch {
    // নেটওয়ার্ক বিচ্ছিন্নতা — অ্যাপ ভাঙে না, স্ক্রিনই সিদ্ধান্ত নেয়।
    return { ok: false, error: 'send-failed' };
  }
}

/** OTP যাচাই। সফল হলে সেশন তৈরি হয় এবং user.id ফেরত আসে। */
export async function verifyOtp(phone: string, token: string): Promise<ওটিপিফলাফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, error: 'no-client' };
  const নম্বর = toE164(phone);
  if (!নম্বর) return { ok: false, error: 'invalid-phone' };
  const কোড = (token || '').trim();
  // Supabase-এর ডিফল্ট ৬ সংখ্যা; ৪–৮ সহনশীল, যাতে টেস্ট-প্রজেক্টের
  // কনফিগারেশন বদলালেও UI না ভাঙে।
  if (!/^\d{4,8}$/.test(কোড)) return { ok: false, error: 'verify-failed' };
  try {
    const { data, error } = await সার্ভার.auth.verifyOtp({ phone: নম্বর, token: কোড, type: 'sms' });
    if (error || !data.user) return { ok: false, error: 'verify-failed' };
    return { ok: true, user: { id: data.user.id } };
  } catch {
    return { ok: false, error: 'verify-failed' };
  }
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
 * upon conflict (id) → আপডেট: ফোন unique, তাই পুনরায় লগইনে নতুন সারি হয় না,
 * ত্রুটি-ব্যানারও দেখানো হয় না।
 *
 * নেটওয়ার্ক-স্তরের ব্যর্থতা (সার্ভারে পৌঁছায়নি, তাই PostgREST কোড নেই) →
 * পথ:'সারি' — ডাককারী সারিতেযোগ() করবে। সার্ভারের প্রকৃত ত্রুটি (কোড থাকে)
 * → পথ:'ব্যর্থ'।
 */
export async function প্রোফাইলসংরক্ষণ(সারি: ব্যবহারকারীঢোকানো & { id: string }): Promise<প্রোফাইলফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, পথ: 'ব্যর্থ', error: 'no-client' };
  try {
    const { error } = await সার্ভার.from('users').upsert(সারি, { onConflict: 'id' });
    if (error) {
      // PostgREST/Postgres ত্রুটিতে সবসময় একটি কোড থাকে; ফাঁকা কোড মানে
      // অনুরোধটি সার্ভার পর্যন্ত যায়নি (fetch ব্যর্থ) — অর্থাৎ অফলাইন।
      if (!error.code) return { ok: false, পথ: 'সারি', error: 'offline' };
      return { ok: false, পথ: 'ব্যর্থ', error: error.code };
    }
    return { ok: true, পথ: 'সংরক্ষিত' };
  } catch {
    return { ok: false, পথ: 'সারি', error: 'offline' };
  }
}
