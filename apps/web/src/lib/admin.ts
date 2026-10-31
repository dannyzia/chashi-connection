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
  // ০০০৬ (CHC-T-035): রিপোর্ট-সীমায় স্বয়ংক্রিয়ভাবে লুকানোর সময়। মালিকের/
  // অপারেটরের নিজের লুকানো (hidden) থেকে আলাদা রাখা হয়েছে — তাই UI-তে আলাদা
  // ব্যাজ, আর প্রকাশ করলে কেবল এই চিহ্নটিই যায়।
  auto_hidden_at: string | null;
  created_at: string;
};

/** ০০০৬-এর কর্ম-লগের কেবল সেই অংশ যা অপারেটর-তালিকা দেখায়। */
export type প্রশাসককর্ম = {
  id: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};

/** ব্যবহারকারী-তালিকার অংশ (০০০৭) — যাচাই টগলের জন্য যতটুকু দরকার। */
export type প্রশাসকব্যবহারকারী = {
  id: string;
  phone: string;
  name: string;
  label: string;
  role: 'user' | 'admin';
  verified: boolean;
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
    // চেইন সরাসরি টাইপড ক্লায়েন্টেই চলে (supabase-js-এর নিজস্ব টাইপিং);
    // supabase.ts (স্কোপের বাইরে) এখনো ০০০৬-এর auto_hidden_at না জানায়
    // বলে কেবল ফলের সারিগুলোতেই কাস্ট। রানটাইমে কিছু বদলায় না।
    const { data, error } = await সার্ভার
      .from('products')
      .select('id,title,category,type,hidden,auto_hidden_at,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data as unknown as প্রশাসকপণ্য[];
  } catch {
    return [];
  }
}

/**
 * সব ব্যবহারকারী, নতুন আগে (সর্বোচ্চ ১০০) — যাচাই ব্যবস্থাপনার জন্য (০০০৭)।
 *
 * সতর্কতা: users_পঠন_প্রমাণিত নীতি authenticated-সবার জন্য (০০০১) — অর্থাৎ
 * এই তালিকা যেকোনো সাইন-ইন করা ব্যবহারকারী পড়তে পারে, কেবল অ্যাডমিন নয়।
 * অপারেটর-পাতাটি ভূমিকা যাচাইয়ের পরেই এটা ডাকে, তাই UI-তে ফাঁস হয় না; কিন্তু
 * নীতিটি প্রশস্ত — তালিকা কেবল-অ্যাডমিন করতে চাইলে ০০০১-এর নীতি বদলাতে হবে
 * (এই কাজের বাইরে, রিপোর্টে খোলা প্রশ্ন হিসেবে আছে)।
 */
export async function fetchAllUsers(): Promise<প্রশাসকব্যবহারকারী[]> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return [];
  try {
    const { data, error } = await সার্ভার
      .from('users')
      .select('id,phone,name,label,role,verified,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map((ব) => ({
      id: ব.id,
      phone: ব.phone,
      name: ব.name,
      label: ব.label,
      role: ব.role,
      verified: ব.verified,
      created_at: ব.created_at
    }));
  } catch {
    return [];
  }
}

/**
 * কর্ম-লগ, নতুন আগে (সর্বোচ্চ ১০০) — ০০০৭-এর পঠন-নীতির আওতায় কেবল অ্যাডমিন
 * সারি পায়। অ-অ্যাডমিনের ফল [] (নীতি কোনো সারি খোলে না) — ত্রুটি নয়।
 */
export async function fetchAuditLog(): Promise<প্রশাসককর্ম[]> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return [];
  try {
    const { data, error } = await সার্ভার
      .from('admin_audit')
      .select('id,actor,action,target_type,target_id,details,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data as unknown as কর্মপঠনসারি[];
  } catch {
    return [];
  }
}

type কর্মপঠনসারি = প্রশাসককর্ম & { details: unknown };

/**
 * যাচাই টগল (পিআরডি §১২.৩) — ০০০৭-এর definer RPC। verified কলাম ক্লায়েন্টের
 * সরাসরি লেখার বাইরে (০০০৫), তাই একমাত্র পথ এই ফাংশন; ভেতরে কলকারীর ভূমিকা
 * যাচাই হয়। non-admin → ব্যতিক্রম → {ok:false}। কখনো throw করে না।
 */
export async function setUserVerified(
  userId: string,
  verified: boolean
): Promise<{ ok: boolean }> {
  const সার্ভার = getSupabase();
  if (!সার্ভার) return { ok: false };
  try {
    const { data, error } = await (সার্ভার as unknown as ডাকক্লায়েন্ট).rpc(
      'set_user_verified',
      { p_user_id: userId, p_verified: verified }
    );
    if (error || !data) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

type ডাকক্লায়েন্ট = {
  rpc: (নাম: string, আর্গ: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * লক্ষ্য-ভিত্তিক রিপোর্ট-সংখ্যা (পিআরডি §১২.৪-এর কিউ-ক্রমের ইনপুট)। reports
 * পড়া যায় ০০০৫-এর reports_অ্যাডমিন_পঠন নীতিতে (কেবল অ্যাডমিন); অ-অ্যাডমিনের
 * ফল কেবল নিজের রিপোর্ট, অর্থাৎ গণনা ছোট — তবু ত্রুটি নয়।
 */
export async function fetchReportCounts(): Promise<Map<string, number>> {
  const সার্ভার = getSupabase();
  const গণনা = new Map<string, number>();
  if (!সার্ভার) return গণনা;
  try {
    const { data, error } = await সার্ভার
      .from('reports')
      .select('target_id,category,created_at');
    if (error || !data) return গণনা;
    for (const র of data) {
      গণনা.set(র.target_id, (গণনা.get(র.target_id) ?? 0) + 1);
    }
    return গণনা;
  } catch {
    return গণনা;
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
