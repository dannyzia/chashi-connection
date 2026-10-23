// পিআরডি §৯ — সার্ভার-ব্যাকড ফিড (অফলাইন-প্রথম)।
//
// এই মডিউল কেবল সার্ভারের পণ্য পড়ে (anon, RLS: products_পঠন_সবার) এবং সেগুলোকে
// ফিডআইটেম আকারে রূপান্তর করে দেয়। ক্রম নির্ধারণ এখানে হয় না — ব্যান্ড অ্যালগরিদম
// (logic/feed.ts) পুরো মিলিত সেটের উপর চলে, তাই লোকালিটি-প্রথম নিয়ম অপরিবর্তিত।
//
// ব্যর্থতা = পুরোনো আচরণ: env নেই, নেট নেই, বা যেকোনো ত্রুটি → { ok:false, items:[] },
// কখনো throw নয়। ফিড তখন শুধু লোকাল ডেটা (বীজ + ক্যাশ) দেখায়।
//
// নোট: RLS নিজে ৩০ দিনের মেয়াদ প্রয়োগ করে না, তাই expires_at ফিল্টার এখানে।
import { getSupabase, type পণ্যসারি } from './supabase';
import type { ফিডআইটেম } from './logic/feed';
import { bn } from './bn';

// সার্ভার থেকে আসা আইটেম — `serverId` চিহ্নটি লোকাল আইটেমে কখনো থাকে না,
// তাই মিলিত সেট থেকে সার্ভার আইটেম আলাদা করা যায় (পুনরায় ফেচে ডুপ্লিকেট জমে না)।
export type সার্ভারআইটেম = ফিডআইটেম & { serverId: true };

export type সার্ভারফল = { ok: boolean; items: সার্ভারআইটেম[] };

export function সার্ভারআইটেমকি(আইটেম: ফিডআইটেম): boolean {
  return (আইটেম as সার্ভারআইটেম).serverId === true;
}

// সারি → ফিডআইটেম। শুধু ফিড যা ভোগ করে তাই মাপা হয়।
// ছবি: সার্ভারে URL-ই থাকে; অফলাইন ক্যাশের জন্য কেবল dataURL রাখা হয়, নাহলে
// ছবিআছে=true রেখে গ্রেডিয়েন্ট প্লেসহোল্ডার দেখানো হয় (অফলাইনে ভাঙা ছবি নয়)।
function রূপান্তর(সারি: পণ্যসারি): সার্ভারআইটেম {
  const সময় = Date.parse(সারি.created_at);
  const ছবি = typeof সারি.photo === 'string' && সারি.photo.startsWith('data:') ? সারি.photo : undefined;
  return {
    id: সারি.id,
    শিরোনাম: সারি.title,
    দাম: সারি.price ?? 0,
    একক: সারি.unit,
    পরিমাণ: সারি.quantity,
    বিভাগ: সারি.category,
    ছবিআছে: typeof সারি.photo === 'string' && সারি.photo.length > 0,
    ছবি,
    সৃষ্টিসময়: Number.isFinite(সময়) ? সময় : Date.now(),
    // sellers জয়েন এখনো নেই (products সারিতে নাম থাকে না) — পরে একটি আলাদা কাজে।
    বিক্রেতানাম: bn.বিক্রেতা,
    বিক্রেতালেবেল: '',
    যাচাইকৃত: false,
    স্থান: { lat: সারি.lat, lng: সারি.lng },
    পোস্টপ্রকার: সারি.type === 'wanted' ? 'প্রয়োজন' : 'বিক্রয়',
    serverId: true
  };
}

/**
 * অদৃশ্য (hidden) ও মেয়াদোত্তীর্ণ বাদ দিয়ে সর্বোচ্চ ২০০টি পণ্য আনে।
 * env নেই বা যেকোনো ত্রুটি → { ok:false, items:[] } — কখনো throw নয়।
 */
export async function সার্ভারফিডআনুন(): Promise<সার্ভারফল> {
  const ক্লায়েন্ট = getSupabase();
  if (!ক্লায়েন্ট) return { ok: false, items: [] };
  try {
    const { data, error } = await ক্লায়েন্ট
      .from('products')
      .select('*')
      .eq('hidden', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !data) return { ok: false, items: [] };
    return { ok: true, items: data.map(রূপান্তর) };
  } catch {
    return { ok: false, items: [] };
  }
}
