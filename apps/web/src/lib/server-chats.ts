// পিআরডি §১০ — সার্ভার-ব্যাকড চ্যাট (কেবল পড়া; লেখা পরের কাজে)।
//
// CHC-T-022-এর ফিড-প্যাটার্নের প্রতিরূপ: সেশন থাকলে RLS দিয়ে নিজের থ্রেড ও বার্তা
// পড়ে সেগুলোকে অ্যাপ-স্টেটের চ্যাটথ্রেড আকারে মিলিয়ে দেওয়া হয়। env নেই, সেশন
// নেই, নেট নেই বা যেকোনো ত্রুটি → { ok:false }; তখন চ্যাট স্ক্রিন ঠিক আজকের মতোই
// কেবল লোকাল ডেটা দেখায় (কোনো স্পিনার নেই — অফলাইন-প্রথম, পিআরডি §১৬.১)।
//
// এই মডিউল কখনো লেখে না: INSERT/UPDATE/DELETE একটিও নেই — পড়া-ই এই কাজের সীমা।
//
// আরএলএস: chats_পঠন_অংশীদার ও messages_পঠন_অংশীদার কেবল অংশগ্রহণকারীকে সারি দেয়,
// তাই সার্ভারই শেষ রক্ষক; কোয়েরিতে buyer/seller ফিল্টার বাড়তি বেল্ট-এন্ড-ব্রেসেস।
//
// গোপনীয়তা: প্রতিপক্ষের ফোন/হোয়াটসঅ্যাপ কখনো আনা হয় না — কলাম-তালিকাতেই নেই,
// আর থ্রেডের হোয়াটসঅ্যাপ সবসময় null (প্রোফাইল → সেটিংসে সেভ করা নম্বরই একমাত্র
// পথ, পিআরডি §১০.২)।
import { getSupabase, type বার্তাধরণ } from './supabase';
import { hasAuthClient, getSessionUserId } from './auth';
import { app, সংরক্ষণ, type চ্যাটথ্রেড, type চ্যাটবার্তা } from './app-state.svelte';
import { bn } from './bn';

// সার্ভার-থ্রেড — লোকাল থ্রেডে এই তিনটি ক্ষেত্র কখনো থাকে না, তাই এগুলোই চিহ্ন:
// `সার্ভারথ্রেডআইডি` = chats.id (পুনঃফেচে মেলানোর চাবি), `পোস্টআইডি` = listing_id,
// `serverId` = T-022-ধাঁচের স্পষ্ট চিহ্ন (একই থ্রেড দুবার জমতে না পারে)।
export type সার্ভারথ্রেড = চ্যাটথ্রেড & {
  সার্ভারথ্রেডআইডি: string;
  পোস্টআইডি: string;
  serverId: true;
};

export type সার্ভারচ্যাটফল = { ok: boolean; threads: Record<string, সার্ভারথ্রেড> };

const ধরণমানচিত্র: Record<বার্তাধরণ, চ্যাটবার্তা['ধরণ']> = {
  text: 'লেখা',
  image: 'ছবি',
  location: 'এলাকা'
};

type পরিচিতি = { name: string; label: string; verified: boolean };

function সময়মান(আইএসও: string): number | null {
  const সময় = Date.parse(আইএসও);
  return Number.isFinite(সময়) ? সময় : null;
}

/**
 * নিজের থ্রেড + বার্তা পড়ে চ্যাটথ্রেড আকারে ফেরত দেয় (কখনো throw নয়)।
 * চাবি = প্রতিপক্ষের uid — অ্যাপ-স্টেট ও /chat/[id] ঠিক এই চাবিই ব্যবহার করে,
 * তাই কোনো নতুন রুট বা UI বদল লাগে না।
 */
