## Chashi Connection — AI Agent Guardrails (Per PRD V5.0)  
**Last Updated:** [Insert Date]  
**Status:** Non-negotiable implementation contract. Violations = automatic rejection.  

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

### ⚙️ **TECHNICAL CONSTRAINTS (PRD §13, §16)**  
- **APK size:** < 6 MB (critical for Android Go Edition).  
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

### 💡 **WHY THIS EXISTS**  
This file encodes the **immutable contract** between PRD V5.0 (strategy) and implementation. It is:  
- **Not suggestions** – violations break core product identity.  
- **Not scope** – it enforces what we *already agreed* is in/out of scope.  
- **Not technical debt** – it prevents costly rework by locking bright lines *before* code is written.  

**Remember:** Chashi Connection wins by being the *only free, local, simple connection board* for Bangladesh’s agricultural economy. Every line of code must serve that truth—or it has no place here.  

---  
*This document is derivable from PRD V5.0 §§1-16, §17.1, §18, and §19. If PRD V5.0 changes, this file updates to match.
