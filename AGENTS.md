## Chashi Connection — AI Agent Guardrails (Per PRD V5.0)  
**Last Updated:** 2026-10-23  
**Status:** Non-negotiable implementation contract. Violations = automatic rejection.  

### ⛔ **MANDATORY BOOT SEQUENCE — READ FIRST (ALL AGENTS, NO EXCEPTIONS)**
Every agent session (orchestrator, builder, planner, auditor, tester, or any coding agent) MUST complete this sequence BEFORE reading or writing any other project file:
1. **Read this file (`AGENTS.md`)** — the implementation contract. Its hard rules override every other instruction.
2. **Read `ORCHESTRATOR.md`** (project root) — the standing operating instructions for the Orchestrator role and the workflow all agent work flows through (task briefs, task reports, gates, ledgers under `docs/orchestration/`). This is required reading for EVERY session type, not just orchestration sessions.
3. **Load your role skill from `.agents/skills/`** (mandatory, project-versioned — always use these local copies, never a global skill of the same name):
   - Orchestrating / instructing / verifying session → `.agents/skills/rhizome-orchestrator/SKILL.md` (and its `references/AGENTS-md-template.md` when editing the `## Orchestrator Protocol` section below).
   - Building / writing code, config, or docs session → `.agents/skills/rhizome-builder/SKILL.md`.
   - If your role changes mid-session, stop and load the other role's skill before continuing.
4. Only then proceed with assigned work. **Work performed without this boot sequence is rejected on review, regardless of quality.**

### 🔑 **CORE IDENTITY (PRD §1.1, §2.4)**  
- **You are building a *digital haat bulletin board*—NOT a marketplace, e-commerce platform, or transaction mediator.**  
- **Bright lines (NEVER implement):**  
  - Cart, Checkout, "My Orders", Payment Gateway, Escrow, Refund/Return, Invoice/Receipt, Seller Payout, Platform Fee, Commission.  
  - Any UI/flow implying the platform holds money, mediates transactions, or guarantees delivery (e.g., "Payment Verified", "Goods Handover Confirmation", Order State Machines).  
- **Mental model:** *Chashi Connection connects buyers/sellers; they settle deals offline. We never see money, never track transactions, never facilitate payments.*  

### 🌍 **LOCALITY-FIRST NON-NEGOTIABLES (PRD §6, §9)**  
- **Discovery feed MUST sort by distance bands FIRST:**  
  - Band 1 (0-5 km) → Band 2 (5-10 km) → Band 3 (10-25 km) → etc.  
  - **Boost/recency ONLY reorder *within* a band.** A boosted listing at 24 km **NEVER** appears above a non-boosted listing at 4 km.  
- **Location precision:**  
  - User’s `location_id` = **village-level** (homestead where they sleep nightly)—*never* farmland village.  
  - Listing’s `pickup_location_id` defaults to user’s village; editable but rarely changed.  
- **UI enforcement:**  
  - Home feed shows distance as approximations (`"প্রায় ৩ কিমি দূরে"`), never exact numbers.  
  - Skipped-photo listings display `🚫 NO PHOTO` badge and are **excluded from top-3 feed positions** (PRD §8.2).  

### 📱 **MVP SCOPE & UX RULES (PRD §5, §8, §10, §11, §15, §17)**  
- **Signup flow (PRD §5.3):**  
  - Mobile OTP → Name → Label Dropdown (13 options + "অন্যান্য") → Address (Division→District→Upazila→Union→Village + Optional Detail).  
  - **NO financial ID fields** (bKash/bank/NID) at signup. NID verification is *optional, post-signup*.  
- **Listing creation (PRD §8.2):**  
  - Default path: **Photo (or skip) → Title/Price/Quantity → Post** (≤5 taps).  
  - AI assist (`"[স্ক্যান করুন]"`) is **optional helper only**—never default.  
  - Price/quantity screen:  
    - Unit dropdown: Default `কেজি` → `Sack` → `মণ` → `PCS` (**no leading space in "Sack"**).  
    - Collapsible `"[আরো তথ্য দিন]"` for optional fields (description, negotiable toggle, pickup location).  
- **Chat thread (PRD §10.2):**  
  - **ZERO VOICE NOTES** (text/image/location-only; no voice icon in UI).  
  - Quick-replies: `"কত?"`, `"কোথায়?"`, `"কবে?"`, `"ঠিক আছে"` (tap-to-send predefined text).  
  - Rating prompt **ONLY** after:  
    (a) ≥2 hours of chat inactivity **AND**  
    (b) Explicit user tap on `"চ্যাট শেষ"` → then shows `"বিক্রয়/ক্রয় শেষ হয়েছে? rating দিন"`.  
  - WhatsApp continuation button appears **ONLY** if counterparty has saved WhatsApp number (opt-in via Profile → Settings).  
