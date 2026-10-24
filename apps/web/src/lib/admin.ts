// পিআরডি §১২.৪ — অপারেটরের (অ্যাডমিন) পাঠ ও লুকানো/দেখানো (CHC-T-028)।
//
// নমুনা: server-feed.ts / server-chats.ts — null-safe, session-gated, কখনো
// throw নয়। ব্যর্থতা মানে "কিছু নেই", ক্র্যাশ নয়।
//
// ভূমিকা আসে সার্ভারের সারি থেকে (users.role)। ০০০০৫-এর কলাম-অনুমতির কারণে
// role কলাম ক্লায়েন্টের লেখার পথেই নেই — তাই এখানে যা পড়া হয়, তা সার্ভারের
// সত্য। localStorage-এ বা ক্লায়েন্টের দাবিতে কোনো ভূমিকা রাখা হয় না।
//
// নীতি (০০০০৫): reports_অ্যাডমিন_পঠন, products_অ্যাডমিন_পঠন,
// products_অ্যাডমিন_সম্পাদনা — তিনটিই role='admin' হলে সারি খোলে। তাই এই
// ফাংশনগুলো অ-অ্যাডমিনের জন্য ডাকলে ফাঁকা ফল দেয়, ত্রুটি নয়: RLS নিজেই
// সারি লুকিয়ে রাখে, ক্লায়েন্টে কোনো ক্ষমতা নেই।
import { getSupabase, type Supabase, type পণ্যসারি } from './supabase';
import { hasAuthClient, getSessionUserId } from './auth';

export type প্রশাসকভূমিকা = 'user' | 'admin';

/** রিপোর্ট সারির কেবল সেই অংশ যা অপারেটর-তালিকা দেখায়। */
export type প্রশাসকরিপোর্ট = {
  id: string;
  target_type: string;
  target_id: string;
  category: string;
  details: string | null;
  created_at: string;
};

/**
 * পণ্য-তালিকার অংশ। `photo` ইচ্ছাকৃতভাবে বাদ — লুকানো/দেখানোর জন্য ছবির
 * বাইট দরকার নেই, আর base64 ছবি 2G-তে মেগাবাইট টেনে আনে (পিআরডি §১৬)।
 */
export type প্রশাসকপণ্য = {
  id: string;
  title: string;
  category: string;
  type: string;
  hidden: boolean;
  created_at: string;
};

/**
 * নিজের ভূমিকা সার্ভার থেকে। ক্লায়েন্ট নেই / সেশন নেই / ত্রুটি → false
 * (নিরাপদ দিক: সন্দেহ হলে অ্যাডমিন নয়)। কখনো throw করে না।
 */
export async function hasAdminRole(): Promise<boolean> {
  const সার্ভার = getSupabase();
  if (!সার্ভার || !hasAuthClient()) return false;
  try {
    const uid = await getSessionUserId();
    if (!uid) return false;
    const { data, error } = await সার্ভার.from('users').select('role').eq('id', uid).single();
    if (error || !data) return false;
    return data.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * সব রিপোর্ট, নতুন আগে (সর্বোচ্চ ১০০)। অ-অ্যাডমিনের কাছে RLS সেগুলো
 * লুকায় — `reports_পঠন_নিজের` নীতি তখন কেবল নিজের রিপোর্ট দেয়, যা এখানে
 * ব্যবহার করা হয় না (কল করা হয় ভূমিকা যাচাইয়ের পরই)।
 */
export async function fetchAllReports(): Promise<প্রশাসকরিপোর্ট[]> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return [];
  try {
    const { data, error } = await সার্ভার
      .from('reports')
      .select('id,target_type,target_id,category,details,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map((স) => ({
      id: স.id,
      target_type: স.target_type,
      target_id: স.target_id,
      category: স.category,
      details: স.details,
      created_at: স.created_at
    }));
  } catch {
    return [];
  }
}

/**
 * সর্বশেষ পণ্য (লুকানোসহ), নতুন আগে। অ-অ্যাডমিনের কাছে hidden পণ্য
 * আসবে না — RLS (products_পঠন_সবার) তখন কেবল অপ্রকাশিতগুলো বাদ দেয়,
 * ফলে তালিকাটি ছোট দেখাবে। এটি ব্যর্থতা নয়, নীতি।
 */
export async function fetchProductsAdmin(): Promise<প্রশাসকপণ্য[]> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return [];
  try {
    const { data, error } = await সার্ভার
      .from('products')
      .select('id,title,category,type,hidden,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map((প) => ({
      id: প.id,
      title: প.title,
      category: প.category,
      type: প.type,
      hidden: প.hidden,
      created_at: প.created_at
    }));
  } catch {
    return [];
  }
}

