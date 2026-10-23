# CHC — Project Status Report (archived)

**Date:** 2026-10-23 · **Author:** Orchestrator session (pre-brief phase) · **Status:** Point-in-time audit; superseded only by newer evidence in this directory
**Scope:** `.kilo/plans/plan/*` (plan docs) vs. full codebase (`apps/web`) · **Evidence:** direct source reads, git history/diff, knowledge-graph index (3,703 nodes / 3,896 edges)

---

## 1. Executive Summary

The project is a **working local-only prototype of the V5 PRD** — a Bengali-language, offline-first "digital haat bulletin board" app built with SvelteKit 5 + Capacitor. All 7 planned UI screens exist, the non-negotiable guardrails (bright lines, locality-first banding, Bengali-only, no-photo demotion) are genuinely implemented and even enforced by a validation script. However, **the entire backend layer (Supabase, auth/OTP, server data, chat sync, push, admin panel) does not exist yet**, the app runs on seed data and localStorage, and the village-level location granularity that the PRD calls "the single most important field" is only approximated (district centroids + free-text village). **Roughly: UI/logic layer ≈ 70% of MVP scope at demo quality; backend/infra ≈ 0%; overall MVP ≈ 25–35%.**

---

## 2. The Plan Documents (`.kilo/plans/plan/`)

| File | Size | Role | Status |
|---|---|---|---|
| **PRD-V5.0.md** | 1,443 lines | Authoritative strategy: "Everyone is a seller, everyone is a buyer." Bulletin board, never a marketplace. Bright lines (no cart/orders/payments/escrow/commission), village-level locality-first discovery with 6 distance bands, 13 signup labels, Wishlist (replaces RFQ), chat as centerpiece (no voice notes, WhatsApp opt-in), rating gated by "চ্যাট শেষ" + 2h inactivity, APK < 6 MB, locked stack (SvelteKit 5 + Capacitor + Supabase + ML Kit/Gemini + FCM) | ✅ Complete, internally consistent; has §17.1 MVP checklist and §19 "what to keep/strip from V3" index |
| **PRD-V3.md** | 8,920 lines | Legacy deep technical architecture (actually titled "HaatBazar V4") with orders/payments/disputes — kept **only** as reference for sections V5 marks "✅ Keep". Its transactional sections are explicitly forbidden | ⚠️ Reference only — a documented trap for engineers; V5 §13 guardrail box addresses this |
| **UI and UX.md** | 199 lines | 7-screen visual spec derived from V5 | ✅ Complete; contains garbled mixed-script artifacts ("রাheem আহমেদ", "মোurf", "kde তেন?") but intent is clear and was followed |
| write_prd.py | script | Doc-generation utility | Ancillary |

**Plus the implementation contract:** `AGENTS.md` (root) locks the same rules as a pre-merge checklist: bright-line grep, locality-first sort check, Bengali-only scan, MVP scope scan.

---

## 3. What the Codebase Actually Contains

Single app at `apps/web` (SvelteKit 2 + Svelte 5 runes, `adapter-static` with SPA fallback, `ssr = false`), Capacitor Android project, and guardrail tooling. Notably, **the entire codebase is written with Bengali identifiers** (functions like `ফিডব্যান্ডেভাগ`, `সারিতেযোগ`), with user-facing strings centralized in `bn.ts`.

### 3.1 Screens (all 7 planned screens exist)

| Screen | Route | What works | Stub/demo-only |
|---|---|---|---|
| Home feed | `/` | Distance **bands** with headers, category chips, search, offline banner, NO PHOTO badge, approximate distance ("প্রায় X কিমি দূরে"), verified ✓, wishlist badge, block filtering, 6 nodes per band (`slice(0, 6)`) | Band titles hardcoded; search is title-substring only (no FTS) |
| Signup | `/signup` | 5 steps (mobile → OTP → name → label → address) matching PRD §5.3; BD phone regex `01[3-9]\d{8}`; **no financial fields**; union/village as free text | OTP accepts any 4 digits (no Supabase auth); user lat/lng = **district centroid** |
| Post | `/post` | Sell/Wishlist toggle, Capacitor Camera capture → 256px JPEG thumbnail, units (কেজি/Sack/মণ/PCS), collapsible "আরো তথ্য দিন", offline queue entry | `[স্ক্যান করুন]` AI assist not implemented; wishlist lacks category/needed-by fields in feed model |
| Listing detail | `/listing/[id]` | Full detail view + action bar (message opens chat, report modal with all PRD §12.4 categories) | Call / Share are `alert()` stubs; **reports are not persisted** (alert only) |
| Chat list + thread | `/chat`, `/chat/[id]` | Threads, the exact 4 quick-replies (কত?/কোথায়?/কবে?/ঠিক আছে), "চ্যাট শেষ" → rating prompt (1–5★), WhatsApp continue (only if number saved), **no voice notes** ✓ | Photo/location send = alert stub; text-only in practice |
| Profile | `/profile` | Name edit, label change, NID (demo), WhatsApp number, notification toggles (new posts/chat locked ON, marketing default OFF ✓), block list, women's-safety toggle, logout | NID verify is a demo stub; **label change never writes back to the user object**; no ratings shown |

