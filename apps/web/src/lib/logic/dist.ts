// পিআরডি §৬.৮, §৯.২ — দূরত্ব ও ব্যান্ড।
export interface স্থানাঙ্ক { lat: number; lng: number; }

export function দূরত্বকিমি(a: স্থানাঙ্ক, b: স্থানাঙ্ক): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ব্যান্ড সীমা: ০-৫ → ৫-১০ → ১০-২৫ → ২৫-৫০ → ৫০-১০০ → ১০০+
export const ব্যান্ডসীমা = [5, 10, 25, 50, 100];

export function ব্যান্সংখ্যা(কিমি: number): number {
  for (let i = 0; i < ব্যান্ডসীমা.length; i++) {
    if (কিমি < ব্যান্ডসীমা[i]) return i + 1;
  }
  return ব্যান্ডসীমা.length + 1;
}

// UI-তে সবসময় আনুমানিক দূরত্ব দেখান (পিআরডি §৬.৯)
export function আনুমানিককিমি(কিমি: number): number {
  if (কিমি < 2) return Math.max(1, Math.round(কিমি));
  if (কিমি < 10) return Math.round(কিমি);
  return Math.round(কিমি / 5) * 5;
}
