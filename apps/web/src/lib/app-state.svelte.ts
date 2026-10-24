// পিআরডি §১৬ — অফলাইন-প্রথম স্টেট।
// অফলাইনে চলে: ক্যাশ ফিড দেখা, খসড়া পোস্ট তৈরি/সম্পাদনা (সারিবদ্ধ), চ্যাট বার্তা (সারিবদ্ধ)।
// অনলাইন-প্রয়োজন: সারাদেশ খোঁজ, এআই বর্ণনা।
import type { ফিডআইটেম } from './logic/feed';
import { getSupabase, type পণ্যঢোকানো } from './supabase';
import { hasAuthClient, getSessionUserId, signOutSession } from './auth';

export interface ব্যবহারকারী {
  id?: string; // Supabase auth uid — সেশন থাকলে (R3)
  নাম: string;
  মোবাইল: string;
  লেবেল: string;
  গ্রাম: string;
  ইউনিয়ন: string;
  উপজেলা: string;
  জেলা: string;
  বিভাগনাম: string;
  ঠিকানাবিস্তারিত: string;
  lat: number;
  lng: number;
  যাচাইকৃত: boolean;
  হোয়াটসঅ্যাপ: string | null;
  ব্লকতালিকা: string[];
}

export interface চ্যাটবার্তা {
  id: string;
  প্রেরক: 'আমি' | 'প্রতিপক্ষ';
  ধরণ: 'লেখা' | 'ছবি' | 'এলাকা';
  বিষয়বস্তু: string;
  সময়: number;
}

export interface চ্যাটথ্রেড {
  প্রতিপক্ষনাম: string;
  প্রতিপক্ষআইডি: string;
  হোয়াটসঅ্যাপ: string | null;
  বার্তাসমূহ: চ্যাটবার্তা[];
  শেষসময়: number;
  শেষহয়েছে: boolean;
  রেটিংদেওয়া: boolean;
}

interface সারিআইটেম {
  id: string;
  কাজ: 'পোস্ট' | 'বার্তা' | 'প্রোফাইল';
  বিষয়বস্তু: unknown;
  সময়: number;
}

const কী = 'chashi.state';
const এখন = () => Date.now();

// নেটিভ গার্ড — Capacitor নিজেই window.Capacitor ইনজেক্ট করে, তাই শনাক্ত করতে কোনো ইম্পোর্ট লাগে না
// (ওয়েব বান্ডলে বাড়তি বাইট নেই)। ওয়েবে এই স্টেটের একমাত্র স্টোর localStorage।
function নেটিভপ্ল্যাটফর্ম(): boolean {
  const c = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!(c && c.isNativePlatform && c.isNativePlatform());
}