### 3.2 Logic library (the PRD's core rules, in code)

- `logic/feed.ts` — **band-first grouping** (Band 1 never below Band 2), newest-first inside a band, **no-photo listings excluded from top-3** of a band, boost documented as future *in-band-only* tiebreaker. This is the AGENTS.md "Locality-First Scan" requirement, genuinely implemented.
- `logic/dist.ts` — haversine + band limits `[5, 10, 25, 50, 100]` + approximate-km rounding.
- `logic/safety.ts` — report categories with PRD hide thresholds (scam=2, spam=3, incitement=2, usury=1, advance-fraud=1) + three auto-flag detectors (political/religious incitement, >1%/day lending, transport bKash/Nagad before chat-complete). **Defined but never called anywhere.**
- `lib/offline/sqlite-wrapper.ts` + `src/offline/schema.sql` — native SQLite (dynamic import to protect APK budget) with `cached_products / chat_cache / sync_queue / kv` tables, and an explicit bright-line comment that no transaction tables exist. **The wrapper is never imported by `app-state` — the app actually persists everything to `localStorage`.**
- `data/locations.ts` — 8 divisions, 64 districts, 494 upazilas in Bengali with district centroids; union/village = free-text (uncommitted rewrite; previously a 2-district demo tree with full village dropdowns).
- `data/labels.ts` (13 labels + 11 categories), `data/units.ts`, `data/seed.ts` (8 sample posts around a fictional village).

### 3.3 Guardrail tooling

- `scripts/validate.mjs` — bright-line word scan, locality-first scan (checks `ফিডব্যান্ডেভাগ`), MVP-scope scan. **Bengali-only scan is a stub that always passes.**
- `verify_final.py` / `check_apk.py` — build size (<6 MB budget), SQLite schema, font, virtualized list, Capacitor plugin checks.
- `static/fonts/` — subset Noto Sans Bengali WOFF2 + subsetting script; `app.html` has `lang="bn"` ✓.

### 3.4 Android

Full Capacitor project (gradle wrapper, `MainActivity`, `com.chashi.connection`, splash/icons, keystore files present but gitignored). `capacitor.config.json` declares Camera/Geolocation/Storage/Network plugins — **only `@capacitor/camera` and `@capacitor-community/sqlite` are actually installed**. No APK has been built (no output APK found).

---

## 4. MVP Scorecard vs. PRD §17.1

| MVP item | Status | Notes |
|---|---|---|
| Signup OTP → name → label → address | 🟡 Demo | Flow + fields ✓; OTP fake, no server |
| Full location hierarchy (→ village) | 🟡 Partial | Division→Upazila real (494); **Union/Village free-text**, user coords = district centroid → **distance bands currently operate at district granularity**, contradicting PRD §6's "village-level precision is the single most important field" |
| Simple listing flow (5 taps) | 🟢 Mostly | Photo → title/price/qty → post works offline with camera + queue |
| Transport listings | 🟢 Basic | Same flow via category; no vehicle-type/capacity/from-to/available-date template fields (PRD §7.3) |
| Wishlist | 🟡 Basic | Public "I want X" posts exist in feed; no dedicated tab/filters (PRD §11.2), no crawlable web pages (impossible with `ssr=false` SPA) |
| AI assist (scan) | ❌ | Not started (string exists in `bn.ts` only) |
| Locality-first feed | 🟢 | Band logic faithful to PRD §9.2 |
| Bengali FTS + filters | 🟡 | Substring search only; price/date/verified/photos filters absent |
| Chat | 🟡 Demo | Local-only; quick-replies ✓, no voice ✓; no realtime, no server |
| Rating | 🟡 Partial | Gated by "চ্যাট শেষ" ✓ but **2-hour inactivity rule not implemented** (PRD calls auto/instant rating corrupting) |
| Reporting | 🟡 Partial | UI + categories ✓; nothing persisted, hide-thresholds & auto-flags unused |
| Blocking | 🟡 Demo | Local list; filters by **seller name**, not user ID |
| Push notifications | ❌ | No FCM, no notification engine |
| Offline drafts + cached feed | 🟢 (local) | Queue + persistence work, but queue "flush" just clears it (nothing to sync to) |
| Admin panel | ❌ | Nothing exists |
| Bengali-only UI | 🟢 | Verified across all routes/lib |
| NID verification badge | 🟡 Demo | Profile stub; no checksum/face-match logic from PRD §12.3 |
| **Backend (Supabase) entirely** | ❌ | No client, no schema, no RLS, no storage, no edge functions |
| Tests / CI-CD / lint | ❌ | Zero test files; no GitHub Actions |

