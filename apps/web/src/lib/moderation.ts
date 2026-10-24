// পিআরডি §১২ — রিপোর্ট ও ব্লক সার্ভারে (RLS), অফলাইন-প্রথম।
//
// server-feed / server-chats-এর ধাঁচ: env নেই, সেশন নেই, বা যেকোনো ত্রুটি →
// { ok:false }; কখনো throw নয়। ডাককারী ব্যর্থতা পেলে সারিতে রাখে (app-state),
// ব্যবহারকারী কোনো ত্রুটি দেখেন না — রিপোর্ট আর ব্লক ঠিক সেই কাজগুলো যা 2G-তে,
// নেট ছাড়াই কাজ করতেই হবে (পিআরডি §১২)। এখানে কোনো UI নেই।
//
// RLS: reports_যোগ / blocks_যোগ দাবি করে নিজের uid (reporter_id / blocker_id),
// blocks_পঠন_নিজের ও blocks_মুছে_ফেলা কেবল নিজের সারি। তাই এখান থেকে কেবল নিজের
// সারিই লেখা/মোছা/পড়া হয় — অন্যের রিপোর্ট কোথাও দেখা যায় না (ইচ্ছাকৃত)।
import { getSupabase, type রিপোর্টলক্ষ্য } from './supabase';
import { hasAuthClient, getSessionUserId } from './auth';

/**
 * সার্ভারে পৌঁছানোর ফল। 'no-session' = env/সেশন নেই (নেটওয়ার্ক ছোঁয়া হয়নি),
 * 'failed' = চেষ্টা হয়েছে কিন্তু ব্যর্থ। ডাককারী দুটোতেই সারিতে রাখে।
 */
export type জমাফল = { ok: boolean; error?: 'no-session' | 'failed' | 'invalid-target' };

// reports.target_id ও blocks.blocked_id দুটোই uuid কলাম। ডেমো বীজের আইডি ('s1')
// বা নাম-জাতীয় ব্লক-এন্ট্রি ওখানে কখনো বসবে না (22P02)। এমন ঠিকানা সার্ভারে পাঠানোর
// চেষ্টাই করা হয় না — এন্ট্রি সারিতে ঢুকলে তা চিরকাল ব্যর্থ হতো।
const ইউইউআইডি = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * রিপোর্ট জমা (পিআরডি §১২.৪ শ্রেণীগুলোই caller দেয় — এখানে যাচাই হয় না)।
 * details খালি হলে null — টেবিলের কলাম ঐচ্ছিক।
 */
export async function রিপোর্টজমা(
  ধরন: রিপোর্টলক্ষ্য,
  লক্ষ্য: string,
  শ্রেণী: string,
  বিস্তারিত?: string
): Promise<জমাফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, error: 'no-session' }; // env নেই → শূন্য নেটওয়ার্ক
  // uuid-যাচাই সেশনের আগেই (নেটওয়ার্ক লাগে না) — অসম্ভব ঠিকানা কখনো সারিতে যায় না।
  if (!ইউইউআইডি.test(লক্ষ্য ?? '')) return { ok: false, error: 'invalid-target' };
  try {
    const uid = await getSessionUserId();
    if (!uid) return { ok: false, error: 'no-session' };
    const বাড়তি = (বিস্তারিত ?? '').trim();
    const { error } = await সার্ভার.from('reports').insert({
      reporter_id: uid,
      target_type: ধরন,
      target_id: লক্ষ্য,
      category: শ্রেণী,
      details: বাড়তি.length > 0 ? বাড়তি : null
    });
    return error ? { ok: false, error: 'failed' } : { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

/**
 * ব্লক জমা — এক জোড়া একবারই (blocks_জোড়া_অদ্বিতীয়)। সারিতে থাকা একই ব্লক
 * দুইবার গেলে UNIQUE ভাঙে (23505), কিন্তু অবস্থা তো ইতিমধ্যেই কাঙ্ক্ষিত —
 * তাই সেটিকে সাফল্যই ধরা হয় (দ্বৈত-নিরপেক্ষ)। নিজেকে ব্লক UI থেকে সম্ভবই নয়
 * (blocks_নিজেকে_নয়); এমন ইনপুট এলে সারিতে চিরকাল আটকে না রেখে বাদ দেওয়া হয়।
 */
export async function ব্লকজমা(blocked_id: string): Promise<জমাফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, error: 'no-session' };
  if (!ইউইউআইডি.test(blocked_id ?? '')) return { ok: false, error: 'invalid-target' };
  try {
    const uid = await getSessionUserId();
    if (!uid) return { ok: false, error: 'no-session' };
    if (blocked_id === uid) return { ok: true };
    const { error } = await সার্ভার.from('blocks').insert({ blocker_id: uid, blocked_id });
    if (!error) return { ok: true };
    return error.code === '23505' ? { ok: true } : { ok: false, error: 'failed' };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

/**
 * ব্লক মুছে ফেলা — নিজের সারি (blocks_মুছে_ফেলা)। সারি না থাকলেও ত্রুটি নেই;
 * ফলে সারিতে থাকা একটি আনব্লক দুইবার গেলেও ফল একই (দ্বৈত-নিরপেক্ষ)।
 */
export async function আনব্লকজমা(blocked_id: string): Promise<জমাফল> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false, error: 'no-session' };
  if (!ইউইউআইডি.test(blocked_id ?? '')) return { ok: false, error: 'invalid-target' };
  try {
    const uid = await getSessionUserId();
    if (!uid) return { ok: false, error: 'no-session' };
    const { error } = await সার্ভার.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', blocked_id);
    return error ? { ok: false, error: 'failed' } : { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

/**
 * নিজের ব্লক-সারির blocked_id তালিকা (বুট-মিলনের জন্য)।
 * ব্যর্থ/সেশন-বিহীন → null; তখন মিলনই হয় না, লোকাল তালিকা অটুট।
 */
export async function ব্লকলোকালতালিকাআনুন(): Promise<string[] | null> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return null;
  if (!hasAuthClient()) return null;
  try {
    const uid = await getSessionUserId();
    if (!uid) return null;
    const { data, error } = await সার্ভার.from('blocks').select('blocked_id').eq('blocker_id', uid);
    if (error || !data) return null;
    return data.map((স) => স.blocked_id).filter((আইডি): আইডি is string => typeof আইডি === 'string');
  } catch {
    return null;
  }
}
