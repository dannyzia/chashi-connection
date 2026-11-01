// পিআরডি §১৫.৩ — পুশ টোকেন নিবন্ধন ও ট্যাপ-রাউটিং।
//
// নিয়ম:
//   • শুধু নেটিভ (APK) প্ল্যাটফর্মে, আর শুধু সেশন থাকলে। ওয়েবে কিছুই হয় না।
//   • অনুমতি চাওয়া হয় লগইনের পরে (নেটিভ গার্ড পেরোনোর পরেই) — §৫.৩-এর ক্রম।
//   • plugin ডাইনামিক ইম্পোর্টে: ওয়েব বান্ডলে অতিরিক্ত বাইট নেই, আর প্লাগইন
//     ইনস্টল না থাকলেও অ্যাপ ভাঙে না (catch → নীরব)।
//   • কোনো ফাংশনই throw করে না — পুশ ব্যর্থতা অ্যাপের কোনো পথ আটকায় না।
import { getSessionUserId } from './auth';
import { getSupabase } from './supabase';

/** Capacitor নিজেই window.Capacitor ইনজেক্ট করে — শনাক্ত করতে ইম্পোর্ট লাগে না। */
function নেটিভপ্ল্যাটফর্ম(): boolean {
  const c = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!(c && c.isNativePlatform && c.isNativePlatform());
}

// device_tokens এখনো supabase.ts-এর টাইপ-প্রতিচ্ছবিতে নেই (এই টাস্কের সুযোগের
// বাইরে), তাই কেবল প্রয়োজনীয় আকৃতিটুকু এখানে ঘোষণা করা হলো — রানটাইমে শূন্য।
type টোকেনক্লায়েন্ট = {
  from: (টেবিল: string) => {
    upsert: (
      মান: Record<string, unknown>,
      অপশন?: Record<string, unknown>
    ) => Promise<{ error: { code?: string } | null }>;
    delete: () => {
      eq: (কলাম: string, মান: string) => Promise<{ error: { code?: string } | null }>;
    };
  };
};

let নিবন্ধনেরচেষ্টা = false;

// CHC-T-040 — শেষ নিবন্ধিত টোকেন ধরে রাখা হয়, যাতে লগআউটে সারিটি মোছা যায়
// (RLS self-delete)। মডিউল-স্টেট মূল; localStorage ব্যাকআপ, কারণ অ্যাপ বন্ধ
// করে আবার খুললে মডিউল-স্টেট শূন্য হয় কিন্তু সারিটি তখনো সার্ভারে থাকে।
const টোকেনচাবি = 'chashi_পুশ_টোকেন';
let সর্বশেষটোকেন: string | null = null;

function টোকেনলেখা(টোকেন: string): void {
  সর্বশেষটোকেন = টোকেন;
  try {
    globalThis.localStorage?.setItem(টোকেনচাবি, টোকেন);
  } catch {
    // স্টোরেজ বন্ধ/কোটা — মডিউল-স্টেটই যথেষ্ট
  }
}

function টোকেনপড়া(): string | null {
  if (সর্বশেষটোকেন) return সর্বশেষটোকেন;
  try {
    return globalThis.localStorage?.getItem(টোকেনচাবি) ?? null;
  } catch {
    return null;
  }
}

function টোকেনভুলেজাও(): void {
  সর্বশেষটোকেন = null;
  try {
    globalThis.localStorage?.removeItem(টোকেনচাবি);
  } catch {
    // মুছতে না পারলেও কিছু ভাঙে না
  }
}

/**
 * টোকেন সার্ভারে লেখা — RLS নিজেই user_id = auth.uid() যাচাই করে, তাই ক্লায়েন্ট
 * অন্য কারো টোকেন লিখতে পারে না। fcm_token unique: একই ডিভাইসে আবার লগইন করলে
 * সারিটি হালনাগাদ হয় (মালিক বদলালে user_id-ও বদলায়)।
 */
async function টোকেনসংরক্ষণ(userId: string, টোকেন: string): Promise<void> {
  if (!টোকেন) return;
  // সার্ভারে লেখার আগেই স্থানীয়ভাবে রাখা — অফলাইনে upsert ব্যর্থ হলেও
  // লগআউটে মোছার চেষ্টা করা যায়।
  টোকেনলেখা(টোকেন);
  const সার্ভার = getSupabase() as unknown as টোকেনক্লায়েন্ট | null;
  if (!সার্ভার) return;
  try {
    await সার্ভার
      .from('device_tokens')
      .upsert(
        { user_id: userId, fcm_token: টোকেন, platform: 'android' },
        { onConflict: 'fcm_token' }
      );
  } catch {
    // অফলাইন/নেটওয়ার্ক ব্যর্থতা — পুশ ছাড়া অ্যাপ আগের মতোই চলে
  }
}