---

## 5. Guardrail Compliance (AGENTS.md contract)

| Check | Verdict |
|---|---|
| **Bright lines** (no cart/checkout/order/payment/escrow/commission/… in code) | ✅ **PASS** — none present in source; enforced by `validate.mjs`; SQLite schema has no transaction tables |
| **Locality-first sort** (bands before recency/boost) | ✅ **PASS** — `ফিডব্যান্ডেভাগ` groups by band first; boost absent entirely |
| **Bengali-only user-facing text** | ✅ effectively (all UI text from `bn.ts`); ⚠️ the automated scan is a no-op stub |
| **MVP scope** (out-of-scope absent) | ✅ **PASS** — no RFQ/bidding/orders/payments/GPS-tracking code |
| No-photo top-3 exclusion | ✅ Implemented per band |
| Approximate distances only | ✅ |
| Notification toggles (2 locked ON, marketing OFF) | ✅ |
| Quick-replies exact set / no voice icon | ✅ |
| APK < 6 MB | 🟡 Web assets built & sized; **no APK produced yet** |
| Village-level `location_id` | ❌ District centroid compromise |

---

## 6. Key Risks & Code-Level Issues

1. **No backend at all** — the biggest gap. Chat, OTP, feed, ratings, reports are all local artifacts of one device.
2. **SQLite wrapper is dead code** — `app-state.svelte.ts` says "SQLite in production" but uses `localStorage`; base64 image thumbnails in localStorage will hit quota fast on device.
3. **Location granularity mismatch** — the PRD's core differentiator (village-level discovery) is approximated by district centroids; the raw union/village datasets are already staged in `.kilo/resources/BD-Div-Dis-Zilla-Upazila-Union/` (bd-unions.json 1.4 MB, per-division JSONs) but **not yet imported**.
4. **Dependency mismatch** — `@capacitor/android ^8.5.2` (Cap 8) vs `@capacitor/camera ^7` and `@capacitor-community/sqlite ^7` (Cap 7 era) — likely runtime/build incompatibility to resolve before the first APK build.
5. **Safety logic unused** — `উসকানিপতাকা`, `সুদখোরিপতাকা`, `অগ্রিমপ্রতারণাপতাকা` and hide-thresholds exist but are wired to nothing.
6. **Identity bugs** — chat threads keyed by *listing id* as counterpart id; block list matches seller *names*; profile label select never saves.
7. **Rating rule incomplete** — missing the ≥2-hour inactivity gate PRD §10.2 mandates.
8. **Duplicated/typo'd distance code** — haversine duplicated in `dist.ts` and `feed.ts`; `ব্যান্সংখ্যা` typo in `dist.ts`; `feed.ts` re-implements banding locally instead of importing.
9. **Repo hygiene** — 3 commits total; large uncommitted rewrite (locations.ts + signup; ~100k lines of raw JSON zips deleted from git; new resources dir untracked; `kilo.json` staged deletion). The last web `build/` (24 Sep) is **stale** relative to these uncommitted changes.
10. **Wishlist SEO** (PRD §18.11's "single biggest growth lever") is architecturally impossible in the current client-rendered SPA — needs an SSR surface or prerendered pages later.

---

## 7. Recommended Next Steps (priority order)

1. **Land the uncommitted location/signup work**, then import unions/villages from the staged datasets (bundle Division→Union per PRD §6.7; villages on-demand or free-text) so distance bands reflect village centroids — this is the product's spine.
2. **Stand up Supabase**: phone-OTP auth, `users/products/wishlists/chats/reports/blocks` schema (per V5 §19, *without* orders/payments), RLS, storage; wire the existing sync queue to a real flush.
3. **Replace localStorage with the already-written SQLite wrapper** (one import away) and move thumbnails to blob/filesystem storage.
4. Persist reports and call the three auto-flag detectors; add block-by-user-id; fix chat counterpart ids; implement the 2h rating gate.
5. Build the release APK, resolve the Capacitor 7/8 mismatch, and make `validate.mjs`'s Bengali scan real before Play Store sizing.
6. Then: push notifications (FCM), admin panel, AI scan assist, wishlist tab + SSR crawlable pages.

**Bottom line:** the project has a faithful, guardrail-compliant front-end skeleton and a very clear contract (V5 + AGENTS.md) — but it is still a client-side demo. Every network-dependent promise of the PRD (OTP, real feed, chat delivery, notifications, moderation) awaits the backend phase.
