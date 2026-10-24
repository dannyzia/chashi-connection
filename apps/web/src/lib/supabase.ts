// পিআরডি §১৩ — লকড স্ট্যাক: Supabase-ই একমাত্র ব্যাকএন্ড (Postgres + RLS)।
//
// এই মডিউল এখনো কোনো স্ক্রিন আমদানি করে না — এটি কেবল সংযোগের ক্ষমতা তৈরি করে,
// অ্যাপের আচরণ বদলায় না। .env না থাকলেও (CI বা অন্য মেশিন) getSupabase() null
// ফেরত দেয়, তাই বিল্ড ও ডেভ কখনো ভাঙে না।
//
// এখানে কোনো URL বা কী হার্ডকোড করা নেই — দুটোই Vite-এর env থেকে আসে:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (apps/web/.env, gitignored)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── স্কিমার প্রতিচ্ছবি (supabase/migrations/00001_init.sql এর সাথে হুবহু) ──
// শুধু টাইপ — রানটাইমে শূন্য বাইট, কারণ টাইপ বিল্ডেই মুছে যায়।

export type পোস্টপ্রকার = 'sale' | 'wanted';
export type বার্তাধরণ = 'text' | 'image' | 'location';
export type রিপোর্টলক্ষ্য = 'product' | 'user' | 'message';

export type ব্যবহারকারীসারি = {
  id: string;
  phone: string;
  name: string;
  label: string;
  division: string;
  district: string;
  upazila: string;
  union_name: string;
  village: string;
  lat: number;
  lng: number;
  detail: string | null;
  whatsapp: string | null;
  women_safety: boolean;
  verified: boolean;
  // ০০০০৫ (CHC-T-028): অপারেটরের ভূমিকা। কেবল সার্ভার/অপারেটর লেখেন —
  // কলাম-অনুমতি ক্লায়েন্টের লেখার পথ বন্ধ রাখে; এখানে কেবল পাঠের প্রতিচ্ছবি।
  role: 'user' | 'admin';
  created_at: string;
};

export type পণ্যসারি = {
  id: string;
  seller_id: string;
  type: পোস্টপ্রকার;
  title: string;
  price: number | null;
  unit: string;
  quantity: number;
  category: string;
  description: string | null;
  photo: string | null;
  division: string;
  district: string;
  upazila: string;
  union_name: string;
  village: string;
  lat: number;
  lng: number;
  negotiable: boolean;
  hidden: boolean;
  created_at: string;
  expires_at: string;
};

export type চ্যাটসারি = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  ended_at: string | null;
};

export type বার্তাসারি = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  kind: বার্তাধরণ;
  created_at: string;
};

export type রিপোর্টসারি = {
  id: string;
  reporter_id: string;
  target_type: রিপোর্টলক্ষ্য;
  target_id: string;
  category: string;
  details: string | null;
  created_at: string;
};

export type ব্লকসারি = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

// সার্ভার-জেনারেটেড কলামগুলো ইনসার্টে ঐচ্ছিক।
type ঐচ্ছিক<সারি, চাবি extends keyof সারি> = Omit<সারি, চাবি> & Partial<Pick<সারি, চাবি>>;

// role/verified সার্ভারের সিদ্ধান্ত (00005): ক্লায়েন্ট পাঠালেও গ্রাহ্য হয় না,
// তাই ইনসার্টের টাইপে এগুলো ঐচ্ছিক — পাঠানো বাধ্যতামূলক নয়।
export type ব্যবহারকারীঢোকানো = ঐচ্ছিক<ব্যবহারকারীসারি, 'id' | 'created_at' | 'role' | 'verified'>;
export type পণ্যঢোকানো = ঐচ্ছিক<পণ্যসারি, 'id' | 'created_at' | 'expires_at'>;
export type চ্যাটঢোকানো = ঐচ্ছিক<চ্যাটসারি, 'id' | 'created_at'>;
export type বার্তাঢোকানো = ঐচ্ছিক<বার্তাসারি, 'id' | 'created_at' | 'kind'>;
export type রিপোর্টঢোকানো = ঐচ্ছিক<রিপোর্টসারি, 'id' | 'created_at'>;
export type ব্লকঢোকানো = ঐচ্ছিক<ব্লকসারি, 'id' | 'created_at'>;

export type Database = {
  public: {
    Tables: {
      users: {
        Row: ব্যবহারকারীসারি;
        Insert: ব্যবহারকারীঢোকানো;
        Update: Partial<ব্যবহারকারীসারি>;
        Relationships: [];
      };
      products: {
        Row: পণ্যসারি;
        Insert: পণ্যঢোকানো;
        Update: Partial<পণ্যসারি>;
        Relationships: [];
      };
      chats: {
        Row: চ্যাটসারি;
        Insert: চ্যাটঢোকানো;
        Update: Partial<চ্যাটসারি>;
        Relationships: [];
      };
      messages: {
        Row: বার্তাসারি;
        Insert: বার্তাঢোকানো;
        Update: Partial<বার্তাসারি>;
        Relationships: [];
      };
      reports: {
        Row: রিপোর্টসারি;
        Insert: রিপোর্টঢোকানো;
        Update: Partial<রিপোর্টসারি>;
        Relationships: [];
      };
      blocks: {
        Row: ব্লকসারি;
        Insert: ব্লকঢোকানো;
        Update: Partial<ব্লকসারি>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Supabase = SupabaseClient<Database>;

// প্রথম ডাকের আগে ক্লায়েন্ট তৈরি হয় না — মডিউল লোড হলেই সংযোগ নয়।
let ক্লায়েন্ট: Supabase | null = null;
let চেষ্টাহয়েছে = false;

function পরিবেশ(): { url: string; key: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * সার্ভারের টাইপড ক্লায়েন্ট। env না থাকলে (বা প্রথমেই না পেলে) `null`।
 * ক্লায়েন্ট একবারই তৈরি হয়, তারপর ক্যাশ থাকে।
 */
export function getSupabase(): Supabase | null {
  if (ক্লায়েন্ট) return ক্লায়েন্ট;
  if (চেষ্টাহয়েছে) return null;
  চেষ্টাহয়েছে = true;
  const env = পরিবেশ();
  if (!env) return null;
  ক্লায়েন্ট = createClient<Database>(env.url, env.key);
  return ক্লায়েন্ট;
}