export async function সার্ভারচ্যাটআনুন(): Promise<সার্ভারচ্যাটফল> {
  const ক্লায়েন্ট = getSupabase();
  if (!ক্লায়েন্ট) return { ok: false, threads: {} }; // env নেই → শূন্য নেটওয়ার্ক
  if (!hasAuthClient()) return { ok: false, threads: {} };

  try {
    const uid = await getSessionUserId();
    if (!uid) return { ok: false, threads: {} }; // সেশন নেই → চ্যাট টেবিলে প্রশ্নই নেই

    // ১) নিজের অংশগ্রহণের থ্রেড (নতুন আগে)। RLS + স্পষ্ট ফিল্টার।
    const চ্যাটফল = await ক্লায়েন্ট
      .from('chats')
      .select('*')
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    if (চ্যাটফল.error || !চ্যাটফল.data) return { ok: false, threads: {} };
    const চ্যাটসমূহ = চ্যাটফল.data;
    if (চ্যাটসমূহ.length === 0) return { ok: true, threads: {} };

    const থ্রেডআইডি = চ্যাটসমূহ.map((চ) => চ.id);

    // ২) সব বার্তা এক ব্যাচে — প্রতি থ্রেডে আলাদা কোয়েরি নয়।
    const বার্তাফল = await ক্লায়েন্ট
      .from('messages')
      .select('*')
      .in('chat_id', থ্রেডআইডি)
      .order('created_at', { ascending: true });
    const বার্তাসমূহ = বার্তাফল.error || !বার্তাফল.data ? [] : বার্তাফল.data;

    // ৩) প্রতিপক্ষের পরিচয় — users টেবিল (authenticated SELECT নীতি আছে)।
    // public_sellers ভিউয়ের বদলে users কেন: (ক) Database টাইপে ভিউটি নেই, কাস্ট
    // লাগত; (খ) দুটোরই RLS সারি একই (security_invoker = true); (গ) এখানে কেবল
    // চারটি কলাম চাওয়া হয়, তাই phone/whatsapp পেলোডেই আসে না।
    const প্রতিপক্ষআইডি = new Set<string>();
    for (const চ of চ্যাটসমূহ) প্রতিপক্ষআইডি.add(চ.buyer_id === uid ? চ.seller_id : চ.buyer_id);
    const পরিচিতিমানচিত্র = new Map<string, পরিচিতি>();
    if (প্রতিপক্ষআইডি.size > 0) {
      const ব্যবহারকারীফল = await ক্লায়েন্ট
        .from('users')
        .select('id,name,label,verified')
        .in('id', [...প্রতিপক্ষআইডি]);
      if (!ব্যবহারকারীফল.error && ব্যবহারকারীফল.data) {
        for (const উ of ব্যবহারকারীফল.data) {
          পরিচিতিমানচিত্র.set(উ.id, { name: উ.name, label: উ.label, verified: উ.verified });
        }
      }
      // পরিচয় না মিললেও থ্রেড বাদ যায় না — নিরপেক্ষ বাংলা নামে দেখানো হয়।
    }

    // ৪) বার্তা থ্রেড অনুযায়ী সাজানো — এক ব্যাচ, তারপর একবার ভাগ।
    const থ্রেডঅনুযায়ীবার্তা = new Map<string, চ্যাটবার্তা[]>();
    for (const ব of বার্তাসমূহ) {
      const সময় = সময়মান(ব.created_at);
      if (সময় === null) continue; // নষ্ট সারি বাদ, ব্যাচ নয়
      const তালিকা = থ্রেডঅনুযায়ীবার্তা.get(ব.chat_id) ?? [];
      তালিকা.push({
        id: ব.id,
        প্রেরক: ব.sender_id === uid ? 'আমি' : 'প্রতিপক্ষ',
        ধরণ: ধরণমানচিত্র[ব.kind] ?? 'লেখা',
        বিষয়বস্তু: ব.body,
        সময়
      });
      থ্রেডঅনুযায়ীবার্তা.set(ব.chat_id, তালিকা);
    }

    // ৫) থ্রেড-আকারে রূপান্তর। একই প্রতিপক্ষের একাধিক চ্যাট থাকলে সবচেয়ে নতুনটিই
    // থাকে (অ্যাপ-স্টেটে থ্রেডের চাবি প্রতিপক্ষ uid — মডেলের নিজস্ব সীমা)।
    const থ্রেডসমূহ: Record<string, সার্ভারথ্রেড> = {};
    for (const চ of চ্যাটসমূহ) {
      const প্রতিপক্ষ: string = চ.buyer_id === uid ? চ.seller_id : চ.buyer_id;
      if (!প্রতিপক্ষ || প্রতিপক্ষ === uid) continue; // ত্রুটিপূর্ণ সারি বাদ, ব্যাচ নয়
      if (থ্রেডসমূহ[প্রতিপক্ষ]) continue; // সবচেয়ে নতুনটি আগেই এসেছে (created_at desc)
      const পরিচিতি = পরিচিতিমানচিত্র.get(প্রতিপক্ষ);
      const বার্তা = থ্রেডঅনুযায়ীবার্তা.get(চ.id) ?? [];
      const শেষবার্তা = বার্তা.length > 0 ? বার্তা[বার্তা.length - 1].সময় : null;
      const সৃষ্টি = সময়মান(চ.created_at);
      থ্রেডসমূহ[প্রতিপক্ষ] = {
        প্রতিপক্ষনাম: পরিচিতি?.name || bn.অজানাব্যবহারকারী,
        প্রতিপক্ষআইডি: প্রতিপক্ষ,
        হোয়াটসঅ্যাপ: null, // কখনো সার্ভার থেকে নয় — পিআরডি §১০.২
        বার্তাসমূহ: বার্তা,
        শেষসময়: শেষবার্তা ?? সৃষ্টি ?? Date.now(),
        শেষহয়েছে: চ.ended_at !== null,
        রেটিংদেওয়া: false, // সার্ভারে রাখা হয় না (রেটিং পরের কাজ)
        সার্ভারথ্রেডআইডি: চ.id,
        পোস্টআইডি: চ.listing_id,
        serverId: true
      };
    }
    return { ok: true, threads: থ্রেডসমূহ };
  } catch {
    return { ok: false, threads: {} };
  }
}

