#!/usr/bin/env node
// STAGE 1 (CHC-T-003) — PRD §6.7: bundle Division → Union (~5,100 rows) offline-first.
// Reads .kilo/resources/BD-Div-Dis-Zilla-Upazila-Union/bd-unions.json and generates
// src/lib/data/locations-unions.ts (division → district → upazila → unions, plus a
// district → upazila map). locations.ts keeps only district centroids (hand-maintained);
// upazila/union names have exactly one source of truth: this dataset. Villages stay
// user-entered free text.
//
// Run from apps/web:  node scripts/import-locations.mjs
// Exits non-zero if any district in locations.ts is missing from the dataset (or vice versa).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(webRoot, '..', '..');
const srcFile = join(repoRoot, '.kilo', 'resources', 'BD-Div-Dis-Zilla-Upazila-Union', 'bd-unions.json');
const locFile = join(webRoot, 'src', 'lib', 'data', 'locations.ts');
const outFile = join(webRoot, 'src', 'lib', 'data', 'locations-unions.ts');

// ডেটাসেটের বানান-ভেদ (যেমন নারায়াণগঞ্জ) → UI-তে ব্যবহৃত প্রমিত বানানে মিলিয়ে দেয়।
const নামেরঅ্যালিয়াস = { 'নারায়াণগঞ্জ': 'নারায়ণগঞ্জ' };

// Bengali sources mix precomposed (ড় U+09DC) and decomposed (ড U+09A1 + ় U+09BC) forms.
// NFKC composes them; also strip zero-width joiners and collapse whitespace.
function norm(s) {
  const n = s
    .normalize('NFKC')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Object.prototype.hasOwnProperty.call(নামেরঅ্যালিয়াস, n) ? নামেরঅ্যালিয়াস[n] : n;
}

const data = JSON.parse(readFileSync(srcFile, 'utf8'));
if (!Array.isArray(data.unions) || data.unions.length === 0) {
  console.error('❌ bd-unions.json has no unions array');
  process.exit(1);
}

// div -> district -> upazila -> Set(display union name)
const tree = new Map();
const seen = new Set();
let dupes = 0;
for (const u of data.unions) {
  const div = norm(u.division_bn);
  const dis = norm(u.district_bn);
  const upa = norm(u.upazila_bn);
  const un = norm(u.union_bn);
  const key = div + '|' + dis + '|' + upa + '|' + un;
  if (seen.has(key)) { dupes++; continue; }
  seen.add(key);
  if (!tree.has(div)) tree.set(div, new Map());
  const districts = tree.get(div);
  if (!districts.has(dis)) districts.set(dis, new Map());
  const upazilas = districts.get(dis);
  if (!upazilas.has(upa)) upazilas.set(upa, new Set());
  upazilas.get(upa).add(u.upazila_bn === upa ? u.upazila_bn : u.upazila_bn.trim());
  // store display union name
  upazilas.get(upa).unionsLike = undefined; // no-op guard for shape clarity
  const set = upazilas.get(upa);
  set.unionNames = set.unionNames || new Set();
  set.unionNames.add(u.union_bn.trim());
}

// Restructure cleanly: per upazila, keep sorted union display names.
const plain = {};
const counts = { divisions: tree.size, districts: 0, upazilas: 0, unions: seen.size };
for (const [div, districts] of tree) {
  plain[div] = {};
  for (const [dis, upazilas] of districts) {
    counts.districts++;
    plain[div][dis] = {};
    for (const [upa, holder] of upazilas) {
      counts.upazilas++;
      plain[div][dis][upa] = [...holder.unionNames].sort();
    }
  }
}

// Coverage: every district declared in locations.ts must exist in the dataset (and report the reverse).
const locText = readFileSync(locFile, 'utf8');
const distRe = /নাম:\s*'([^']+)',\s*lat:/g;
const declaredDistricts = new Set();
for (const m of locText.matchAll(distRe)) declaredDistricts.add(norm(m[1]));
const datasetDistricts = new Set();
for (const districts of tree.values()) for (const d of districts.keys()) datasetDistricts.add(d);
const missingInDataset = [...declaredDistricts].filter((d) => !datasetDistricts.has(d));
const missingInLocations = [...datasetDistricts].filter((d) => !declaredDistricts.has(d));

const header = `// GENERATED FILE — হাতে সম্পাদনা করবেন না। পুনরায় তৈরি: node scripts/import-locations.mjs
// উৎস: .kilo/resources/BD-Div-Dis-Zilla-Upazila-Union/bd-unions.json (${counts.unions} ইউনিয়ন)
// পিআরডি §৬.৭ — বিভাগ→ইউনিয়ন বান্ডিল (অফলাইন-প্রথম); গ্রাম ব্যবহারকারী-লিখিত ফ্রি টেক্সট।
// কী-গুলো NFKC-নরমালাইজড; লুকআপে অন্য ফাইলের নামও একইভাবে নরমালাইজ করা হয়।
export type ইউনিয়নগাছT = Record<string, Record<string, Record<string, string[]>>>;

export const ইউনিয়নগাছ: ইউনিয়নগাছT = `;
const body = JSON.stringify(plain, null, 1);
const suffix = `\n\n// জেলা → উপজেলা[] (একই উৎস; উপজেলার একমাত্র সত্য-উৎস)\nexport const উপজেলাগাছ: Record<string, Record<string, string[]>> = `;
const upazilaPlain = {};
for (const [div, districts] of tree) {
  upazilaPlain[div] = {};
  for (const [dis, upazilas] of districts) upazilaPlain[div][dis] = [...upazilas.keys()].sort();
}
writeFileSync(outFile, header + body + ';\n' + suffix + JSON.stringify(upazilaPlain, null, 1) + ';\n', 'utf8');

console.log('=== ইউনিয়ন/উপজেলা ইমপোর্ট রিপোর্ট ===');
console.log(`বিভাগ: ${counts.divisions}  জেলা: ${counts.districts}  উপজেলা: ${counts.upazilas}  ইউনিয়ন: ${counts.unions}  (ডুপ্লিকেট বাদ: ${dupes})`);
console.log(`locations.ts-এ ঘোষিত জেলা: ${declaredDistricts.size}`);
if (missingInDataset.length === 0 && missingInLocations.length === 0) {
  console.log('✅ জেলা মিল ১০০% — locations.ts ও ডেটাসেট একমত');
} else {
  if (missingInDataset.length) console.log(`❌ ডেটাসেটে নেই (${missingInDataset.length}): ` + missingInDataset.join(', '));
  if (missingInLocations.length) console.log(`⚠️ locations.ts-এ নেই (${missingInLocations.length}): ` + missingInLocations.join(', '));
  if (missingInDataset.length) process.exitCode = 1;
}
console.log(`লেখা হয়েছে: ${outFile}`);