- **Wishlist (PRD §11.2):**  
  - Public "I want X" posts. UI identical to listing creation but with fields:  
    - Product Name, Needed By (date), From/To (village-level location), Budget (optional), Details.  
  - **NO bidding, NO fulfillment tracking, NO "Book" button.**  
- **Notifications (PRD §15.3, §15.4):**  
  - **Bengali-only text.** Never notify about payment-related events (we don’t process payments).  
  - New Posts/Chat Messages toggles are **ALWAYS ON** (non-removable per PRD §15.4).  
  - Marketing toggle defaults to **OFF**.  
- **Trust & Safety (PRD §12):**  
  - Report button on every listing/profile/chat message.  
  - Reporting categories include (exact PRD wording):  
    - Fake Listing/Scam → Hide after **2 reports** + admin review  
    - Spam → Hide after **3 reports**  
    - Abusive Language in Chat → Hide message + warn user  
    - Political/Religious Incitement → Hide after **2 reports** + admin review *(auto-flag if text contains [Bangladesh Election Commission party names] + [Hindu/Muslim/Buddhist/Christian] + [বিরোধী/নফর্ট])*  
    - Predatory Lending → Auto-flag if chat has `[Interest rate >1%/day]` OR [`'pay later'` + seed/fertilizer/feed] → Hide after **1 report** + admin review  
    - Advance-Payment Fraud (Transport) → Auto-flag if transport listing + chat contains bKash/Nagad screenshot **before** chat marked complete → Show mandatory UX warning  
    - Women’s Safety → Optional “Meet at police station” toggle (§10.2) → Auto-suggest nearest thana from location hierarchy when arranging meetup  

### 🔐 **LOCKED TECH STACK (PRD §13 — BINDING ON EVERY AGENT)**
**Everyone working on this project follows and maintains exactly this stack. Adding, swapping, or layering any framework, state/UI/date/utility library, or npm dependency is an OWNER DECISION (CHC-D-008) — never an implementer choice.**
- **Frontend:** SvelteKit (Svelte 5 Runes) + `@sveltejs/adapter-static` (SPA, `ssr=false`) + TypeScript + Vite.
- **Native:** Capacitor (Android-first) + `@capacitor/camera` + `@capacitor-community/sqlite` + `@capacitor/push-notifications`.
- **Backend (when built):** Supabase only — Postgres, Auth (phone OTP), Storage, Realtime, Edge Functions. **No Firebase except FCM** (push only) — Supabase Edge Functions + FCM HTTP v1 (push).
<!-- CHC-D-049: `@capacitor/push-notifications` + the `send-fcm` Edge Function (FCM HTTP v1) are ratified stack; T-040 recorded them here. -->
- **AI (when built):** Google ML Kit (on-device) + Gemini 1.5 Flash (cloud) only.
- **Ops (when built):** Cloudflare CDN, PostHog (self-hosted), Sentry, GitHub Actions.
- **Styling:** plain CSS (`app.css` + component `<style>`); no CSS frameworks, no icon fonts (byte budget).
- **Strings:** all user-facing text centralized in `src/lib/bn.ts`; Bengali identifier convention continues.

### ⚙️ **TECHNICAL CONSTRAINTS (PRD §13, §16)**  
- **App size (owner rulings CHC-D-008, CHC-D-010): 6 MB absolute hard cap (PRD §13). Measured release APK ≈ 3.5 MB per ABI (arm64 3,731,526 B / armeabi 3,368,864 B). The ≤1 MB stretch target is RETIRED — ruled infeasible with the locked Capacitor stack (CHC-D-009).**  
  - Every STEP/STAGE REPORT must state total web-asset bytes and APK/ABB bytes per ABI.  
  - Any change growing the bundle must state its byte delta; unexplained growth = REJECT.  
- **Performance:**  
  - Cold start to home feed: < 3s on 2G  
  - Home feed scroll: 60fps sustained  
  - Virtualized lists: **5–6 DOM nodes max**  
- **Offline-first (PRD §16.1):**  
  - ✅ Works offline: Browse cached locality feed, view listing details, create/edit draft listings (queued), send chat messages (queued), view location hierarchy (Division→Union bundled; villages cached after first view).  
  - ❌ **Never works offline:** Cross-Bangladesh search, AI description generation, payment proof posting, Boost purchases.  
