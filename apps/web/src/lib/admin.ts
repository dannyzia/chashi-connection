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
import { getSupabase } from './supabase';
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

/**
 * লুকানো/দেখানো (পিআরডি §১২.৪)। কাজ করে কেবল ০০০০৫-এর
 * products_অ্যাডমিন_সম্পাদনা নীতির আওতায় (role='admin') — নাহলে RLS শূন্য
 * সারি বদলায়, অর্থাৎ {ok:false}।
 *
 * `hidden: false` মানে পুনরায় প্রকাশ, `true` মানে লুকানো। অ-অ্যাডমিনের
 * অনুরোধে ০ সারি প্রভাবিত হয় — একে ত্রুটি ধরা হয় যাতে UI মিথ্যা সাফল্য
 * না দেখায়।
 */
export async function setHidden(productId: string, hidden: boolean): Promise<boolean> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return false;
  try {
    const { data, error } = await সার্ভার
      .from('products')
      .update({ hidden })
      .eq('id', productId)
      .select('id');
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
