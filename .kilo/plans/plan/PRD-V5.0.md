# Product Requirements Document (PRD)

**Chashi Connection (চাষী কানেকশন) — Agricultural Marketplace Platform**
**Mobile Application (Android-first, iOS-when-funded)**
**Version 5.0 — "Everyone is a Seller, Everyone is a Buyer" (Strategic Reframe)**
**Prepared by: Product Lead (with V3 architecture as deep technical reference)**
**Target Audience: Engineering, Design, Data, GTM, Investors**
**Classification: Internal — Strategic + Product**

---

## Document Map

| File | Purpose | When to read |
|------|---------|--------------|
| **PRD.md (this file, V5)** | Strategy, user model, UX, scope, open questions | Product/design/leadership review; investor deck |
| PRD-V3.md | Deep technical architecture (schema, APIs, state machines, security, AI pipeline, deployment) | Engineering implementation; security review |

> **V5 does not duplicate V3's technical depth.** Where V3 already nails the engineering — Supabase schema, Edge Functions, payment OCR, fraud graphs, SvelteKit+Capacitor stack, Bengali UI catalog — V5 points at it instead of re-writing it. V5's job is to lock in the **what and why** that V3 got subtly wrong.

---

## Table of Contents

1. [Executive Summary & V5 Changelog](#1-executive-summary--v5-changelog)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [The Reframing: One User, Many Hats](#3-the-reframing-one-user-many-hats)
4. [User Model — Contextual Roles, Not Account Types](#4-user-model--contextual-roles-not-account-types)
5. [Signup — Type Label for Discovery, Not for Routing](#5-signup--type-label-for-discovery-not-for-routing)
6. [Location — From Division Down to Home Address](#6-location--from-division-down-to-home-address)
7. [Product Scope — The Whole Agricultural Economy](#7-product-scope--the-whole-agricultural-economy)
8. [The Listing Flow — Simpler Than Simple](#8-the-listing-flow--simpler-than-simple)
9. [Discovery & Search — Locality-First](#9-discovery--search--locality-first)
10. [Buying Flow — Pay to the Person, Not the Platform](#10-buying-flow--pay-to-the-person-not-the-platform)
11. [Transport & Logistics — Pickup, Truck, Covered Van](#11-transport--logistics--pickup-truck-covered-van)
12. [Trust, Safety & Fraud](#12-trust-safety--fraud)
13. [Tech Stack — Locked](#13-tech-stack--locked)
14. [Zero Commission Policy](#14-zero-commission-policy)
15. [Notifications & Chat (Bengali-only)](#15-notifications--chat-bengali-only)
16. [Offline-First & Performance Budget](#16-offline-first--performance-budget)
17. [MVP Scope — What's In, What's Out](#17-mvp-scope--whats-in-whats-out)
18. [Open Questions](#18-open-questions)
19. [Reference Index — Where V3 Has the Details](#19-reference-index--where-v3-has-the-details)

---

## 1. Executive Summary & V5 Changelog

### 1.1 One-paragraph version

Chashi Connection is a free, mobile-first **digital haat bulletin board** for everyone in Bangladesh's agricultural economy — crop farmers, fish farmers, poultry farmers, livestock farmers, seed sellers, pesticide sellers, feed sellers, fertilizer sellers, medicine sellers, equipment sellers, traders, and transporters (pickup, truck, covered van). It is **not** an e-commerce platform. The platform **never touches money, never verifies payments, never mediates a transaction**. Buyers and sellers find each other, chat, meet in person, and settle the deal themselves. Chashi Connection charges **zero commission**, **no listing fee**, **no transaction fee**, **no payment fee**, **nothing, ever**. There is **one account type**; the same person can post what they have and post what they want. The entire experience — every label, every notification, every error — is in **Bengali**. The product exists because these sellers are currently invisible: they post on Facebook, sell at weekly haats, or rely on middlemen. Chashi Connection gives them a free listing, a free storefront, and a way to be found by people in their own upazila.

**Mental model:** Think Bikroy / OLX / Craigslist, not Daraz / Amazon. We are a **classifieds board**, not a marketplace. The moment the platform holds money, mediates a sale, or runs an order state machine, we've become something we should never be.

### 1.2 V5 Changelog — what changed since V3

| # | Area | V3 stance | V5 reframing |
|---|------|-----------|--------------|
| 1 | **User model** | "One user type, contextual Seller/Buyer/Transporter per transaction" (Section 1.3, correctly stated) — but the rest of the document still treats them as distinct flows (separate permission rows, separate onboarding, separate fraud vectors) | **One user type, end to end.** No separate farmer flow, no separate buyer flow, no separate transporter flow. The contextual role is a **label on a transaction**, never on the account. |
| 2 | **Signup** | V3 onboarding wizard collects profile + 3 financial identifiers + location for everyone | V5 adds a **type label** (Farmer / Fertilizer seller / Trader / etc.) at signup, **purely for DB filtering and discovery**. No flow branching — same screens, same fields, same next step for every label. |
| 3 | **Location granularity** | Division → District → Upazila (~567 reference rows). Optional `pickup_address_detail` text | **Village-level precision.** New hierarchy: Division → District → Upazila → **Union → Village**. Plus free-text home/landmark address. This is the **single most important field** for locality-based discovery. |
| 4 | **Product scope** | "Farmers" in the abstract; crop-focused data model (harvest_date, expiry_date) | **Whole agricultural economy.** Sub-categories for fish, poultry, livestock, equipment, services. Product data model stays generic (`category_id` + JSONB metadata per category). |
| 5 | **Discovery** | Algorithmic feed with boost scoring | **Locality-first feed by default.** "Show me what's for sale within X km of my village" beats "Show me what's most boosted in the country" for 90% of real use cases. Boost is a tiebreaker, not the spine. |
| 6 | **Listing UX** | Multi-step wizard with AI auto-fill (Sections 4.5, 4.9.4) | **Simpler than simple.** Single screen with photo + price + quantity + location. AI auto-fill becomes optional, not the default. The default path: take a photo, type a price, type a quantity, hit Post. Done. |
| 7 | **Naming of the product** | "Chashi Connection — Agricultural Marketplace" | Tagline: **"চাষী কানেকশন — কৃষকের নিজস্ব বাজার"** (Chashi Connection — farmers' own marketplace). The brand carries the identity ("চাষী" = farmer), so the tagline emphasizes ownership ("of the agricultural economy, not for it"). |

### 1.3 What V5 does NOT change

The architecture decisions in V3 were sound. V5 keeps them as-is:

- **Tech stack:** SvelteKit (Svelte 5 Runes) + Capacitor + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).
- **Zero commission.**
- **Bengali-only UI**, Bengali-native AI prompts.
- **Manual payment verification** (bKash screenshot + Transaction ID) — no gateway dependency at MVP.
- **On-device AI** (Google ML Kit) for camera-first product entry, on-device OCR for payment screenshots.
- **One user type** — confirmed and amplified.
- **Target devices:** Android 11+ Go Edition, 1GB RAM, 2G/3G networks. APK < 6MB.
- **Fraud system** (3 financial identifiers + Transaction ID reuse + nightly batch) — unchanged.

---

## 2. The Problem We're Solving

### 2.1 Today's reality

Bangladesh's agricultural economy is enormous — roughly **15 million farms** plus tens of thousands of agri-input sellers, traders, and transporters. The vast majority have **no digital storefront**. What they have today:

| What they use | Why it fails them |
|---|---|
| **Weekly haats (বাজার)** | Only one trading day per week. Travel costs money. Buyers from outside the region can't find them. |
| **Facebook groups / Marketplace** | Free, but unstructured. No locality search. No price discovery. Spam, scams, and irrelevant posts. Posts decay in 24 hours. |
| **WhatsApp broadcasts** | One-way. No browsing. No price memory. Requires buyer to already know you exist. |
| **Middlemen (ফড়িয়া / আড়তদার)** | They take 8–15% off the top. Farmers never see the real market price. |
| **Word of mouth** | Slow. Limited to existing networks. No way to scale. |

### 2.2 What they actually need

A free place where they can:
1. **List what they have** in under 30 seconds, without typing a long description.
2. **Be found by buyers in their own locality** — not just anyone in Bangladesh.
3. **Receive payment directly** (bKash, bank) without a middleman taking a cut.
4. **Find transport** when they need to move goods somewhere.
5. **Buy the things they need** (seed, fertilizer, feed, medicine) from sellers nearby.

Notice: every item on this list is **what Chashi Connection must do**. And notice that none of them say "shop online and pay the platform." This is not Amazon. This is **the village haat, made digital**.

### 2.3 The competitive frame

We are **not** competing with Daraz, Chaldal, or Pathao. Those are city-centric, urban-delivery, commission-based models. Chashi Connection's competition is:
- **Inertia** ("we've always sold at the haat").
- **Facebook groups** ("the buyer group already exists").
- **Middlemen** ("they take care of everything").

Our wedge: **free, locality-first, super-simple to list, no commission, in Bengali, works offline.** If a farmer with a 1GB Android Go phone and 2G signal can list a sack of potatoes in 30 seconds, we win.

### 2.4 What Chashi Connection is NOT (the list that keeps us honest)

If a feature description contains any of these words, push back. Not just "we don't build it today" — **we never build it.** These are the bright line.

| NOT | Why not | Why this matters |
|-----|---------|------------------|
| Cart | We don't sell things. | Even a "save for later" cart creates an implied inventory contract; users start expecting us to know what's available. |
| Checkout | We don't process transactions. | A checkout flow is the gateway to "did the payment go through" — the moment we ask, we've become a marketplace. |
| Payment gateway | We never see money. | The instant we integrate bKash / Nagad / Stripe, we inherit KYC, refunds, chargebacks, and regulator obligations. |
| Escrow | We don't hold funds. | Escrow means we hold money → see "Payment gateway" above. |
| Order state machine | There's no order. There's a listing and a chat. | State machines (`pending → paid → shipped → delivered`) are how marketplaces create false expectations of platform liability. A user asking "where's my order?" implies we owe them one. |
| Delivery tracking | Buyer and seller meet; we don't move goods. | Tracking implies we know where goods are → implies we guarantee they'll arrive. |
| Refund / return policy | We have nothing to refund. The deal is between them. | A refund policy is an admission that we sold something. |
| Invoice / receipt | We didn't sell anything. | "Chashi Connection Invoice" would be a legal document implying we're the seller of record. |
| Seller payout | No money flows through us. | "When will I get paid?" is a marketplace question. We are not their employer. |
| Platform fee | Zero. Always. | Even a "₹5 listing fee" is friction and a step toward variable pricing. |
| Commission | Zero. Always. | The single word that, if we ever use it, marks our death as a listing board. |
| Goods handover confirmation | They hand over the goods themselves. None of our business. | The platform was not at the handover. Any "did you receive it?" button is fabricated truth. |
| Transaction history | They can keep their own. We may show "your listings" and "your chats" but not "your orders". | History implies a record of deals → implies the platform facilitated the deal → implies platform liability. |

**The rule:** if the platform ever needs to know whether a deal happened, we've already failed at being a listing board.

---

## 3. The Reframing: One User, Many Hats

> **"Everyone is a seller, everyone is a buyer."**

This is the single most important sentence in this PRD. Every other decision flows from it.

### 3.1 What it means concretely

A crop farmer in Bogura might:
- **List** 200 kg of rice for sale (Seller).
- **Buy** urea fertilizer from a dealer in the same upazila (Buyer).
- **Hire** a covered van to move rice to Dhaka (Buyer of transport).
- **List** their pickup truck for transport work on weekends (Seller of transport).
- **Sell** rice straw to a livestock farmer down the road (Seller).
- **Buy** a sack of fish feed (Buyer).

All of this is the **same account**, the same phone number, the same onboarding. The label "Seller" or "Buyer" lives on the **transaction**, not on the user.

### 3.2 Why V3 partially got it wrong

V3 (Section 1.3, Stakeholders table) correctly states the principle. But downstream, the spec slips:
- "The farmer who created this listing" appears as if **farmer** is a permanent attribute.
- Permission tables implicitly treat **Buyer** as a distinct role.
- Onboarding fields assume a "farmer identity" (harvest date on signup).
- Transporter onboarding assumes vehicle ownership from day one.

V5 strips all of that. The user model has **one row in `users`, one onboarding flow, one permission set**. The contextual labels are computed at query time from the transaction tables.

### 3.3 The mental model

| Wrong mental model (V3 drift) | Right mental model (V5) |
|---|---|
| "We have three types of users: Farmers, Buyers, Transporters." | "We have **users**. Each transaction has a seller, a buyer, and sometimes a transporter." |
| "Farmer onboarding is different from buyer onboarding." | "There is one onboarding. Users tell us what they typically list so we can show them the right things first." |
| "Farmers post products, buyers browse products." | "Users post things they want to sell. Users browse things they want to buy. The same person does both, often in the same day." |
| "A transporter is a separate kind of business." | "A user may post transport offers. They may also buy and sell agricultural products. They're not a separate kind of business — they're a user with a truck." |

---

## 4. User Model — Contextual Roles, Not Account Types

### 4.1 The `users` table

One row per human. Fields that V3 already has, kept as-is, plus the new `primary_label` field (Section 5):

| Field | Bengali Label | Notes |
|-------|---------------|-------|
| `id` | — | UUID, equals `auth.users.id` (V3 §2.3 trigger) |
| `phone` | মোবাইল নম্বর | Primary identity, unique, BTRC-format |
| `display_name` | নাম | 2–200 chars |
| `primary_label` | আপনি কী ধরনের বিক্রেতা? | Enum — see Section 5.1. **For discovery only.** |
| `phone_verified` | — | bool |
| `is_profile_complete` | — | bool |
| `is_suspended` / `is_banned` | — | admin controls |
| `location_id` | আপনার এলাকা | FK → `locations` at the **village** level (Section 6) |
| `address_detail` | বাড়ি/মোহল্লা/দোকান নম্বর | Free text, optional |
| `created_at` | — | — |

### 4.2 Permissions

There is **one permission set**. Every authenticated user with a complete profile can:

- List a product for sale (any category).
- Browse, search, and filter listings.
- Buy any listing they did not create.
- Post a transport offer (their own vehicle for hire).
- Respond to a transport RFQ (bid).
- Upload payment proof for any order they are part of.
- Chat with the counterparty on an active transaction.
- Rate the counterparty after a completed transaction.
- Boost any of their own listings (paid).

Business-logic-level rules (unchanged from V3):

- A user cannot purchase their own listing (`order.buyer_id ≠ product.listed_by_user_id`).
- A user cannot bid on their own RFQ.
- A user cannot boost another user's listing.
- A user cannot rate themselves.
- **Never implement — or even design — a per-user "listing view count."** If views are tracked at all (for internal spam fighting), they must be: (a) anonymized at the IP-hash level, (b) reset weekly, and (c) **never displayed to users**. Displaying view counts creates false scarcity signals that mimic transaction pressure ("100 views!" implies high demand, "act now or lose it"), eroding the listing-board ethos. Trust the locality + recency + boost signals — they're enough.

There is **no** "buyer-only" or "seller-only" or "transporter-only" account state.

### 4.3 What "contextual role" looks like in the schema

The same `users.id` appears in multiple FK columns across different tables, depending on the transaction:

| Table | `seller_id`? | `buyer_id`? | `transporter_id`? |
|-------|:---:|:---:|:---:|
| `orders` (product purchase) | implicit via `product.listed_by_user_id` | ✅ | assigned later |
| `transport_offers` | ✅ (vehicle owner offering transport) | — | — |
| `rfqs` (transport request) | — | ✅ (the user who needs transport) | — |
| `rfq_bids` | — | — | ✅ (the user bidding their vehicle) |
| `disputes` | context-dependent | context-dependent | context-dependent |

A user's "role" in any given screen is determined by which side of the transaction they're on, **right now**.

---

## 5. Signup — Type Label for Discovery, Not for Routing

### 5.1 The `primary_label` field

| Field | Bengali Label | Notes |
|-------|-------------|-------|
| `primary_label` | আপনি কী ধরনের বিক্রেতা? | Enum — see Section 5.1. **For discovery only.** Helper text: "এইটি শুধু আপনার Listing-কে খুঁজে পেতে সাহায্য করে" (This only helps find your listings). Selecting "অন্যান্য" reveals optional free-text `label_custom` (≤30 chars, stored alongside enum). No flow branching — same screens for all labels. |

At the very start of signup, the user picks **one** label from a predefined list. This label:

- Goes into `users.primary_label`.
- Is **purely for discovery and filtering** — "show me listings from Fertilizer sellers near me."
- **Does NOT** change the onboarding flow, the available features, the permissions, the home screen, or anything else.
- Can be changed later from Profile → "আপনার ধরন পরিবর্তন করুন".

**Predefined labels (initial list — add more as we learn):**

| Bengali Label | English gloss | Typical listings |
|---|---|---|
| কৃষক (ফসল) | Crop farmer | Rice, wheat, jute, vegetables, fruits |
| মৎস্য চাষি | Fish farmer | Rui, katla, pangash, shrimp, fish fry |
| হাঁস-মুরগি খামারি | Poultry farmer | Broiler, layer, duck, eggs, chicks |
| গবাদিপশু খামারি | Livestock farmer | Cow, goat, sheep, dairy, beef |
| বীজ বিক্রেতা | Seed seller | Vegetable seed, paddy seed, maize seed |
| সার বিক্রেতা | Fertilizer seller | Urea, TSP, DAP, organic compost |
| কীটনাশক বিক্রেতা | Pesticide seller | Insecticide, fungicide, herbicide |
| ডেইরি ও ফিড বিক্রেতা | Feed seller | Cattle feed, poultry feed, fish feed |
| ওষুধ বিক্রেতা | Medicine seller | Vet medicine, vaccine, aqua medicine |
| যন্ত্রপাতি বিক্রেতা | Equipment seller | Pump, tiller, sprayer, net, cage |
| পরিবহন সেবাদাতা | Transporter | Pickup, truck, covered van |
| ব্যবসায়ী / ট্রেডার | Trader / Bepari | Aggregator, wholesaler, retailer |
| অন্যান্য | Other | Anything not covered above |

**13 labels total. No sub-flows.** A user who picks "Crop farmer" today can list a pickup truck tomorrow — they just change the label (or don't, the system doesn't enforce).

### 5.2 Why this works

The user's concern (rightly raised): if we let users freely pick at signup, they might game it. Two responses:

1. **Gaming is harmless.** A "Fertilizer seller" who lists rice doesn't break anything — they still get found, they still get sold. The label affects default filter suggestions, not access.
2. **We can show "Other listings from this user"** on every product card. If someone labeled "Crop farmer" lists a tiller, it's visible. Trust comes from behavior, not from a label.

### 5.3 The signup flow (single path, no branches, no financial identity)

A user types: **mobile number, name, picks a label from a dropdown, fills address**. That's it. No bKash. No bank account. No NID. We don't need any of that — we're not holding their money, not processing their transactions, not issuing payouts.

```
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: Mobile number                                            │
│   "আপনার মোবাইল নম্বর দিন"                                      │
│   → supabase.auth.signInWithOtp({ phone })                      │
│   → Bengali OTP via DP Relay gateway                            │
├──────────────────────────────────────────────────────────────────┤
│ Step 2: Name                                                     │
│   "আপনার নাম লিখুন"                                              │
│   → Single text field                                           │
├──────────────────────────────────────────────────────────────────┤
│ Step 3: What do you do? (the label)                              │
│   "আপনি মূলত কী বিক্রি করেন?"                                   │
│   → Dropdown (not even chips — keeps it neutral).               │
│   → 13 options + "অন্যান্য".                                    │
│   → This is a search/filter signal. Nothing else.                │
├──────────────────────────────────────────────────────────────────┤
│ Step 4: Where are you?                                           │
│   বিভাগ → জেলা → উপজেলা → ইউনিয়ন (cascade dropdowns)          │
│   গ্রাম / এলাকা (free text or village dropdown)                  │
│   বাড়ি নম্বর / রাস্তা / দোকান (free text, optional)             │
├──────────────────────────────────────────────────────────────────┤
│ Step 5: Done                                                     │
│   "স্বাগতম! আপনার দোকার প্রস্তুত।"                              │
│   → Goes to Home.                                               │
└──────────────────────────────────────────────────────────────────┘
```

**No financial identity. No NID. No payment setup.** If a user later wants to be verified (the green badge), they can add NID from Profile → Settings. But nothing in the core flow needs it.

**Why this is safe without the V3 financial-identity check:** V3 added bKash + bank account to detect multi-account fraud. But since we **don't process payments and don't hold money**, the financial-identity attack surface shrinks dramatically. A user with multiple accounts can list the same cow twice. Fine — buyers report duplicates, we collapse them. The cost of multi-account fraud on a listing board is negligible compared to the cost of friction during signup. **We removed three form fields and a fraud check to make signup 2× faster.** Worth it.

**Total time target: under 90 seconds on 3G.**

**Location integrity guardrail (post-signup, ongoing):** To prevent location spoofing that would undermine locality-first discovery (§6.1), the app periodically prompts users to re-confirm their village via a 1-tap **"এখানে আছি" (I am here)** button when the app detects they're opening it from a new GPS cluster — specifically, >500 m from their last confirmed village. Failure to confirm after **3 consecutive prompts** reverts `users.location_id` to the last verified village (with a Bengali toast: "আপনার এলাকা পরিবর্তন হয়েছে বলে মনে হচ্ছে — নিশ্চিত করুন") until re-confirmed. The prompt is non-blocking (dismissible, no penalty per prompt), silent in the background, and runs **only when GPS is already warm** (e.g., user just made a call) — never forces a cold GPS lock, which would drain battery on Go Edition devices. This protects the locality-first feed from junk villages without adding a single signup field.

### 5.4 Changing the label later

Settings → "আপনার ধরন পরিবর্তন করুন" → Pick a new label. Takes 3 seconds. No impact on existing listings.

---

## 6. Location — From Division Down to Home Address

### 6.1 Why locality beats every other signal

A buyer in Sherpur, Bogura, looking for urea fertilizer will drive 5 km, not 50 km. A seller of fresh Rui fish in Muktagacha, Mymensingh, is irrelevant to a buyer in Dhaka — the fish would die in transit. **Distance is the strongest filter in this market.** More than price, more than rating, more than boost. V3 had it right that locality matters; V3 didn't go granular enough.

### 6.2 The location hierarchy (extended from V3)

V3 had Division → District → Upazila. V5 extends to:

| Level | Bengali | Approx count | Notes |
|-------|---------|--------------|-------|
| Division | বিভাগ | 8 | Same as V3 |
| District | জেলা | 64 | Same as V3 |
| Upazila | উপজেলা | ~495 | Same as V3 |
| **Union** | **ইউনিয়ন** | ~4,554 | New in V5 |
| **Village** | **গ্রাম** | ~87,000+ | New in V5 |
| **Home/landmark** | **বাড়ি / দোকান** | free text | New in V5 |

### 6.3 The `locations` table (extended)

Self-referencing hierarchy, ~93,000 rows seeded at deployment:

```
locations
├── id (UUID)
├── parent_id (UUID, nullable for top-level)
├── level ('division' | 'district' | 'upazila' | 'union' | 'village')
├── name_en (English, e.g., "Sherpur")
├── name_bn (Bengali, e.g., "শেরপুর")
├── lat, lng (centroid, for distance)
├── union_code (BBS code, for Union/Village levels only)
└── searchable_text (tsvector, for autocomplete)
```

### 6.4 User's `location_id` — at the village level

Every user's profile stores their **village** as `location_id` (FK to a village row in `locations`). Plus optional free-text `address_detail` (e.g., "মিয়া বাড়ির পশ্চিম পাশ, পুরাতন বাজারের কাছে").

**First-time framing:** The initial prompt is framed as welcome, not correction: "আপনার বাড়ির ঠিকানা নিশ্চিত করুন" (Confirm your home address). Only after 3 failed GPS attempts does it shift to corrective nudge.

**Union-level fallback:** If GPS unavailable (indoors, poor signal) and user cannot confirm village, allow temporary lock at union level with clear badge "ইউনিয়ন-স্তর" (Union-level). Auto-upgrade to village when GPS fix obtained. Keeps feed usable while encouraging finer granularity.

**Critical: `location_id` must always represent the user's *homestead village* (where they sleep nightly), *not* their farmland village.** A substantial share of Bangladeshi farmers cultivate land in a different village than their residence — if `location_id` were set to the farmland village, a Sherpur-resident farmer would appear as a "Bogura seller" to Sherpur buyers looking for nearby inputs, *invisible to the people who should find them*. The signup copy must say "যেখানে আপনি থাকেন" (where you **live**), never "যেখানে আপনি চাষ করেন" (where you farm). For input sellers and transporters, the rule is the same — `location_id` is the base of operations, not the customer's location. The existing OTP verification of the phone number (which is registered to a BTRC NID-linked SIM, typically at the homestead address) provides a soft cross-check.

**Why village, not district?** Because "I'm in Bogura" doesn't help a buyer — Bogura District has ~3 million people spread over 12 upazilas. "I'm in Sherpur upazila, Alahdipur village, near the new bridge" is the actionable level.

### 6.5 Listing's `location_id` — also at village level

When a user lists a product, the default `pickup_location_id` is their home village. They can override (rare). The free-text `pickup_address_detail` is encouraged ("ধানক্ষেতের পাশে, সিএনজি স্টেশনের পেছনে").

### 6.6 Discovery uses location first

When the user opens the app, the default discovery feed is **"What's for sale within 25 km of my village"**. Distance is computed from village centroid to village centroid (good enough for MVP). Filters available: expand radius, switch to district-wide, switch to division-wide.

### 6.7 Offline storage of the location tree

The full hierarchy (~93k rows) is too big for `@capacitor-community/sqlite` mirror at install time. Compromise:

- Bundled at install: **all Divisions, Districts, Upazilas, and Unions** (~5,100 rows).
- Downloaded on demand: **Villages** — fetched per Union when the user drills down, cached locally forever after.
- Free-text search at village level with fuzzy matching (Postgres `pg_trgm`) handles typo cases.

### 6.8 Distance calculation

For MVP, we use straight-line distance (haversine on village centroids). For later:

- Road network distance via OpenStreetMap Bangladesh tiles (free, offline-friendly).
- Time-based routing (Bangladesh has notoriously bad rural roads — 5 km can take 90 minutes in monsoon).

For MVP, haversine is fine. Show "প্রায় ১২ কিমি দূরে" (approx 12 km away) as a soft hint, not a hard filter.

---

## 7. Product Scope — The Whole Agricultural Economy

### 7.1 The 13 categories (initial)

Each maps to one of the `primary_label` values, but **anyone can list under any category**. A trader can list fertilizer. A fertilizer seller can list fish. Categories are filters, not cages.

| Category (Bengali) | English | Typical examples | Key sub-attributes (JSONB metadata) |
|---|---|---|---|
| ফসল ও সবজি | Crops & vegetables | Rice, wheat, jute, potato, tomato | harvest_date, variety |
| ফলমূল | Fruits | Mango, litchi, banana, guava | harvest_date, variety |
| মাছ ও চিংড়ি | Fish & shrimp | Rui, katla, pangash, shrimp | live_or_fresh, weight_avg |
| হাঁস-মুরগি ও ডিম | Poultry & eggs | Broiler, layer, duck, eggs | live_count, age_weeks |
| গবাদিপশু ও দুগ্ধ | Livestock & dairy | Cow, goat, dairy | age, breed, pregnant |
| বীজ | Seeds | Vegetable seed, paddy seed | variety, packet_size |
| সার | Fertilizer | Urea, TSP, DAP, compost | type, weight_kg |
| কীটনাশক | Pesticide | Insecticide, fungicide | target_pest, formulation |
| খাদ্য/ফিড | Animal feed | Cattle feed, fish feed | weight_kg, target_animal |
| ওষুধ | Medicine | Vet medicine, aqua medicine | form (liquid/powder/injection) |
| যন্ত্রপাতি | Equipment | Pump, tiller, sprayer | condition (new/used), age |
| পরিবহন সেবা | Transport service | Pickup, truck, covered van | capacity_ton, vehicle_type |
| অন্যান্য | Other | Anything | free-form |

### 7.2 Why JSONB metadata, not 12 fixed schemas

The temptation is to design 12 category-specific tables. **Don't.** V3's generic `products` table with a `category_id` FK + a `metadata JSONB` column is the right call. Reason:

- Sub-attributes change constantly. Adding a column for every category takes forever.
- Search across categories is easier with one table.
- Validation can be done per-category in the application layer or via JSON Schema validation in Postgres.

### 7.3 What "Transport service" looks like as a listing

Transport is also a product listing, but with a slightly different shape:

| Field | Notes |
|-------|-------|
| Title | "ঢাকা থেকে বগুড়া — ৩ টন কভার্ড ভ্যান" |
| `vehicle_type` enum | `pickup` / `truck` / `covered_van` / `tractor` / `other` |
| `capacity_ton` | DECIMAL |
| `from_location_id` | village-level |
| `to_location_id` | village-level (or "anywhere in district X") |
| `available_date` | when the vehicle is free |
| `rate_per_km` or `fixed_price` | either per-km or lump sum |
| `notes` | free text |

This is **the same `products` table**, just with a category of "Transport service". A user listing transport is a user with a vehicle — they may also list fertilizer. Same account.

---

## 8. The Listing Flow — Simpler Than Simple

### 8.1 The principle

> **The default path to listing a product should be: tap "Sell something", take a photo, type a price, type a quantity, tap Post. Done.**

**Photo-skip enforcement:** If user skips photo, listing gets a visible "🚫 NO PHOTO" badge (same size/contrast as verified badge) in feed and detail. After listing goes live, show non-intrusive toast: "ছবি যোগ করে আপনার Listing-কে আরও বিশ্বস্ত করুন" (Add a photo to make your listing more trustworthy) — disappears after photo added or 2 dismissals.

Anything beyond that is opt-in.

### 8.2 The two paths

```
                        ┌─────────────────────────┐
                        │ "কিছু বিক্রি করুন" tap  │
                        └──────────┬──────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ CAMERA OPEN — full screen    │
                    │ "পণ্যের ছবি তুলুন"           │
                    │                              │
                    │ [Large shutter button]       │
                    └──────────┬───────────────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
                  ▼                         ▼
        ┌──────────────────┐      ┌──────────────────┐
        │ SKIP photo       │      │ Photo taken      │
        │ (rare, allowed)  │      │                  │
        └────────┬─────────┘      └────────┬─────────┘
                 │                         │
                 └────────────┬────────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │ PRICE + QUANTITY screen         │
              │ (the only required screen)      │
              │                                 │
              │  পণ্যের নাম [স্ক্যান করুন]      │ ← optional AI assist
              │  মূল্য (৳/কেজি) [___]            │
              │  কতটুকু আছে   [___] কেজি        │
              │                                 │
              │  [আরো তথ্য দিন] (collapsible)  │
              │  ─ Description (optional)       │
              │  ─ Negotiable toggle            │
              │  ─ Pickup location (defaults to │
              │    your village, editable)      │
              │                                 │
              │  [পোস্ট করুন] (big green btn)   │
              └────────────┬────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │ DONE — "পোস্ট হয়েছে!"           │
              │ Shows up in your village feed.  │
              │ [আরেকটি পোস্ট করুন]              │
              │ [হোমে যান]                      │
              └─────────────────────────────────┘
```

Total taps: **5 minimum** (open Sell → photo → name (or skip) → price → quantity → Post). Total time: **under 30 seconds**.

**Category templates (the rural-Bangladesh shortcut):** Once a user picks a category (or AI scans one), the listing form **pre-fills category-specific fields** so the user doesn't need to remember what to enter. This is critical for low-literacy users who don't know what "harvest_date" or "breed" means in Bengali. Examples:

| Category | Auto-shown fields (in Bengali, with icon + example) |
|----------|------------------------------------------------------|
| ফসল (Crops) | ফসল কাটার তারিখ (optional, with today as default), জাত (variety, free text) |
| মাছ (Fish) | জীবিত / তাজা / হিমায়িত (radio), গড় ওজন (kg), পানির ধরন (মিষ্টি / লবণ — sweet/saltwater) |
| হাঁস-মুরগি (Poultry) | সংখ্যা (count), গড় বয়স (weeks), জাত (Sonali / Broiler / Deshi / etc.) |
| গবাদিপশু (Livestock) | জাত, বয়স, দুধ দেয় কি না (yes/no — for cows/buffalo), গর্ভবতী কি না |
| বীজ (Seed) | প্যাকেট সাইজ (g), জাত, মেয়াদ (expiry) |
| সার (Fertilizer) | ধরন (urea/TSP/DAP/organic), ওজন (kg) |
| পরিবহন (Transport) | যানবাহনের ধরন (pickup/truck/covered van/tractor), ধারণক্ষমতা (ton), কোথা থেকে, কোথায়, কবে |

Templates never auto-submit — they just stage the form. Users edit anything that's wrong, skip anything they don't know, and only the absolute required fields (title, price, quantity, pickup location) must be filled. A user who only ever lists crops never sees the "গর্ভবতী কি না" field — it's hidden behind category selection.

**Photo-skip rule (non-negotiable):** If a user skips the photo, the resulting listing **must** display a prominent **"🚫 NO PHOTO"** badge in search results, the locality feed, and the detail view, and **must be excluded by default** from the "With photos only" filter (§9.4). Additionally, no skipped-photo listing may appear in the **top 3 positions of any locality feed**, regardless of distance, recency, or boost — only after three photo-bearing listings are shown. This is a trust mechanism, not a punishment: skips remain allowed (camera anxiety, low literacy, hardware failure), but skipped-photo listings are visibly deprioritized so the locality feed stays browsable and buyers can self-select trust level.

### 8.3 AI assist, demoted to optional

V3 had "পণ্য স্ক্যান করুন" as a primary path — camera scans the product, ML Kit categorizes, Gemini fills description. V5 keeps it, but **as an opt-in shortcut, not the default**. Why:

- The default path works without internet. AI needs network.
- Many farmers will be listing things ML Kit doesn't know (their own breed of cow, a specific fish variety). Don't force AI to fail before letting them list.
- The lift from "photo + price + quantity" to "AI-inferred title and category" is nice but not necessary.

So: a "স্ক্যান" button next to the name field. If tapped, ML Kit runs locally (works offline), suggests a title and category. User accepts or edits. Done.

### 8.4 The minimum required fields

For a listing to be postable:

| Field | Why it's required |
|-------|------------------|
| Photo (or explicit skip) | Even one photo reduces scam risk massively |
| Title (or category from photo) | Buyers need to know what it is |
| Price | Obviously |
| Quantity | Otherwise infinite/zero confusion |
| Pickup location (defaults to user's village) | The whole point of the platform is locality |

Everything else — description, negotiable, expiry date, harvest date, sub-attributes — is optional and lives behind "আরো তথ্য দিন" (More info).

### 8.5 Offline drafts

If the user is offline, the listing is saved to `@capacitor-community/sqlite` and uploaded when connectivity returns. V3's sync queue (Section 2.7) is preserved.

---

## 9. Discovery & Search — Locality-First

### 9.1 Home feed

```
┌─────────────────────────────────────────────────────────────┐
│ চাষী কানেকশন                          🔍  🔔  👤               │
├─────────────────────────────────────────────────────────────┤
│ 📍 শেরপুর, বগুড়া (আমার এলাকা)        ▼                     │
│    "২৫ কিমি এর মধ্যে"  [সব এলাকা]                         │
├─────────────────────────────────────────────────────────────┤
│ [ফসল] [মাছ] [পশু] [বীজ] [সার] [যন্ত্র] [পরিবহন]  →        │  ← chip filters
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐                    │
│ │ [photo]  ধান (মোটা) — ৳৩৫/কেজি       │                    │
│ │ কৃষক: আব্দুর রহিম ✓                │                    │
│ │ 📍 শেরপুর, ৩ কিমি দূরে               │                    │
│ │ কাল ১২:০০ পর্যন্ত বিক্রি হবে        │                    │
│ └─────────────────────────────────────┘                    │
│ ┌─────────────────────────────────────┐                    │
│ │ [photo]  রুই মাছ (জীবিত) — ৳৪০০/কেজি │                    │
│ │ মৎস্য চাষি: করিম মিয়া ✓              │                    │
│ │ 📍 শেরপুর, ৮ কিমি দূরে               │                    │
│ └─────────────────────────────────────┘                    │
│                          …                                  │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Sort order (default = locality + recency)

Default sort:
1. **Closer first** (haversine distance from user's village ascending, **grouped into discrete bands**: 0–5km, 5–10km, 10–25km, 25–50km, 50km+).
2. **Within the same distance band, newer first.**
3. **Boost breaks ties only within the same distance band** (e.g., a boosted listing at 24 km beats a non-boosted listing at 24.1 km, but **never** beats a non-boosted listing at 10 km).

**Distance bands (this is the key operational detail):**

Listings are first **grouped into discrete distance bands** before any other sort is applied. Bands:

| Band | Range | Why this band |
|------|-------|---------------|
| 1 | 0–5 km | Walkable / bicycle — same village or next-door |
| 2 | 5–10 km | CNG / rickshaw — same upazila, easy pickup |
| 3 | 10–25 km | Motorbike / auto — adjacent upazilas |
| 4 | 25–50 km | Truck / van — same district, half-day trip |
| 5 | 50–100 km | Same division, full-day trip |
| 6 | 100+ km | Different division — show only on explicit filter |

**Within each band**, listings sort by recency (newest first), then by boost (boosted first), then by seller rating (higher first). **Across bands**, Band 1 always beats Band 2 always beats Band 3, regardless of recency or boost. To avoid overwhelming users with distant results, listings are first grouped into distance bands (0–5km, 5–10km, 10–25km, etc.). Within each band, sort by recency (newest first). Boost only affects ordering *within* the same distance band. This ensures a user in Sherpur always sees relevant local listings first—even if a boosted Dhaka listing is newer or cheaper.

**Practical example:** A farmer in Sherpur opens the app. A Band-2 listing (5 km away, posted yesterday) always appears above a Band-6 listing (150 km away in Dhaka, boosted today, cheaper). The Dhaka listing only appears if the user scrolls past Band 5 OR explicitly changes the distance slider to "Anywhere".

**Distance slider UI** (also in filters, §9.4): 5 / 10 / 25 / 50 / 100 km / Anywhere. Choosing "Anywhere" disables band-based grouping and reverts to pure haversine sort.

**Why we need explicit bands (not just "sort by distance"):** Without bands, a single boosted Dhaka listing at position #1 would always push down the Sherpur listings to position #200+, even though Sherpur listings are closer, more relevant, and more likely to convert. A user would never scroll that far. Bands guarantee local listings are always seen.

Settings → Sort options:
- Closest (default, uses bands)
- Newest (ignores bands, pure recency)
- Price low to high (uses bands, then price)
- Price high to low (uses bands, then price)
- Top rated seller (uses bands, then rating)

The locality-first default is critical. V3's feed ranking (Section 9) lists boost as a primary driver. For a 2G user in a village, "what's nearest to me" matters 10x more than "what's boosted".

### 9.3 Search

Bengali full-text search (Postgres `tsvector` on title + short_desc + category name_bn). Prefix autocomplete for instant feel.

Example: user types "ধ" → suggests "ধান", "ধনিয়া", "ধুলো", etc.

### 9.4 Filters

| Filter | Source | Notes |
|--------|--------|-------|
| Category chip | product.category_id | Multi-select |
| Distance slider | haversine | 5 / 10 / 25 / 50 / 100 km / Anywhere |
| Price range | min–max | Optional |
| Verified sellers only | users.nid_verified | Optional |
| With photos only | product has at least 1 image | Default ON |
| Posted within last X | created_at | 1d / 7d / 30d |

### 9.5 Category pages

Tapping a category chip shows all listings in that category, **still scoped to the user's chosen radius by default**. The "All categories" feed is the home feed.

---

## 10. Buying Flow — Find, Chat, Meet, Done

### 10.1 The principle

> **Chashi Connection is not a party to the deal.** We connect a buyer with a seller. They chat. They meet. They settle the deal (cash, bKash, barter, whatever — none of our business). They rate each other. We get out of the way.

There is **no "Buy" button** that creates an order. There is **no payment proof upload**. There is **no platform money ever**. The closest thing to a "transaction" on our side is **a chat thread** between two users.

### 10.2 The flow

```
Buyer browses the locality feed
        │
        ▼
Taps a listing card → Listing detail screen
        │
        ├── "বিক্রেতাকে মেসেজ করুন" (Message seller)  ◀── primary action
        │
        ├── "ফোন করুন" (Call) [if seller showed phone]  ◀── secondary
        │
        └── "রিপোর্ট করুন" (Report listing)             ◀── small, bottom
        └── "শেয়ার করুন" (Share) [WhatsApp deep link]   ◀── medium button
        │
        ▼
Chat thread opens with the seller. The in-app chat supports **text, single images, location pin share, and the 4 quick-reply shortcuts** ("কত?" / "কোথায়?" / "কবে?" / "ঠিক আছে"). That's it. **We deliberately do NOT support voice notes in-app** — see the rationale below.

**Why no in-app voice notes (the rural-Bangladesh network reality):**

| Concern | Why it's a blocker |
|---------|---------------------|
| **APK size** | Bundling Opus codec + Web Speech API model adds ~2–4 MB to the APK. We're holding the line at <6 MB total (§13.1); voice would burn ⅓ of that budget for a single feature. |
| **Upload bandwidth** | 60 s of Opus at 12 kbps ≈ 90 KB. On a 2G EDGE connection in a rural village, that's 30–90 seconds of upload — during which the user stares at a spinner, often times out, retries. A failed voice note is a much worse experience than a successful text. |
| **Download bandwidth** | The recipient also has to download that 90 KB. If their connection drops mid-download, the message is permanently gone (no offline-first cache for audio blobs in SQLite). |
| **Battery** | Continuous microphone capture + Opus encoding on a Go Edition 1 GB RAM device noticeably heats the phone. Users notice. |
| **Storage cost** | Every voice note stored server-side forever (or at least until chat delete). At 90 KB × 100k chats/day × 365 = ~3.3 TB/year of pure voice. Storage isn't free even on Supabase. |
| **Search** | Audio blobs aren't indexed by Postgres `tsvector`. We'd need transcription before search works. |
| **Already solved** | WhatsApp has solved every one of these problems for billions of users in low-bandwidth markets. Voice notes on WhatsApp work on 2G, queue offline, compress aggressively, transcribe on-device when possible. **We're not going to out-engineer WhatsApp at voice notes.** Use WhatsApp. |

**The right pattern — WhatsApp number sharing (opt-in):**

Instead of voice notes in-app, we let users **share their WhatsApp number** so the conversation can move to WhatsApp for anything richer than text. The flow:

1. **Profile setting (opt-in):** Settings → Profile → "WhatsApp নম্বর যোগ করুন" (Add WhatsApp number). User enters their number; it goes into `users.whatsapp_number` (separate from `users.phone`). The platform **never auto-derives WhatsApp from phone** — many users have different SIMs for voice and WhatsApp data plans, or share phones.
2. **Per-chat visibility:** In any active chat, if the other party has a WhatsApp number on file, a small button appears: **"WhatsApp-এ চালিয়ে যান" (Continue on WhatsApp)**. Tapping it opens WhatsApp with that number pre-filled and the listing context attached as a Bengali message template: *"চাষী কানেকশনে আপনার '{listing_title}' দেখে যোগাযোগ করছি।"*
3. **Discovery boost (the carrot):** Profiles and listings with a WhatsApp number shown get a small **📞 WhatsApp** badge. This is **not** boost in the algorithmic sense — it's a static trust signal. Buyers who see a WhatsApp-enabled seller know they can reach them in their preferred medium.
4. **Privacy:** WhatsApp number is **never shown publicly** on the listing or profile. It's only visible inside an active chat thread, only to the counterparty. If the chat is closed/deleted by either side, the number becomes inaccessible (though the chat history may still exist locally on each user's phone).
5. **Rating still happens in-app.** Even if the negotiation moves to WhatsApp, the rating step (§10.2) stays in Chashi Connection so the reputation system works. The platform remains the source of truth for *who is trustworthy*, even when the actual conversation happens elsewhere.
6. **We track the move but not the contents.** We log a single anonymous event: `chat_extended_to_whatsapp = true` on the chat row. No message content, no WhatsApp metadata, no screenshots. Just the fact that the conversation moved.

**Why this is the right tradeoff:** Rural Bangladeshi users already use WhatsApp as their primary communication channel for everything from family to business. Forcing them to learn a new in-app chat with fewer features than WhatsApp is a losing battle. The platform's job is to **make the introduction** and **own the reputation** — not to replace WhatsApp. We connect, then we get out of the way.

**WhatsApp share (the Bangladesh-specific viral lever):** The "শেয়ার করুন" button opens WhatsApp with a pre-filled Bengali message: *"চাষী কানেকশনে দেখুন: {title} — {price} ({village}, {distance} দূরে)। {deep_link}"*. Recipients who don't have the app installed see the Play Store link in the message; recipients with the app installed are deep-linked straight to the listing detail. **Why WhatsApp specifically:** it has near-100% reach in rural Bangladesh — the marketplace where most agricultural commerce happens today (see §2.1). This is the single biggest off-platform acquisition channel we have. Track share → install conversion in PostHog as a leading indicator of viral loop health.
        │
        ▼
Buyer and seller arrange:
  • When to meet
  • Where to meet (usually the pickup_location on the listing)
  • How to pay (cash / bKash / bank / barter)
        │
        ▼
They meet in person. Goods change hands. Money changes hands.
        │
        ▼
Buyer (and/or seller) rates the other person: ⭐ 1–5
        │
        ▼
Done.

**Rating prompt refinement:** After "চ্যাট শেষ" tap, show brief confirmation ("আপনি চ্যাট শেষ করতে চান?") before rating screen. If dismissed, schedule soft in-app reminder after 2 hours of inactivity (not push — avoids noise).
```

**Rating rule (preserves signal integrity):** Rating is only possible *after* the chat thread has been inactive for ≥2 hours *and* either party has explicitly tapped **"চ্যাট শেষ" (Chat complete)**. Tapping "Chat complete" triggers a non-intrusive prompt: **"বিক্রয়/ক্রয় শেষ হয়েছে? rating দিন"** (Sale/purchase done? Leave a rating). If neither party taps, the chat stays open — but ratings remain locked. **Auto-rating after inactivity is forbidden** — a timer-based rating prompt (e.g., "30 days since last message, rate now") corrupts the reputation system because users rate impulsively during negotiation, then again after discovery of quality issues, with no way to distinguish. The 2-hour + explicit completion rule ensures ratings reflect **post-transaction sentiment**, which is the only signal that matters on a listing board with no payment verification.

That's it. **Five screens from browse to rated.**

### 10.3 What we deliberately removed from V3

V3 had a complex buying flow with these steps:

| V3 step | V5 reason for removing |
|---------|------------------------|
| "Buy" button → Order summary | We don't create orders. The "transaction" is just a chat. |
| Select quantity and confirm price | They discuss this in chat. |
| "Payment method" selector (bKash/bank/cash) | Their choice, not ours. We don't process. |
| TrxID field + screenshot upload | We don't verify payments. |
| "Goods handover confirmation" (cash-on-pickup) | They hand over the goods themselves. Why would we ask for confirmation of something we have no stake in? |
| Admin payment verification queue | There is nothing to verify. |
| Order state machine (pending → confirmed → completed) | There is no order. There is a listing and a chat. |

Each of these made the platform heavier without making the deal safer. The deal is between them.

### 10.4 Trust on a listing board, not on a marketplace

Without escrow, the platform's role is **reputation infrastructure**:

1. **Verified-seller badge** (optional NID check) — visible on every listing and profile.
2. **Star rating + count** — visible on every profile. Updated after each chat ends.
3. **Response rate / time** — visible on profile ("usually replies within 2 hours").
4. **Report button** on every listing, profile, chat message → admin review.
5. **Block button** on every profile → never see their listings again.
6. **Listing age** — soft signal of activity (newer = fresher stock, but no urgency framing).

These are the trust levers. They are not bulletproof, and they don't need to be — the alternative (escrow + verification queues) is heavier, slower, and still imperfect. We optimize for **velocity** (more listings, more connections, more deals) and let the community surface bad actors.

### 10.5 The one thing we DO track: did a chat happen?

For reputation and to prevent abuse, we track:
- **Chat exists between A and B** (yes/no).
- **Chat was rated by either party** (yes/no, what stars).
- **Chat was reported** (yes/no, what reason).
- **Chat ended** (manually closed by either party, or auto-closed after 30 days of inactivity).

We do **not** track: what was said, what was agreed, whether money changed hands, whether goods changed hands, the price. None of it. We're a phone book with reviews, not a ledger.

---

## 11. Transport & Logistics — Pickup, Truck, Covered Van

### 11.1 Two-sided transport, same as two-sided everything

A user with a pickup truck:
1. Lists it the same way they'd list rice — "রাজশাহী → ঢাকা, কভার্ড ভ্যান, ২৫ নভেম্বর, ৳৮/কিমি".
2. The truck shows up in the locality feed under "পরিবহন".
3. Someone needing transport sees it, messages them.
4. They chat. They agree. They deal. Done.

A user needing transport **searches for a transport listing** or **posts a Wishlist** ("need 5-ton covered van Rajshahi to Chittagong, 22nd Nov") and transport sellers message them.

There is no "Book" button. There is no "driver on the way" tracking. There is no payment flow. **Same rules as products.**

### 11.2 RFQ → renamed to **Wishlist** (জিনিস খুঁজছি)

For complex transport jobs (or anything hard to find), users post a **Wishlist**. The Wishlist is **publicly visible, filterable, and open to anyone** — exactly like a wishlist on any classifieds site.

> Browse to "Wishlist" tab → see a feed of "I want X" posts → filter by category, location, urgency → if you have X (or know someone who does), message them.

| Field | Bengali | Notes |
|-------|---------|-------|
| Title | কী খুঁজছেন | "৫ টন কভার্ড ভ্যান রাজশাহী → চট্টগ্রাম" |
| Category | ধরন | Transport / crop / fish / equipment / other |
| Needed by | কবে দরকার | Date or "যত তাড়াতাড়ি সম্ভব" |
| Location (from) | কোথা থেকে | village-level |
| Location (to) | কোথায় | village-level or "anywhere in district X" |
| Notes | বিস্তারিত | Free text, up to 500 chars |
| Budget (optional) | বাজেট | ৳ or "open to offers" |

**Wishlist SEO & crawlability (§18.11):** Every Wishlist page includes `<article lang="bn">`, JSON-LD `Offer` with `itemOffered` (sought product, not location/ID), canonical `<link rel="canonical">`, and `rel="prev/next"` for paginated lists. **CI check:** Before merge to main, run `curl` on sample Wishlist URL and verify `<article lang="bn">` + JSON-LD `itemOffered` present. **Private Wishlist:** When user marks private, serve `noindex` meta tag and suppress JSON-LD; remains accessible in-app only.

**Wishlist expiry:** auto-expires after 30 days. User can renew.

### 11.3 Vehicle types

| Bengali | English | Typical capacity |
|---------|---------|------------------|
| পিকআপ | Pickup | 1–2 ton |
| ট্রাক | Truck | 3–10 ton |
| কভার্ড ভ্যান | Covered van | 1–5 ton |
| ট্রাক্টর | Tractor (with trailer) | 1–3 ton |

Plus "অন্যান্য" (other). User picks one when creating a transport listing.

### 11.4 Why no in-app GPS tracking (yet)

Tempting feature, but:
- Most drivers don't have smartphones, or have very cheap ones.
- Even with GPS, the operational cost of a real-time map at scale is significant.
- The current solution (driver sends a quick "আমি রওনা হয়েছি" message, then "পৌঁছেছি") works fine for now.

Out of scope for V5 MVP. Roadmap item.

### 11.5 Why a Wishlist works for non-transport too

A user wanting to **buy** something they can't find on the platform just posts a Wishlist. A fertilizer dealer in the next upazila sees it, lists their stock. The wishlist becomes a **pull signal** to sellers — "there's demand for X near Y, go list it." Same shape as the transport Wishlist.

This is the **#1 reason** the platform can grow supply without us doing demand-generation: every Wishlist is a free advertising board telling sellers what to list.

---

## 12. Trust, Safety & Fraud — Reputation, Not Arbitration

### 12.1 What kind of safety are we providing?

V3 framed trust as: fraud check at signup, payment verification by admin, dispute mediation by admin. That was the right framing **for an e-commerce platform**. We are not that.

On a listing board, "trust" means:
- **Bad actors can be spotted** before you meet them.
- **Bad actors get removed** quickly when reported.
- **You can block people** you don't want to deal with.
- **Your data isn't sold** to third parties.
- **The platform never holds your money** (because it doesn't have any).

It does **not** mean:
- Mediating disputes about goods (you met, you saw the rice, you handled it — that's between you and the seller).
- Verifying payments (none happened on-platform).
- Holding funds in escrow (we don't have any).

### 12.2 Identity & account uniqueness

V3's multi-account fraud detection (phone + bKash + bank) loses two of its three signals now that we don't collect financial identifiers at signup. What we still have:

| Signal | Strength | Notes |
|--------|----------|-------|
| **Phone (OTP)** | Strong | BTRC NID-linked SIM — one per person, mostly. **Exception: in rural Bangladeshi agro-households, one SIM is frequently shared by 2–3 adults for farming business — see shared-homestead rule below **|
| **Device fingerprint** | Medium | `@capacitor/device` collects hardware signals; same physical device flagged |
| **IP address** | Weak | Shared NAT in rural Bangladesh, but useful in aggregate |
| **Behavior patterns** | Strong | Rapid listing-creation, same images reused, etc. |

So: **phone uniqueness is the bedrock.** One phone = one account. If a user loses their phone or changes number, they verify the new number via OTP and we migrate the account (V3 §3.2 logic, unchanged). The bKash/bank cross-reference is **removed** — we don't collect them.

**When users opt for NID verification (§12.3), the system runs automated checks *before* manual review: (1) Confirm exactly 17 digits; (2) Validate checksum digit (position 17) = (sum of positions 1-16 × weight [2,7,6,5,4,3,2] mod 11); (3) Run on-device ML Kit face similarity (threshold: 65% confidence) between selfie and ID photo. Failures on (1) or (2) auto-reject; failure on (3) routes to manual review. Both on-device (Section 13) → zero server load, no privacy risk.**

**Shared-homestead exception (§12.2):** Allow unlimited accounts per homestead, but require each to have a unique, BTRC-verified SIM *and* NID. During signup, after OTP verification, prompt: "আপনার NID নম্বর যা আপনার সিমে নিবন্ধিত আছে কি তা নিশ্চিত করুন" (Confirm your NID matches your SIM-registered NID). If mismatch, block signup. The real fraud gate is SIM-NID linkage (BTRC requirement), not homestead size. Joint families pass if each adult has unique SIM+NID (universally true). For shared-device cases (divorced parents, worker using landlord SIM), require live selfie holding phone showing OTP screen (ML Kit liveness check — Section 13) — no exceptions.

- A user who has completed **NID verification** (§12.3) can enable **"একই ঘরের সদস্য" (Same household member)** toggle in Settings → Profile, which permits **one additional account** (i.e., max 2 per verified NID + shared homestead).
- Both accounts must be **NID-verified** before the second one is created (admin review on the link).
- All accounts from a shared homestead are flagged with a **🏠 shared-home icon** on their listings, profile, and chat headers — transparency preserved for the other party.
- A homestead cannot have more than 2 accounts. The third attempt is hard-blocked at signup.
- Same listing cannot be co-listed by both accounts of a homestead (de-duplicated by `phone_shared_homestead_id` + `category_id` + 24-hour window).
- **Audit log:** Linking/unlinking of shared-homestead accounts logged in `admin.audit_log` with readable description (e.g., "User X linked secondary account Y under verified NID Z") for moderation and troubleshooting.

**Device fingerprint fallback:** If `@capacitor/device` fails to return hardware hash (common on Go Edition devices), fall back to hashed combination of `Screen resolution + OS version + installed app version` (anonymized, no raw PII). Keeps fraud signal useful without storing identifiable data.

This is the smallest concession that captures real rural behavior (shared business phone) while keeping the multi-account attack surface bounded. Without this, ~10–15% of the rural TAM couldn't use the platform at all.

### 12.3 Optional NID verification = "যাচাইকৃত" badge (V3 §3.4, unchanged)

A user can voluntarily upload NID photos for manual admin review. **On upload, auto-validate: (1) Exactly 17 digits; (2) Checksum digit (pos 17) = (sum of pos 1-16 × weight [2,7,6,5,4,3,2] mod 11). Fail = instant reject with 'NID নম্বর ভOLT'. If format passes, run on-device ML Kit face similarity (threshold: 65% confidence) against selfie; pass = auto-approve, fail = manual review. Both on-device (Section 13) → no server load, no privacy risk. Reduces manual review ~85% (Sangstha NID pilot). Approved users get the green ✓ badge. Buyers see the badge and may prefer verified sellers.

**Important:** the badge is a **trust signal**, not a transaction guarantee. If a verified user scams someone, we still can't undo the deal — but we can ban them, refund nothing, and warn future users.

### 12.4 Reporting — the primary safety mechanism

Every listing, profile, and chat message has a **"রিপোর্ট করুন"** (Report) button. Categories:

| Category | Bengali | Auto-action |
|----------|---------|-------------|
| Fake listing / scam | নকল / প্রতারণা | Hide listing after 2 reports, admin review |
| Duplicate listing | একই পণ্য বারবার | Collapsed into one listing by admin |
| Wrong category / info | ভুল তথ্য | User can edit, or admin can recategorize |
| Spam / promotional | স্প্যাম | Hide after 3 reports |
| Abusive language in chat | অশ্লীল / গালি | Hide message, warn user |
| Suspicious NID / verification | সন্দেহজনক | Re-review verification |
| Rapid-fire duplicate reports | দ্রুত রিপোর্ট | Hide listing after ≥3 reports from unique devices in any sliding 60-min window (not fixed hourly buckets; catches staggered fraud-ring reporting — BRAC 2023: 78% of agri-classifieds rings use staggered intervals >60 min); triggers admin review for potential collusion rings |
| Political / religious incitement | রাজনৈতিক / ধার্মিক উক déclara | Hide after 2 reports + admin review (auto-flag if text contains [Bangladesh Election Commission-registered party names]¹ or [Hindu/Muslim/Buddhist/Christian] + [বিরোধী / নফর্ট]) — DSA 2018 Sec. 21/25/29 compliance |
| Predatory lending / credit trap | ঋণ বাঁচার | Auto-flag if chat contains [Interest rate >1%/day] OR [‘pay later’ + seed/fertilizer/feed]; hide after 1 report + admin review (CIRDAP 2022 patterns) |
| Advance-payment fraud (transport) | আগে পেমেন্ট প্রতারণা | Auto-flag if transport listing + chat contains bKash/Nagad screenshot before chat marked complete; show mandatory UX warning (§11.1) |
| Women's safety / unsafe meetup | নিরাপত্তা | Optional “Meet at police station” toggle (§10.2); auto-suggest nearest thana from location hierarchy (§6) when arranging meetup |
| Other | অন্যান্য | Manual review |

¹ Refers to the 30+ parties currently registered with the Bangladesh Election Commission (updated quarterly via govt. open data feed).

**Admin queue:** admin sees reports sorted by report count + recency. Admin action: dismiss, warn user, hide content, suspend user, ban user. Every action logged in `audit_log` (V3 §13).

### 12.5 Blocking

Every profile has a **"ব্লক করুন"** (Block) button. Blocked users' listings don't show in your feed; they can't message you; they can't see your listings. Block list is local to the user, never shared.

### 12.6 Rate limits (V3 §18.4, retained)

Even on a listing board, we need throttling:

| Action | Limit | Reason |
|--------|-------|--------|
| Listings per day | 20 | Spam prevention |
| Listings per day | 50 (with harvest-batch exemption) | Spam prevention; accommodates batch-harvest listings (e.g., BR26/BR28/BRRI dhan29) without forcing merge or delay |
| Messages per day (new chats) | 50 | Reset at 2 AM IST (not rolling 24h) to align with rural evening negotiation peaks (6–10 PM IST, a2i survey) |
| Reports per day | 10 | Anti-abuse of report system |
| OTP requests per phone | 3/hour | SMS cost |
| Photo uploads per hour | 50 | Storage cost |

### 12.7 What we explicitly don't do

| Don't do | Why |
|----------|-----|
| Hold money | We don't take money. We can't lose it. |
| Verify payments | There are no on-platform payments. |
| Mediate "I didn't receive the goods" | They met in person. We weren't there. We can't adjudicate. |
| Refund / compensate | We have no money to refund. We can ban a bad actor. |
| Provide invoices | We didn't sell anything. The seller can issue one if they want. |
| Insurance | Not in scope. Partnerships later, maybe. |

This is the **bright line.** The moment we offer dispute mediation, we become a marketplace. We are not a marketplace. We are a listing board.

---

## 13. Tech Stack — Locked

V3's stack is approved. V5 confirms it without change:

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile | SvelteKit (Svelte 5 Runes) + `@sveltejs/adapter-static` + Capacitor 6+ | One TS codebase, native plugins, no VDOM, small bundle |
| Local DB | `@capacitor-community/sqlite` | Offline-first, mirror of server schema, version migrations |
| Auth | Native Supabase Auth (Phone OTP + Google OAuth) | No Firebase, proprietary SMS gateway via Send SMS Hook |
| Backend | Supabase (Postgres 15+, PostgREST, Realtime, Storage, Edge Functions) | Managed PG, RLS, CDC, one platform |
| AI | Google Gemini 1.5 Flash (cloud) + Google ML Kit (on-device) | On-device for offline image labeling & OCR; cloud only when online |
| SMS | DP Relay gateway via Edge Function | Proprietary, Bengali, OTP only |
| Push | Firebase Cloud Messaging (FCM) | The only Firebase we use — push delivery only |
| CDN | Cloudflare | Edge caching in Bangladesh |
| Analytics | PostHog (self-hosted) | Funnels, fraud cohorts, no data sovereignty issues |
| Errors | Sentry | JS + native + Edge Function SDK |
| CI/CD | GitHub Actions | Adapter-static build → cap sync → Gradle |

> ### ⚠️ Critical Implementation Guardrails (Non-Negotiable)
>
> These are **build-time rules**, not aspirational guidance. PRs that violate them should be blocked at code review regardless of how useful the feature seems.
>
> **DO NOT** — under any circumstances, regardless of stakeholder pressure:
>
> - ❌ **Never** implement payment processing, escrow, or any transaction state machine (see §10.3, §12.7). The platform never sees money. If a PR adds a `payments` table, an `orders.status` field, or a payment-verification endpoint, reject it.
> - ❌ **Never** show platform-mediated "order status," payment verification flows, or goods-handover confirmation. These contradict our core identity as a listing board.
> - ❌ **Never** add a Cart, Checkout, Refund, or "My Orders" screen to the client. The words themselves should be missing from the codebase (search-able red flag).
> - ❌ **Never** persist a "transaction record" anywhere — not in Postgres, not in SQLite, not in Edge Function logs. If the platform needs to know whether a deal happened, we've already failed.
> - ❌ **Never** collect bKash, bank account, or any payment-rail identifier at signup or in user profile. We don't need them; storing them creates liability.
>
> **DO** — preserve the strategic reframing from §3 and §4:
>
> - ✅ **Always** treat permission checks as **transaction-contextual**, not attribute-based. Example: instead of `if (user.role === 'buyer') reject`, write `if (chat.buyer_id === auth.uid()) allow`. The user has no role; the transaction does.
> - ✅ **Always** derive "seller vs buyer" from the table being queried, not from the `users` row. `product.listed_by_user_id` is the seller in any order context, period.
> - ✅ **Always** prefer locality over recency over boost in any default sort or recommendation. If a feature surfaces a Dhaka listing before a Sherpur listing to a Sherpur user, the feature is broken.
> - ✅ **Always** keep the single-user-model: the same `auth.uid()` can list, buy, chat, rate, and report. No role-gated flows, no role-gated onboarding steps.
>
> **Why this callout exists:** Engineers referencing PRD-V3.md (the deep technical architecture doc) might miss strategic constraints buried in prose here. V3 still describes the old transactional architecture in detail; it's tempting to implement what's documented there. This callout encodes V5's strategic reframing as **build-time rules** so it survives contact with the technical spec.

### 13.1 Device targets (unchanged)

- Android 11–13 Go Edition
- 1–2 GB RAM
- 2G/3G networks
- APK < 6MB
- No `backdrop-filter: blur()`
- Virtualized lists (5–6 DOM nodes max)
- Bengali fonts bundled in APK (Noto Sans Bengali / Hind Siliguri WOFF2)

### 13.2 Why we are NOT changing the stack

Common temptations and why we're saying no:

| Temptation | Why no |
|------------|--------|
| "Use React Native, more devs" | Larger bundle, more RAM, slower on Go Edition |
| "Use Next.js for the admin panel" | Admin panel is web, V3 has it as separate SvelteKit project; keep stack consistent |
| "Replace Supabase with Firebase" | V3 already removed Firebase Auth; full reversal undoes that work |
| "Use Stripe / bKash API for payment" | Out of scope for MVP — manual verification works and costs zero |
| "Add a web version of the marketplace" | Mobile-only by design. Web dilutes focus. |

---

## 14. Zero Commission Policy

### 14.1 The policy

**Chashi Connection charges nothing. Ever.**

| What we don't charge | Amount |
|----------------------|--------|
| Listing fee | ৳0 |
| Sale fee | 0% |
| Transport fee | 0% |
| Payment fee | 0% |
| Withdrawal fee | ৳0 |
| Sign-up fee | ৳0 |
| Subscription | ৳0 |
| "Boost" fee (for now) | ৳0 |
| Featured-listing fee | ৳0 |
| Anything else we might invent | ৳0 |

### 14.2 Why this is the only right policy

The users we serve — small farmers, fish farmers, local sellers — operate on razor-thin margins (sometimes 5–8% net). Any fee we charge comes directly out of their livelihood. Middlemen already extract 8–15%. We will not be another middleman.

More importantly: **we are not a party to the deal.** We don't process the payment. We don't move the goods. There is no transaction for us to take a cut of. Charging commission would mean pretending we're something we're not.

Our competitive position is **the only free option**, and the only platform that **literally cannot** charge commission (because we never see the money). Charging a commission would make us equivalent to Daraz / other platforms — and they are better at e-commerce than we will ever be. Free is our wedge.

### 14.3 How we make money (later, optional, never required)

V3 Section 7 details **product boosting** as the sole monetization path. V5 keeps this and frames it more carefully:

- **Boost is optional.** A listing without boost works exactly like a listing with boost, it just appears lower in non-locality sort buckets.
- **Boost is transparent.** When you boost, you see "this listing will appear in the top X of the 'all Bangladesh' feed for Y days". No dark patterns.
- **Boost does not affect locality search.** A boosted listing in Dhaka does not show up in a user's Sherpur feed unless the user expands the radius.

### 14.4 Future revenue streams (NOT in MVP)

| Idea | When | Why not now |
|------|------|-------------|
| Insurance partnerships | Post-PMF | Need user data first |
| Micro-credit for input sellers | Post-PMF | Regulatory complexity |
| Premium verified badge (more than just NID check) | Post-PMF | Build trust first |
| Sponsored listings in non-local search | V1.1 | After core loop is solid |
| Data products (aggregated, anonymized market prices) | V2+ | Only after meaningful volume |

---

## 15. Notifications & Chat (Bengali-only)

### 15.1 Bengali-native, not Bengali-translated

Every notification, every error, every chat message, every AI prompt output is in Bengali. The platform's identity is Bengali. A user who has never seen the platform should be able to guess what every button does from the icon + Bengali label alone.

V3 Section 19 has a 50+ Bengali error catalog. V5 keeps this and adds a notification catalog (Section 15.3).

### 15.2 In-app chat — order-context only

V3 Section 11. Buyers and sellers chat on the order thread. Transport parties (when assigned) join the same thread. Admin joins only on dispute.

### 15.3 Notification catalog (initial)

| Trigger | Bengali template | Channel |
|---------|------------------|---------|
| **User opens app after >7 days inactive (re-engagement)** | **"আপনার এলাকায় [X]টি নতুন পোস্ট হয়েছে। দেখতে ট্যাপ করুন।"** | **Push — ONLY if ≥3 new listings have appeared in the user's 10 km radius since their last session. No push otherwise.** |
| **A new listing matches one of the user's active Wishlists** | **"আপনার চাহিদা '{wishlist_title}' অনুযায়ী পাশেই নতুন পোস্ট: '{listing_title}'।"** | **Push — ONLY if match score ≥ medium confidence (category + location radius match), capped at 1 push per Wishlist per day, 3 total pushes per user per day. Otherwise in-app only.** |
| **A seller in your area just listed in a category you've Wishlisted** | **"{seller_name} ({distance} দূরে) '{category}' তে নতুন পোস্ট করেছেন।"** | **In-app only (no push) — too high-frequency otherwise.** |
| New chat message from a buyer/seller | "{sender_name}: {message_preview}" | Push + in-app |
| Someone responded to your Wishlist | "{buyer_or_seller_name} আপনার Wishlist '{title}' এ সাড়া দিয়েছেন।" | Push + in-app |
| New Wishlist in your area (by upazila) | "আপনার এলাকায় নতুন চাহিদা: '{wishlist_title}'" | Push (topic-based by upazila) |
| Your listing is nearing expiry (3 days) | "আপনার '{product_title}' পোস্টের মেয়াদ ৩ দিনে শেষ হবে। নবায়ন করুন।" | Push |
| Your NID verification was approved | "অভিনন্দন! আপনার অ্যাকাউন্ট যাচাইকৃত হয়েছে। ✓" | Push + in-app |
| Your NID verification was rejected | "আপনার যাচাইকরণ প্রত্যাখ্যাত হয়েছে। কারণ: {reason}।" | Push + in-app |
| Your listing was reported | "আপনার '{product_title}' পোস্টে রিপোর্ট এসেছে। প্রশাসক দেখবেন।" | Push + in-app |
| **A Wishlist receives its first response** | **"আপনার Wishlist '{title}' এর প্রথম প্রতিক্রিয়া আসছilde! দেখে নিন।"** | **Push — ONLY if the Wishlist had 0 responses before this event, capped at 1 push per Wishlist lifetime** |
| Admin took action on your account (warn / suspend) | "সতর্কতা: আপনার অ্যাকাউন্টে সমস্যা শনাক্ত হয়েছে। বিস্তারিত দেখুন।" | Push + in-app |
| Someone rated you | "{rating_stars} — {reviewer_name} আপনাকে রেটিং দিয়েছেন।" | In-app only (no push — too noisy) |

What we **don't** notify about (because none of this happens on the platform):
- Payment received (we don't process payments)
- Payment verified (we don't verify)
- Order confirmed / shipped / delivered (no orders)
- Goods handover confirmation (no such step)

### 15.4 Notification preferences

Settings → Notifications (নোটিফিকেশন):
| Per-type daily cap | Max 1 Wishlist-match push/day, max 2 re-engagement pushes/week | Prevents single-category spam from consuming overall 3-push/day budget |

**Quiet-hours respect:** Honor device Do-Not-Disturb / system quiet hours (via Capacitor) by deferring non-critical pushes until next active window; time-sensitive alerts (new chat message) delivered immediately regardless.

---

## 16. Offline-First & Performance Budget

### 16.1 What works offline (V5 priority list)

| Feature | Offline behavior |
|---------|------------------|
| Browse cached listings in your locality | ✅ fully cached |
| View a listing's details | ✅ cached |
| Start a new product listing (with photo) | ✅ saved to local DB, uploaded when online |
| Edit your own draft listings | ✅ fully offline |
| View your own order history | ✅ cached |
| Chat (send a message) | ✅ queued, sent when online |
| View location hierarchy (Division → Union) | ✅ bundled |
| View a specific village | ✅ cached after first online view |
| **Search across all of Bangladesh** | ❌ online only |
| **View other users' villages** | ❌ online only |
| **AI description generation** | ❌ online only (but ML Kit categorization works offline) |
| **Post a payment proof** | ❌ online only (need to fetch seller's payment details + send OTP) |
| **Boost a listing** | ❌ online only |

### 16.2 Sync queue (V3 Section 2.7) — unchanged

Operations queued offline:
- Create / edit / delete product listing
- Send chat message
- Update profile

Server-authoritative on:
- Order state changes
- Payment verifications
- Dispute resolutions
- Transport bookings

### 16.3 Performance budget

| Metric | Target |
|--------|--------|
| APK size | < 6 MB |
| Cold start to home feed | < 3s on 2G |
| Home feed scroll | 60fps sustained |
| Photo capture → preview | < 500ms |
| Search result | < 200ms local, < 2s cloud |
| DOM nodes on home feed | 5–6 (virtualized) |
| Memory usage | < 150 MB resident |
| Sync queue throughput | 50 items/minute |

**Adaptive image quality:** On 2G/EDGE connection, serve listing thumbnails at 200px width; upgrade to full-size only when user opens detail view or connection upgrades to 3G+. Reduces data usage and improves perceived speed on slow links.

**Prefetch adjacent bands:** While user scrolls 0–5 km band, silently prefetch 5–10 km band in background (low-priority fetch). Cancel if user navigates away quickly. Makes radius expansion feel instantaneous.

---

## 17. MVP Scope — What's In, What's Out

### 17.1 MVP (V5.0, target 4–6 months from kickoff)

**In scope:**

- [x] Signup: mobile OTP → name → label dropdown → address (90 seconds, no financial identity)
- [x] Full location hierarchy (Division → Village + free-text address)
- [x] **Listing a product** (super-simple flow, 5 taps) — see §8
- [x] **Listing transport** (pickup / truck / covered van / tractor) — same flow as products
- [x] **Wishlist** — public "I want X" posts, filterable, indexed by search engines
- [x] AI assist (optional "স্ক্যান" button — photo → suggested title + category)
- [x] Locality-first discovery feed (default = within X km of your village)
- [x] Bengali full-text search + category filters
- [x] **Chat** between buyer and seller (the centerpiece of coordination) — see §10.2
- [x] **Rating** after a chat ends (1–5 stars + optional short text)
- [x] **Reporting** (every listing / profile / chat message has a Report button) — see §12.4
- [x] **Blocking** (per-user block list)
- [x] Push notifications (Bengali)
- [x] Offline drafts + cached locality feed
- [x] Admin panel (user mgmt, NID verification review, reports queue, fraud flag triage, audit log)
- [x] All UI in Bengali
- [x] Optional NID verification = "যাচাইকৃত" green badge

**NOT in MVP (explicitly out of scope):**

- ❌ **Payment verification** — there's nothing to verify
- ❌ **Order state machine** — there are no orders
- ❌ **Cart / checkout** — we don't sell things
- ❌ **Goods handover confirmation** — they hand over the goods themselves
- ❌ **Dispute mediation** — replaced with reporting (§12.4)
- ❌ **Escrow** — we have no money to hold
- ❌ **bKash / Nagad API integration** — none of our business
- ❌ **Boost monetization** — free at MVP, add later if/when needed
- ❌ **RFQ (bidding system)** — replaced with simpler Wishlist (§11.2)
- ❌ **Real-time GPS tracking** — too costly for MVP
- ❌ **Crop & Fish Doctor AI diagnosis** — defer to V5.1
- ❌ **iOS app** — Android first
- ❌ **Web app** for marketplace — admin panel is web (SvelteKit), marketplace is mobile-only
- ❌ **Multi-language** — Bengali only
- ❌ **Voice input** — nice-to-have, defer
- ❌ **Video listings** — photos only at MVP
- ❌ **Group buying / auctions** — not on a listing board

### 17.2 Success criteria for MVP

**🚨 Top-priority early signals** (these two predict PMF *during* MVP — track weekly, before any of the lagging metrics below):

| Metric | Target (6 months post-launch) | Why it matters |
|--------|-------------------------------|----------------|
| **% of new listings receiving ≥1 inquiry within 24 hours** | ≥ 55% | *Early liquidity signal: Measures if locality discovery works **before** transactions occur. Below 45% indicates flawed location granularity or trust issues.* |
| **Avg. chats initiated per *new* user in first 72 hours** | ≥ 0.8 | *Predicts retention: Measures if onboarding successfully connects users to immediate value. Below 0.5 signals signup flow or discovery mismatch.* |

Lagging indicators (outcomes we ultimately want):

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| MAU (monthly active users) | ≥ 50,000 |
| DAU / MAU | ≥ 20% |
| Listings posted per day | ≥ 5,000 |
| Active chats per day (chats with ≥ 1 message from each side) | ≥ 2,000 |
| Repeat sellers (≥ 3 listings in 30 days) | ≥ 25% of sellers |
| Listings with photos | ≥ 80% |
| Report rate | ≤ 2% of listings |
| App size on Play Store | ≤ 6 MB |

Leading indicators (early signals that predict whether lagging indicators will hit — diagnose issues *before* outcomes fail):

| Metric | Target (6 months post-launch) | Why it matters |
|--------|-------------------------------|----------------|
| % of listings receiving first inquiry within 24 hours | ≥ 60% | Measures if locality-first discovery works — an early signal of liquidity *before* chats occur. If this is below target, the problem is in discovery/ranking, not in user behavior. |
| Avg. chats initiated per active user / week | ≥ 1.2 | Indicates engagement depth; predicts retention better than MAU alone for a chat-driven platform. A user who starts even one chat per week is dramatically more likely to return than one who only browses. |
| Median time from signup to first listing posted | ≤ 30 min | Onboarding friction diagnostic. If users take longer, signup is broken. If they never post, the "what to sell" framing is broken. |
| Wishlist → Listing conversion rate | ≥ 8% | A wishlist is a demand signal. If 8% of wishlists eventually become matching listings, supply is responding to demand organically — the platform's core flywheel is working. Below 5% means sellers aren't seeing wishlists or aren't motivated to respond. |
| Search → Listing detail tap-through rate | ≥ 25% | Discovery relevance. If users search and don't tap any result, search relevance is broken. |
| Listing detail → Chat start rate | ≥ 15% | Listing quality + trust signal effectiveness. If detail views don't convert to chats, the listing is either incomplete, the seller is unresponsive, or trust signals (badge, rating, photo) are weak. |
| 7-day retention (signed-up users active in week 2) | ≥ 35% | The strongest predictor of long-term retention. Below 25% means the product isn't sticky. |
| NPS among users with ≥ 3 chats | ≥ 40 | Quality of connection — measures whether users feel the platform *works*. |

**How to use this table:**

- If a **lagging** metric misses target, look at the leading metrics in the same row's domain to find the root cause.
- If a **leading** metric misses target, that's where to invest engineering/design effort.
- Track leading metrics weekly, lagging metrics monthly.

---

## 18. Open Questions

These are decisions still pending. V5 takes a position where V3 was silent, but flags them so the team can revisit.

### 18.1 Should `primary_label` be one-per-user or many?

**V5 position:** One per user, changeable. **Open question:** Should power users (who legitimately are both a fertilizer seller AND a transporter) be able to pick multiple labels? Currently they have to pick the dominant one.

**Recommendation (with measurable triggers):**

Start with **single label for MVP**. Re-evaluate for multi-label **only if both** of these conditions are met after 90 days post-launch:

- **Condition 1 — Demand signal:** > 30% of users request label changes within 30 days of signup. Measured via Profile → "আপনার ধরন পরিবর্তন করুন" click rate (raw count + as a percentage of new signups in the same window).
- **Condition 2 — Supply signal:** Single-label users post > 40% fewer cross-category listings† than expected based on the cross-category rate observed in the same period on similar multi-label platforms (e.g., Bikroy, Facebook Marketplace Bangladesh).

† Defined as listings outside the user's initial signup category. Example: a user who signs up as কৃষক (farmer) but then posts a transport listing. Tracked via `listings.category_id ≠ users.primary_label_at_signup`.

**Decision rule:**
- Both conditions met → ship multi-label in V5.1 (low-risk complexity upgrade).
- Only Condition 1 met → improve the label-change UX (one-tap swap, better onboarding copy) but don't ship multi-label yet. Users want to change; they're not blocked from cross-category listing.
- Neither condition met → single label is fine indefinitely. Revisit at 6-month mark.
- Only Condition 2 met (without Condition 1) → investigate: users are cross-listing without complaining, so the friction isn't visible to them. Single label stays.

**Why this framework:** Open questions should be revisitable, but revisitation requires a trigger, not a feeling. This gives the team a quantitative gate.

### 18.2 Should we ship iOS at MVP?

**V5 position:** No. Android-first. iOS in V5.1 or V6 depending on traction. **Open question:** Does the investor narrative require iOS for credibility? (For some Bangladeshi investors, yes — argue based on Android market share in rural Bangladesh, 95%+.)

### 18.3 ~~Cash on pickup — first-class or second-class?~~ **RESOLVED.**

**V5 position:** Out of scope entirely. There is no payment on the platform. Cash on pickup happens in the real world between two users. We don't see it, don't record it, don't mediate disputes about it. Their problem, not ours.

### 18.4 Boost — at MVP or never?

**V5 position:** **Not at MVP.** The platform is free, period. Boost can be added in V5.1 if we need revenue and can't find a better path. But we should resist — every monetization adds friction. **Open question:** Is there a better revenue model? (Sponsorships from input brands? Subsidized by NGOs / gov? Premium features for shops?) **Recommendation:** Defer monetization. Grow the user base first. Re-evaluate at 100k MAU.

### 18.5 Should transport listings have a separate home tab?

**V5 position:** No. Transport is a category like any other. **Open question:** If a user is primarily a transporter, does the home feed drown in crop listings? **Recommendation:** The home feed respects the user's `primary_label` — if they're a transporter, transport listings surface higher. Tweak in V5.1 if needed.

### 18.6 ~~RFQ — ship in MVP or defer?~~ **RESOLVED.**

**V5 position:** Replaced by **Wishlist** (§11.2). Public "I want X" posts, no bidding, no fulfillment tracking. Everyone can see and filter wishlists. Anyone with X can message the wishlister.

### 18.7 What's the policy on used equipment?

**V5 position:** Allowed. `condition` enum (`new` / `like_new` / `used_good` / `used_fair`) in metadata. **Open question:** Tractors and pumps are commonly sold used — should there be a "verification" step (mechanic inspection) before listing? **Recommendation:** Allow used listings without verification, but show a clear condition badge. Add voluntary inspection later.

### 18.8 Price negotiation

**V5 position:** Each listing has an `is_negotiable` toggle. If on, the listing shows "দরকষাকষি সম্ভব" badge. Negotiation happens in chat. We don't track agreed prices. **No complications.** Simple.

### 18.9 Seller rating vs listing rating

**V5 position:** MVP has only **seller rating** (overall). Listing-specific rating deferred to V5.1 if needed.

### 18.10 Location privacy

**V5 position:** A user's village is shown to other users within their locality (e.g., within 50 km). Beyond that, only the district. **Open question:** Can a user opt to show only their district to everyone? **Recommendation:** Default = full village within 50 km, district beyond. Add opt-down toggle in Settings.

### 18.11 Should Wishlist pages be publicly indexable by Google?

**V5 position:** Yes. Every wishlist is a public page that Google can index. This is **the single biggest growth lever** — "user in Sherpur wants urea fertilizer" becomes a Google result that attracts sellers who don't yet have the app. **Open question:** Privacy? Wishlists reveal demand in a specific area, which could be exploited (e.g., a fertilizer company targeting ads). **Recommendation:** Index by default, allow user to mark wishlist as "private" if needed.

**Mandatory implementation rule (the crawlability landmine):** Wishlist pages must use **server-side rendered semantic HTML** — `<article lang="bn">` wrapping the title, location, need-by date, category, and full Bengali description in the initial HTML payload. **Never rely on client-side JS rendering** for Wishlist content: SPAs (SvelteKit, even with hydration) often hide content behind JS, making them invisible to Googlebot and — more critically — to **UC Browser, Opera Mini, and other low-power crawlers used in Bangladesh** where 73% of agricultural searches happen on feature phones that execute JS poorly. Pre-deploy test: `curl https://chashiconnection.bd/wishlist/<id> | grep "<h1"` — if the Bengali title isn't in the initial HTML payload, **block the deploy**. Add Bengali `lang="bn"` to `<html>`. Include JSON-LD schema markup (e.g., Schema.org `Offer` type with `itemOffered` pointing to the sought product, or a custom `Wishlist` type) for structured-data snippets in SERPs.

⚠️ Critical: The `itemOffered` field must reference the *sought* product (e.g., "urea fertilizer"), *not* the user’s location or Wishlist ID. Test with: `grep -i 'itemoffered' public/wishlist/* | head -n 5`

### 18.12 What about duplicate listings across users?

**V5 position:** If two users list the same cow (each from their own farm), both listings stay up. **Open question:** Should we have an admin tool to merge suspected duplicates? **Recommendation:** Yes, but low priority. Most duplicates are legitimate (same fertilizer sold by multiple dealers). User reports of duplicates can be triaged manually.

### 18.13 What's the listing expiry policy?

**V5 position:** Listings auto-expire after **30 days**. User can renew (one tap) or mark "sold/removed" before that. **Open question:** Some listings (e.g., a farm that always has milk for sale) shouldn't expire. **Recommendation:** In V5.1, add an "always available" flag that exempts the listing from auto-expiry.

### 18.14 Chat history retention

**V5 position:** Chats are kept **forever by default**, but either party can delete a chat from their side. Admin can delete on report. **Open question:** Storage cost? Privacy? **Recommendation:** Forever by default — it's free storage on Supabase for our scale. Delete on user request or admin action.

---

## 19. Reference Index — What to keep from V3, what to strip

V5 is the strategy and product doc. V3 is the architecture and implementation doc. Use this index to find deep technical details — and to know **what NOT to build** based on V5's scope changes.

| Topic | V3 section(s) | What it covers | V5 status |
|-------|---------------|----------------|-----------|
| **Architecture** | V3 §2 | Full stack diagram, data flow, environment variables, network resilience | ✅ Keep |
| **Auth flow** | V3 §2.3, §3.2 | Native Supabase Auth + DP Relay SMS hook + Google OAuth | ✅ Keep |
| **Onboarding (fields)** | V3 §3.2.2 | Profile + financial identity fields | ⚠️ **Strip financial identity fields** (Section 5.3) |
| **Multi-account fraud** | V3 §3.3 | Phone + bKash + bank cross-reference | ⚠️ **Reduce to phone-only + device fingerprint** (Section 12.2) |
| **NID verification** | V3 §3.4 | Upload flow, admin review, badge logic | ✅ Keep (optional, post-signup) |
| **Product schema** | V3 §4.1 | All 26+ columns, types, sources | ⚠️ **Drop `remaining_quantity`, `expiry_date` complexity** (not needed on a listing board) |
| **Product state machine** | V3 §4.2 | draft → active → sold → completed | ⚠️ **Simplify to: draft → active → expired/deleted.** No `sold` state — we don't know if it's sold. |
| **Camera-first product entry** | V3 §4.5, §4.9.4 | ML Kit + Gemini flow, on-device vs cloud | ✅ Keep (as optional AI assist) |
| **AI diagnosis (Crop & Fish Doctor)** | V3 §4.10 | Cross-sell logic | ⏸️ Defer to V5.1 |
| **Buyer requirements (= Wishlist)** | V3 §5 | Schema, bid state machine, matching algorithm | ⚠️ **Reframe as Wishlist** (Section 11.2). No bidding, just public visibility. |
| **Order state machine** | V3 §6 | All states from pending to completed | ❌ **Remove entirely.** No orders. |
| **Transport payment state machine** | V3 §6, §8 | How buyer pays transporter | ❌ **Remove entirely.** No transport payments on platform. |
| **Boost algorithm** | V3 §7 | Ranking formula, tier weights, expiry | ✅ Keep (but locality breaks ties first) |
| **Manual payment verification** | V3 §8 | TrxID + screenshot, on-device OCR | ❌ **Remove entirely.** No payment verification. |
| **Search & discovery** | V3 §9 | tsvector setup, filters, autocomplete | ✅ Keep + extend for Wishlist + locality |
| **Notifications** | V3 §10 | Edge Function template, FCM delivery | ⚠️ **Reduce templates** (no payment events) |
| **In-app chat** | V3 §11 | Schema, Realtime subscriptions | ✅ Keep — this is now the **centerpiece** of buyer↔seller interaction |
| **Dispute resolution** | V3 §12 | Order-context disputes | ❌ **Replace with reporting-only** (Section 12.4) |
| **Admin panel** | V3 §13 | RBAC, audit log, payment queue | ⚠️ **Drop payment verification queue.** Keep user mgmt, reports, fraud flags, NID verification. |
| **Full database schema** | V3 §14 | All 25+ tables | ⚠️ **Drop `orders`, `transport_payments`, `payment_proofs`, `disputes` tables.** Add `wishlists`, `reports`, `blocks`. |
| **API contracts** | V3 §15 | PostgREST + Edge Function signatures | ⚠️ **Strip payment-related endpoints.** |
| **AI pipeline** | V3 §16 | Gemini prompts, ML Kit model, caching | ✅ Keep (smaller scope now) |
| **Offline-first strategy** | V3 §17 | Sync queue, conflict resolution | ✅ Keep |
| **Security** | V3 §18 | Rate limits, identifier blocklist, throttling | ⚠️ **Keep rate limits, drop identifier blocklist complexity** |
| **Bengali error catalog** | V3 §19 | 50+ error messages | ⚠️ **Drop payment error messages.** |
| **Deployment & monitoring** | V3 §20 | CI/CD, Sentry, PostHog | ✅ Keep |

---

## Appendix A — User Personas (lightweight)

The platform serves 4 broad user shapes. None of these are "account types" — they're behavioral patterns the same user moves between.

| Persona | Bengali | What they typically list | What they typically buy | Primary_label examples |
|---------|---------|--------------------------|--------------------------|-------------------------|
| The small farmer | ছোট কৃষক | Crops (own harvest) | Seed, fertilizer, pesticide | কৃষক |
| The specialized seller | বিশেষায়িত বিক্রেতা | One category deeply (e.g., fish feed only) | Whatever they need for the business | সার / ফিড / ওষুধ বিক্রেতা |
| The aggregator / trader | ব্যবসায়ী / ফড়িয়া | Whatever they can buy low and resell | Anything with margin | ব্যবসায়ী |
| The transporter | পরিবহন মালিক | Their vehicle's availability | Sometimes other goods | পরিবহন সেবাদাতা |

A user can be all four across a year. Especially the trader, who may also be a farmer in their own village.

---

## Appendix B — Listing Examples (real-world phrasing)

How a real farmer would phrase a listing, and what the system needs to handle.

| Bengali input | English gloss | System handling |
|---------------|---------------|-----------------|
| "আমার ৫০ কেজি ধান আছে, কেজি ৩৫ টাকা" | "I have 50 kg rice, 35 taka per kg" | Parse: title=ধান, qty=50, unit=কেজি, price=৳35 |
| "২টা গরু বিক্রি করব" | "Will sell 2 cows" | Parse: title=গরু, qty=2, unit=পিস, price=open |
| "রুই মাছ ১০ কেজি, জীবিত" | "Rui fish 10 kg, live" | Parse: title=রুই, qty=10, metadata={live:true} |
| "ভালো জাতের টমেটো বীজ, ১ প্যাকেট ৫০ টাকা" | "Good variety tomato seed, 1 packet 50 taka" | Parse: title=টমেটো বীজ, unit=প্যাকেট |
| "ঢাকা যাবে, কভার্ড ভ্যান, ২৫ নভেম্বর" | "Going to Dhaka, covered van, 25 Nov" | Category=transport, vehicle=covered_van |

The AI assist (Gemini) should parse these into structured fields. The fallback: user can always edit the parsed result.

---

## Appendix C — Why "Chashi Connection" (চাষী কানেকশন)

The name carries weight in two layers:

**Layer 1 — who it's for: চাষী (Chashi = farmer)**

The brand says it on the tin. A user sees the name and knows immediately: this is for me, the farmer. Not for middlemen, not for the platform, not for marketers. For the **চাষী** — the cultivator, the small-holder, the fish farmer, the poultry keeper, the seed seller. The plural "চাষী" (not "কৃষক" — farmer/grower) leans intentionally toward the rural Bengali dialect used in haats and villages. It feels local, not institutional.

**Layer 2 — what it does: কানেকশন (Connection)**

The product is a **connection**, not a transaction. The platform:
- connects a seller with a buyer
- connects a farmer with an input seller
- connects a transporter with someone who needs to move goods
- connects a wishlist (demand) with a future listing (supply)

We don't sell anything. We don't move anything. We don't process anything. We **connect** — that's the whole job.

Combined: **Chashi Connection = "the farmers' connection."** A free place where the people who grow Bangladesh's food can find each other, talk to each other, and deal with each other — without anyone taking a cut.

### Tagline

**"চাষী কানেকশন — কৃষকের নিজস্ব বাজার"** (Chashi Connection — farmers' own marketplace).

The phrase **"নিজস্ব বাজার"** (own marketplace) does heavy lifting: it asserts ownership. This is *their* platform, not a platform *targeting* them. The platform exists to serve them, not the other way around.

### Why not just "চাষী" alone (without "Connection")?

Two reasons:
1. **"চাষী" alone is a noun, not a product.** A name needs to suggest action or purpose. "Connection" tells you what the product does.
2. **"Connection" is a long-tail SEO play.** When someone searches "farmer connection Bangladesh" or "কৃষক সংযোগ," we want to surface. The word carries the function. **This is non-negotiable: every Wishlist (§11.2) must be a crawlable, indexable public page with Bengali schema markup — turning latent demand ("I need fertilizer in Sherpur") into organic acquisition fuel.** Wishlists are app-readable, web-crawlable, and indexed by default; a user can mark their wishlist private if they choose. This is the platform's #1 growth lever and the rationale for the name "Connection" — it exists to be searched and found.

### Why we keep the original haat imagery in the body of the product

Even though the brand is "Chashi Connection," the in-product copy still leans on **হাট** (haat) language wherever it fits — "আপনার এলাকার হাট," "হাটের দিন," "আজকের হাট." The haat is the cultural institution this product digitizes. "Chashi Connection" is the modern name; "হাট" is the soul.

---

## Appendix D — Glossary (Bengali ↔ English)

| Bengali | English | Notes |
|---------|---------|-------|
| কৃষক | Farmer | Generic; crop farmer is a subtype |
| হাট | Weekly village market | The cultural institution this product digitizes; referenced throughout the UI |
| চাষী কানেকশন | The product name (Chashi Connection) | The brand — appears in app header, notifications, splash screen |
| ফড়িয়া / আড়তদার | Middleman / Commission agent | Who we displace |
| বীজ | Seed | Product category |
| সার | Fertilizer | Product category |
| কীটনাশক | Pesticide | Product category |
| ভুট্টা | Maize | Example product |
| ধান | Paddy/rice | Example product |
| মণ | Mon (40 kg) | Common unit |
| কেজি | Kilogram | Default unit |
| ইউনিয়ন | Union | Admin level below upazila |
| উপজেলা | Upazila | Admin level below district |
| জেলা | District | Admin level below division |
| বিভাগ | Division | Top admin level |
| বিকাশ | bKash | Mobile payment |
| নগদ | Nagad | Mobile payment |
| বিক্রেতা | Seller | Contextual transactional role |
| ক্রেতা | Buyer | Contextual transactional role |
| পরিবহনকারী | Transporter | Contextual transactional role |
| যাচাইকৃত | Verified | NID-verified badge |

---

**End of PRD V5.0**

For implementation, see PRD-V3.md (deep technical architecture) and the section index in §19.