- **Fonts:** Bengali-only (Noto Sans Bengali/Hind Siliguri WOFF2 bundled in APK).  
- **No web/marketplace features:** Mobile-only (Android-first); marketplace has **no web version** (admin panel is web/SvelteKit, but user-facing app is mobile-only).  

### 🚫 **VALIDATION CHECKLIST (RUN PRE-COMMIT)**  
If **ANY** check fails → **DO NOT MERGE. FIX FIRST.**  
1. **Bright Line Scan:**  
   ```bash
   git diff --staged | grep -i -E "cart|checkout|order|payment|escrow|refund|invoice|payout|fee|commission" && echo "BRIGHT LINE VIOLATION DETECTED" || echo "OK"
   ```  
   → If output shows matches, **REJECT**.  
2. **Locality-First Scan:**  
   Verify home feed sort logic groups by distance bands (0-5km, 5-10km, etc.) *before* applying recency/boost.  
   → If boost ever overrides band priority (e.g., boosted 24km shown above non-boosted 4km), **REJECT**.  
3. **Bengali-Only Scan:**  
   ```bash
   find . -type f -name "*.js" -o -name "*.ts" -o -name "*.svelte" | xargs grep -L "[^\u0980-\u09FF]" | grep -v node_modules | head -n 5
   ```  
   → If any file contains non-Bengali user-facing text (buttons, labels, placeholders, errors), **REJECT**.  
4. **MVP Scope Scan:**  
   - Confirm all [In Scope] items from PRD §17.1 are present.  
   - Confirm all [Out of Scope] items (e.g., payment verification, order state machine, RFQ bidding) are **absent**.  
   → Missing in-scope or present out-of-scope → **REJECT**.  

## Orchestrator Protocol (Chashi Connection)

> **Activation:** active while a Rhizome hub issue titled `ORCHESTRATOR LOOP` is open for this repo.
> **Hub state: NOT YET BOOTSTRAPPED.** Until the orchestrator creates it (procedure: `.agents/skills/rhizome-orchestrator/SKILL.md` §3) and records its ID on the `Hub:` line below, the Rhizome loop is inactive: work single-agent / Zia-relay per `ORCHESTRATOR.md`, with the role skills still governing report and verification discipline.

Roles: **orchestrator** (instructs, answers, verifies — skill: `rhizome-orchestrator`)
and **builder** (builds, reports, asks — skill: `rhizome-builder`). Load your skill
at session start (see ⛔ Mandatory Boot Sequence above).

- Hub: `<pending — orchestrator records the ORCHESTRATOR LOOP issue ID here on bootstrap>`. All loop coordination is comments there.
- Builder tags: `STEP <n>:` after every build step (even small), `STAGE REPORT:`
  at stage end, `QUESTION:` for clarifications and follow-ups.
- Orchestrator tags: stage orders, `ANSWER:`, `OWNER-DECISION:`, `VERIFIED:`.
- The builder never contacts the owner; business/risk/money/irreversible items
  route through the orchestrator (pre-bootstrap: via `ORCHESTRATOR.md` briefs relayed by the owner).
- Both roles check Rhizome intermittently; silence never means approval.
- Verification rule: a stage advances only after three-pillar verification
  (repo, CI on the exact head SHA, and live surface). This project's live-surface
  definition: **no deployed backend at MVP** — verification reduces to build-output
  checks: `npm run build` succeeds in `apps/web`, `node scripts/validate.mjs` prints
  `ALL CHECKS PASSED`, and total web assets (and any produced APK, via
  `check_apk.py`) stay under 6 MB.
- Project standing rules (non-negotiable): all 🔑 Core Identity bright lines above;
  locality-first band sort; Bengali-only user-facing text; no secrets in the repo
  (`android/keystore.properties`, `android/local.properties`, `*.keystore` stay
  gitignored — reference secrets by manager name, never in chat); branch per task
  `task/<TASK-ID>`, commit format `type(scope): subject` + `Refs: <TASK-ID>`;
  never edit an applied DB migration or already-deployed artifact.

### 💡 **WHY THIS EXISTS**  
This file encodes the **immutable contract** between PRD V5.0 (strategy) and implementation. It is:  
- **Not suggestions** – violations break core product identity.  
- **Not scope** – it enforces what we *already agreed* is in/out of scope.  
- **Not technical debt** – it prevents costly rework by locking bright lines *before* code is written.  

**Remember:** Chashi Connection wins by being the *only free, local, simple connection board* for Bangladesh’s agricultural economy. Every line of code must serve that truth—or it has no place here.  

---  
*This document is derivable from PRD V5.0 §§1-16, §17.1, §18, and §19. If PRD V5.0 changes, this file updates to match.