/**
 * ফেচ + মিলন (কখনো throw নয়, কখনো UI আটকায় না)।
 * সফল হলে সার্ভার-থ্রেড একই app.চ্যাটসমূহ-এ বসে (চাবি = প্রতিপক্ষ uid), আর
 * সার্ভারে আর নেই এমন সার্ভার-থ্রেড বাদ পড়ে — তাই মোছা চ্যাট পরের ফেচে মিলিয়ে যায়।
 * কেবল-লোকাল থ্রেড (সার্ভারথ্রেডআইডি নেই) স্পর্শই করা হয় না।
 */
let চলছে = false;

export async function সার্ভারচ্যাটযোগ(): Promise<number> {
  if (চলছে) return 0;
  চলছে = true;
  try {
    const ফল = await সার্ভারচ্যাটআনুন();
    if (!ফল.ok) return 0; // ব্যর্থ → কিছুই বদলায় না
    const বর্তমান = app.চ্যাটসমূহ as Record<string, চ্যাটথ্রেড>;
    let বদল = 0;
    for (const চাবি of Object.keys(বর্তমান)) {
      if (বর্তমান[চাবি].সার্ভারথ্রেডআইডি && !ফল.threads[চাবি]) {
        delete বর্তমান[চাবি];
        বদল++;
      }
    }
    for (const [চাবি, থ্রেড] of Object.entries(ফল.threads)) {
      বর্তমান[চাবি] = থ্রেড;
      বদল++;
    }
    if (বদল > 0) সংরক্ষণ();
    return বদল;
  } catch {
    return 0;
  } finally {
    চলছে = false;
  }
}
