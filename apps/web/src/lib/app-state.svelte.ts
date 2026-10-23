// পিআরডি §১৬ — অফলাইন-প্রথম স্টেট।
// অফলাইনে চলে: ক্যাশ ফিড দেখা, খসড়া পোস্ট তৈরি/সম্পাদনা (সারিবদ্ধ), চ্যাট বার্তা (সারিবদ্ধ)।
// অনলাইন-প্রয়োজন: সারাদেশ খোঁজ, এআই বর্ণনা।
import type { ফিডআইটেম } from './logic/feed';

export interface ব্যবহারকারী {
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

export function লগআউট() {
  app.লগইন = false;
  app.ব্যবহারকারী = null;
  সংরক্ষণ();
}

// অফলাইন সারি — পিআরডি §১৬.২
export function সারিতেযোগ(কাজ: সারিআইটেম['কাজ'], বিষয়বস্তু: unknown) {
  app.সারি.push({ id: crypto.randomUUID(), কাজ, বিষয়বস্তু, সময়: এখন() });
  সংরক্ষণ();
}

export function সারিফ্লাশ() {
  if (!app.অনলাইন || app.সারি.length === 0) return 0;
  const সংখ্যা = app.সারি.length;
  app.সারি = [];
  সংরক্ষণ();
  return সংখ্যা;
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