// নেটিভ রাইট (APK) — একই পেলোড SQLite-এর kv টেবিলে, কী = 'chashi.state'।
// সংরক্ষণ() সিঙ্ক্রোনাস থাকে, তাই await করা হয় না; ব্যর্থ হলেও localStorage ফলব্যাক টিকে থাকে।
function ডিবিতেসংরক্ষণ(পেলোড: string) {
  if (!নেটিভপ্ল্যাটফর্ম()) return;
  void import('./offline/sqlite-wrapper')
    .then((ও) => ও.ডিবিলেখা('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [কী, পেলোড]))
    .catch((e) => console.warn('SQLite-এ সংরক্ষণ ব্যর্থ — localStorage ফলব্যাক সক্রিয়', e));
}

// নেটিভ বুট — SQLite ডিউরেবল স্টোর, তাই তা localStorage-এর চেয়ে অগ্রগণ্য।
function ডিবিথেকেলোড() {
  if (!নেটিভপ্ল্যাটফর্ম()) return;
  void import('./offline/sqlite-wrapper')
    .then(async (ও) => {
      const সারি = await ও.ডিবিপড়া('SELECT value FROM kv WHERE key = ?', [কী]);
      const কাঁচা = সারি && সারি[0] ? সারি[0].value : null;
      if (typeof কাঁচা !== 'string' || কাঁচা.trim().length === 0) return;
      try {
        const পার্স = JSON.parse(কাঁচা) as Record<string, unknown>;
        // অনলাইন পতাকা চলমান অবস্থার সত্য — ডিস্ক থেকে আসা পুরোনো মান দিয়ে তা বদলানো হয় না।
        Object.assign(app, বিশ্রামস্টেট(), পার্স, { অনলাইন: app.অনলাইন });
        void সেশনসিঙ্ক().then(() => সারিফ্লাশ());
      } catch {
        console.warn('SQLite-এর সংরক্ষিত স্টেট পড়া যায়নি — localStorage স্টেট রাখা হলো');
      }
    })
    .catch((e) => console.warn('SQLite থেকে লোড ব্যর্থ — localStorage স্টেট রাখা হলো', e));
}

function বিশ্রামস্টেট() {
  return {
    লগইন: false,
    ব্যবহারকারী: null as ব্যবহারকারী | null,
    পোস্টসমূহ: [] as ফিডআইটেম[],
    চ্যাটসমূহ: {} as Record<string, চ্যাটথ্রেড>,
    সারি: [] as সারিআইটেম[],
    অনলাইন: true,
    নোটিফিকেশন: { নতুনপোস্ট: true, চ্যাটবার্তা: true, বিপণন: false }
  };
}

function লোড() {
  try {
    // SQLite-based load (PRD §2.7, §16.1) — schemaVersion 1
    const raw = localStorage.getItem(কী); // Fallback during dev; SQLite in production
    if (raw) return { ...বিশ্রামস্টেট(), ...JSON.parse(raw) };
  } catch {}
  return বিশ্রামস্টেট();
}

export const app = $state(লোড());

// নেটিভ (APK): বুটে SQLite-এর সংরক্ষিত স্টেট localStorage-এর উপরে বসে (অ্যাসিঙ্ক্রোনাস, নন-ব্লকিং)।
ডিবিথেকেলোড();

// বুট-সিঙ্ক মডিউল-ইনিশে চলে (SPA, ssr=false → শুধু ক্লায়েন্ট)। নেটিভে ডিস্ক
// থেকে স্টেট পরে বসতে পারে, তাই ডিবিথেকেলোড শেষেও একবার চালানো হয়।
// সেশন মিলে গেলেই সারির প্রথম আসল ফ্লাশ (CHC-T-023) — ব্যর্থ হলে সারি অটুট।
if (typeof window !== 'undefined') void সেশনসিঙ্ক().then(() => সারিফ্লাশ());

export function সংরক্ষণ() {
  const { লগইন, ব্যবহারকারী, পোস্টসমূহ, চ্যাটসমূহ, সারি, নোটিফিকেশন } = app;
  const পেলোড = JSON.stringify({ লগইন, ব্যবহারকারী, পোস্টসমূহ, চ্যাটসমূহ, সারি, নোটিফিকেশন });
  try {
    // ওয়েব পাথ অপরিবর্তিত; নেটিভেও localStorage ফলব্যাক হিসেবে থাকে
    localStorage.setItem(কী, পেলোড);
  } catch {}
  // নেটিভ পাথ — একই পেলোড SQLite-এ (schemaVersion 1) — PRD §2.7, §16.1
  ডিবিতেসংরক্ষণ(পেলোড);
}

export function লগইনকরুন(ব্যবহারকারী: ব্যবহারকারী) {
  app.লগইন = true;
  app.ব্যবহারকারী = ব্যবহারকারী;
  সংরক্ষণ();
}

// CHC-T-018 — লগআউট: স্থানীয় স্টেট আগে, তারপর Supabase সেশন।
// সেশন মোছা await করা হয় না — অফলাইনে/নেটওয়ার্ক ঝুলে গেলেও লগআউট কখনো
// আটকায় না বা throw করে না (signOutSession নিজেই কখনো throw করে না)।
export function লগআউট() {
  app.লগইন = false;
  app.ব্যবহারকারী = null;
  সংরক্ষণ();
  void signOutSession();
}

// CHC-T-018 — বুট-সিঙ্ক (R2)। কেবল ব্যবহারকারী.id (ঐচ্ছিক) মেলে/মুছে;
// app.লগইন ও ব্যবহারকারী কখনো বদলায় না — অফলাইন-প্রথম।
//   (a) সেশন আছে        → id মিলিয়ে বসানো (আলাদা হলে সেশনই সত্য)
//   (b) সেশন নেই, id আছে → শুধু id মোছা
//   (c) সেশন নেই, id নেই → কিছুই নয়
// রিফ্রেশ supabase-js নিজেই করে — এখানে ম্যানুয়াল রিফ্রেশ নেই।
export async function সেশনসিঙ্ক() {
  if (!hasAuthClient()) return; // env নেই → ডেমো পথ, কিছুই করার নেই
  const uid = await getSessionUserId();
  const ব্যবহারকারী = app.ব্যবহারকারী;
  if (!ব্যবহারকারী) return;
  if (uid) {
    if (ব্যবহারকারী.id !== uid) {
      ব্যবহারকারী.id = uid;
      সংরক্ষণ();
    }
  } else if (ব্যবহারকারী.id) {
    ব্যবহারকারী.id = undefined;
    সংরক্ষণ();
  }
}

// অফলাইন সারি — পিআরডি §১৬.২
export function সারিতেযোগ(কাজ: সারিআইটেম['কাজ'], বিষয়বস্তু: unknown) {
  app.সারি.push({ id: crypto.randomUUID(), কাজ, বিষয়বস্তু, সময়: এখন() });
  সংরক্ষণ();
}

// ── CHC-T-023 — পোস্ট সার্ভারে (সেশন থাকলে), সারির প্রথম আসল ফ্লাশ ───────────
// অফলাইন-প্রথম অপরিবর্তিত: সেশন/নেট না থাকলে ঠিক আগের মতোই সারিতে যায় এবং
// UI কখনো নেটওয়ার্কের জন্য অপেক্ষা করে না। RLS: seller_id অবশ্যই auth.uid()।

type পোস্টবাড়তি = { বর্ণনা?: string; দরকষাকষি?: boolean };

// উইশলিস্ট পোস্টের স্থানীয় শিরোনামে উপসর্গ থাকে — সার্ভারে শিরোনাম পরিষ্কার রাখি,
// কারণ ফিড ওখানে 'জিনিস খুঁজছি' ব্যাজটাই দেখায়।
const খোঁজউপসর্গ = 'জিনিস খুঁজছি: ';

function পণ্যসারি(আইটেম: ফিডআইটেম, ব্যবহারকারী: ব্যবহারকারী, sellerId: string, বাড়তি?: পোস্টবাড়তি): পণ্যঢোকানো {
  const বর্ণনা = (বাড়তি?.বর্ণনা ?? '').trim();
  const শিরোনাম =
    আইটেম.পোস্টপ্রকার === 'প্রয়োজন' && আইটেম.শিরোনাম.startsWith(খোঁজউপসর্গ)
      ? আইটেম.শিরোনাম.slice(খোঁজউপসর্গ.length)
      : আইটেম.শিরোনাম;
  return {
    seller_id: sellerId,
    type: আইটেম.পোস্টপ্রকার === 'প্রয়োজন' ? 'wanted' : 'sale',
    title: শিরোনাম,
    price: আইটেম.পোস্টপ্রকার === 'বিক্রয়' ? আইটেম.দাম : null,
    unit: আইটেম.একক || 'কেজি',
    quantity: আইটেম.পরিমাণ,
    category: আইটেম.বিভাগ,
    description: বর্ণনা.length > 0 ? বর্ণনা : null,
    photo: typeof আইটেম.ছবি === 'string' && আইটেম.ছবি.length > 0 ? আইটেম.ছবি : null,
    division: ব্যবহারকারী.বিভাগনাম,
    district: ব্যবহারকারী.জেলা,
    upazila: ব্যবহারকারী.উপজেলা,
    union_name: ব্যবহারকারী.ইউনিয়ন,
    village: ব্যবহারকারী.গ্রাম,
    lat: আইটেম.স্থান.lat,
    lng: আইটেম.স্থান.lng,
    negotiable: বাড়তি?.দরকষাকষি === true,
    hidden: false
  };
}

// একক INSERT — সাফল্যে সার্ভার আইডি, ব্যর্থতায় null (কখনো throw নয়)।
async function পণ্যপাঠান(আইটেম: ফিডআইটেম, sellerId: string, বাড়তি?: পোস্টবাড়তি): Promise<string | null> {
  const সার্ভার = getSupabase();
  const ব্যবহারকারী = app.ব্যবহারকারী;
  if (!সার্ভার || !ব্যবহারকারী) return null;
  try {
    const { data, error } = await সার্ভার.from('products').insert(পণ্যসারি(আইটেম, ব্যবহারকারী, sellerId, বাড়তি)).select('id').single();
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

// ডুপ্লিকেট-মুক্তির কেন্দ্র: স্থানীয় যমজের id → সার্ভার uuid।
// server-feed হাইড্রেশন লোকাল আইটেম বাদ দেয় যার id সার্ভারের আইডির তালিকায় আছে,
// তাই পরের বুটে পোস্টটি ঠিক একবারই থাকে (সার্ভারের কপি)।
// ইতিমধ্যে সার্ভার-ফেচ একই পোস্ট যোগ করে থাকলে সেটিও সরিয়ে দেওয়া হয় —
// যে ক্রমেই ফেচ/ইনসার্ট শেষ হোক, ফল একটাই আইটেম।
function পুনর্মিলন(পুরনোআইডি: string, সার্ভারআইডি: string) {
  if (পুরনোআইডি === সার্ভারআইডি) return;
  for (let i = app.পোস্টসমূহ.length - 1; i >= 0; i--) {
    if (app.পোস্টসমূহ[i].id === সার্ভারআইডি) app.পোস্টসমূহ.splice(i, 1);
  }
  const আইটেম = (app.পোস্টসমূহ as ফিডআইটেম[]).find((প: ফিডআইটেম) => প.id === পুরনোআইডি);
  if (!আইটেম) return;
  আইটেম.id = সার্ভারআইডি;
  সংরক্ষণ();
}

// সারির পেলোড: সেশন-বিহীন পথে আজকের হুবহু একই আইটেম (বাড়তি কী কেবল থাকলে),
// যাতে অফলাইন/ডেমো পথে কোনো পার্থক্যই না হয়।
function সারিপেলোড(আইটেম: ফিডআইটেম, বাড়তি?: পোস্টবাড়তি): ফিডআইটেম & পোস্টবাড়তি {
  const পেলোড: ফিডআইটেম & পোস্টবাড়তি = { ...আইটেম };
  if (বাড়তি?.বর্ণনা) পেলোড.বর্ণনা = বাড়তি.বর্ণনা;
  if (বাড়তি?.দরকষাকষি) পেলোড.দরকষাকষি = true;
  return পেলোড;
}

/**
 * নতুন পোস্ট: সেশন থাকলে সার্ভারে INSERT, নাহলে (বা ব্যর্থতায়) সারিতে।
 * সফলে স্থানীয় যমজটিকে সার্ভার আইডিতে মিলিয়ে দেওয়া হয়, তাই পোস্ট কখনো দুবার
 * দেখায় না। কখনো throw করে না; ফলাফল শুধুই তথ্য (true = সার্ভারে পৌঁছেছে)।
 */
export async function পোস্টসংরক্ষণ(আইটেম: ফিডআইটেম, বাড়তি?: পোস্টবাড়তি): Promise<boolean> {
  // env নেই → ডেমো পথ: কোনো নেটওয়ার্ক চেষ্টাই নেই, আজকের মতোই সারি।
  if (!hasAuthClient()) {
    সারিতেযোগ('পোস্ট', সারিপেলোড(আইটেম, বাড়তি));
    return false;
  }
  let uid: string | null = null;
  try {
    uid = await getSessionUserId();
  } catch {
    uid = null;
  }
  if (!uid) {
    সারিতেযোগ('পোস্ট', সারিপেলোড(আইটেম, বাড়তি));
    return false;
  }
  const সার্ভারআইডি = await পণ্যপাঠান(আইটেম, uid, বাড়তি);
  if (!সার্ভারআইডি) {
    সারিতেযোগ('পোস্ট', সারিপেলোড(আইটেম, বাড়তি));
    return false;
  }
  পুনর্মিলন(আইটেম.id, সার্ভারআইডি);
  void সারিফ্লাশ(); // পুরোনো ব্যাকলগও এই সুযোগেই যায়
  return true;
}

let ফ্লাশচলছে = false;

/**
 * আন্তরিক সারি-ফ্লাশ (CHC-T-023) — কেবল সেশন থাকলে। 'পোস্ট' সারি সার্ভারে যায়:
 * সফল → সারি থেকে বাদ + স্থানীয় যমজ সার্ভার আইডিতে মিলে যায়; ব্যর্থ → সারিতে
 * অটুট। বার্তা/প্রোফাইল সারি এই কাজে ছোঁয়া হয় না। কখনো throw করে না।
 */
export async function সারিফ্লাশ(): Promise<number> {
  if (ফ্লাশচলছে || !app.অনলাইন || app.সারি.length === 0) return 0;
  if (!hasAuthClient()) return 0; // env নেই → ডেমো পথ, সারি অটুট
  ফ্লাশচলছে = true;
  try {
    const uid = await getSessionUserId();
    if (!uid) return 0; // সেশন নেই → সারি অটুট
    const সফল: string[] = [];
    for (const আইটেম of [...app.সারি]) {
      if (আইটেম.কাজ !== 'পোস্ট') continue;
      const বিষয় = আইটেম.বিষয়বস্তু as ফিডআইটেম & পোস্টবাড়তি;
      const সার্ভারআইডি = await পণ্যপাঠান(বিষয়, uid, { বর্ণনা: বিষয়.বর্ণনা, দরকষাকষি: বিষয়.দরকষাকষি });
      if (!সার্ভারআইডি) continue; // ব্যর্থ → সারিতে থাকে
      পুনর্মিলন(বিষয়.id, সার্ভারআইডি);
      সফল.push(আইটেম.id);
    }
    if (সফল.length === 0) return 0;
    const সরান = new Set(সফল);
    // ফ্লাশ চলাকালীন নতুন যোগ হওয়া সারি অটুট থাকে — কেবল প্রক্রিয়াকৃতগুলো বাদ।
    app.সারি = (app.সারি as সারিআইটেম[]).filter((আ: সারিআইটেম) => !সরান.has(আ.id));
    সংরক্ষণ();
    return সফল.length;
  } catch {
    return 0;
  } finally {
    ফ্লাশচলছে = false;
  }
}

export function পোস্টযোগ(আইটেম: ফিডআইটেম) {
  app.পোস্টসমূহ.unshift(আইটেম);
  সংরক্ষণ();
}

export function চ্যাটখুলুন(প্রতিপক্ষআইডি: string, নাম: string, হোয়াটসঅ্যাপ: string | null): চ্যাটথ্রেড {
  if (!app.চ্যাটসমূহ[প্রতিপক্ষআইডি]) {
    app.চ্যাটসমূহ[প্রতিপক্ষআইডি] = {
      প্রতিপক্ষনাম: নাম,
      প্রতিপক্ষআইডি,
      হোয়াটসঅ্যাপ,
      বার্তাসমূহ: [],
      শেষসময়: এখন(),
      শেষহয়েছে: false,
      রেটিংদেওয়া: false
    };
    সংরক্ষণ();
  }
  return app.চ্যাটসমূহ[প্রতিপক্ষআইডি];
}

export function বার্তাপাঠান(থ্রেড: চ্যাটথ্রেড, ধরণ: চ্যাটবার্তা['ধরণ'], বিষয়বস্তু: string) {
  // ভয়েস নোট কখনো নেই — শুধু লেখা / ছবি / এলাকা (পিআরডি §১০.২)
  থ্রেড.বার্তাসমূহ.push({ id: crypto.randomUUID(), প্রেরক: 'আমি', ধরণ, বিষয়বস্তু, সময়: এখন() });
  থ্রেড.শেষসময় = এখন();
  সারিতেযোগ('বার্তা', { প্রতিপক্ষ: থ্রেড.প্রতিপক্ষআইডি, ধরণ, বিষয়বস্তু });
}

export function ব্যবহারকারীব্লক(id: string) {
  if (app.ব্যবহারকারী && !app.ব্যবহারকারী.ব্লকতালিকা.includes(id)) {
    app.ব্যবহারকারী.ব্লকতালিকা.push(id);
    সংরক্ষণ();
  }
}
