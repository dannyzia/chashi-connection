// পিআরডি §৮.২ — একক: ডিফল্ট কেজি → Sack → মণ → PCS (কোনো আগের স্পেস নেই)।
export const এককতালিকা = ['কেজি', 'Sack', 'মণ', 'PCS'] as const;
export type একক = (typeof এককতালিকা)[number];
export const ডিফল্টএকক: একক = 'কেজি';
