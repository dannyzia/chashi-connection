// পিআরডি §২.৭, §১৬.১ — আসল SQLite ওয়্যারিং (@capacitor-community/sqlite)।
// নেটিভ (APK) → SQLite; ওয়েব/dev → localStorage ফলব্যাক (নেটিভ গার্ড দিয়ে)।
// ব্রাইট-লাইন: এখানে কোনো লেনদেন-সংক্রান্ত টেবিল নেই — শুধু ক্যাশ+সারি (পিআরডি §২.৪)।
import { Capacitor } from '@capacitor/core';

export const DB_NAME = 'chashi';
export const SCHEMA_VERSION = 1;

const স্কিমা = `
CREATE TABLE IF NOT EXISTS cached_products (id TEXT PRIMARY KEY, data TEXT);
CREATE TABLE IF NOT EXISTS chat_cache (id TEXT PRIMARY KEY, data TEXT);
CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
`;

export function নেটিভকিনা(): boolean {
  return Capacitor.isNativePlatform();
}

type ডিবিহ্যান্ডেল = {
  execute: (sql: string) => Promise<any>;
  query: (sql: string, params?: any[]) => Promise<any>;
  run: (sql: string, params?: any[]) => Promise<any>;
};

let _ডিবি: ডিবিহ্যান্ডেল | null = null;

export async function ডিবিচালু(): Promise<ডিবিহ্যান্ডেল | null> {
  if (_ডিবি) return _ডিবি;
  if (!নেটিভকিনা()) return null;
  try {
    // ডাইনামিক ইম্পোর্ট — ওয়েব/dev-এ প্যাকেজ লোডই হবে না (APK বাজেট)
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
    const সংযোগ = new SQLiteConnection(CapacitorSQLite);
    const ডিবি = await সংযোগ.createConnection(DB_NAME, false, 'no-encryption', SCHEMA_VERSION, false);
    await ডিবি.open();
    await ডিবি.execute(স্কিমা);
    _ডিবি = ডিবি as unknown as ডিবিহ্যান্ডেল;
    return _ডিবি;
  } catch (e) {
    console.warn('SQLite চালু ব্যর্থ — localStorage ফলব্যাক', e);
    return null;
  }
}

export async function ডিবিপড়া(sql: string, params?: any[]): Promise<any[]> {
  const ডিবি = await ডিবিচালু();
  if (!ডিবি) return [];
  try {
    const ফল = await ডিবি.query(sql, params);
    return ফল?.values ?? [];
  } catch {
    return [];
  }
}

export async function ডিবিলেখা(sql: string, params?: any[]): Promise<boolean> {
  const ডিবি = await ডিবিচালু();
  if (!ডিবি) return false;
  try {
    await ডিবি.run(sql, params);
    return true;
  } catch {
    return false;
  }
}

export async function ডিবিএক্সিকিউট(sql: string): Promise<boolean> {
  const ডিবি = await ডিবিচালু();
  if (!ডিবি) return false;
  try {
    await ডিবি.execute(sql);
    return true;
  } catch {
    return false;
  }
}