// ── অপারেটর-কর্মের লগ (০০০৬) ──
// supabase.ts (এই কাজের স্কোপের বাইরে) এখনো admin_audit টেবিলটি জানে না, তাই
// এখানে কেবল ইনসার্টের হালকা কাঠামো-প্রকার ঘোষণা করা হলো — নতুন ডিপেন্ডেন্সি
// নয়, নতুন স্কিমা নয়; শুধু টাইপ।
type কর্মলগসারি = {
  actor: string;
  action: 'hide' | 'unhide';
  target_type: 'product';
  target_id: string;
};
type কর্মলগক্লায়েন্ট = {
  from: (তালিকা: 'admin_audit') => {
    insert: (সারি: কর্মলগসারি) => PromiseLike<{ error: unknown }>;
  };
};

/**
 * লগ লেখা — fire-and-forget (পিআরডি §১২.৪: প্রতিটি অ্যাডমিন কাজ লগ হয়)।
 * ব্যর্থ হলে নীরব: লগের ব্যর্থতা অপারেটরের লুকানো/প্রকাশ আটকায় না। ০০০৬-এর
 * নীতি কেবল নিজের নামে ও প্রকৃত অ্যাডমিনকে লগ লিখতে দেয় — তাই এখানে actor
 * সবসময় সেশন-uid, ক্লায়েন্টের দাবি কখনো নয়।
 */
async function কর্মলগলেখা(
  সার্ভার: Supabase,
  uid: string,
  action: 'hide' | 'unhide',
  productId: string
): Promise<void> {
  try {
    await (সার্ভার as unknown as কর্মলগক্লায়েন্ট).from('admin_audit').insert({
      actor: uid,
      action,
      target_type: 'product',
      target_id: productId
    });
  } catch {
    // ইচ্ছাকৃত নীরবতা — লগ সারি না গেলেও অপারেটর-কাজ সফল।
  }
}

/**
 * লুকানো/দেখানো (পিআরডি §১২.৪)। কাজ করে কেবল ০০০০৫-এর
 * products_অ্যাডমিন_সম্পাদনা নীতির আওতায় (role='admin') — নাহলে RLS শূন্য
 * সারি বদলায়, অর্থাৎ {ok:false}।
 *
 * `hidden: false` মানে পুনরায় প্রকাশ, `true` মানে লুকানো। অ-অ্যাডমিনের
 * অনুরোধে ০ সারি প্রভাবিত হয় — একে ত্রুটি ধরা হয় যাতে UI মিথ্যা সাফল্য
 * না দেখায়।
 *
 * প্রকাশের সময় auto_hidden_at-ও মোছা হয় (০০০৬): অপারেটরের "প্রকাশ করুন"
 * মানে পণ্যটি আর স্বয়ংক্রিয়ভাবে লুকানো নয়। লুকানোর সময় ওই কলাম অপরিবর্তিত
 * থাকে — মালিকের নিজের hidden আর রিপোর্ট-সীমার চিহ্ন আলাদা থাকে।
 * সফল হলে একই অনুরোধে লগ সারি লেখা হয় (অপেক্ষা করা হয় না)।
 */
export async function setHidden(productId: string, hidden: boolean): Promise<boolean> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return false;
  try {
    const uid = await getSessionUserId();
    if (!uid) return false;
    // supabase.ts-এর পণ্যসারি প্রতিচ্ছবিতে এখনো ০০০৬-এর auto_hidden_at নেই
    // (সেই ফাইল এই কাজের স্কোপের বাইরে)। তাই কাস্ট: সার্ভার কলামটি লেখে ঠিকই
    // (০০০৫-এর products_অ্যাডমিন_সম্পাদনা নীতি পুরো সারির UPDATE দেয়), কেবল
    // ক্লায়েন্ট-টাইপ এখনো জানে না।
    const পরিবর্তন = (hidden
      ? { hidden: true }
      : { hidden: false, auto_hidden_at: null }) as Partial<পণ্যসারি>;
    const { data, error } = await সার্ভার
      .from('products')
      .update(পরিবর্তন)
      .eq('id', productId)
      .select('id');
    if (error) return false;
    const সফল = Array.isArray(data) && data.length > 0;
    if (সফল) void কর্মলগলেখা(সার্ভার, uid, hidden ? 'hide' : 'unhide', productId);
    return সফল;
  } catch {
    return false;
  }
}