/**
 * ট্যাপ → গন্তব্য (§১৫.৩)। data-এর নিজস্ব ক্ষেত্রই ঠিক করে, কোনো টেক্সট নয়।
 *   chat_message + chat_id → /chat/<chat_id>
 *   new_post     + listing_id → /listing/<listing_id>
 * অন্য কিছু / অসম্পূর্ণ data → কিছুই নয় (অ্যাপ যেমন ছিল তেমনই থাকে)।
 */
export function ট্যাপপথ(data: Record<string, unknown> | undefined | null): string | null {
  if (!data) return null;
  const kind = typeof data.kind === 'string' ? data.kind : '';
  if (kind === 'chat_message' && typeof data.chat_id === 'string' && data.chat_id) {
    return '/chat/' + data.chat_id;
  }
  if (kind === 'new_post' && typeof data.listing_id === 'string' && data.listing_id) {
    return '/listing/' + data.listing_id;
  }
  return null;
}

/**
 * লগআউটের আগে টোকেন-সারি মোছা (CHC-T-040)।
 *
 * RLS নিজেই user_id = auth.uid() যাচাই করে, তাই কেবল নিজের সারি যায়।
 * কখনো throw করে না — লগআউট পুশ-পরিষ্কারের উপর নির্ভর করে না।
 * মোছা ব্যর্থ হলে টোকেন রাখা থাকে, পরের লগআউটে আবার চেষ্টা হয়।
 */
export async function পুশটোকেনমুছুন(): Promise<void> {
  const টোকেন = টোকেনপড়া();
  if (!টোকেন) return;
  const সার্ভার = getSupabase() as unknown as টোকেনক্লায়েন্ট | null;
  if (!সার্ভার) {
    টোকেনভুলেজাও();
    return;
  }
  try {
    const { error } = await সার্ভার.from('device_tokens').delete().eq('fcm_token', টোকেন);      if (!error) টোকেনভুলেজাও();
  } catch {
    // অফলাইন/নেটওয়ার্ক ব্যর্থ — সারিটি পরের বার চেষ্টার জন্য রয়ে যায়
  }
}

/**
 * সেশন-শুরুর নিবন্ধন। একবারই চলে; ব্যর্থ হলে চুপচাপ ফিরে যায় এবং পরের
 * লগইনে আবার চেষ্টা করে (নিবন্ধনেরচেষ্টা কেবল সফল হলে সত্য হয়)।
 */
export async function পুশনিবন্ধন(): Promise<void> {
  if (নিবন্ধনেরচেষ্টা) return;
  if (!নেটিভপ্ল্যাটফর্ম()) return;

  const userId = await getSessionUserId();
  if (!userId) return; // সেশন না থাকলে অনুমতিও চাওয়া হয় না

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Android 13+ (API 33) POST_NOTIFICATIONS — লগইনের পরেই, আগে নয়।
    const অনুমতি = await PushNotifications.requestPermissions();
    if (অনুমতি.receive !== 'granted') return;

    await PushNotifications.addListener('registration', (টোকেন) => {
      void টোকেনসংরক্ষণ(userId, টোকেন.value);
    });
    await PushNotifications.addListener('registrationError', () => {
      // টোকেন না পেলে পুশই আসবে না — বাকি অ্যাপ অপরিবর্তিত
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', async (ঘটনা) => {
      const পথ = ট্যাপপথ(ঘটনা.notification.data as Record<string, unknown> | undefined);
      if (!পথ) return;
      try {
        const { goto } = await import('$app/navigation');
        await goto(পথ);
      } catch {
        // নেভিগেশন ব্যর্থ — ব্যবহারকারী নিজেই গন্তব্যে যেতে পারেন
      }
    });

    await PushNotifications.register();
    নিবন্ধনেরচেষ্টা = true;
  } catch {
    // প্লাগইন অনুপস্থিত (google-services.json ছাড়া Phase-A বিল্ড) বা অনুমতি-ত্রুটি
  }
}
