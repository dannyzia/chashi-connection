# Product Requirements Document (PRD) — Version 4.0

**HaatBazar (হাটবাজার) — Agricultural Marketplace Platform**
**Mobile Application**
**Version 4.0 — Final Architect Blueprint (SvelteKit + Capacitor Client Architecture)**
**Prepared by: Senior Solution Architect**
**Target Audience: Technical Architect Agent**
**Classification: Internal — Technical**

---

## Table of Contents

1. [Executive Summary & V4 Changelog](#1-executive-summary--v4-changelog)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [User Roles, Authentication & Fraud Prevention](#3-user-roles-authentication--fraud-prevention)
4. [Product Listings & AI Integration](#4-product-listings--ai-integration)
5. [Marketplace Dynamics — Buyer Requirements & Transport Offers](#5-marketplace-dynamics--buyer-requirements--transport-offers)
6. [Transaction & Logistics Workflow — Complete State Machines](#6-transaction--logistics-workflow--complete-state-machines)
7. [Monetization — Product Boosting](#7-monetization--product-boosting)
8. [Payments & Financials — Manual Verification System](#8-payments--financials--manual-verification-system)
9. [Search, Discovery & Recommendation Engine](#9-search-discovery--recommendation-engine)
10. [Notification System](#10-notification-system)
11. [Chat & Messaging System](#11-chat--messaging-system)
12. [Dispute Resolution System](#12-dispute-resolution-system)
13. [Admin Panel Specifications](#13-admin-panel-specifications)
14. [Complete Database Schema](#14-complete-database-schema)
15. [API Architecture & Contracts](#15-api-architecture--contracts)
16. [AI Implementation Strategy](#16-ai-implementation-strategy)
17. [Offline-First & Performance Strategy](#17-offline-first--performance-strategy)
18. [Security Architecture](#18-security-architecture)
19. [Localization & Bengali UI Catalog](#19-localization--bengali-ui-catalog)
20. [Deployment, CI/CD & Monitoring](#20-deployment-cicd--monitoring)
21. [Risk Matrix & Mitigation](#21-risk-matrix--mitigation)
22. [Appendices](#22-appendices)

---

## 1. Executive Summary & V4 Changelog

### 1.1 Project Vision

HaatBazar (হাটবাজার) is a **mobile-only** agricultural marketplace connecting **Farmers (কৃষক)**, **Buyers (ক্রেতা)**, and **Transport Companies (পরিবহন কোম্পানি)** across Bangladesh. The platform charges **zero commission** on all trades. Revenue is generated **exclusively through paid product boosting**. The entire user interface — every screen, button, label, notification, error message, and in-app communication — is **exclusively in Bengali (Bangla script)**.

### 1.2 Core Design Principles

| Principle | Implementation |
|-----------|---------------|
| Zero Commission | 0% fee on all product sales and transport bookings. Displayed prominently on every transaction confirmation screen. |
| Farmer-First UX | Minimal-tap workflows. AI auto-fills descriptions. Large touch targets (min 48dp) for outdoor/field use. |
| Manual-Payment Native | System designed ground-up for screenshot-based payment verification. No payment gateway dependency. |
| Anti-Fraud by Default | Every financial identifier (Phone, bKash, Bank Account) is cross-referenced at registration, profile update, and payment proof upload stages. |
| Offline-Resilient | Forms, product listings, and drafts work fully offline. Background sync queue processes when connectivity returns. |
| Bengali-Native | Not a translation layer over English — Bengali is the **primary and only** language. All server-side notification templates, AI prompts, and error messages generate Bengali text natively. |

### 1.3 Key Stakeholders

| Stakeholder | Role in System | Primary Concern |
|-------------|---------------|-----------------|
| User (ব্যবহারকারী) | Any registered user can list & sell products, purchase products from others, post transport offers, bid on RFQs, and post buyer requirements — all within one account. In any transaction, the user who listed the product is contextually the **Seller (বিক্রেতা)**, the user who placed the order is the **Buyer (ক্রেতা)**, and the user whose transport offer is assigned is the **Transporter (পরিবহনকারী)**. These are transactional labels, not permanent account types. | Ease of use, fast payment verification, fair pricing, reliable transport |
| Platform Admin (অ্যাডমিন) | Verifies payments, resolves disputes, manages fraud flags | Efficient verification queue, fraud detection, SLA compliance |

### 1.4 Critical Improvements over V2

This version resolves **14 architectural gaps** identified in the V2 review:

| # | Area | V2 Gap | V3 Resolution |
|---|------|--------|---------------|
| 1 | Database Schema | JSONB array for RFQ bids (anti-pattern, no indexing, no referential integrity) | Normalized `rfq_bids` table with proper FK constraints, indexes, and status tracking per bid |
| 2 | Database Schema | Missing tables: buyer_requirements, ratings, chat_messages, chat_threads, audit_log, wallet_transactions, product_categories, notification_log, user_verification, product_images, order_status_history, product_ai_cache | All **12 missing tables** added with full constraints, indexes, and RLS policies |
| 3 | Transport Payment | No flow defined for how Buyer pays the Transporter after delivery | Complete transport payment state machine with separate `transport_payments` table and manual verification flow |
| 4 | Search & Filters | No product search or filter specification | Full-text Bengali search using PostgreSQL `tsvector` + category/location/price range filters with sort options |
| 5 | Location Strategy | Vague "string matching + radius" with no implementation detail | Bangladesh Division > District > Upazila hierarchy stored in `locations` reference table (~567 rows, seeded at deploy) with optional lat/lng for future distance-based matching |
| 6 | Boost Algorithm | "Visibility multiplier" mentioned but no ranking algorithm defined | Concrete feed ranking formula: `score = base_recency_score + (boost_tier_weight * is_active_boost) + verified_seller_bonus + rating_factor` |
| 7 | Partial Quantities | No handling when Buyer wants a subset of a listing (e.g., 3kg from a 10kg listing) | Partial purchase flow with real-time inventory deduction, `remaining_quantity` field on products, and auto-status change when quantity hits zero |
| 8 | Cancellation Policy | No cancellation rules or penalties defined | Tiered cancellation policy: free before payment proof, cooldown penalty after payment verified, restricted after transport assigned |
| 9 | Chat System | Referenced in dispute flow but no schema, API, or UI flow defined | Complete in-app messaging system with order-context threads, `chat_threads` and `chat_messages` tables, and Supabase Realtime subscriptions |
| 10 | Admin System | No admin role definition, no admin RBAC, no audit trail | Full admin panel spec with role-based access (super_admin, payment_verifier, dispute_resolver), `admin_users` table, and `audit_log` table tracking every admin action |
| 11 | Bengali Error Catalog | No standardized Bengali error/validation messages | 50+ Bengali error messages cataloged in Section 19 covering validation, auth, payment, and system errors |
| 12 | Image Storage | No strategy for upload, compression, CDN, or content moderation | Supabase Storage pipeline: client-side compression (max 1024px, 80% JPEG quality) → signed URL upload → Edge Function trigger for NSFW check → CDN delivery via Cloudflare |
| 13 | Rate Limiting | Not specified for any endpoint | Per-endpoint rate limits defined (e.g., 5 req/min for AI describe, 30 req/min for listing browse, 3 req/min for payment proof upload) |
| 14 | Data Retention | Not specified | Retention policies for all data categories: active data (indefinite), soft-deleted accounts (90 days), audit logs (2 years), chat messages (1 year post-order completion), AI cache (30 days) |

### 1.5 Scope Boundaries

**In Scope (MVP):**
- Farmer product listing with AI-assisted descriptions
- Buyer browsing, purchasing, and transport arrangement
- Transport company offer posting and RFQ bidding
- Manual payment verification (screenshot + transaction ID)
- Product boosting (paid feature)
- In-app chat (order-context only)
- Push and in-app notifications in Bengali
- Admin panel for payment verification, fraud management, and dispute resolution
- Offline draft support for product listings and RFQs

**Out of Scope (Future Phases):**
- Automated payment gateway integration (bKash API, Nagad API, Stripe)
- Real-time GPS tracking of transport vehicles
- Multi-language support (English, Hindi)
- Web application (admin panel is web; marketplace is mobile-only)
- Crop price prediction / market intelligence features
- Integration with government agricultural databases
- Video uploads for product listings
- Group buying / bulk auction features

### 1.6 V4.0 Client Architecture Migration (This Revision)

This revision formalizes the V4.0 client baseline (SvelteKit + Capacitor), **removes Firebase Auth** in favour of native Supabase Auth with a proprietary SMS gateway, and adds two camera-first AI capabilities. The domain model, transactional tables (`orders`, `disputes`, `transport_offers`), state machines, payment workflows, and the **zero-commission policy** are **unchanged**.

| # | Area | V4.0 Specification |
|---|------|--------------------|
| 1 | Mobile Framework | SvelteKit (Svelte 5 Runes) SPA via `@sveltejs/adapter-static`, wrapped in Capacitor 6+ (modern Android System WebView) |
| 2 | Offline Database | `@capacitor-community/sqlite` with explicit `schemaVersion` migration hooks (Section 2.7) |
| 3 | Authentication | **Native Supabase Auth** via `@supabase/supabase-js` — Google OAuth + Phone OTP. Firebase Auth and the Firebase→Supabase JWT bridge are **removed**. OTP delivery: Supabase **Send SMS Hook** → `POST /functions/v1/sms-hook` → proprietary gateway `https://dprelay.digital-papyrus.com` (Section 2.3) |
| 4 | On-Device AI | **Google ML Kit** via Capacitor plugins — offline image labeling (bundled custom TFLite model), barcode scanning, OCR text recognition (Sections 2.1, 4.4.3, 8.12.1) |
| 5 | Camera-First Product Entry | **"পণ্য স্ক্যান করুন" (Scan Product)** — ML Kit categorizes offline and auto-selects `category_id`; Gemini 1.5 Flash auto-fills title, short/long description, and quality metrics when online. The farmer types only **price and quantity** (Sections 4.5, 4.9.4) |
| 6 | New Feature: "ফসল ও মাছের ডাক্তার" | AI pathology diagnosis (`ai-diagnose`) for diseased crops and sick fish, with automatic marketplace cross-selling of the required pesticides/treatments (Section 4.10) |
| 7 | On-Device Payment OCR | `@capacitor-mlkit/text-recognition` extracts the Transaction ID and amount on-device **before** the screenshot is uploaded; server-side comparison and risk scoring are unchanged (Section 8.12) |
| 8 | Constraints preserved | Zero commission; all UI/system text in Bengali; Android 11+ Go Edition, 1GB RAM, 2G/3G; APK < 6MB; no `backdrop-filter: blur()`, no Virtual DOM diffing |

---

## 2. System Architecture Overview

### 2.1 Technology Stack (Recommended)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Mobile Framework | SvelteKit (Svelte 5 with Runes) + `@sveltejs/adapter-static` | Single TypeScript codebase for Android + iOS. Built as a static SPA bundle and served from the Capacitor WebView container. Svelte 5 Runes provide compile-time reactive state with fine-grained DOM updates — no Virtual DOM diffing. Bengali/Bangla rendering via self-hosted WOFF2 fonts bundled in the app. |
| Native Wrapper | Capacitor 6+ | Wraps the modern Android System WebView (Chromium-based) inside a native Android/iOS shell with typed plugin bridges to camera, SQLite, FCM, biometrics, and a custom TFLite plugin. Web assets ship inside the APK — no remote shell download, no WebView upgrade dependency. |
| State Management | Svelte 5 Native Runes (`$state`, `$derived`, `$effect`) + Context API | Compile-time reactive signals that update only the DOM nodes reading the changed state. Fine-grained, testable, and async-friendly for offline-first patterns. Context API scopes per-feature stores without a global DI container. |
| Local Database (Offline-First) | `@capacitor-community/sqlite` | Native SQLite access through the Capacitor bridge with persistent `schemaVersion` migration handling. Stores offline drafts, cached listings, pending sync queue. Local tables mirror the server columns needed for offline reads and local search. |
| Hardware Integration | `@capacitor/camera` (capture + gallery), Web Speech API / `@capacitor-community/speech-recognition` (Bengali voice input), `@capacitor/device` (device info, fingerprint signals) | Native hardware access via typed Capacitor plugin bridges instead of browser-only APIs. |
| Typography & Assets | Self-hosted local WOFF2 Bengali fonts (`Noto Sans Bengali` / `Hind Siliguri`) packaged inside the APK | Zero runtime font CDN requests — mandatory on 2G/3G rural networks and for the sub-6MB APK budget. No `backdrop-filter: blur()` or other GPU-intensive CSS filters in the client UI. |
| Backend | Supabase (self-hosted or cloud) | Managed PostgreSQL 15+, built-in Auth, PostgREST auto-generated APIs, Realtime WebSocket subscriptions, Row Level Security (RLS), Edge Functions (Deno runtime). |
| Authentication | Native Supabase Auth via `@supabase/supabase-js` (Google OAuth + Phone OTP) | Firebase Auth is fully removed. Phone OTP is delivered through the **Supabase Send SMS Hook** → Edge Function `/functions/v1/sms-hook` → proprietary gateway `https://dprelay.digital-papyrus.com`. Supabase (GoTrue) issues the session JWT directly; `users.id` = `auth.users.id`. |
| AI Processing | Google Gemini 1.5 Flash (via Supabase Edge Functions) + Google ML Kit (on-device) | Cloud-based Bengali description generation and pathology diagnosis. On-device Google ML Kit with a bundled custom TFLite model handles offline image labeling / crop classification — executed natively through a custom Capacitor plugin, never TensorFlow.js inside the WebView (RAM spikes on 1GB devices). |
| On-Device AI / Vision | Google ML Kit via Capacitor plugins: `@capacitor-mlkit/text-recognition` (OCR), `@capacitor-mlkit/barcode-scanning` (barcode / QR), custom `HaatBazarTFLite` plugin wrapping ML Kit Image Labeling with the bundled custom TFLite crop model | Fully offline, on-device inference on Android 11+ Go Edition — no cloud call and no data usage on 2G/3G fields. Powers camera-first product entry (Section 4.9.4), Crop & Fish Doctor pre-screening (Section 4.10), and payment screenshot OCR (Section 8.12.1). |
| Image Storage | Supabase Storage + Cloudflare CDN | Signed URL uploads directly from client. Supabase Storage triggers for post-upload processing. Cloudflare for edge caching in Bangladesh. |
| Push Notifications | `@capacitor-firebase/messaging` (FCM — push delivery only) | The **only** remaining Firebase dependency, used exclusively for push notification delivery (no Firebase Auth). Native FCM token management and notification routing; supports topic-based subscriptions for broadcast notifications (e.g., new buyer requirements by region). |
| Realtime | Supabase Realtime (WebSocket) | Postgres CDC (Change Data Capture) for order state changes, chat messages, RFQ bid updates. Client subscribes to filtered channels. |
| Cron / Scheduler | Supabase pg_cron extension + Edge Function triggers | In-database scheduled jobs for: order timeout enforcement, boost expiry checks, stale listing cleanup, fraud pattern batch analysis. Runs every 5 minutes. |
| Analytics | PostHog (self-hosted recommended) | User funnel tracking, feature adoption metrics, fraud pattern detection via cohort analysis. Self-hosted avoids data sovereignty issues for Bangladeshi user data. |
| Error Monitoring | Sentry (SvelteKit Browser SDK + Capacitor Native SDK + Edge Function SDK) | Real-time crash reporting (JS and native), API error tracking, performance monitoring with release-based filtering. |
| CI/CD | GitHub Actions | Automated build, test, and deploy pipelines for SvelteKit (adapter-static build → `npx cap sync` → Gradle APK/AAB) and Supabase Edge Functions. |
| Target Devices & Client Budget | Android 11–13 (Go Edition), 1GB–2GB RAM, 2G/3G rural networks | APK/AAB size target **< 6MB**. Client UI must avoid heavy DOM operations, Virtual DOM diffing, and GPU-intensive CSS filters (`backdrop-filter: blur()`). Long lists are virtualized; only 5–6 items exist in the DOM at any time (Section 4.9, Section 17.6). |

### 2.2 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│     MOBILE CLIENT — SvelteKit Webview App (Capacitor Container)      │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────────┐  │
│  │ UI Layer │  │ Svelte 5 │  │@capacitor-│  │ Sync Queue        │  │
│  │ (Bengali)│  │  Runes & │  │ community │  │ (Offline → Online)│  │
│  │ (Svelte) │→ │  Stores  │→ │ /sqlite   │→ │ (SQLite mirror)   │  │
│  └──────────┘  └────┬─────┘  └───────────┘  └────────┬──────────┘  │
│                      │                                 │             │
│  ┌───────────────────┴─────────────────────────────────┴──────────┐ │
│  │            Supabase JS Client (@supabase/supabase-js)           │ │
│  │  • REST (PostgREST)  • Realtime (WS)  • Storage  • Auth       │ │
│  └───────────────────────────────┬─────────────────────────────────┘ │
│                                  │                                   │
│  ┌──────────────────┐   ┌───────┴──────────┐                       │
│  │ Supabase Auth SDK │   │ FCM (Push)       │                       │
│  │ (Google + OTP)    │   │ Notifications    │                       │
│  └────────┬──────────┘   └───────┬──────────┘                       │
└───────────┼──────────────────────┼──────────────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Supabase Auth     │    │  Firebase Cloud  │    │  DP Relay SMS   │
│  (Google OAuth +   │    │  Messaging       │    │  Gateway        │
│   Phone OTP)       │    │  (FCM Server)    │    │  (sms-hook)     │
└────────┬──────────┘    └─────────────────┘    └─────────────────┘
         │ JWT
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   PostgreSQL 15+ Database                     │   │
│  │                                                               │   │
│  │  • 25+ Tables (see Section 14)                               │   │
│  │  • Row Level Security (RLS) on all user-facing tables        │   │
│  │  • pg_cron for scheduled jobs (every 5 min)                  │   │
│  │  • pg_trgm + tsvector for Bengali full-text search           │   │
│  │  • Database Functions (plpgsql) for fraud checks             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │  PostgREST API  │  │  Realtime       │  │  Storage           │  │
│  │  (Auto REST)    │  │  (WebSocket     │  │  (S3-compatible)   │  │
│  │                 │  │   CDC streams)  │  │                    │  │
│  └─────────────────┘  └─────────────────┘  └────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Edge Functions (Deno)                       │   │
│  │                                                               │   │
│  │  POST /functions/v1/sms-hook                                 │   │
│  │    → Supabase Send SMS Hook → format Bengali OTP → DP Relay  │   │
│  │                                                               │   │
│  │  POST /functions/v1/ai-describe                              │   │
│  │    → Proxy to Gemini 1.5 Flash API for Bengali descriptions  │   │
│  │                                                               │   │
│  │  POST /functions/v1/ai-diagnose                              │   │
│  │    → Gemini 1.5 Flash diagnosis + treatment cross-sell links │   │
│  │                                                               │   │
│  │  POST /functions/v1/fraud-check                              │   │
│  │    → Cross-reference phone/bKash/bank across user_identifiers│   │
│  │                                                               │   │
│  │  POST /functions/v1/match-transport                          │   │
│  │    → Route + capacity matching algorithm                     │   │
│  │                                                               │   │
│  │  POST /functions/v1/send-notification                        │   │
│  │    → Compose Bengali message → send via FCM Admin SDK        │   │
│  │                                                               │   │
│  │  POST /functions/v1/admin/*                                  │   │
│  │    → Payment verification, dispute resolution, user mgmt     │   │
│  │                                                               │   │
│  │  POST /functions/v1/storage-webhook                          │   │
│  │    → Post-upload: image compression, NSFW check, thumbnail   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Google Gemini     │  │ Google Maps      │  │ Sentry           │  │
│  │ 1.5 Flash API    │  │ Platform         │  │ Error Tracking   │  │
│  │ (AI Descriptions)│  │ (Optional Geocode)│  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │ Cloudflare CDN   │  │ PostHog          │                        │
│  │ (Image Delivery) │  │ (Analytics)      │                        │
│  └──────────────────┘  └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Authentication: Native Supabase Auth + Proprietary SMS Gateway Hook

Firebase is fully removed. Authentication runs **natively on Supabase Auth (GoTrue)** through `@supabase/supabase-js`: Phone OTP as the primary Bangladeshi identity and Google OAuth as the secondary path. Because no third-party SMS vendor is used, every OTP is delivered through the **Supabase Send SMS Hook**, which relays the message via the proprietary DP Relay gateway.

**Phone OTP Flow (Send SMS Hook):**
1. Client calls `supabase.auth.signInWithOtp({ phone })` — no password, no Firebase.
2. Supabase Auth (GoTrue) generates the OTP and fires the configured **Send SMS Hook** instead of a third-party SMS provider.
3. The hook invokes the Edge Function webhook: `POST /functions/v1/sms-hook` (service-role secret, internal only).
4. The Edge Function formats the Bengali OTP message:
   `"হাটবাজার ভেরিফিকেশন কোড: {otp}. কোডটি কারও সাথে শেয়ার করবেন না।"` (the same template is used for sensitive-action re-verification, Section 3.2.3)
5. The Edge Function relays the message via HTTP POST to the proprietary gateway `https://dprelay.digital-papyrus.com` with `Authorization: Bearer $SMS_GATEWAY_API_KEY` and payload `{ "to": "+8801XXXXXXXXX", "message": "<bengali text>", "source": "haatbazar-otp" }`.
6. The user receives the Bengali OTP by SMS and the client completes login with `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
7. Supabase returns the Supabase session (access + refresh JWT). The client stores the session and uses it for all subsequent PostgREST and Realtime calls.
8. RLS policies on all tables reference `auth.uid()` which maps to the Supabase session user.

**Google OAuth Flow (secondary):**
- The client obtains a Google ID Token from the native Google Sign-In plugin and exchanges it via `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- GoTrue verifies the ID token against Google's public JWKS (OpenID Connect) and issues the same Supabase session. The Google account sub is stored in `users.google_uid`.

**User Provisioning (V4.0 — no intermediary auth bridge):**
- A Postgres trigger `handle_new_auth_user()` on `auth.users` INSERT creates the matching `public.users` row (`id = auth.users.id`, `is_profile_complete = false`).
- After sign-in, the client calls `POST /functions/v1/auth-status` (Supabase JWT) which returns `{ user_profile, is_profile_complete, is_suspended }`. If the account is suspended or banned, the function revokes the session via `supabase.auth.admin.signOut()` and the client routes to the suspended-account screen.

**Send SMS Hook Contract (Edge Function `sms-hook`):**

| Property | Value |
|----------|-------|
| Trigger | Supabase Auth "Send SMS" hook (shared with the Section 3.2.3 sensitive-action OTP) |
| Auth | Internal only — Supabase service-role secret; never exposed to the client |
| Downstream | `POST https://dprelay.digital-papyrus.com` (proprietary DP Relay gateway) |
| Message language | Bengali only, single 160-char segment target |
| Failure handling | Retry ×2 with 2s backoff; on final failure the OTP error surfaces to the client: "এসএমএস পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।" |
| Throttling | Gateway-side per-number OTP throttle (3 OTP/hour) re-enforced in the hook (Section 18.4) |

**Token Refresh:**
- Supabase access tokens expire after 1 hour; `@supabase/supabase-js` auto-refreshes them using the 7-day refresh token.
- The client-side interceptor detects 401 responses and forces a silent token refresh.

**Critical Constraint:** The `users.id` (UUID) in Supabase must be the **same** as the Supabase Auth user ID (`auth.users.id`); rows are created by the `handle_new_auth_user()` trigger. `users.phone` is the primary identity (`UNIQUE`) and `users.google_uid` stores the Google account sub for OAuth cross-reference only.

### 2.4 Bangladesh Location Hierarchy

Instead of raw lat/lng (unreliable and unfamiliar for rural Bangladeshi users), use a **structured administrative hierarchy**:

| Level | Bengali Label | Example | Approximate Count |
|-------|--------------|---------|-------------------|
| Division (বিভাগ) | বিভাগ | রাজশাহী | 8 |
| District (জেলা) | জেলা | বগুড়া | 64 |
| Upazila (উপজেলা) | উপজেলা | শেরপুর | ~495 |

**Implementation:**
- The `locations` table is a **self-referencing hierarchy** with `parent_id`:
  - Division rows have `parent_id = NULL` and `level = 'division'`
  - District rows reference their Division via `parent_id` and `level = 'district'`
  - Upazila rows reference their District via `parent_id` and `level = 'upazila'`
- Total ~567 rows, **seeded at deployment** from a JSON fixture file.
- Each row optionally stores `lat` and `lng` (centroid) for future distance-based matching.
- Products, Transport Offers, Buyer Requirements, and RFQs reference `location_id` (FK to `locations`) at the **Upazila level** for precision.
- **Transport Route Matching Algorithm:**
  1. Extract `from_location_id` and `to_location_id` from order/RFQ.
  2. Resolve both to their parent **District** IDs.
  3. Query `transport_offers` where `from_district_id = order.from_district_id AND to_district_id = order.to_district_id`.
  4. If no exact district match, expand to **Division** level match.
  5. Filter by `capacity_ton >= order.weight_ton` and `available_date <= order.preferred_date`.
  6. Sort by price ascending, then by rating descending.

**UI Behavior:**
- Location selection uses a **cascading dropdown**: Division → District → Upazila.
- Dropdowns are cached locally in `@capacitor-community/sqlite` for offline use.
- Bengali labels are stored in the `locations.name_bn` column.

### 2.5 Data Flow Summary (Request Lifecycle)

```
[User Action in Bengali UI]
        │
        ▼
[Svelte 5 Runes / Component Controller]
        │
        ├── [Offline?] → Store in @capacitor-community/sqlite sync queue → [When online] → Continue below
        │
        ▼
[@supabase/supabase-js Client SDK]
        │
        ├── Simple CRUD → PostgREST (auto-generated REST from Postgres schema + RLS)
        │
        ├── Business Logic → Edge Function (fraud check, AI describe, transport match)
        │
        ├── File Upload → Supabase Storage (signed URL) → Post-upload webhook
        │
        └── Subscribe → Realtime WebSocket (order state changes, chat, bids)
                │
                ▼
        [PostgreSQL processes request]
                │
                ├── RLS Policy Check (does user own this resource?)
                ├── Trigger: update `updated_at` timestamps
                ├── Trigger: insert into `audit_log` for admin actions
                ├── Trigger: insert into `notification_queue` for state changes
                └── Trigger: update `order_status_history` on state transitions
                │
                ▼
        [Response returned to client]
                │
                ▼
        [Svelte 5 Runes update reactive state]
                │
                ▼
        [SvelteKit UI patches only the affected DOM nodes with Bengali content]
```

### 2.6 Environment Configuration

The system requires the following environment variables, managed per deployment environment:

| Variable | Used By | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | SvelteKit Client | Supabase project URL |
| `SUPABASE_ANON_KEY` | SvelteKit Client | Supabase anonymous/public key (safe to embed in app) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Full-access key for admin operations. NEVER in client. |
| `SMS_GATEWAY_URL` | Edge Functions only | Proprietary DP Relay SMS gateway base URL (`https://dprelay.digital-papyrus.com`) used by the Send SMS Hook |
| `SMS_GATEWAY_API_KEY` | Edge Functions only | Bearer token for the DP Relay SMS gateway. NEVER in client. |
| `GEMINI_API_KEY` | Edge Functions | Google Gemini 1.5 Flash API key for AI descriptions and diagnostics |
| `SENTRY_DSN` | SvelteKit Client, Edge Functions | Sentry error tracking endpoint |
| `POSTHOG_API_KEY` | SvelteKit Client | Analytics tracking key |
| `CDN_BASE_URL` | SvelteKit Client | Cloudflare CDN base URL for image delivery |
| `FCM_SERVER_KEY` | Edge Functions | Firebase Cloud Messaging server key for push notifications |

**Security Rule:** `SUPABASE_SERVICE_ROLE_KEY`, `SMS_GATEWAY_API_KEY`, `GEMINI_API_KEY`, and `FCM_SERVER_KEY` must **never** be included in the mobile app binary. They exist only in Edge Function environment secrets.

### 2.7 Network Resilience Strategy

Given that target users (farmers) operate in rural Bangladesh with unreliable 2G/3G connectivity:

| Scenario | Client Behavior |
|----------|----------------|
| No connectivity | All reads served from the `@capacitor-community/sqlite` local cache. All writes (new listing, RFQ, payment proof) queued in `sync_queue` table in `@capacitor-community/sqlite`. User sees Bengali toast: "অফলাইন মোড — ইন্টারনেট সংযোগ হলে স্বয়ংক্রিয়ভাবে আপলোড হবে।" |
| Intermittent connectivity | Sync queue processes items in FIFO order. Each item retried 3 times with exponential backoff (2s, 8s, 32s). Failed items marked for manual retry. |
| Slow connectivity (>5s response) | Image uploads use resumable uploads via Supabase Storage `tus` protocol. API calls have 15-second timeout with automatic retry. |
| Connectivity restored | Background sync runner (Capacitor Background Task via `@capacitor/background-runner`, executing the queue logic inside a Web Worker) processes the sync queue. User sees Bengali toast: "সংযোগ ফিরে এসেছে — ডেটা সিঙ্ক হচ্ছে..." |

**Conflict Resolution (Sync Queue):**
- **Last-write-wins** for profile updates.
- **Server-authoritative** for order state changes (client cannot override server state).
- **Merge** for product listing edits (client changes merged with server version; conflicts flagged for user review).
- **Idempotency keys** attached to every write operation to prevent duplicate submissions on retry.

**Local Schema Mirroring & Migration Strategy:**

The device database is a **mirror of the server schema subset** that is required offline — never a separately designed store:

- Local SQLite tables (`products_draft`, `sync_queue`, `cached_products`, `cached_locations`, `cached_orders`, `chat_cache`) mirror the corresponding PostgreSQL tables from Section 14 column-for-column where the column is needed offline (identical names and types, `TIMESTAMPTZ` → `INTEGER` Unix-ms, `UUID` → `TEXT`).
- Migrations are driven by the explicit `schemaVersion` hook of `@capacitor-community/sqlite`: the connection is opened with a version number and an ordered list of `up` statements per version. Native Android uses the bundled SQLite engine; web/SPA preview builds use the `jeep-sqlite` (WASM) implementation behind the same API.
- Version bumps are **additive only** (new tables, new nullable columns, new indexes). Destructive changes are never executed on the device database — local rows are superseded by server truth on the next sync and pruned by the retention job.
- Connectivity/consistency is checked on every open (`checkConnectionsConsistency()` + version read) so a migration interrupted by an OS kill is replayed from the last committed version.
- The client `schemaVersion` is bumped in the **same release** as the server migration; the client never issues a query for a column that does not exist in its mirrored local version.
- The `sync_queue` table is never dropped or recreated during migration, so pending offline writes always survive an app update.

---

## 3. User Roles, Authentication & Fraud Prevention

### 3.1 User Model & Permissions Matrix

The system defines **two** user types: **User (ব্যবহারকারী)** (customer-facing, mobile app) and **Admin (অ্যাডমিন)** (internal, web panel). All Users have identical capabilities — there are no role-based restrictions between customers.

**Contextual Transaction Labels:**
In any given transaction, the following labels are applied contextually and are **not** permanent account attributes:
- **Seller (বিক্রেতা)** — the User who created the product listing in that order.
- **Buyer (ক্রেতা)** — the User who placed the purchase order.
- **Transporter (পরিবহনকারী)** — the User whose transport offer is assigned to that order.

| Permission / Action | User (ব্যবহারকারী) | Admin (অ্যাডমিন) |
|---------------------|:---:|:---:|
| Create product listing | ✅ | ❌ |
| Edit own product listing | ✅ | ✅ (override) |
| Browse product listings | ✅ | ✅ |
| Purchase any product (except own) | ✅ | ❌ |
| Post buyer requirement | ✅ | ❌ |
| Post transport offer | ✅ | ❌ |
| Bid on RFQ | ✅ | ❌ |
| Create RFQ | ✅ | ❌ |
| Boost own product listing | ✅ | ✅ (manual activate) |
| Upload payment proof (order, transport, or boost) | ✅ | ❌ |
| Verify payment proof | ❌ | ✅ |
| Raise dispute | ✅ | ❌ (mediates only) |
| Resolve dispute | ❌ | ✅ |
| View/manage fraud flags | ❌ | ✅ |
| Suspend/ban user | ❌ | ✅ |
| Send chat message (order context) | ✅ | ✅ (dispute context) |
| Rate counterparty after transaction | ✅ | ❌ |
| View own analytics | ✅ | ✅ (platform-wide) |

**User Account Rules:**
- Every registered account has identical capabilities from the moment onboarding is complete. No role selection is required.
- A user **cannot purchase their own listing**. Business logic enforces: `order.buyer_id ≠ product.listed_by_user_id`.
- A user **cannot bid on their own RFQ**. Business logic enforces: `rfq_bid.bidder_id ≠ rfq.created_by_user_id`.
- A user **cannot rate themselves**. Ratings are only permitted between the two counterparties of a completed transaction.
- A user **cannot boost another user's listing**. Boost is only available for listings owned by the requesting user.

### 3.2 Authentication Flow — Complete Technical Specification

#### 3.2.1 Primary Authentication: Native Supabase Auth (Phone OTP + Google)

Phone OTP is the **primary** login path for rural users (no Google account required); Google OAuth is the secondary path. Both run natively on Supabase Auth (GoTrue) — no Firebase, no bridge.

**Sequence — Phone OTP (primary, delivered via the Send SMS Hook):**

```
[User] → Enters mobile number (01XXXXXXXXX) → Taps "ওটিপি দিয়ে লগইন করুন"
   │
   ▼
[SvelteKit App] → supabase.auth.signInWithOtp({ phone: '+8801XXXXXXXXX' })
   │
   ▼
[Supabase Auth (GoTrue)] → Generates 6-digit OTP → Fires the Send SMS Hook
   │
   ▼
[Edge Function: POST /functions/v1/sms-hook]
   │             Formats the Bengali message:
   │             "হাটবাজার ভেরিফিকেশন কোড: {otp}. কোডটি কারও সাথে শেয়ার করবেন না।"
   │             → HTTP POST → https://dprelay.digital-papyrus.com
   │
   ▼
[SvelteKit App] → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
   │
   ▼
[Supabase Auth (GoTrue)] → Issues the Supabase session:
   │               • users.id = auth.users.id (row auto-created by handle_new_auth_user() trigger)
   │               • access_token (JWT, 1h) + refresh_token (7d)
   │               • phone identity + phone_verified = true
   │
   ▼
[SvelteKit App] → Calls Supabase Edge Function: POST /functions/v1/auth-status
   │
   ▼
[Edge Function: auth-status]
   │
   ├── [User EXISTS and is_suspended = false]
   │     → Return { user_profile, is_profile_complete }
   │
   └── [User EXISTS and is_suspended = true or is_banned = true]
         → supabase.auth.admin.signOut() — session revoked
         → Return 403: "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে। সহায়তার জন্য যোগাযোগ করুন।"
   │
   ▼
[SvelteKit App]
   │
   ├── [is_profile_complete = true] → Navigate to Home Dashboard (role-specific)
   │
   └── [is_profile_complete = false] → Navigate to Onboarding Screen
```

**Sequence — Google OAuth (secondary):**

```
[User] → Taps "গুগল দিয়ে লগইন করুন" button
   │
   ▼
[SvelteKit App] → Native Google Sign-In (Capacitor Google Sign-In plugin) → receives the Google ID Token
   │
   ▼
[SvelteKit App] → supabase.auth.signInWithIdToken({ provider: 'google', token: <id_token> })
   │
   ▼
[Supabase Auth (GoTrue)] → Verifies the Google ID Token against Google's public JWKS (OpenID Connect)
   │               • Stores the Google account sub in users.google_uid
   │               • Issues the Supabase session (access + refresh JWT)
   │
   ▼
[SvelteKit App] → POST /functions/v1/auth-status → same routing as the Phone OTP flow
```

#### 3.2.2 Onboarding Flow (First-Time Users)

After initial sign-in (Phone OTP or Google), if `is_profile_complete = false`, the user enters a **mandatory 2-step onboarding wizard**. There is no role selection — all users have equal capabilities from the start.

**Step 1: Profile & Financial Identity (আর্থিক তথ্য)**

| Field | Bengali Label | Validation | Required |
|-------|-------------|------------|----------|
| Full Name | পুরো নাম | 2-200 characters, Bengali/English | Yes |
| Phone Number | মোবাইল নম্বর | Regex: `^01[3-9]\d{8}$` (11-digit Bangladeshi mobile) | Yes |
| bKash ID | বিকাশ নম্বর | Regex: `^01[3-9]\d{8}$` (same as mobile format) | Yes |
| Bank Account Number | ব্যাংক হিসাব নম্বর | Regex: `^\d{10,17}$` (10-17 digit numeric) | Yes |
| Bank Name | ব্যাংকের নাম | Dropdown from predefined list of Bangladeshi banks | Yes |
| Bank Routing Number | ব্যাংক রাউটিং নম্বর | Regex: `^\d{9}$` (9-digit numeric) | Yes |
| Location | আপনার এলাকা | Division → District → Upazila cascade selector | Yes |
| Business / Farm Name | ব্যবসা বা খামারের নাম (ঐচ্ছিক) | 3-200 characters, Bengali/English | No (optional for all users) |

**CRITICAL — Fraud Check Execution Point:**
Before saving Step 1, the system calls `POST /functions/v1/fraud-check` synchronously. See Section 3.3 for full fraud check logic.

**Step 2: Phone OTP Verification (মোবাইল যাচাইকরণ)**

1. System sends OTP to the phone number provided in Step 1 via **native Supabase Phone Auth — Send SMS Hook → DP Relay gateway** (Section 2.3). Bengali message template: "হাটবাজার ভেরিফিকেশন কোড: {otp}. কোডটি কারও সাথে শেয়ার করবেন না।"
2. User enters 6-digit OTP.
3. On verification success → `users.phone_verified = true`.
4. On 3 failed attempts → Lock OTP for 30 minutes. Bengali message: "অনেকবার ভুল কোড দেওয়া হয়েছে। ৩০ মিনিট পরে আবার চেষ্টা করুন।"

**Post-Onboarding:**
- `users.is_profile_complete = true`
- `users.onboarded_at = NOW()`
- All three financial identifiers inserted into `user_identifiers` table.
- User redirected to the unified home dashboard.

#### 3.2.3 Secondary OTP for Sensitive Actions

OTP re-verification is required for the following actions (even if user is already logged in):

| Action | Reason |
|--------|--------|
| Upload payment proof (order or boost) | Prevents unauthorized payment claims |
| Change phone number | Prevents account takeover |
| Change bKash ID | Prevents payment redirection fraud |
| Change bank account | Prevents payment redirection fraud |
| Delete account | Prevents malicious account deletion |

**Flow:** When user initiates a sensitive action → Modal: "নিরাপত্তার জন্য আপনার মোবাইলে পাঠানো কোডটি দিন" → OTP sent → Verify → Action proceeds.

#### 3.2.4 Session Management

| Parameter | Value |
|-----------|-------|
| Supabase Access Token TTL | 1 hour |
| Supabase Refresh Token TTL | 7 days |
| Max concurrent sessions per user | 2 (one phone + one tablet) |
| Session invalidation | On password/account change, admin suspension, or manual logout |
| Idle timeout | None (agricultural users may open app infrequently) |

**Token Refresh Flow:**
1. Supabase client SDK detects access token expiry.
2. SDK uses refresh token to get new access token from Supabase Auth.
3. If the refresh token is also expired → The session is cleared locally and the user must re-authenticate (Phone OTP via the Send SMS Hook, or Google). Bengali toast: "আপনার সেশন শেষ হয়েছে। আবার লগইন করুন।"

### 3.3 Multi-Account Detection & Fraud Prevention — Complete System

#### 3.3.1 Design Philosophy

The fraud detection system operates on the principle that **each real person should have exactly one account on the platform**. Multiple accounts enable price manipulation, fake reviews, self-dealing (farmer selling to own buyer account), and boosting fraud. The system uses **three financial identifiers** as strong signals of unique identity:

1. **Phone Number** — Each Bangladeshi SIM card is NID-linked (per BTRC regulation).
2. **bKash ID** — Tied to a mobile number, effectively NID-linked.
3. **Bank Account Number** — Requires NID to open, difficult to obtain multiples.

#### 3.3.2 Fraud Check — Trigger Points

The fraud check runs at **four distinct points** in the system:

| Trigger Point | Check Type | Blocking? |
|---------------|-----------|-----------|
| **Onboarding Step 2** (initial registration) | Full cross-reference of all 3 identifiers | Yes — blocks registration |
| **Profile Update** (change phone/bKash/bank) | Cross-reference of changed identifier | Yes — blocks update |
| **Payment Proof Upload** (order or boost) | Check if Transaction ID was previously used | Yes — blocks upload |
| **Nightly Batch Job** (pg_cron, 2:00 AM BDT) | Fuzzy matching across all identifiers for near-duplicates | No — flags for admin review |

#### 3.3.3 Real-Time Fraud Check Algorithm

**Edge Function: `POST /functions/v1/fraud-check`**

```
Input: {
  user_id: UUID,           // The user being checked (null for new registration)
  phone: string,
  bkash_id: string,
  bank_account: string
}

Algorithm:

Step 1: Normalize inputs
  - phone → strip spaces, leading +880 → convert to 01XXXXXXXXX format
  - bkash_id → same normalization as phone
  - bank_account → strip spaces and dashes, lowercase

Step 2: Query user_identifiers table
  SELECT ui.user_id, ui.identifier_type, ui.identifier_value, u.role, u.display_name
  FROM user_identifiers ui
  JOIN users u ON u.id = ui.user_id
  WHERE ui.identifier_value IN (normalized_phone, normalized_bkash, normalized_bank)
    AND ui.user_id != input.user_id  -- Exclude self for profile updates

Step 3: Analyze results
  - If ANY match found:
      → Collect all matching user_ids and their matching identifier types
      → Set fraud_flag = true on the attempting user (or block registration)
      → Insert record into fraud_alerts table:
          {
            flagged_user_id: input.user_id,
            matched_user_ids: [array of matched user IDs],
            matched_identifiers: [
              { type: "phone", value: "01XXXXXXXXX", matched_user_id: "UUID" },
              ...
            ],
            status: "pending_review",
            created_at: NOW()
          }
      → Send push notification to all admin users:
          "⚠️ সতর্কতা: সম্ভাব্য জালিয়াতি শনাক্ত হয়েছে। ব্যবহারকারী: {display_name}"
      → Return to client:
          {
            allowed: false,
            error_bn: "এই তথ্য ইতিমধ্যে অন্য একটি অ্যাকাউন্টের সাথে যুক্ত। সাহায্যের জন্য ০১XXXXXXXXX নম্বরে কল করুন।",
            matched_types: ["phone"] // Tell user which field(s) conflicted (without revealing other user's info)
          }

  - If NO match found:
      → Insert/update records in user_identifiers table:
          INSERT INTO user_identifiers (user_id, identifier_type, identifier_value)
          VALUES
            (user_id, 'phone', normalized_phone),
            (user_id, 'bkash', normalized_bkash),
            (user_id, 'bank', normalized_bank)
          ON CONFLICT (identifier_value) DO UPDATE SET user_id = input.user_id
            WHERE user_identifiers.user_id = input.user_id;  -- Only update if same user
      → Return: { allowed: true }
```

#### 3.3.4 Transaction ID Reuse Detection

When a user uploads a payment proof (for order payment or boost payment):

```
Input: { tx_id: string, user_id: UUID, context: "order" | "boost" }

Step 1: Normalize tx_id → uppercase, strip spaces

Step 2: Check across BOTH tables:
  SELECT id, 'order' as source FROM orders WHERE tx_id = normalized_tx_id
  UNION ALL
  SELECT id, 'boost' as source FROM boost_payments WHERE tx_id = normalized_tx_id

Step 3: If any match found:
  → Block upload
  → Set fraud_flag = true on user
  → Insert fraud_alert
  → Return error: "এই লেনদেন আইডি আগে ব্যবহার করা হয়েছে। একটি নতুন লেনদেন করুন।"
```

#### 3.3.5 Nightly Batch Fraud Analysis (pg_cron)

Runs at 2:00 AM BDT daily. Catches sophisticated fraud that bypasses real-time checks:

| Check | Logic | Action |
|-------|-------|--------|
| **Phone number similarity** | Levenshtein distance <= 1 between any two users' phone numbers | Flag for review (might be typo or deliberate variation) |
| **Same bank routing + sequential account numbers** | Bank routing matches AND bank account numbers differ by <= 5 | Flag for review (possible related accounts at same branch) |
| **Same device fingerprint** | Multiple accounts registered from same device ID (collected via `@capacitor/device`) | Flag for review |
| **Rapid account creation** | Same IP address used to create > 2 accounts within 24 hours | Flag for review |
| **Self-dealing pattern** | Farmer and Buyer in same order share same IP address or device fingerprint in the last 30 days | Flag for review + notify admin |

Results are inserted into `fraud_alerts` table with `alert_type = 'batch_analysis'` and `status = 'pending_review'`.

#### 3.3.6 Admin Fraud Resolution Workflow

1. Admin sees fraud alerts in admin panel dashboard (sorted by severity: real-time blocks first, batch flags second).
2. Admin reviews matched user profiles, their transaction history, and evidence.
3. Admin takes one of the following actions (each logged in `audit_log`):

| Action | Effect | Bengali Notification to User |
|--------|--------|------------------------------|
| **Dismiss Alert** | fraud_flag removed, alert status = 'dismissed' | None |
| **Warn User** | Warning counter incremented, alert status = 'warned' | "সতর্কতা: আপনার অ্যাকাউন্টে সন্দেহজনক কার্যকলাপ শনাক্ত হয়েছে। নিয়ম লঙ্ঘন করলে অ্যাকাউন্ট বন্ধ করা হবে।" |
| **Suspend User** | is_suspended = true, all active orders cancelled, alert status = 'suspended' | "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে। আপিল করতে ০১XXXXXXXXX নম্বরে কল করুন।" |
| **Ban User** | is_banned = true (permanent), all identifiers blocklisted, alert status = 'banned' | "আপনার অ্যাকাউন্ট স্থায়ীভাবে বন্ধ করা হয়েছে।" |
| **Merge Accounts** | Keep one account, transfer orders to it, delete duplicate | Notification to kept account: "আপনার অ্যাকাউন্ট আপডেট করা হয়েছে।" |

### 3.4 Profile Verification System (Optional — Trust Badge)

Users can optionally verify their identity for a "যাচাইকৃত" (Verified) badge displayed on their profile and listings.

**Verification Flow:**

1. User navigates to প্রোফাইল → "যাচাইকরণ করুন" (Get Verified).
2. User uploads:
   - **NID Front Photo** — Image of National ID Card (front side).
   - **NID Back Photo** — Image of National ID Card (back side).
   - **Selfie with NID** — User holding their NID next to their face.
3. Images stored in Supabase Storage bucket `verification-docs` (private, admin-only access).
4. Record inserted into `user_verifications` table with `status = 'pending'`.
5. Admin reviews in admin panel:
   - Compares NID name with profile display_name.
   - Compares NID photo with selfie (manual visual check).
   - Compares NID number format validity.
6. Admin approves or rejects:
   - **Approved:** `users.nid_verified = true`, `user_verifications.status = 'approved'`. Bengali notification: "অভিনন্দন! আপনার অ্যাকাউন্ট যাচাইকৃত হয়েছে। ✅"
   - **Rejected:** `user_verifications.status = 'rejected'`, `rejection_reason` stored. Bengali notification: "আপনার যাচাইকরণ প্রত্যাখ্যাত হয়েছে। কারণ: {reason}। আবার চেষ্টা করুন।"

**Verified Badge Benefits:**
- ✅ badge displayed next to name on all listings and profiles.
- Boosted ranking in search results (see Section 9 — boost algorithm includes `verified_seller_bonus`).
- Higher trust signal for buyers.
- Priority dispute resolution.

### 3.5 Account Deletion & Data Retention

**User-Initiated Deletion:**
1. User navigates to সেটিংস → "অ্যাকাউন্ট মুছে ফেলুন".
2. OTP re-verification required.
3. Confirmation dialog: "আপনি কি নিশ্চিত? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। আপনার সব পণ্য, অর্ডার ইতিহাস এবং ডেটা মুছে যাবে।"
4. **Pre-conditions for deletion:**
   - No active orders (any state before `completed` or `cancelled`).
   - No pending disputes.
   - No pending boost payment verifications.
   - If any pre-condition fails: "আপনার সক্রিয় অর্ডার/বিবাদ আছে। সেগুলো সম্পন্ন হওয়ার পরে অ্যাকাউন্ট মুছতে পারবেন।"
5. On successful deletion:
   - `users.is_deleted = true`, `users.deleted_at = NOW()`
   - All products set to `status = 'expired'`
   - All personal data (phone, bKash, bank, NID photos) **anonymized** after 90-day retention period
   - `user_identifiers` rows retained for 90 days (to prevent re-registration fraud), then purged
   - Audit log entry created

**Admin-Initiated Deletion:**
- Admin can force-delete accounts (for banned users).
- Same flow but bypasses OTP and pre-conditions.
- All data anonymized immediately (no 90-day grace).

---

## 4. Product Listings & AI Integration

### 4.1 Product Data Model Overview

Every product listing on HaatBazar is created by a **Farmer (কৃষক)** and represents a specific agricultural product available for purchase. The listing lifecycle is AI-assisted at creation, manually managed during its active period, and system-managed through sale and expiry.

**Product Entity — Complete Field Specification:**

| Field | Bengali Label | Type | Required | Source | Description |
|-------|-------------|------|----------|--------|-------------|
| id | — | UUID PK | Auto | System | Auto-generated unique identifier |
| farmer_id | — | UUID FK → users.id | Auto | System | The farmer who created this listing |
| category_id | পণ্যের ধরন | UUID FK → product_categories.id | Yes | User selects | Product category from predefined taxonomy |
| title | পণ্যের নাম | VARCHAR(200) | Yes | AI-generated, user-editable | Short product title in Bengali |
| short_desc | সংক্ষিপ্ত বিবরণ | TEXT (max 300 chars) | Yes | AI-generated, user-editable | Brief description for card view and search results |
| long_desc | বিস্তারিত বিবরণ | TEXT (max 2000 chars) | Yes | AI-generated, user-editable | Detailed description including quality, harvest info, storage conditions |
| price | মূল্য (৳) | DECIMAL(10,2) | Yes | User enters | Price per unit in BDT. Minimum 1.00 |
| quantity | পরিমাণ | DECIMAL(10,2) | Yes | User enters | Available quantity |
| remaining_quantity | অবশিষ্ট পরিমাণ | DECIMAL(10,2) | Auto | System | Decremented on each purchase. Initialized to `quantity` on creation |
| unit | একক | VARCHAR(20) | Yes | User selects | Unit of measure. Enum: কেজি (kg), মণ (mon/40kg), টন (ton), পিস (piece), বস্তা (sack), লিটার (liter) |
| pickup_location_id | সংগ্রহস্থল | UUID FK → locations.id | Yes | User selects (cascading dropdown) | Upazila-level location where product can be picked up |
| pickup_address_detail | বিস্তারিত ঠিকানা | TEXT (max 500 chars) | No | User enters | Optional street-level address or landmark description |
| harvest_date | ফসল কাটার তারিখ | DATE | No | User enters or AI-estimated | When the product was harvested |
| expiry_date | মেয়াদ শেষের তারিখ | DATE | No | User enters | When the product is expected to expire/spoil. Used for auto-expiry. |
| is_negotiable | দর কষাকষি সম্ভব | BOOLEAN | Yes | User selects (toggle) | Whether the price is open to negotiation |
| min_order_quantity | সর্বনিম্ন অর্ডার | DECIMAL(10,2) | No | User enters | Minimum quantity a buyer must purchase. Defaults to 1.0 |
| is_boosted | বুস্ট সক্রিয় | BOOLEAN | Auto | System | Set to true when an active boost exists |
| boost_expiry | বুস্ট মেয়াদ | TIMESTAMP | Auto | System | When the current boost expires. NULL if not boosted. |
| status | অবস্থা | VARCHAR(20) | Auto | System | Product lifecycle status (see 4.2) |
| view_count | দর্শন সংখ্যা | INTEGER | Auto | System | Number of times the product detail page was viewed |
| ai_confidence_score | — | DECIMAL(3,2) | Auto | System | Confidence score (0.00–1.00) from the AI description generation. Not shown to user. Used for internal quality monitoring. |
| created_at | তারিখ | TIMESTAMP | Auto | System | When the listing was created |
| updated_at | — | TIMESTAMP | Auto | System | Last modification timestamp |

### 4.2 Product Lifecycle State Machine

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
    [draft] ──→ [pending_review] ──→ [active] ──→ [sold] ──→ [completed]
                    │                   │  ▲          │
                    │                   │  │          │
                    │                   │  └──────────┘
                    │                   │  (partial sale:
                    │                   │   remaining_qty > 0
                    │                   │   → stays active)
                    │                   │
                    │                   ├──→ [expired]
                    │                   │     (expiry_date passed OR
                    │                   │      manual expiry by farmer OR
                    │                   │      90 days since creation with no sale)
                    │                   │
                    │                   └──→ [suspended]
                    │                         (admin action due to
                    │                          policy violation)
                    │
                    └──→ [rejected]
                          (admin rejects listing
                           for policy violation)
```

**State Definitions:**

| State | DB Value | Bengali Label | Description | Allowed Transitions |
|-------|----------|---------------|-------------|-------------------|
| Draft | `draft` | খসড়া | Farmer is still composing the listing. Saved locally or server-side. Not visible to other users. | → `pending_review` (on publish) |
| Pending Review | `pending_review` | পর্যালোচনাধীন | Listing submitted for automated content check (NSFW image filter, spam text detection). Typically auto-approved within seconds. | → `active` (auto-approved), → `rejected` (content violation) |
| Active | `active` | সক্রিয় | Listing is live and visible in search results and feeds. `remaining_quantity > 0`. | → `sold` (remaining_quantity = 0), → `expired` (date/manual/stale), → `suspended` (admin) |
| Sold | `sold` | বিক্রি হয়েছে | All quantity has been purchased. Listing still visible in farmer's history and active orders. | → `completed` (all related orders completed) |
| Expired | `expired` | মেয়াদ শেষ | Product listing is no longer available. Farmer can re-list by creating a new listing. | Terminal state |
| Suspended | `suspended` | স্থগিত | Admin has suspended this listing for policy violation. Farmer sees reason in notification. | → `active` (admin lifts suspension) |
| Rejected | `rejected` | প্রত্যাখ্যাত | Listing rejected during review. Farmer notified with reason. Can edit and resubmit. | → `pending_review` (farmer edits and resubmits) |
| Completed | `completed` | সম্পন্ন | All orders from this listing are delivered and completed. Historical record only. | Terminal state |

**Automatic State Transitions (pg_cron — runs every 5 minutes):**

| Condition | Transition | Notification |
|-----------|-----------|-------------|
| `expiry_date < NOW()` and status = `active` | → `expired` | Farmer: "আপনার পণ্য '{title}' এর মেয়াদ শেষ হয়ে গেছে।" |
| `created_at < NOW() - INTERVAL '90 days'` and status = `active` and `remaining_quantity = quantity` (no sales) | → `expired` (stale) | Farmer: "আপনার পণ্য '{title}' ৯০ দিন ধরে বিক্রি না হওয়ায় মেয়াদ শেষ করা হয়েছে।" |
| `boost_expiry < NOW()` and `is_boosted = true` | Set `is_boosted = false`, `boost_expiry = NULL` | Farmer: "আপনার পণ্য '{title}' এর বুস্ট মেয়াদ শেষ হয়েছে। পুনরায় বুস্ট করতে চাইলে ট্যাপ করুন।" |

### 4.3 Product Images

Each product listing supports **1 to 5 images**. The first image is the **primary image** displayed in search results and cards.

**Product Images — Separate Table (not embedded in products):**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| product_id | UUID FK → products.id | Parent product |
| image_url | TEXT | Full URL to the image in Supabase Storage / CDN |
| thumbnail_url | TEXT | URL to 200x200 compressed thumbnail (generated server-side) |
| display_order | INTEGER | Sort order. 1 = primary image |
| is_ai_processed | BOOLEAN | Whether this image was sent to AI for description generation |
| created_at | TIMESTAMP | Upload timestamp |

**Image Upload Pipeline:**

```
[Farmer captures/selects image on device]
        │
        ▼
[Client-side processing (SvelteKit — OffscreenCanvas Web Worker)]
    • Executed inside an HTML5 OffscreenCanvas Web Worker (never on the main UI thread)
    • Resize to max 1024px on longest edge
    • Compress to JPEG at 80% quality
    • Extract EXIF (orientation + GPS if present — used for location suggestion)
    • Strip the remaining EXIF metadata from the payload that is uploaded
    • Target: < 500KB per image
        │
        ▼
[Request signed upload URL from Supabase Storage]
    POST /storage/v1/object/sign/product-images/{product_id}/{uuid}.jpg
        │
        ▼
[Upload image directly to Supabase Storage via signed URL]
    PUT <signed_url>
    Content-Type: image/jpeg
        │
        ▼
[Supabase Storage Webhook triggers Edge Function: /functions/v1/process-image]
    • Generate 200x200 thumbnail → store in /thumbnails/ bucket
    • Run NSFW content check (Google Cloud Vision SafeSearch API):
        - If LIKELY or VERY_LIKELY for adult/violence → flag image, set product to pending_review
        - If POSSIBLE → allow but log for batch review
        - If UNLIKELY → pass
    • Store image metadata in product_images table
    • If this is the first image for a draft product → trigger AI description (Section 4.4)
        │
        ▼
[CDN URL returned to client for display]
    https://cdn.haatbazar.com/product-images/{product_id}/{uuid}.jpg
    https://cdn.haatbazar.com/thumbnails/{product_id}/{uuid}_thumb.jpg
```

**Image Constraints:**
- Maximum 5 images per product listing.
- Maximum file size per image: 5MB (before client compression), 500KB (after compression).
- Accepted formats: JPEG, PNG, WebP. Client converts all to JPEG before upload.
- If farmer has no camera access, they can skip image and manually enter descriptions (AI features unavailable in this path).

### 4.4 AI-Powered Description Generation — Complete Technical Specification

#### 4.4.1 Architecture Decision: Cloud-First with On-Device Fallback

| Component | Technology | Role | When Used |
|-----------|-----------|------|-----------|
| **Step 0: Pre-processing** | Client-side image pipeline (SvelteKit — OffscreenCanvas Web Worker) | Contrast enhancement (CLAHE), colour correction (white-balance normalisation), noise reduction before any AI call | Always — improves accuracy in low-light / cloudy conditions by up to 15% |
| **Primary: Cloud AI** | Google Gemini 1.5 Flash (via Supabase Edge Function) | Full description + quality assessment + explainability in Bengali | Default path when online AND Gemini confidence ≥ 0.85 |
| **Fallback 1: Secondary Cloud AI** | GPT-4o-mini (OpenAI) | Full description generation when Gemini confidence is 0.70–0.84 or Gemini returns an error | Confidence bridge between primary cloud and on-device |
| **Fallback 2: On-Device Classification** | Google ML Kit Image Labeling (custom Capacitor plugin `HaatBazarTFLite`) with the bundled custom TFLite model | Classify crop type AND variety (75+ Bangladeshi varieties) | When both cloud AIs are unavailable or the device is offline. Provides crop/variety label + template description. |
| **Fallback 3: Manual Entry** | N/A | User types descriptions manually | When all AI layers fail, or user prefers manual entry. |

**Decision Logic (Confidence-Based Cascade):**

```
[User taps "ছবি থেকে বিবরণ তৈরি করুন" (Generate description from image)]
        │
        ▼
[Step 0: Client-side image pre-processing]
    → CLAHE contrast enhancement
    → White-balance colour correction
    → Resize to 1024px max, JPEG 80% quality
    → Bengali toast: "ছবি প্রস্তুত হচ্ছে..." (disappears in ~0.5s)
        │
        ▼
[Check network connectivity]
        │
        ├── [Online] → Call Gemini 1.5 Flash (PRIMARY)
        │       │
        │       ├── [Success, confidence ≥ 0.85]
        │       │       → Populate all fields: title, short_desc, long_desc,
        │       │         quality_assessment, visual_evidence
        │       │
        │       ├── [Success, confidence 0.70–0.84] → Call GPT-4o-mini (FALLBACK 1)
        │       │       │
        │       │       ├── [Success] → Populate fields with GPT-4o-mini output
        │       │       │               Badge shown: "AI (ব্যাকআপ) দ্বারা তৈরি"
        │       │       └── [Failure] → Fall back to On-Device ML Kit (FALLBACK 2)
        │       │
        │       └── [Timeout (>8s) or Error]
        │               → Attempt GPT-4o-mini once; if also fails → On-Device ML Kit
        │
        └── [Offline] → Use On-Device ML Kit directly (FALLBACK 2)
                │
                ├── [Native ML Kit plugin (HaatBazarTFLite) loaded the model successfully]
                │       → Classify crop type AND variety (75+ classes)
                │       → Generate template description
                │       → Badge: "অফলাইন AI দ্বারা তৈরি — অনলাইনে উন্নত বিবরণ পাবেন"
                │
                └── [Native ML Kit plugin failed to load the model]
                        → Show manual entry form (FALLBACK 3)
                        → Bengali toast: "AI বিবরণ তৈরি করা যায়নি। অনুগ্রহ করে নিজে লিখুন।"
```

#### 4.4.2 Cloud AI — Gemini 1.5 Flash Integration

**Edge Function: `POST /functions/v1/ai-describe`**

**Request:**
```
POST /functions/v1/ai-describe
Authorization: Bearer <supabase_session_token>
Content-Type: application/json

{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
  "location_name_bn": "বগুড়া, শেরপুর",
  "category_hint": "ফল",              // Optional: pre-selected category
  "farmer_notes": "গাছ পাকা আম",      // Optional: user note to guide AI
  "capture_conditions": {             // NEW: client reports shooting context
    "lighting": "cloudy",             // "bright" | "cloudy" | "indoor" | "unknown"
    "angle":    "top_down"            // "top_down" | "side" | "multiple_items" | "unknown"
  }
}
```

**Edge Function Processing:**

```
Step 1: Validate request
  - Check auth token → extract user_id (all authenticated users may call this endpoint)
  - Check image_base64 size (max 1MB after base64 encoding)
  - Rate limit: max 5 requests per user per hour

Step 2: Check AI cache
  - Compute SHA-256 hash of image_base64
  - SELECT * FROM product_ai_cache WHERE image_hash = <hash> AND created_at > NOW() - INTERVAL '30 days'
  - If cache hit → return cached result immediately (skip Gemini call)

Step 3: Construct Gemini prompt (Bengali)

  System Prompt:
  """
  তুমি একজন বাংলাদেশী কৃষি পণ্য বিশেষজ্ঞ। তোমার কাজ হলো কৃষি পণ্যের ছবি বিশ্লেষণ করে
  বাংলায় পণ্যের বিবরণ তৈরি করা।

  নিয়মাবলী:
  ১. সব আউটপুট অবশ্যই বাংলায় হতে হবে।
  ২. বিবরণ সৎ এবং সঠিক হতে হবে — অতিরঞ্জিত করো না।
  ৩. পণ্যের ধরন, সম্ভাব্য জাত, দৃশ্যমান গুণমান, আনুমানিক পরিমাণ উল্লেখ করো।
  ৪. যদি ছবিতে কৃষি পণ্য না থাকে, তাহলে is_agricultural = false দাও।
  ৫. সংক্ষিপ্ত বিবরণ ৫০ শব্দের মধ্যে রাখো।
  ৬. বিস্তারিত বিবরণ ২০০ শব্দের মধ্যে রাখো।

  আউটপুট ফরম্যাট (JSON):
  {
    "is_agricultural": true/false,
    "detected_crop": "ফসলের নাম",
    "suggested_category": "ফল/সবজি/শস্য/মসলা/মাছ/গবাদি পশু/দুগ্ধজাত/অন্যান্য",
    "title": "পণ্যের শিরোনাম",
    "short_desc": "সংক্ষিপ্ত বিবরণ",
    "long_desc": "বিস্তারিত বিবরণ",
    "estimated_quality": "ভালো/মাঝারি/নিম্ন",
    "suggested_unit": "কেজি/মণ/টন/পিস/বস্তা/লিটার",
    "confidence": 0.0-1.0,
    "quality_assessment": {
      "estimated_grade": "premium/standard/economy",
      "visible_defects": ["দৃশ্যমান ত্রুটির তালিকা — খালি থাকলে [] দাও"],
      "size_estimate": "ছোট/মাঝারি/বড়",
      "ripeness": "কাঁচা/পাকা/অতিপাকা/মিশ্র"
    },
    "visual_evidence": [
      "কোন দৃশ্যমান বৈশিষ্ট্য থেকে এই বিবরণ তৈরি হয়েছে — সংক্ষেপে ১-৩টি পয়েন্ট"
    ]
  }
  """

  User Message:
  """
  এই ছবিটি বিশ্লেষণ করো। {if location_name_bn: "পণ্যটি {location_name_bn} থেকে।"}
  {if category_hint: "কৃষক জানিয়েছেন এটি {category_hint} ক্যাটাগরির।"}
  {if farmer_notes: "কৃষকের নোট: {farmer_notes}"}
  [IMAGE ATTACHED]
  """

Step 4: Call Gemini 1.5 Flash API
  - Model: gemini-1.5-flash
  - Temperature: 0.3 (low creativity, high accuracy)
  - Max output tokens: 1024
  - Timeout: 8 seconds

Step 5: Parse Gemini response
  - Validate JSON structure
  - If is_agricultural = false:
      → Return to client: {
          "success": false,
          "error_bn": "ছবিতে কৃষি পণ্য শনাক্ত করা যায়নি। অনুগ্রহ করে পণ্যের একটি পরিষ্কার ছবি দিন।"
        }

  - If is_agricultural = true:
      → Store in product_ai_cache:
          INSERT INTO product_ai_cache (image_hash, response_json, model_version, confidence, created_at)
          VALUES (<hash>, <response>, 'gemini-1.5-flash', <confidence>, NOW())

      → Return to client: {
          "success": true,
          "title": "পাকা আম — হিমসাগর জাত",
          "short_desc": "বগুড়ার শেরপুর থেকে সংগ্রহ করা পাকা হিমসাগর আম। ভালো মানের, রসালো।",
          "long_desc": "এই হিমসাগর আম বগুড়া জেলার শেরপুর উপজেলা থেকে সংগ্রহ করা হয়েছে। আমগুলো পুরোপুরি পাকা, উজ্জ্বল হলুদ রঙের এবং কোনো কালো দাগ নেই। প্রতিটি আমের ওজন আনুমানিক ২৫০-৩০০ গ্রাম। প্রাকৃতিকভাবে গাছে পাকানো, কোনো রাসায়নিক ব্যবহার করা হয়নি। আমের ঘ্রাণ তীব্র ও মিষ্টি। পরিবহনের জন্য সঠিকভাবে প্যাকিং করা হবে।",
          "suggested_category": "ফল",
          "suggested_unit": "কেজি",
          "confidence": 0.92,
          "quality_assessment": {                 // NEW: auto-populated quality fields
            "estimated_grade": "premium",
            "visible_defects": [],
            "size_estimate": "বড়",
            "ripeness": "পাকা"
          },
          "visual_evidence": [                    // NEW: explainability for user trust
            "উজ্জ্বল হলুদ রঙ পূর্ণ পরিপক্কতা নির্দেশ করে",
            "ত্বকে কোনো কালো দাগ বা পচন দৃশ্যমান নয়",
            "আকার ও আকৃতি হিমসাগর জাতের বৈশিষ্ট্য অনুযায়ী"
          ],
          "fallback_triggered": null              // null | "gpt4o" | "tflite"
        }

Step 6: Log AI usage for cost tracking
  INSERT INTO ai_usage_log (user_id, function_name, model, tokens_used, cost_usd, created_at)
  VALUES (<user_id>, 'ai-describe', 'gemini-1.5-flash', <token_count>, <estimated_cost>, NOW())
```

**Error Handling:**

| Gemini Error | Client Behavior |
|-------------|----------------|
| 429 Rate Limit | Retry once after 2 seconds. If still fails → fallback to on-device. Bengali toast: "সার্ভার ব্যস্ত। কিছুক্ষণ পর আবার চেষ্টা করুন।" |
| 500 Server Error | Fallback to on-device immediately. |
| Timeout (>8s) | Fallback to on-device. Bengali toast: "ইন্টারনেট ধীর। সংক্ষিপ্ত বিবরণ তৈরি হয়েছে, বিস্তারিত আপনি লিখুন।" |
| Invalid JSON response | Fallback to on-device. Log error to Sentry for investigation. |
| Content safety block | Return to user: "এই ছবিটি প্রক্রিয়া করা সম্ভব হয়নি। অন্য একটি ছবি দিন।" |

#### 4.4.3 On-Device ML Kit Image Labeling — Fallback Classification

**Model Specification:**

| Property | Value |
|----------|-------|
| Framework | Google ML Kit Image Labeling with a **custom TFLite model**, wrapped by the custom Capacitor plugin `HaatBazarTFLite` — inference runs in the native Android process, never TensorFlow.js inside the WebView |
| Execution Path | The plugin configures ML Kit's `CustomImageLabelerOptions` with the bundled `.tflite` model and returns labels over the Capacitor bridge. TensorFlow.js / WASM inference in the WebView is explicitly rejected: it duplicates the model into the JS heap and spikes RSS on 1GB-RAM Android Go devices. |
| Bridge Contract | SvelteKit calls `HaatBazarTFLite.classifyCrop({ imageBase64 })` through the Capacitor bridge and receives JSON output: `{ crop_label_bn, variety_bn, confidence, alternatives[] }`. The payload is the pre-processed 1024px / 80%-quality JPEG from Step 0 (Section 4.3). |
| Memory Profile | Model + ML Kit interpreter are loaded once in the native process; WebView heap growth is ~0MB (only the in-flight base64 string, released when the call resolves). |
| Model Size | **Bundled compact model ~4MB** (quantized INT8, top-50 crop classes — keeps the APK under 6MB) + **full variety-level model ~12MB** downloaded OTA (75+ classes). |
| Input | 224x224 RGB image |
| Output | Class probabilities for 75+ Bangladeshi crop types AND named varieties |
| Inference Time | < 500ms on mid-range Android (Snapdragon 665 or equivalent); < 800ms on 1GB Go Edition devices |
| Training Data | 15,000+ images covering 75+ crop varieties with deliberate diversity in lighting conditions, camera angle, and maturity stage |
| Update Mechanism | Full model hosted on Supabase Storage. On launch the app compares the bundled version against `platform_settings.ml_model_version` and downloads the update over Wi-Fi only; the swap is applied on next app start. |

**Crop Classification Labels (75+ Classes — Bengali):**

Variety-level distinction is critical for market pricing. Examples of high-value variety pairs the model must differentiate:
- আম: **হিমসাগর** vs **ল্যাংড়া** vs **ফজলি** vs **আম্রপালি** (significant price difference)
- ধান: **বি আর ২৮** vs **বি আর ২৯** vs **বিআর ৫০ (বাংলামতি)** vs **মিনিকেট**
- টমেটো: **হাইব্রিড** vs **দেশি** vs **চেরি টমেটো**

| Category (ক্যাটাগরি) | Example Crops & Varieties |
|-----------------------|--------------------------|
| ফল (Fruits) | আম (হিমসাগর, ল্যাংড়া, ফজলি, আম্রপালি, গোপালভোগ), কাঁঠাল, লিচু (বোম্বাই, চায়না-৩), কলা (সবরি, চম্পা, বাংলা), পেয়ারা (কাজী, থাই), পেঁপে, তরমুজ, জাম, বরই, আনারস |
| সবজি (Vegetables) | আলু, টমেটো, বেগুন, শিম, লাউ, কুমড়া, ফুলকপি, বাঁধাকপি, মরিচ, ঢেঁড়স, পটল, করলা |
| শস্য (Grains) | ধান, গম, ভুট্টা, সরিষা, পাট |
| মসলা (Spices) | পেঁয়াজ, রসুন, আদা, হলুদ, মরিচ (শুকনো) |
| মাছ (Fish) | ইলিশ, রুই, কাতলা, পাঙ্গাশ, তেলাপিয়া, চিংড়ি |
| দুগ্ধজাত (Dairy) | দুধ, ঘি, দই, পনির |
| গবাদি পশু (Livestock) | গরু, ছাগল, মুরগি, হাঁস |
| অন্যান্য (Other) | মধু, ডিম, আখের গুড় |

**Template Description Generation (when cloud AI is unavailable):**

```
Given: crop_label = "আম", quality_label = "ভালো", location_name = "বগুড়া, শেরপুর"

Generated Output:
{
  "title": "আম",
  "short_desc": "আম — ভালো মানের",
  "long_desc": "এই আম বগুড়া, শেরপুর থেকে সংগ্রহ করা হয়েছে। পণ্যের মান ভালো। বিস্তারিত তথ্য ও দামের জন্য বিক্রেতার সাথে যোগাযোগ করুন।"
}
```

The farmer is **always shown** these AI-generated fields in editable text fields so they can improve or correct the descriptions before publishing.

#### 4.4.4 Quality Assessment Vision Module

The `quality_assessment` block (returned by both Gemini and GPT-4o-mini) is used to **auto-populate a dedicated quality section** in the product listing form, saving the user from manually entering fields they may not know how to describe:

| AI Field | Maps to UI Field | Bengali Label | Editable? |
|----------|----------------|--------------|-----------|
| `estimated_grade` | Product quality badge | পণ্যের মান | ✅ Yes |
| `visible_defects` | Defects note (auto-filled) | দৃশ্যমান ত্রুটি | ✅ Yes |
| `size_estimate` | Size category chip | আকার | ✅ Yes |
| `ripeness` | Ripeness chip | পরিপক্কতা | ✅ Yes |

If the AI quality assessment is present, the UI shows a summary card before publish:

```
┌──────────────────────────────────────────────┐
│  🤖 AI গুণমান মূল্যায়ন                        │
│  মান: প্রিমিয়াম  |  আকার: বড়  |  পাকা        │
│  ত্রুটি: কোনো দৃশ্যমান ত্রুটি নেই             │
│                                              │
│  [এটি সঠিক ✓]   [পরিবর্তন করুন ✎]           │
└──────────────────────────────────────────────┘
```

#### 4.4.5 Explainable AI Output

The `visual_evidence` array is rendered directly below the AI-generated description to help users **verify and trust** the output before publishing:

```
┌──────────────────────────────────────────────┐
│  📋 AI কীভাবে এই বিবরণ তৈরি করেছে:            │
│  • উজ্জ্বল হলুদ রঙ পূর্ণ পরিপক্কতা নির্দেশ করে │
│  • ত্বকে কোনো কালো দাগ বা পচন দৃশ্যমান নয়    │
│  • আকার ও আকৃতি হিমসাগর জাতের বৈশিষ্ট্য অনুযায়ী│
└──────────────────────────────────────────────┘
```

This builds farmer trust by making the AI's reasoning transparent. Users who see clear evidence are significantly more likely to accept the AI description without editing, reducing listing creation time.

#### 4.4.6 AI Cache Table

To avoid redundant API calls and reduce cost:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| image_hash | VARCHAR(64) UNIQUE | SHA-256 hash of the image bytes |
| response_json | JSONB | Full AI response stored for reuse |
| model_version | VARCHAR(50) | Which AI model generated this (e.g., "gemini-1.5-flash-001") |
| confidence | DECIMAL(3,2) | AI confidence score |
| hit_count | INTEGER DEFAULT 1 | Number of times this cache entry was reused |
| created_at | TIMESTAMP | Cache entry creation time |

**Cache Policy:**
- TTL: 30 days. Entries older than 30 days are purged by pg_cron nightly job.
- Cache is **per-image**, not per-user. If two farmers upload the same image (rare but possible), the second gets cached result.
- Cache is NOT used if `farmer_notes` are provided (notes change the AI prompt, so result would differ).

### 4.5 Complete Farmer Product Creation Flow (UI Walkthrough)

This is the step-by-step flow a Farmer experiences when creating a new product listing:

**Screen 1: "পণ্য যোগ করুন" (Add Product)**

```
┌─────────────────────────────────────────┐
│  ← পণ্য যোগ করুন                        │
│─────────────────────────────────────────│
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   📷 ছবি তুলুন বা নির্বাচন করুন   │    │
│  │   (Tap to capture or select)    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ক্যামেরা দিয়ে ছবি তুলুন]  [গ্যালারি]     │
│                                         │
│  ────────── অথবা ──────────            │
│                                         │
│  [ছবি ছাড়া চালিয়ে যান →]                │
│  (Skip image — manual entry only)       │
│                                         │
└─────────────────────────────────────────┘
```

**Camera-First Entry — "পণ্য স্ক্যান করুন" (Scan Product):**

Screen 1 also offers the primary CTA **[📸 পণ্য স্ক্যান করুন]**. Tapping it opens the camera in scan mode; the farmer points the camera at the harvest (crop, fish, or livestock) and the classification pipeline below runs immediately on the captured frame — no typing required.

```
[User taps "পণ্য স্ক্যান করুন" → camera opens in scan mode]
        │
        ▼
[Frame captured → OffscreenCanvas Web Worker pre-processing (Section 4.3)]
    • Resize to 1024px max, JPEG 80%, EXIF handling
        │
        ▼
[Check network connectivity]
        │
        ├── [OFFLINE — Google ML Kit on-device (HaatBazarTFLite plugin)]
        │       • ML Kit Image Labeling with the bundled custom TFLite model
        │       • Returns { crop_label_bn, variety_bn, confidence } in <800ms
        │       • Auto-selects `category_id` from `product_categories`
        │         (Bengali label → category map, e.g. "ইলিশ মাছ" → মাছ → ইলিশ,
        │          "হিমসাগর আম" → ফল → আম → হিমসাগর)
        │       • Pre-fills: title (crop label), category, unit
        │       • Descriptions completed by the template generator (Section 4.4.3)
        │         and refreshed from Gemini when connectivity returns
        │       • Bengali badge: "অফলাইন স্ক্যান — বিবরণ পরে আপডেট হবে"
        │
        └── [ONLINE — Gemini 1.5 Flash via Edge Function]
                • POST /functions/v1/ai-describe with the pre-processed image
                • Returns the structured JSON payload (Section 4.4.2):
                  { title, short_desc, long_desc, category_id,
                    quality_assessment, visual_evidence, confidence }
                • Auto-fills Title, Short Description, Long Description and the
                  Estimated Quality metrics — all editable before publish
                • Bengali badge: "🤖 স্ক্যান সম্পন্ন — বিবরণ তৈরি হয়েছে"
        │
        ▼
[Screen 3 opens with every text field pre-filled]
    • The farmer enters ONLY: মূল্য (Price) and পরিমাণ (Quantity)
    • Location is pre-filled from the profile
    • One tap on [প্রকাশ করুন] publishes the listing
```

**Zero-Typing Contract:** after a successful scan (confidence ≥ 0.5), the only fields the farmer must touch are **মূল্য (Price)** and **পরিমাণ (Quantity)** — every text field is generated by the scan (ML Kit offline labels, or Gemini structured JSON online) and remains editable. If scan confidence is < 0.5, the client falls back to the standard Screen 3 form with the category pre-selected.

**Screen 2: AI Processing (shown for 2-5 seconds)**

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│           🔄                            │
│   AI বিবরণ তৈরি করছে...                  │
│   (Generating AI description...)        │
│                                         │
│   ──────────────── 65% ───              │
│                                         │
│   ⚡ আপনার পণ্য চিনে নেওয়া হচ্ছে        │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Screen 3: "পণ্যের তথ্য" (Product Details — Edit AI Output + Add Pricing)**

```
┌─────────────────────────────────────────┐
│  ← পণ্যের তথ্য                   ধাপ ১/৩│
│─────────────────────────────────────────│
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ [+]       │
│  │ img1 │ │ img2 │ │ img3 │            │
│  └──────┘ └──────┘ └──────┘            │
│  (Swipeable image thumbnails, max 5)    │
│                                         │
│  🤖 AI দ্বারা তৈরি — সম্পাদনা করুন        │
│                                         │
│  পণ্যের নাম *                            │
│  ┌─────────────────────────────────┐    │
│  │ পাকা আম — হিমসাগর জাত           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  পণ্যের ধরন *                            │
│  ┌─────────────────────────────────┐    │
│  │ ফল                        ▼    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  সংক্ষিপ্ত বিবরণ *                        │
│  ┌─────────────────────────────────┐    │
│  │ বগুড়ার শেরপুর থেকে সংগ্রহ করা     │    │
│  │ পাকা হিমসাগর আম। ভালো মানের...   │    │
│  └─────────────────────────────────┘    │
│  (AI tag: 🤖 AI তৈরি — ২৫৬/৩০০ অক্ষর)  │
│                                         │
│  বিস্তারিত বিবরণ *                        │
│  ┌─────────────────────────────────┐    │
│  │ এই হিমসাগর আম বগুড়া জেলার       │    │
│  │ শেরপুর উপজেলা থেকে সংগ্রহ করা    │    │
│  │ হয়েছে। আমগুলো পুরোপুরি পাকা...    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  (AI tag: 🤖 AI তৈরি — ৮৯২/২০০০ অক্ষর) │
│                                         │
│         [পরবর্তী ধাপ →]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Screen 4: "মূল্য ও পরিমাণ" (Pricing & Quantity)**

```
┌─────────────────────────────────────────┐
│  ← মূল্য ও পরিমাণ               ধাপ ২/৩│
│─────────────────────────────────────────│
│                                         │
│  মূল্য (৳) *                             │
│  ┌───────────────────────┐              │
│  │ ১২০.০০                │ প্রতি কেজি   │
│  └───────────────────────┘              │
│                                         │
│  একক *                                  │
│  [কেজি] [মণ] [টন] [পিস] [বস্তা] [লিটার] │
│  (chip selection — কেজি selected)       │
│                                         │
│  মোট পরিমাণ *                            │
│  ┌───────────────────────┐              │
│  │ ৫০০                   │ কেজি         │
│  └───────────────────────┘              │
│                                         │
│  সর্বনিম্ন অর্ডার পরিমাণ                   │
│  ┌───────────────────────┐              │
│  │ ১০                    │ কেজি         │
│  └───────────────────────┘              │
│                                         │
│  ☑ দর কষাকষি সম্ভব (toggle ON)           │
│                                         │
│  ফসল কাটার তারিখ                         │
│  ┌───────────────────────┐              │
│  │ ১৫ জুন ২০২৬           │ 📅           │
│  └───────────────────────┘              │
│                                         │
│  মেয়াদ শেষের তারিখ                       │
│  ┌───────────────────────┐              │
│  │ ৩০ জুন ২০২৬           │ 📅           │
│  └───────────────────────┘              │
│                                         │
│         [পরবর্তী ধাপ →]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Screen 5: "সংগ্রহস্থল ও প্রকাশ" (Pickup Location & Publish)**

```
┌─────────────────────────────────────────┐
│  ← সংগ্রহস্থল ও প্রকাশ           ধাপ ৩/৩│
│─────────────────────────────────────────│
│                                         │
│  সংগ্রহস্থল *                             │
│                                         │
│  বিভাগ *                                │
│  ┌─────────────────────────────────┐    │
│  │ রাজশাহী                   ▼    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  জেলা *                                 │
│  ┌─────────────────────────────────┐    │
│  │ বগুড়া                    ▼    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  উপজেলা *                               │
│  ┌─────────────────────────────────┐    │
│  │ শেরপুর                   ▼    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  বিস্তারিত ঠিকানা (ঐচ্ছিক)                │
│  ┌─────────────────────────────────┐    │
│  │ শেরপুর বাজারের পাশে, জামাল...    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  📋 পণ্যের সারসংক্ষেপ:                    │
│  • পাকা আম — হিমসাগর জাত                │
│  • ৳১২০.০০/কেজি × ৫০০ কেজি              │
│  • শেরপুর, বগুড়া, রাজশাহী                 │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  🚀 এই পণ্য বুস্ট করতে চান?              │
│  [হ্যাঁ, বুস্ট করুন ৳৫০ থেকে]  [না, ধন্যবাদ] │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  ☑ আমি নিশ্চিত করছি যে তথ্যগুলো সঠিক    │
│  ☑ ০% কমিশন — কোনো চার্জ নেই           │
│                                         │
│      [📤 পণ্য প্রকাশ করুন]                 │
│                                         │
└─────────────────────────────────────────┘
```

**Post-Publish Flow:**

```
[Farmer taps "পণ্য প্রকাশ করুন"]
        │
        ▼
[Client validates all required fields]
        │
        ├── [Validation fails] → Highlight fields with Bengali error messages
        │
        └── [Validation passes]
                │
                ▼
        [Create product record]
            INSERT INTO products (farmer_id, category_id, title, short_desc, long_desc,
                price, quantity, remaining_quantity, unit, pickup_location_id,
                pickup_address_detail, harvest_date, expiry_date, is_negotiable,
                min_order_quantity, status, ai_confidence_score)
            VALUES (..., ..., 'pending_review', <confidence>)
                │
                ▼
        [Link product images]
            UPDATE product_images SET product_id = <new_product_id>
            WHERE id IN (<uploaded_image_ids>)
                │
                ▼
        [Auto-review (within same request)]
            • Check product title/description for spam keywords (blacklist)
            • Check if all images passed NSFW check
            • If all pass → UPDATE products SET status = 'active'
            • If any fail → Keep status = 'pending_review', alert admin
                │
                ▼
        [If Farmer selected "বুস্ট করুন"]
            → Navigate to Boost Payment flow (Section 7)
                │
                ▼
        [Push notifications to relevant Buyers]
            → Topic: new_products_{district_id}
            → Message: "নতুন পণ্য: {title} — ৳{price}/{unit} — {upazila_name}"
                │
                ▼
        [Success screen]
            "আপনার পণ্য সফলভাবে প্রকাশিত হয়েছে! ✅"
            [পণ্য দেখুন]  [আরেকটি পণ্য যোগ করুন]  [হোমে ফিরে যান]
```

### 4.6 Product Editing & Inventory Management

#### 4.6.1 Editing Rules

| Field | Editable After Publish? | Constraint |
|-------|------------------------|-----------|
| Images | ✅ Yes | Can add/remove/reorder. Re-triggers NSFW check for new images. |
| Title | ✅ Yes | Sets status back to `pending_review` if changed significantly (>50% character difference) |
| Short/Long Description | ✅ Yes | Same review trigger as title |
| Price | ✅ Yes | Immediately effective. Does NOT affect existing orders. Active orders keep their locked price. |
| Quantity | ✅ Yes (increase only) | Can only increase total quantity (re-stock). Cannot set below `quantity - remaining_quantity` (already sold amount). |
| Unit | ❌ No | Cannot change after first order placed. Before any orders: editable. |
| Category | ❌ No | Cannot change after publish. Must create new listing. |
| Pickup Location | ✅ Yes | Change effective immediately. Existing transport arrangements not affected. |
| Harvest/Expiry Date | ✅ Yes | Immediately effective. |
| is_negotiable | ✅ Yes | Toggle anytime. |
| min_order_quantity | ✅ Yes | Cannot exceed remaining_quantity. |

#### 4.6.2 Partial Purchase & Inventory Deduction

When a Buyer purchases a product:

```
[Buyer orders 50 kg from a 500 kg listing]
        │
        ▼
[System checks]
    • remaining_quantity (500) >= order_quantity (50)? → YES
    • order_quantity (50) >= min_order_quantity (10)? → YES
        │
        ▼
[Atomic transaction]
    BEGIN;
    INSERT INTO orders (product_id, buyer_id, quantity_ordered, unit_price, total_amount, current_state)
    VALUES (<product_id>, <buyer_id>, 50, 120.00, 6000.00, 'pending_payment');

    UPDATE products SET remaining_quantity = remaining_quantity - 50 WHERE id = <product_id>;

    -- Check if remaining is now zero
    UPDATE products SET status = 'sold' WHERE id = <product_id> AND remaining_quantity <= 0;
    COMMIT;
        │
        ▼
[If order is later cancelled before payment verification]
    → remaining_quantity += order_quantity (restore inventory)
    → If product was set to 'sold', revert to 'active'
```

**Race Condition Prevention:**
- The `UPDATE products SET remaining_quantity = remaining_quantity - :qty WHERE id = :id AND remaining_quantity >= :qty` uses a **row-level lock** to prevent overselling.
- If the `WHERE remaining_quantity >= :qty` clause matches zero rows → the purchase fails with Bengali error: "দুঃখিত, এই পণ্যের পর্যাপ্ত পরিমাণ নেই। বর্তমানে {remaining_quantity} {unit} পাওয়া যাচ্ছে।"

### 4.7 Product Categories Taxonomy

Categories are stored in a `product_categories` table and seeded at deployment. They are **admin-managed** (not user-created).

**Category Hierarchy (2 levels):**

| Parent Category (Bengali) | Subcategories (Bengali) |
|---------------------------|------------------------|
| ফল (Fruits) | আম, কাঁঠাল, লিচু, কলা, পেয়ারা, পেঁপে, তরমুজ, জাম, বরই, আনারস, নারিকেল, কমলা, আপেল (আমদানি), আঙ্গুর (আমদানি), অন্যান্য ফল |
| সবজি (Vegetables) | আলু, টমেটো, বেগুন, শিম, লাউ, কুমড়া, ফুলকপি, বাঁধাকপি, মরিচ, ঢেঁড়স, পটল, করলা, শসা, মুলা, পালংশাক, লালশাক, ডাটা, অন্যান্য সবজি |
| শস্য ও ডাল (Grains & Pulses) | ধান, চাল, গম, ভুট্টা, মসুর ডাল, মুগ ডাল, ছোলা, খেসারি, অন্যান্য শস্য |
| মসলা (Spices) | পেঁয়াজ, রসুন, আদা, হলুদ, মরিচ (শুকনো), ধনিয়া, জিরা, তেজপাতা, অন্যান্য মসলা |
| মাছ (Fish) | ইলিশ, রুই, কাতলা, পাঙ্গাশ, তেলাপিয়া, চিংড়ি, শিং, মাগুর, বোয়াল, অন্যান্য মাছ |
| গবাদি পশু ও হাঁস-মুরগি (Livestock & Poultry) | গরু, ছাগল, ভেড়া, মুরগি (ব্রয়লার), মুরগি (দেশি), হাঁস, কোয়েল, অন্যান্য |
| দুগ্ধজাত ও ডিম (Dairy & Eggs) | দুধ, ঘি, দই, পনির, ছানা, মুরগির ডিম, হাঁসের ডিম, অন্যান্য |
| সার, বীজ ও কীটনাশক (Fertilizers, Seeds & Pesticides) | সার (ইউরিয়া, এমওপি, টিএসপি, ডিএপি), কীটনাশক, ছত্রাকনাশক, বীজ, মাছের ওষুধ, অন্যান্য |
| অন্যান্য কৃষি পণ্য (Other Agricultural Products) | মধু, আখের গুড়, খেজুরের গুড়, পাট, তামাক, বাঁশ, ফুল, অন্যান্য |

> **V4.0 note:** **"সার, বীজ ও কীটনাশক" (Fertilizers, Seeds & Pesticides)** is promoted to a top-level category in V4.0. It is the dedicated input-supplies category used by the Crop & Fish Doctor cross-selling flow (Section 4.10.2) — all fertilizer, seed, pesticide, and fish-medicine listings must live under it.

**`product_categories` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| name_bn | VARCHAR(100) | Bengali display name |
| slug | VARCHAR(100) UNIQUE | URL-friendly identifier (e.g., "fruits", "vegetables") |
| parent_id | UUID FK → product_categories.id NULL | NULL for top-level categories |
| icon_url | TEXT | Icon image URL for UI display |
| display_order | INTEGER | Sort order in UI dropdowns and category grid |
| is_active | BOOLEAN DEFAULT true | Soft-disable without deleting |

### 4.8 Product Reporting & Moderation

Any logged-in user can report a product listing for policy violations.

**Report Reasons (Bengali):**

| Reason Code | Bengali Label | Description |
|-------------|--------------|-------------|
| `fake_product` | ভুয়া পণ্য | Product doesn't match description or image |
| `inappropriate_image` | অনুপযুক্ত ছবি | Image contains non-agricultural or offensive content |
| `misleading_price` | বিভ্রান্তিকর মূল্য | Price is clearly unrealistic (too low to be real, potential scam) |
| `prohibited_item` | নিষিদ্ধ পণ্য | Item not allowed on platform (e.g., illegal substances) |
| `duplicate_listing` | একই পণ্যের একাধিক তালিকা | Same farmer has listed the same product multiple times |
| `other` | অন্যান্য | Free-text report with description |

**Moderation Flow:**
1. User taps ⚑ (flag icon) on product detail page → selects reason → optional description → submit.
2. Record inserted into `product_reports` table.
3. If a product receives **3+ unique reports** → auto-set status to `suspended` → admin notification.
4. Admin reviews in admin panel → either restores listing or confirms suspension.
5. Farmer notified with Bengali message explaining the outcome.

**`product_reports` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| product_id | UUID FK → products.id | Reported product |
| reporter_user_id | UUID FK → users.id | Who reported |
| reason | VARCHAR(30) | Reason code from above |
| description | TEXT | Optional free-text |
| status | VARCHAR(20) | `pending`, `reviewed_valid`, `reviewed_dismissed` |
| reviewed_by | UUID FK → admin_users.id NULL | Admin who reviewed |
| reviewed_at | TIMESTAMP NULL | When reviewed |
| created_at | TIMESTAMP | When reported |

**Constraint:** `UNIQUE(product_id, reporter_user_id)` — a user can only report a specific product once.

---

### 4.9 Accessibility & Low-Literacy UX

A significant portion of HaatBazar's target users have limited literacy or prefer voice interaction. This section defines the features that make the platform usable for this audience without degrading the experience for literate users.

#### 4.9.1 Voice-First Product Creation

Any text input field in the product creation flow (title, short description, long description, notes) supports voice input via Bengali ASR (Automatic Speech Recognition), executed through `@capacitor-community/speech-recognition` with locale `bn-BD`. Long-pressing the field's microphone icon starts a recognition session whose partial (interim) results stream directly into the focused SvelteKit form input.

**Voice-to-Structured Data Pipeline:**

```
[User long-presses 🎤 on any description field]
        │
        ▼
[Recording starts — visual waveform shown]
    @capacitor-community/speech-recognition session opens (locale: bn-BD)
    Partial results stream into the focused SvelteKit input as they arrive
    Bengali instruction: "বলুন, আমি শুনছি..."
        │
        ▼
[User speaks, e.g.:
 "আমার আম পাকা, হিমসাগর জাত,
  পাঁচশ কেজি আছে, একশো বিশ টাকা কেজি"]
        │
        ▼
[Speech-to-Text — @capacitor-community/speech-recognition, locale bn-BD]
    → Device engine transcribes; Google Cloud Speech-to-Text (bn-BD) is the fallback when the device engine is unavailable
    → Raw transcript: "আমার আম পাকা হিমসাগর জাত পাঁচশ কেজি আছে একশো বিশ টাকা কেজি"
        │
        ▼
[Edge Function: POST /functions/v1/parse-voice-input]
    Bengali NLP extraction:
    {
      "raw_transcript": "...",
      "extracted": {
        "product_name": "আম",
        "variety":      "হিমসাগর",
        "quantity":     { "value": 500, "unit": "কেজি" },
        "price_hint":   120,
        "quality_signals": ["পাকা"]
      },
      "confidence": 0.91,
      "missing_fields": ["pickup_location", "harvest_date"]
    }
        │
        ▼
[Auto-populate matched form fields]
[Highlight missing fields with gentle pulse animation]
[Show editable transcript card so user can correct misheard words]
```

**Supported voice commands for common actions:**

| Voice Input (Bengali) | Action |
|----------------------|--------|
| "পরবর্তী" / "পরের পাতা" | Navigate to next step |
| "মুছে দাও" | Clear current field |
| "আবার বলো" | Re-read current AI-generated description aloud (TTS) |
| "প্রকাশ করো" | Publish the listing |

#### 4.9.2 Audio Description Playback (TTS)

After AI generates a description, users can hear it read aloud before accepting. This helps low-literacy users verify the content without reading.

```
┌──────────────────────────────────────────────┐
│  AI তৈরি বিবরণ:                              │
│  "পাকা হিমসাগর আম, বগুড়া, শেরপুর থেকে..."   │
│                                              │
│  [🔊 শুনুন]   [✏️ সম্পাদনা করুন]   [✅ ঠিক আছে] │
└──────────────────────────────────────────────┘
```

Tapping **[🔊 শুনুন]** requests the Bengali audio from Google Cloud Text-to-Speech (Bengali, female voice `bn-BD-Standard-A`) and streams it into an inline HTML5 `<audio>` element played through the device speaker. When audio streaming is unavailable (offline, or restricted autoplay), the client falls back to the WebView's native `window.speechSynthesis` Bengali voice. Playback can be paused and replayed.

TTS is also available on:
- Product detail pages (buyer can hear description)
- Order status screens ("আপনার অর্ডার পরিবহনে আছে")
- Notification messages (long-press any notification → "শুনুন")

#### 4.9.3 Visual Category Selection

Instead of a text dropdown, category selection uses an **illustrated photo grid**. Each category cell shows a representative photograph of that product type. Users tap the image that looks like their product.

```
┌──────────────────────────────────────────────┐
│  আপনার পণ্যের ধরন বেছে নিন                   │
│──────────────────────────────────────────────│
│                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ [🥭]   │ │ [🥕]   │ │ [🌾]   │ │ [🧅]   │ │
│  │  ফল    │ │ সবজি   │ │  শস্য  │ │  মসলা  │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ │
│                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ [🐟]   │ │ [🐄]   │ │ [🥛]   │ │ [🍯]   │ │
│  │  মাছ   │ │গবাদি পশু│দুগ্ধজাত │অন্যান্য │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

After tapping a parent category, a second grid appears with subcategory photos. Tapping a subcategory selects it and provides the AI model a `category_hint`, improving recognition accuracy.

**Implementation:** Each `product_categories` row has an `icon_url` (stored in Supabase Storage) pointing to a real photograph of that crop type. The grid is a plain CSS Grid over cached, pre-compressed thumbnails — no Virtual DOM diffing, no CSS filters — so a 16-tile category grid keeps at most 16 nodes in the DOM.

**List Performance (feeds with 100+ items):** Every long feed (product feed, requirements feed, transport offers, chat history, notifications) is rendered with `svelte-virtual-list` virtualization, so a 100+ item feed keeps only **5–6 item nodes mounted in the DOM at any time** regardless of scroll position. This is a hard requirement for 1GB-RAM Android Go devices and is verified in Section 17.6 performance targets.

#### 4.9.4 Camera-First Product Entry (Zero-Typing Quick Sell)

Quick Sell is now **Camera-First** — the flow starts with the camera, not a form. Accessible via a prominent **"দ্রুত বিক্রি" (Quick Sell)** button on the home screen. Step ① opens the camera in scan mode: the farmer taps **"পণ্য স্ক্যান করুন"** and points the camera at the harvest (crop, fish, or livestock). The scan classifies the product instantly and every text field is generated automatically — the farmer only ever types the **price** and the **quantity**.

```
┌──────────────────────────────────────────────┐
│  ← দ্রুত বিক্রি                               │
│  ৩টি সহজ ধাপে পণ্য বিক্রি করুন                │
│──────────────────────────────────────────────│
│                                              │
│  ① ছবি তুলুন                                  │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │    [📷 ক্যামেরা]   [🖼️ গ্যালারি]      │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ② দাম ও পরিমাণ লিখুন  (🎤 ভয়েস)             │
│  ┌─────────────┐  ┌─────────────────┐        │
│  │  দাম (৳)    │  │  পরিমাণ         │        │
│  │  ১২০        │  │  ৫০০ কেজি       │        │
│  └─────────────┘  └─────────────────┘        │
│                                              │
│  ③ এলাকা নিশ্চিত করুন                         │
│  📍 বগুড়া, শেরপুর  [পরিবর্তন করুন]            │
│                                              │
│  ─────────────────────────────────────       │
│  🤖 AI বাকি সব পূরণ করবে                     │
│                                              │
│       [🚀 এখনই প্রকাশ করুন]                   │
│                                              │
└──────────────────────────────────────────────┘
```

**Scan Result — everything is auto-filled before the farmer types anything:**

```
[Scan completes]
        │
        ▼
┌──────────────────────────────────────────────┐
│  🤖 স্ক্যান সম্পন্ন — সব তথ্য পূরণ হয়েছে      │
│──────────────────────────────────────────────│
│  পণ্য: ইলিশ মাছ                 (আত্মবিশ্বাস ০.৯৪) │
│  ধাপ: মাছ → ইলিশ                    category_id ✓ │
│  শিরোনাম: "পদ্মার তাজা ইলিশ মাছ"              │
│  সংক্ষিপ্ত বিবরণ: পদ্মা নদীর টাটকা ইলিশ...     │
│  বিস্তারিত বিবরণ: (২০০০ অক্ষর পর্যন্ত)         │
│  মান নির্ণয়: ভালো — বরফজাল ব্যবহার করা হয়েছে  │
│──────────────────────────────────────────────│
│  👉 আপনাকে শুধু দাম ও পরিমাণ লিখতে হবে        │
└──────────────────────────────────────────────┘
        │
        ▼
[Farmer enters ONLY: দাম (Price) + পরিমাণ (Quantity)] → [🚀 এখনই প্রকাশ করুন]
```

**Camera-First Entry Rules (Zero-Typing):**
- **Offline scan:** Google ML Kit Image Labeling (custom Capacitor plugin `HaatBazarTFLite`, bundled custom TFLite model — Section 4.4.3) classifies the frame in <800ms and auto-selects the `category_id` from `product_categories` via the Bengali label → category map. Title, category, and unit are pre-filled; descriptions are completed by the template generator and refreshed from Gemini when connectivity returns. Bengali badge: "অফলাইন স্ক্যান — বিবরণ পরে আপডেট হবে"।
- **Online scan:** the pre-processed image (Section 4.3 OffscreenCanvas Web Worker) is sent to Gemini 1.5 Flash via `POST /functions/v1/ai-describe`, which returns the structured JSON payload (`title`, `short_desc`, `long_desc`, `category_id`, `quality_assessment`, `confidence`) that instantly auto-fills Title, Short Description, Long Description, and the Estimated Quality metrics.
- **Zero-Typing Contract:** after a successful scan (confidence ≥ 0.5), the only fields the farmer must touch are **মূল্য (Price)** and **পরিমাণ (Quantity)** — location is pre-filled from the profile. All generated text remains editable before publish.
- The listing is published immediately in `active` status without a review step (AI-generated content is considered pre-moderated; still subject to community reporting).
- If scan confidence is < 0.5, the client falls back to the standard Screen 3 form with the category pre-selected — the flow never dead-ends.
- Users can always switch to the **full listing flow** ("বিস্তারিত ফর্ম") for more control.

#### 4.9.5 Bengali Number Input & Universal Voice Fallback

| Feature | Behaviour |
|---------|-----------|
| **Dual-script number input** | All numeric fields (price, quantity, phone) accept both Bengali digits (০১২৩৪৫৬৭৮৯) and Arabic digits (0123456789). The client normalises to Bengali for display and to Arabic for API calls. |
| **Universal voice fallback** | Every text and number input field has a microphone icon. Long-pressing any field activates voice input regardless of field type. |
| **Large tap targets** | All interactive elements have a minimum touch target of 48×48dp per Material Design guidelines — critical for users with less precise motor control. |
| **High-contrast mode** | Respects Android system accessibility settings. All text meets WCAG AA contrast ratio (4.5:1 minimum). |
| **Font size scaling** | UI respects system font size multiplier (up to 1.5×) without layout breakage. Critical text never uses `px` units smaller than 14px. |

### 4.10 AI Pathology & Marketplace Cross-Selling — "ফসল ও মাছের ডাক্তার" (Crop & Fish Doctor)

A farmer standing in a rice field or a fisherman on a pond can photograph a diseased leaf, a pest infestation, or a sick fish and receive an **instant Bengali diagnosis** together with the exact treatments available for purchase on HaatBazar. This closes the loop **diagnose → treat → buy** without leaving the app. The feature is zero-typing: a photo goes in, a diagnosis, a treatment plan, and buyable treatments come out.

**Entry Points:**
- Home screen card: **"ফসল ও মাছের ডাক্তার"** (🩺 icon, prominent placement under the Quick Sell button).
- Contextual: when a camera-first product scan (Section 4.9.4) returns a low quality score, a "রোগ নির্ণয় করুন" shortcut appears on the result card.
- History: **"আমার রোগ নির্ণয়"** list on the profile (previous diagnoses with photos).

**End-to-End Flow:**

```
[User taps "ফসল ও মাছের ডাক্তার" → camera opens]
        │
        ▼
[Photo captured: diseased leaf / pest infestation / sick fish]
        │
        ▼
[OffscreenCanvas Web Worker pre-processing (Section 4.3)]
    → Resize to 1024px max, JPEG 80%, EXIF handling
        │
        ▼
[POST /functions/v1/ai-diagnose]
    → Gemini 1.5 Flash (vision) analyzes the visual symptoms
    → Returns the structured JSON payload (Section 4.10.1)
        │
        ▼
[Diagnosis card rendered in Bengali]
    → diagnosis_bn + treatment_bn + confidence + severity
        │
        ▼
[Marketplace cross-selling (Section 4.10.2)]
    → search_keywords → POST /functions/v1/search-products
      (hard-filtered to the "সার, বীজ ও কীটনাশক" category)
    → Horizontally scrollable treatment listings + [কিনুন] button
```

#### 4.10.1 Diagnostic Engine (`POST /functions/v1/ai-diagnose`)

**Request:**

```json
{
  "image_base64": "<1024px / 80% JPEG from the OffscreenCanvas worker>",
  "subject_hint": "crop | fish | livestock",
  "location_id": "uuid-or-null"
}
```

**Response (Gemini 1.5 Flash, structured JSON output):**

```json
{
  "diagnosis_bn": "পাতার দাগ রোগ (ব্লাস্ট)",
  "diagnosis_confidence": 0.88,
  "severity": "moderate",
  "treatment_bn": "৭-১০ দিন অন্তর ছত্রাকনাশক স্প্রে করুন এবং ক্ষেতে পানি নিষ্কাশন নিশ্চিত করুন।",
  "search_keywords": ["ছত্রাকনাশক", "ম্যানকোজেব", "ট্রাইসাইক্লাজল"],
  "preventive_tips_bn": ["প্রতিরোধে বীজ শোধন করুন", "অতিরিক্ত ইউরিয়া ব্যবহার এড়িয়ে চলুন"],
  "is_agricultural": true
}
```

- `diagnosis_bn` — name of the disease / pest in Bengali.
- `treatment_bn` — recommended action in Bengali.
- `search_keywords` — array of chemical / treatment names used for marketplace cross-selling (Section 4.10.2).
- The prompt is versioned in the Edge Function exactly like `ai-describe` (Section 16.2) and must return `"is_agricultural": false` gracefully for non-agricultural photos (Bengali message: "এটি কৃষি বা মৎস্য সম্পর্কিত ছবি নয়।").
- Every successful diagnosis writes a row to `crop_diagnoses` (Section 4.10.3) and decrements the shared AI quota via `ai_usage_log` (`ai_model_used = 'gemini-1.5-flash'`, Section 7.14).

#### 4.10.2 Marketplace Cross-Selling (Diagnose → Buy)

The SvelteKit client takes `search_keywords` and immediately calls the **existing** search API, hard-filtered to the input-supplies category:

```
POST /functions/v1/search-products
{
  "query": "ম্যানকোজেব",             // first keyword; falls back to the next keyword on 0 results
  "category_id": "<uuid of the সার, বীজ ও কীটনাশক category>",
  "per_page": 10,
  "sort_by": "relevance"
}
```

**UI:** the diagnosis card renders `diagnosis_bn` and `treatment_bn`, then a **horizontally scrollable carousel** of active marketplace listings for the exact pesticides / treatments needed. Each carousel card shows photo, price, seller rating, and a direct **[কিনুন]** button that opens the standard product detail → order flow (Sections 6.4–6.5). Zero commission applies to these sales exactly as to every other trade — the Doctor feature takes no cut and adds no markup.

- Results render in a virtualized horizontal list (Section 4.9.3 list-performance rules) — at most 5–6 item nodes in the DOM at a time on 1GB devices.
- If every keyword returns 0 results, the card shows: "এই ওষুধ এখন মজুত নেই। অনুরূপ পণ্য দেখুন।" with a browse link into the "সার, বীজ ও কীটনাশক" category.
- Treatment listings are ordinary products: sellers follow the existing moderation rules (Section 4.8), and pesticide listings must include a valid license number in the description (moderation-checked).

#### 4.10.3 Data Model — `crop_diagnoses` (V4.0 addition)

```sql
CREATE TABLE crop_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT,                            -- Supabase Storage, private bucket 'diagnosis-images'
    subject_hint VARCHAR(20),                  -- 'crop' | 'fish' | 'livestock'
    diagnosis_bn TEXT,
    diagnosis_confidence DECIMAL(3,2),
    severity VARCHAR(20),                      -- 'low' | 'moderate' | 'high'
    treatment_bn TEXT,
    search_keywords JSONB,                     -- ["ছত্রাকনাশক", "ম্যানকোজেব"]
    ai_model_used VARCHAR(50) DEFAULT 'gemini-1.5-flash',
    is_agricultural BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_crop_diagnoses_user ON crop_diagnoses(user_id, created_at DESC);
-- RLS: owner can SELECT / DELETE own rows only; INSERT happens via the ai-diagnose Edge Function.
```

Retention: diagnosis images are auto-deleted after 90 days (Appendix B policy); the rows remain as the user's diagnosis history ("আমার রোগ নির্ণয়").

#### 4.10.4 Bengali UX & Low-End Constraints

- The diagnosis card is a single scrollable column — no `backdrop-filter: blur()`, no CSS filters, no Virtual DOM diffing (Section 2.1 client budget; Android 11+ Go Edition, 1GB RAM).
- Voice support: long-pressing 🎤 on the diagnosis card reads `treatment_bn` aloud through the Section 4.9.2 TTS path.
- Offline: diagnosis requires connectivity (Gemini). Offline, the client runs ML Kit labeling only, stores the photo, shows "ইন্টারনেট সংযোগ ছাড়া রোগ নির্ণয় সম্ভব নয়। ছবিটি সংরক্ষিত আছে — সংযোগ পেলে স্বয়ংক্রিয়ভাবে পাঠানো হবে।" and enqueues the request in the sync queue (priority 5).

#### 4.10.5 Rate Limiting & Abuse Controls

- 5 diagnoses per user per hour (Section 18.4) plus the shared AI quota (Section 7.14).
- `is_agricultural: false` responses are logged for abuse analytics but do **not** consume AI quota.
- Repeated non-agricultural uploads (>10/day) raise a fraud flag for manual review.

---

## 5. Marketplace Dynamics — Buyer Requirements & Transport Offers

This section defines two critical "demand-side" features that complement the Farmer's product listings (supply-side). Together, they create a **two-sided marketplace** where both supply and demand can originate from either side.

### 5.1 Feature Overview

| Feature | Initiated By | Bengali Label | Purpose |
|---------|-------------|---------------|---------|
| **Buyer Requirement** | Buyer (ক্রেতা) | চাহিদা পোস্ট | Buyer publishes what they want to buy, allowing Farmers to approach them with matching products. Reverses the typical "browse and buy" flow. |
| **Transport Offer** | Transport Company (পরিবহন কোম্পানি) | পরিবহন অফার | Transporter publishes available vehicle capacity on a specific route at a specific price. Buyers can select these offers directly when arranging logistics for purchased products. |

**Marketplace Interaction Matrix:**

```
                    SUPPLY SIDE                    DEMAND SIDE
                    ───────────                    ───────────

Product Listings ◄──────────────────────────────► Buyer Requirements
(Farmer creates)     Farmers can respond to         (Buyer creates)
                     buyer requirements with
                     matching product offers

Transport Offers ◄──────────────────────────────► Transport RFQs
(Transporter creates) Transporters can bid on       (Buyer creates after
                      buyer RFQs                     purchasing a product)
```

---

### 5.2 Buyer Requirements — Complete Specification

#### 5.2.1 Purpose & Business Logic

Buyer Requirements solve the "I know what I want but can't find it" problem. In traditional Bangladeshi agricultural trade, buyers (wholesalers, restaurants, retailers) often know exactly what product, quantity, and price they need but lack visibility into which farmers can supply it. This feature digitizes the "demand broadcast" pattern.

**Key Business Rules:**
- A Buyer can have a maximum of **10 active requirements** at any time (prevents spam).
- Requirements expire automatically after their `deadline_date` passes.
- Farmers in the matching location (District-level) receive push notifications for new requirements.
- Farmers respond by either linking an existing active product listing OR creating a new listing and sending an offer.
- The Buyer can accept a Farmer's response, which transitions into a standard purchase + logistics flow (Section 6).

#### 5.2.2 Buyer Requirement Data Model

**`buyer_requirements` Table:**

| Field | Bengali Label | Type | Required | Description |
|-------|-------------|------|----------|-------------|
| id | — | UUID PK | Auto | Unique identifier |
| buyer_id | — | UUID FK → users.id | Auto | The buyer who posted this requirement |
| category_id | পণ্যের ধরন | UUID FK → product_categories.id | Yes | What type of product is needed |
| title | চাহিদার শিরোনাম | VARCHAR(200) | Yes | Short title (e.g., "৫০০ কেজি হিমসাগর আম দরকার") |
| description | বিস্তারিত বিবরণ | TEXT (max 1000 chars) | Yes | Detailed description of quality expectations, packaging needs, etc. |
| quantity_needed | প্রয়োজনীয় পরিমাণ | DECIMAL(10,2) | Yes | How much the buyer needs |
| unit | একক | VARCHAR(20) | Yes | Unit of measure (same enum as products: কেজি, মণ, টন, পিস, বস্তা, লিটার) |
| min_price_bdt | সর্বনিম্ন মূল্য (৳) | DECIMAL(10,2) | No | Optional: minimum acceptable price per unit (prevents unrealistically low offers) |
| max_price_bdt | সর্বোচ্চ মূল্য (৳) | DECIMAL(10,2) | Yes | Maximum price per unit the buyer is willing to pay |
| delivery_location_id | ডেলিভারি স্থান | UUID FK → locations.id | Yes | Where the buyer needs the product delivered (Upazila level) |
| delivery_address_detail | বিস্তারিত ডেলিভারি ঠিকানা | TEXT (max 500 chars) | No | Optional street-level delivery address |
| deadline_date | শেষ তারিখ | DATE | Yes | By when the buyer needs the product. Must be >= today + 1 day. |
| is_urgent | জরুরি | BOOLEAN DEFAULT false | No | If true, requirement gets a "জরুরি" badge and priority in farmer notifications |
| preferred_location_id | পছন্দের সংগ্রহস্থল | UUID FK → locations.id NULL | No | Optional: preferred pickup/sourcing location (e.g., buyer prefers products from a specific district) |
| status | অবস্থা | VARCHAR(20) | Auto | Lifecycle status (see state machine below) |
| response_count | প্রতিক্রিয়া সংখ্যা | INTEGER DEFAULT 0 | Auto | Number of farmer responses received (denormalized counter for UI) |
| created_at | তারিখ | TIMESTAMP | Auto | Creation timestamp |
| updated_at | — | TIMESTAMP | Auto | Last update timestamp |

**Indexes:**
- `idx_buyer_requirements_status_deadline` ON `(status, deadline_date)` — for active requirement queries and expiry cron job
- `idx_buyer_requirements_category_location` ON `(category_id, delivery_location_id)` — for farmer matching
- `idx_buyer_requirements_buyer` ON `(buyer_id)` — for "my requirements" listing

**Constraints:**
- `CHECK (max_price_bdt > 0)`
- `CHECK (min_price_bdt IS NULL OR min_price_bdt <= max_price_bdt)`
- `CHECK (quantity_needed > 0)`
- `CHECK (deadline_date >= CURRENT_DATE + INTERVAL '1 day')`
- RLS Policy: Buyers can only INSERT/UPDATE/DELETE their own requirements. All authenticated users can SELECT active requirements.

#### 5.2.3 Buyer Requirement Lifecycle State Machine

```
    [draft] ──→ [active] ──→ [fulfilled]
                  │  │
                  │  ├──→ [expired]
                  │  │     (deadline_date passed with
                  │  │      no accepted response)
                  │  │
                  │  ├──→ [cancelled]
                  │  │     (buyer manually cancels)
                  │  │
                  │  └──→ [partially_fulfilled]
                  │         (buyer accepted a response
                  │          for partial quantity;
                  │          remaining qty still needed)
                  │              │
                  │              ├──→ [fulfilled] (remaining also filled)
                  │              └──→ [expired] (deadline passed)
                  │
                  └──→ (receives farmer responses while active)
```

**State Definitions:**

| State | DB Value | Bengali Label | Description |
|-------|----------|---------------|-------------|
| Draft | `draft` | খসড়া | Buyer is composing requirement. Not visible to farmers. |
| Active | `active` | সক্রিয় | Published and visible to all farmers. Accepting responses. |
| Partially Fulfilled | `partially_fulfilled` | আংশিক পূরণ | Buyer has accepted a response for part of the needed quantity. Remaining quantity still needed. |
| Fulfilled | `fulfilled` | পূরণ হয়েছে | Full quantity has been committed through accepted responses. Linked orders created. |
| Expired | `expired` | মেয়াদ শেষ | `deadline_date` has passed without full fulfillment. |
| Cancelled | `cancelled` | বাতিল | Buyer manually cancelled the requirement. |

**Auto-Expiry (pg_cron — runs every 5 minutes):**

```sql
-- Expire active/partially_fulfilled requirements past deadline
UPDATE buyer_requirements
SET status = 'expired', updated_at = NOW()
WHERE status IN ('active', 'partially_fulfilled')
  AND deadline_date < CURRENT_DATE;

-- Notify buyers of expired requirements
-- (trigger on update inserts into notification_queue)
```

#### 5.2.4 Farmer Responses to Buyer Requirements

When a Farmer sees a Buyer Requirement and wants to offer their product, they submit a **Requirement Response**.

**`requirement_responses` Table:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID PK | Auto | Unique identifier |
| requirement_id | UUID FK → buyer_requirements.id | Yes | The requirement being responded to |
| farmer_id | UUID FK → users.id | Yes | The farmer responding |
| product_id | UUID FK → products.id NULL | Conditional | If the farmer has an existing active listing, they link it here |
| offered_price_bdt | DECIMAL(10,2) | Yes | Price per unit the farmer is offering |
| offered_quantity | DECIMAL(10,2) | Yes | Quantity the farmer can supply (may be less than buyer's full need) |
| message | TEXT (max 500 chars) | No | Optional Bengali message from farmer to buyer (e.g., quality notes, availability timing) |
| pickup_location_id | UUID FK → locations.id | Yes | Where the product can be picked up |
| available_date | DATE | Yes | When the product will be ready for pickup |
| status | VARCHAR(20) | Auto | `pending`, `accepted`, `rejected`, `withdrawn` |
| created_at | TIMESTAMP | Auto | When the response was submitted |
| responded_at | TIMESTAMP NULL | Auto | When the buyer accepted/rejected |

**Indexes:**
- `idx_requirement_responses_requirement` ON `(requirement_id, status)` — for listing responses to a requirement
- `idx_requirement_responses_farmer` ON `(farmer_id)` — for farmer's "my responses" view
- `UNIQUE(requirement_id, farmer_id)` — a farmer can only respond once per requirement (can update their existing response)

**Response Flow:**

```
[Farmer sees buyer requirement in feed or via push notification]
        │
        ▼
[Farmer taps "অফার দিন" (Make Offer)]
        │
        ▼
[Response form screen: "চাহিদায় অফার দিন"]
    • If farmer has active listings matching the category:
        → Show list: "আপনার বিদ্যমান পণ্য থেকে নির্বাচন করুন"
        → Farmer selects existing product → price/quantity/location auto-filled
        → Farmer can override price for this specific offer
    • If no matching listing:
        → Farmer enters: offered_price, offered_quantity, pickup_location, available_date, message
        │
        ▼
[Validation]
    • offered_price <= buyer's max_price_bdt? (Warning if exceeds, but still allowed — buyer decides)
    • offered_quantity > 0?
    • available_date <= requirement's deadline_date?
    • Farmer not suspended or fraud-flagged?
        │
        ▼
[Submit response]
    INSERT INTO requirement_responses (...) VALUES (...)
    UPDATE buyer_requirements SET response_count = response_count + 1 WHERE id = <req_id>
        │
        ▼
[Notify Buyer]
    Push notification: "আপনার চাহিদায় নতুন অফার পেয়েছেন: {farmer_name} — ৳{price}/{unit}"
    In-app notification with link to requirement detail page
```

**Buyer Reviewing Responses:**

```
[Buyer opens their requirement → taps "অফার দেখুন" ({response_count} টি)]
        │
        ▼
[Response list screen — sorted by: price ascending, then farmer rating descending]
    Each card shows:
    ┌─────────────────────────────────────────┐
    │ 👤 {farmer_name} {✅ if verified}        │
    │ ⭐ {avg_rating} ({total_reviews} রিভিউ)  │
    │                                         │
    │ 📦 {offered_quantity} {unit}             │
    │ 💰 ৳{offered_price}/{unit}              │
    │ 📍 {pickup_location_name}               │
    │ 📅 {available_date}                     │
    │                                         │
    │ 💬 "{message preview...}"               │
    │                                         │
    │ [গ্রহণ করুন]  [প্রত্যাখ্যান]  [চ্যাট করুন]  │
    └─────────────────────────────────────────┘
        │
        ├── [Buyer taps "গ্রহণ করুন" (Accept)]
        │       │
        │       ▼
        │   [Confirmation dialog]
        │   "আপনি কি {farmer_name} এর অফার গ্রহণ করতে চান?
        │    ৳{offered_price}/{unit} × {offered_quantity} {unit}
        │    = ৳{total_amount}
        │    
        │    এই অফার গ্রহণ করলে একটি অর্ডার তৈরি হবে।"
        │       │
        │       ▼
        │   [System creates order]
        │   • If farmer linked an existing product_id:
        │       → Create order against that product (standard Section 6 flow)
        │       → Deduct quantity from product's remaining_quantity
        │   • If farmer did NOT link a product:
        │       → Auto-create a product listing from the offer details
        │       → Mark it as status = 'sold' immediately (private listing, not searchable)
        │       → Create order against this auto-created product
        │   • Set requirement_response.status = 'accepted'
        │   • Set requirement_response.responded_at = NOW()
        │   • Update requirement status:
        │       → If total accepted quantity >= needed quantity → 'fulfilled'
        │       → Else → 'partially_fulfilled', update remaining needed
        │   • Reject all other pending responses? NO — buyer can accept multiple
        │     responses from different farmers to fulfill total quantity
        │       │
        │       ▼
        │   [Navigate to Order Payment flow (Section 8)]
        │   [Farmer notified: "আপনার অফার গৃহীত হয়েছে! অর্ডার আইডি: {order_id}"]
        │
        ├── [Buyer taps "প্রত্যাখ্যান" (Reject)]
        │       → Set response.status = 'rejected'
        │       → Farmer notified: "দুঃখিত, আপনার অফারটি এবার গৃহীত হয়নি।"
        │       → response_count NOT decremented (keeps historical count)
        │
        └── [Buyer taps "চ্যাট করুন" (Chat)]
                → Opens a chat thread between buyer and farmer
                → Context: the specific requirement + response
                → Allows price negotiation before formal acceptance
                → See Section 11 for chat system details
```

#### 5.2.5 Buyer Requirement Matching & Notification Logic

When a new Buyer Requirement is published (`status` changes from `draft` to `active`), the system must notify relevant Farmers.

**Matching Algorithm:**

```
Step 1: Extract requirement fields:
    category_id, delivery_location_id, preferred_location_id, max_price_bdt

Step 2: Find matching Farmers:
    SELECT DISTINCT u.id, u.fcm_token, u.display_name
    FROM users u
    JOIN products p ON p.farmer_id = u.id
    WHERE u.role = 'farmer'
      AND u.is_suspended = false
      AND u.is_profile_complete = true
      AND p.status = 'active'
      AND p.category_id = :requirement_category_id
      AND p.price <= :max_price_bdt  -- only farmers whose price fits buyer's budget
      AND (
          -- Match by pickup location: same district as buyer's delivery location
          p.pickup_location_id IN (
              SELECT id FROM locations
              WHERE parent_id = (
                  SELECT parent_id FROM locations WHERE id = :delivery_location_id
              )
          )
          OR
          -- Match by preferred sourcing location if specified
          (:preferred_location_id IS NOT NULL AND p.pickup_location_id IN (
              SELECT id FROM locations
              WHERE parent_id = (
                  SELECT parent_id FROM locations WHERE id = :preferred_location_id
              )
          ))
      )
    LIMIT 100;  -- Cap notifications to prevent spam

Step 3: If specific farmer matches found → send targeted push notifications:
    "নতুন চাহিদা: {title} — সর্বোচ্চ ৳{max_price}/{unit} — {delivery_location_name}"

Step 4: If fewer than 5 specific matches → also broadcast to district-level farmer topic:
    Topic: buyer_requirements_{district_id}
    "নতুন চাহিদা পোস্ট: {category_name} — {quantity} {unit} — {delivery_location_name}"

Step 5: Insert notification records into notification_log table for each notified farmer.
```

#### 5.2.6 Buyer Requirement Creation UI

**Screen: "চাহিদা পোস্ট করুন" (Post Requirement)**

```
┌─────────────────────────────────────────┐
│  ← চাহিদা পোস্ট করুন                     │
│─────────────────────────────────────────│
│                                         │
│  পণ্যের ধরন *                            │
│  ┌─────────────────────────────────┐    │
│  │ ফল > আম                  ▼    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  চাহিদার শিরোনাম *                       │
│  ┌─────────────────────────────────┐    │
│  │ ৫০০ কেজি হিমসাগর আম দরকার       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  বিস্তারিত বিবরণ *                        │
│  ┌─────────────────────────────────┐    │
│  │ পাকা হিমসাগর আম দরকার।          │    │
│  │ রাসায়নিক মুক্ত হতে হবে।          │    │
│  │ প্রতিটি আম ২৫০-৩৫০ গ্রাম হতে হবে। │    │
│  └─────────────────────────────────┘    │
│                                         │
│  প্রয়োজনীয় পরিমাণ *                      │
│  ┌──────────────┐                       │
│  │ ৫০০           │ কেজি                 │
│  └──────────────┘                       │
│                                         │
│  মূল্য পরিসীমা (প্রতি কেজি) *              │
│  ┌──────────┐  থেকে  ┌──────────┐      │
│  │ ৳৮০      │        │ ৳১৫০     │      │
│  └──────────┘        └──────────┘      │
│  (সর্বনিম্ন — ঐচ্ছিক)  (সর্বোচ্চ — আবশ্যিক) │
│                                         │
│  ডেলিভারি স্থান *                         │
│  বিভাগ: [ঢাকা        ▼]                 │
│  জেলা:  [ঢাকা        ▼]                 │
│  উপজেলা: [সাভার      ▼]                 │
│                                         │
│  বিস্তারিত ডেলিভারি ঠিকানা (ঐচ্ছিক)        │
│  ┌─────────────────────────────────┐    │
│  │ সাভার বাসস্ট্যান্ডের পাশে...       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  পছন্দের সংগ্রহস্থল (ঐচ্ছিক)              │
│  ┌─────────────────────────────────┐    │
│  │ রাজশাহী > চাঁপাইনবাবগঞ্জ   ▼   │    │
│  └─────────────────────────────────┘    │
│  ℹ️ যেখান থেকে পণ্য সংগ্রহ করতে পছন্দ    │
│                                         │
│  শেষ তারিখ *                             │
│  ┌───────────────────────┐              │
│  │ ২৫ জুলাই ২০২৬         │ 📅           │
│  └───────────────────────┘              │
│                                         │
│  ☐ জরুরি চাহিদা (urgent badge)          │
│                                         │
│  ─────────────────────────────────      │
│  ☑ ০% কমিশন — কোনো চার্জ নেই           │
│                                         │
│       [📤 চাহিদা প্রকাশ করুন]              │
│                                         │
└─────────────────────────────────────────┘
```

---

### 5.3 Transport Offers — Complete Specification

#### 5.3.1 Purpose & Business Logic

Transport Offers are the **supply side of the logistics marketplace**. Transport companies proactively publish their available vehicle capacity, routes, and pricing. This enables:

1. **Direct Selection:** When a Buyer purchases a product and needs transport, the system shows matching Transport Offers that the Buyer can select immediately (no RFQ/bidding needed).
2. **Price Transparency:** Published prices reduce negotiation friction and set market expectations.
3. **Route Discovery:** Buyers can see what transport routes are available before purchasing, helping them plan logistics.

**Key Business Rules:**
- A Transport Company can have a maximum of **50 active offers** at any time.
- Offers expire automatically on the day after `available_date` (the vehicle was available on that date; if not booked, it moves on).
- Offers can specify a date range (`available_from` to `available_to`) instead of a single date.
- Multiple Buyers can book against the same offer IF total booked weight does not exceed `capacity_ton` (shared transport/LTL — Less Than Truckload).
- Transport Company sets a `min_booking_ton` to prevent too-small bookings.
- The Transporter can mark an offer as `fully_booked` manually even if capacity remains (e.g., they got an offline booking).

#### 5.3.2 Transport Offer Data Model

**`transport_offers` Table:**

| Field | Bengali Label | Type | Required | Description |
|-------|-------------|------|----------|-------------|
| id | — | UUID PK | Auto | Unique identifier |
| transporter_id | — | UUID FK → users.id | Auto | The transport company who posted this |
| from_location_id | যাত্রা শুরু | UUID FK → locations.id | Yes | Pickup location (Upazila level) |
| from_address_detail | শুরুর বিস্তারিত ঠিকানা | TEXT (max 500 chars) | No | Optional pickup address detail |
| to_location_id | গন্তব্য | UUID FK → locations.id | Yes | Delivery destination (Upazila level) |
| to_address_detail | গন্তব্যের বিস্তারিত ঠিকানা | TEXT (max 500 chars) | No | Optional delivery address detail |
| vehicle_type | গাড়ির ধরন | VARCHAR(30) | Yes | Enum (see vehicle types below) |
| capacity_ton | ধারণক্ষমতা (টন) | DECIMAL(10,2) | Yes | Maximum weight capacity in metric tons |
| remaining_capacity_ton | অবশিষ্ট ধারণক্ষমতা | DECIMAL(10,2) | Auto | Initialized to `capacity_ton`. Decremented on booking. |
| min_booking_ton | সর্বনিম্ন বুকিং (টন) | DECIMAL(10,2) | No | Minimum weight per booking. Defaults to 0.5 ton. |
| price_bdt | মূল্য (৳) | DECIMAL(10,2) | Yes | Price for full capacity (full truckload). |
| price_per_ton_bdt | প্রতি টন মূল্য (৳) | DECIMAL(10,2) | No | Optional: price per ton for partial bookings (LTL). If NULL, only full-truck booking allowed. |
| is_negotiable | দর কষাকষি সম্ভব | BOOLEAN DEFAULT false | No | Whether the price is open to negotiation |
| available_from | উপলব্ধ তারিখ (শুরু) | DATE | Yes | Start of availability window |
| available_to | উপলব্ধ তারিখ (শেষ) | DATE | Yes | End of availability window. Must be >= available_from. |
| notes | বিশেষ দ্রষ্টব্য | TEXT (max 500 chars) | No | Free-text notes (e.g., "ঢাকার মধ্যে শুধু ফ্রিজ ভ্যান", "রাতে চলবে না") |
| is_refrigerated | ফ্রিজ ভ্যান | BOOLEAN DEFAULT false | No | Whether the vehicle has cold chain capability |
| is_covered | ঢাকা গাড়ি | BOOLEAN DEFAULT true | No | Whether the vehicle is covered/enclosed |
| status | অবস্থা | VARCHAR(20) | Auto | Lifecycle status |
| booking_count | বুকিং সংখ্যা | INTEGER DEFAULT 0 | Auto | Number of bookings made against this offer (denormalized counter) |
| created_at | তারিখ | TIMESTAMP | Auto | Creation timestamp |
| updated_at | — | TIMESTAMP | Auto | Last update timestamp |

**Vehicle Type Enum:**

| DB Value | Bengali Label | Typical Capacity | Description |
|----------|-------------|------------------|-------------|
| `pickup` | পিকআপ | 0.5–1.5 ton | Small pickup truck. Common for short-distance, small loads. |
| `truck_small` | ছোট ট্রাক | 1.5–3 ton | Small covered truck. |
| `truck_medium` | মাঝারি ট্রাক | 3–7 ton | Medium truck. Most common for inter-district transport. |
| `truck_large` | বড় ট্রাক | 7–15 ton | Large truck for bulk transport. |
| `trailer` | ট্রেইলার | 15–30 ton | For very large shipments. |
| `van` | ভ্যান | 0.5–1 ton | Covered van for smaller loads. |
| `refrigerated_van` | ফ্রিজ ভ্যান | 1–5 ton | Refrigerated vehicle for perishables (fish, dairy, etc.) |
| `three_wheeler` | সিএনজি / অটো | 0.2–0.5 ton | CNG auto-rickshaw for very short distance, small loads. |
| `boat` | নৌকা / ট্রলার | 1–20 ton | For riverine transport (common in southern Bangladesh). |

**Indexes:**
- `idx_transport_offers_route` ON `(from_location_id, to_location_id, status)` — primary query for route matching
- `idx_transport_offers_transporter` ON `(transporter_id)` — for "my offers" listing
- `idx_transport_offers_availability` ON `(available_from, available_to, status)` — for date-based filtering
- `idx_transport_offers_capacity` ON `(remaining_capacity_ton)` WHERE `status = 'active'` — for capacity filtering

**Constraints:**
- `CHECK (capacity_ton > 0)`
- `CHECK (remaining_capacity_ton >= 0)`
- `CHECK (remaining_capacity_ton <= capacity_ton)`
- `CHECK (price_bdt > 0)`
- `CHECK (price_per_ton_bdt IS NULL OR price_per_ton_bdt > 0)`
- `CHECK (available_to >= available_from)`
- `CHECK (available_from >= CURRENT_DATE)` — cannot post for past dates
- `CHECK (min_booking_ton IS NULL OR min_booking_ton > 0)`

#### 5.3.3 Transport Offer Lifecycle State Machine

```
    [draft] ──→ [active] ──→ [fully_booked]
                  │  │            │
                  │  │            └──→ [completed]
                  │  │                  (all linked orders delivered)
                  │  │
                  │  ├──→ [expired]
                  │  │     (available_to date passed AND
                  │  │      remaining_capacity > 0)
                  │  │
                  │  └──→ [cancelled]
                  │         (transporter cancels manually;
                  │          only allowed if no active bookings)
                  │
                  └──→ (bookings reduce remaining_capacity while active)
```

**State Definitions:**

| State | DB Value | Bengali Label | Description |
|-------|----------|---------------|-------------|
| Draft | `draft` | খসড়া | Transporter composing offer. Not visible. |
| Active | `active` | সক্রিয় | Live and bookable. `remaining_capacity_ton > 0` and within date range. |
| Fully Booked | `fully_booked` | সম্পূর্ণ বুকড | All capacity booked (remaining_capacity_ton = 0) or manually marked by transporter. |
| Expired | `expired` | মেয়াদ শেষ | `available_to` date has passed without full booking. |
| Cancelled | `cancelled` | বাতিল | Transporter cancelled. Only allowed if `booking_count = 0`. |
| Completed | `completed` | সম্পন্ন | All orders linked to this offer have been delivered. Historical record. |

**Auto-Expiry (pg_cron — runs every 5 minutes):**

```sql
-- Expire active offers past their availability window
UPDATE transport_offers
SET status = 'expired', updated_at = NOW()
WHERE status = 'active'
  AND available_to < CURRENT_DATE;

-- Notify transporters of expired offers
-- (trigger on update inserts into notification_queue)
```

**Cancellation Rules:**
- If `booking_count = 0` → Transporter can cancel freely.
- If `booking_count > 0` → Transporter CANNOT cancel via UI. Must contact admin.
  - Admin can force-cancel, which triggers re-matching of affected orders to other transport offers or creates RFQs automatically.
  - Affected Buyers notified: "আপনার অর্ডারের পরিবহন বাতিল হয়েছে। নতুন পরিবহন নির্বাচন করুন বা RFQ পাঠান।"
  - Transporter receives a cancellation penalty (recorded in `transporter_penalties` for reputation tracking, affects future ranking).

#### 5.3.4 Transport Offer Creation UI

**Screen: "পরিবহন অফার যোগ করুন" (Add Transport Offer)**

```
┌─────────────────────────────────────────┐
│  ← পরিবহন অফার যোগ করুন                  │
│─────────────────────────────────────────│
│                                         │
│  রুট তথ্য                                │
│  ─────────                              │
│                                         │
│  যাত্রা শুরু *                             │
│  বিভাগ: [রাজশাহী    ▼]                   │
│  জেলা:  [বগুড়া      ▼]                   │
│  উপজেলা: [শেরপুর    ▼]                   │
│                                         │
│  গন্তব্য *                                │
│  বিভাগ: [ঢাকা       ▼]                   │
│  জেলা:  [ঢাকা       ▼]                   │
│  উপজেলা: [সাভার     ▼]                   │
│                                         │
│  গাড়ির তথ্য                               │
│  ─────────                              │
│                                         │
│  গাড়ির ধরন *                             │
│  [পিকআপ] [ছোট ট্রাক] [মাঝারি ট্রাক]      │
│  [বড় ট্রাক] [ট্রেইলার] [ভ্যান]             │
│  [ফ্রিজ ভ্যান] [সিএনজি] [নৌকা]            │
│  (chip selection — মাঝারি ট্রাক selected) │
│                                         │
│  ধারণক্ষমতা (টন) *                        │
│  ┌───────────────────────┐              │
│  │ ৫                      │              │
│  └───────────────────────┘              │
│                                         │
│  সর্বনিম্ন বুকিং (টন)                      │
│  ┌───────────────────────┐              │
│  │ ০.৫                    │              │
│  └───────────────────────┘              │
│  ℹ️ এর কম ওজনের বুকিং নেওয়া হবে না      │
│                                         │
│  ☐ ফ্রিজ ভ্যান (শীতল পরিবহন)             │
│  ☑ ঢাকা গাড়ি (আবৃত)                     │
│                                         │
│  মূল্য নির্ধারণ                             │
│  ─────────                              │
│                                         │
│  পূর্ণ গাড়ির মূল্য (৳) *                    │
│  ┌───────────────────────┐              │
│  │ ১০,০০০                 │              │
│  └───────────────────────┘              │
│                                         │
│  প্রতি টন মূল্য (৳) — ঐচ্ছিক              │
│  ┌───────────────────────┐              │
│  │ ২,৫০০                  │              │
│  └───────────────────────┘              │
│  ℹ️ আংশিক বুকিংয়ের জন্য প্রতি টন মূল্য   │
│  ℹ️ খালি রাখলে শুধু পূর্ণ গাড়ি বুকিং হবে   │
│                                         │
│  ☐ দর কষাকষি সম্ভব                       │
│                                         │
│  সময়সীমা                                 │
│  ─────────                              │
│                                         │
│  উপলব্ধ তারিখ (শুরু) *                    │
│  ┌───────────────────────┐              │
│  │ ২০ জুলাই ২০২৬         │ 📅           │
│  └───────────────────────┘              │
│                                         │
│  উপলব্ধ তারিখ (শেষ) *                     │
│  ┌───────────────────────┐              │
│  │ ২৫ জুলাই ২০২৬         │ 📅           │
│  └───────────────────────┘              │
│                                         │
│  বিশেষ দ্রষ্টব্য (ঐচ্ছিক)                   │
│  ┌─────────────────────────────────┐    │
│  │ শুধু দিনের বেলা চলবে। ঢাকার মধ্যে  │    │
│  │ আনলোডিং পয়েন্ট জানাতে হবে...     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────      │
│  ☑ ০% কমিশন — কোনো চার্জ নেই           │
│                                         │
│       [📤 অফার প্রকাশ করুন]                │
│                                         │
└─────────────────────────────────────────┘
```

#### 5.3.5 Transport Offer Matching Algorithm

When a Buyer needs to find transport (either after purchasing a product or when creating an RFQ), the system runs the following matching algorithm:

**Input Parameters:**
- `from_location_id` — Product pickup location (Upazila level)
- `to_location_id` — Buyer's delivery location (Upazila level)
- `weight_ton` — Total weight of the order in tons
- `preferred_date` — When the buyer wants the transport
- `needs_refrigeration` — Whether the product requires cold chain (derived from product category: fish, dairy = true)

**Matching Query (executed in Edge Function: `POST /functions/v1/match-transport`):**

```sql
WITH from_district AS (
    SELECT parent_id AS district_id FROM locations WHERE id = :from_location_id
),
to_district AS (
    SELECT parent_id AS district_id FROM locations WHERE id = :to_location_id
),
from_division AS (
    SELECT parent_id AS division_id FROM locations WHERE id = (SELECT district_id FROM from_district)
),
to_division AS (
    SELECT parent_id AS division_id FROM locations WHERE id = (SELECT district_id FROM to_district)
)
SELECT
    t.id,
    t.transporter_id,
    u.display_name AS transporter_name,
    u.nid_verified AS is_verified,
    t.vehicle_type,
    t.capacity_ton,
    t.remaining_capacity_ton,
    t.price_bdt,
    t.price_per_ton_bdt,
    t.is_negotiable,
    t.is_refrigerated,
    t.is_covered,
    t.available_from,
    t.available_to,
    t.notes,
    fl.name_bn AS from_location_name,
    tl.name_bn AS to_location_name,
    -- Calculate effective price for this booking
    CASE
        WHEN :weight_ton >= t.capacity_ton THEN t.price_bdt  -- Full truck
        WHEN t.price_per_ton_bdt IS NOT NULL THEN t.price_per_ton_bdt * :weight_ton  -- Per-ton pricing
        ELSE t.price_bdt  -- No per-ton price = must book full truck
    END AS effective_price_bdt,
    -- Match quality score (higher = better match)
    CASE
        -- Exact upazila match on both ends = best
        WHEN t.from_location_id = :from_location_id AND t.to_location_id = :to_location_id THEN 100
        -- Exact upazila on from, same district on to
        WHEN t.from_location_id = :from_location_id
             AND (SELECT parent_id FROM locations WHERE id = t.to_location_id) = (SELECT district_id FROM to_district) THEN 80
        -- Same district on both ends
        WHEN (SELECT parent_id FROM locations WHERE id = t.from_location_id) = (SELECT district_id FROM from_district)
             AND (SELECT parent_id FROM locations WHERE id = t.to_location_id) = (SELECT district_id FROM to_district) THEN 60
        -- Same division on both ends (broad match)
        WHEN (SELECT parent_id FROM locations l2 WHERE l2.id = (SELECT parent_id FROM locations WHERE id = t.from_location_id)) = (SELECT division_id FROM from_division)
             AND (SELECT parent_id FROM locations l3 WHERE l3.id = (SELECT parent_id FROM locations WHERE id = t.to_location_id)) = (SELECT division_id FROM to_division) THEN 30
        ELSE 0
    END AS match_score,
    -- Transporter rating
    COALESCE(
        (SELECT AVG(r.rating) FROM ratings r WHERE r.rated_user_id = t.transporter_id AND r.rating_type = 'transporter'),
        0
    ) AS avg_rating,
    COALESCE(
        (SELECT COUNT(*) FROM ratings r WHERE r.rated_user_id = t.transporter_id AND r.rating_type = 'transporter'),
        0
    ) AS total_reviews
FROM transport_offers t
JOIN users u ON u.id = t.transporter_id
JOIN locations fl ON fl.id = t.from_location_id
JOIN locations tl ON tl.id = t.to_location_id
WHERE t.status = 'active'
  AND t.remaining_capacity_ton >= :weight_ton
  AND (t.min_booking_ton IS NULL OR t.min_booking_ton <= :weight_ton)
  AND t.available_from <= :preferred_date
  AND t.available_to >= :preferred_date
  AND (:needs_refrigeration = false OR t.is_refrigerated = true)
  -- Route matching: at minimum, same division on both ends
  AND (
      (SELECT parent_id FROM locations l4 WHERE l4.id = (SELECT parent_id FROM locations WHERE id = t.from_location_id))
      = (SELECT division_id FROM from_division)
      OR
      t.from_location_id = :from_location_id  -- exact match always included
  )
  AND (
      (SELECT parent_id FROM locations l5 WHERE l5.id = (SELECT parent_id FROM locations WHERE id = t.to_location_id))
      = (SELECT division_id FROM to_division)
      OR
      t.to_location_id = :to_location_id  -- exact match always included
  )
  AND u.is_suspended = false
ORDER BY
    match_score DESC,           -- Best route match first
    avg_rating DESC,            -- Highest rated transporters
    effective_price_bdt ASC,    -- Lowest price
    u.nid_verified DESC         -- Verified transporters preferred
LIMIT 20;
```

**Response to Client:**

The matching results are returned as a list, displayed to the Buyer in a UI showing:

```
┌─────────────────────────────────────────┐
│  ← পরিবহন নির্বাচন করুন                   │
│─────────────────────────────────────────│
│                                         │
│  📍 শেরপুর, বগুড়া → সাভার, ঢাকা          │
│  📦 ২.৫ টন | 📅 ২০ জুলাই ২০২৬            │
│                                         │
│  {matching_count} টি পরিবহন পাওয়া গেছে    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🚛 মাঝারি ট্রাক                  │    │
│  │ 👤 করিম ট্রান্সপোর্ট ✅           │    │
│  │ ⭐ ৪.৫ (২৩ রিভিউ)               │    │
│  │ 💰 ৳৬,২৫০ (৳২,৫০০/টন)          │    │
│  │ 📍 শেরপুর → সাভার (সরাসরি মিল)   │    │
│  │ ☐ দর কষাকষি সম্ভব                │    │
│  │                                 │    │
│  │ [নির্বাচন করুন]  [বিস্তারিত দেখুন]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🚛 বড় ট্রাক                     │    │
│  │ 👤 রহিম লজিস্টিকস               │    │
│  │ ⭐ ৪.২ (১১ রিভিউ)               │    │
│  │ 💰 ৳৮,০০০ (পূর্ণ গাড়ি)           │    │
│  │ 📍 বগুড়া সদর → ঢাকা (জেলা মিল)   │    │
│  │                                 │    │
│  │ [নির্বাচন করুন]  [বিস্তারিত দেখুন]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─── অথবা ───                          │
│                                         │
│  কোনো উপযুক্ত পরিবহন পাননি?              │
│  [📋 পরিবহন RFQ পাঠান]                  │
│  (পরিবহন কোম্পানিরা আপনাকে দাম জানাবে)  │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4 Transport Offer Booking Flow

When a Buyer selects a Transport Offer from the matching results:

```
[Buyer taps "নির্বাচন করুন" on a transport offer]
        │
        ▼
[Booking Confirmation Screen]
    "পরিবহন বুকিং নিশ্চিত করুন"

    📦 অর্ডার: {product_title} — {order_quantity} {unit}
    📍 সংগ্রহ: {from_location_name}
    📍 গন্তব্য: {to_location_name}
    🚛 গাড়ি: {vehicle_type}
    👤 পরিবহনকারী: {transporter_name}
    💰 পরিবহন খরচ: ৳{effective_price_bdt}

    [বুকিং নিশ্চিত করুন]  [বাতিল]
        │
        ▼
[System processes booking]
    BEGIN TRANSACTION;

    -- Update order with transport assignment
    UPDATE orders
    SET transporter_id = :transporter_id,
        transport_offer_id = :offer_id,
        transport_price_bdt = :effective_price_bdt,
        current_state = 'transport_assigned',
        updated_at = NOW()
    WHERE id = :order_id
      AND current_state IN ('transport_required', 'payment_verified');

    -- Deduct capacity from transport offer
    UPDATE transport_offers
    SET remaining_capacity_ton = remaining_capacity_ton - :weight_ton,
        booking_count = booking_count + 1,
        updated_at = NOW()
    WHERE id = :offer_id
      AND remaining_capacity_ton >= :weight_ton;

    -- If remaining capacity is now 0, mark as fully booked
    UPDATE transport_offers
    SET status = 'fully_booked'
    WHERE id = :offer_id
      AND remaining_capacity_ton <= 0;

    -- Record in order status history
    INSERT INTO order_status_history (order_id, from_state, to_state, changed_by, notes)
    VALUES (:order_id, 'transport_required', 'transport_assigned', :buyer_id, 'Transport offer selected');

    -- Create transport payment record (Buyer must pay Transporter separately)
    INSERT INTO transport_payments (order_id, buyer_id, transporter_id, amount_bdt, status)
    VALUES (:order_id, :buyer_id, :transporter_id, :effective_price_bdt, 'pending_payment');

    COMMIT;
        │
        ▼
[Notifications]
    → Transporter: "নতুন পরিবহন বুকিং! {from_location} → {to_location}, {weight} টন, ৳{price}। বিস্তারিত দেখুন।"
    → Farmer: "আপনার পণ্যের পরিবহন ব্যবস্থা হয়েছে। পরিবহনকারী: {transporter_name}"
    → Buyer: "পরিবহন বুকিং সফল! পরিবহনকারীকে ৳{price} পরিশোধ করুন।"
        │
        ▼
[Navigate to Transport Payment Proof Upload (Section 8)]
```

### 5.5 Cross-Feature Interaction Summary

The following diagram shows how Buyer Requirements, Product Listings, Transport Offers, and RFQs interact:

```
FARMER SIDE                          BUYER SIDE                        TRANSPORTER SIDE
───────────                          ──────────                        ────────────────

Product Listing ──── Buyer browses ──── Purchase ──── Order Created
                     & purchases             │
                                             │
        ┌────────────────────────────────────┤
        │                                    │
        │                              [Transport Needed]
        │                                    │
        │                        ┌───────────┴───────────┐
        │                        │                       │
        │                  [Match Found]           [No Match]
        │                        │                       │
        │               Select Transport          Create RFQ ──── Transporter
        │               Offer (5.3/5.4)                  │         bids (6.2)
        │                        │                       │
        │                        └───────┬───────────────┘
        │                                │
        │                      [Transport Assigned]
        │                                │
        │                         Order continues
        │                         (Section 6 flow)
        │
Buyer Requirement ◄── Farmer sees ──── Farmer responds
(Buyer posts)         requirement       with offer (5.2.4)
                                             │
                                      [Buyer accepts]
                                             │
                                       Order Created
                                      (same flow as above)
```

### 5.6 Feed & Discovery — How Users Find Requirements and Offers

#### 5.6.1 Unified User Home Feed

All users see the same home screen with a unified, multi-section feed. Sections that have no relevant content for the user are gracefully hidden to keep the UI uncluttered.

| Section | Content | Sort Order | Visibility Condition |
|---------|---------|-----------|---------------------|
| "পণ্য খুঁজুন" (Find Products) | Search bar + category chips for quick filtering | — | Always shown |
| "বুস্টেড পণ্য" (Boosted Products) | Products with active boosts matching user's district or nearby | Boost ranking score (Section 9) | Always shown |
| "সাম্প্রতিক পণ্য" (Recent Products) | Latest active product listings in user's district | Most recent first | Always shown; excludes user's own listings |
| "নতুন চাহিদা" (New Requirements) | Active buyer requirements matching the categories of the user's own active listings | Most recent first; urgent requirements pinned to top | Only shown if user has at least one active listing |
| "নতুন RFQ" (New RFQs) | Open RFQs matching routes covered by the user's active transport offers | Most recent first; closest route match first | Only shown if user has at least one active transport offer |
| "আমার পণ্য" (My Listings) | User's own product listings with status badges | Active first, then by most recent update | Only shown if user has at least one listing |
| "আমার চাহিদা" (My Requirements) | User's own posted requirements with response count badges | Most recent first; unread responses highlighted | Only shown if user has posted at least one requirement |
| "আমার অফার" (My Transport Offers) | User's own transport offers with booking count badges | Active first, then by availability date | Only shown if user has at least one transport offer |
| "সক্রিয় অর্ডার" (Active Orders) | All orders where this user is the seller, buyer, or assigned transporter — in any active state | By most recent activity | Only shown when active orders exist |
| "বাজার দর" (Market Prices) | Average prices for active listings in user's district, grouped by category | By category | Always shown |

---

### 5.7 Operational Efficiency — Admin & Logistics Intelligence

#### 5.7.1 Smart Transport Matching Algorithm

The transport offer matching query (Section 5.3.5) is enhanced with ML-derived reliability and utilisation signals to surface the **best** match, not just any match:

```sql
WITH transport_scores AS (
    SELECT
        t.*,
        -- Base route match score (existing logic from Section 5.3.5)
        route_match_score,

        -- Reliability: on-time delivery rate over last 90 days
        COALESCE((
            SELECT AVG(CASE WHEN o.delivered_on_time THEN 1.0 ELSE 0.0 END)
            FROM orders o
            WHERE o.transporter_id = t.listed_by_user_id
              AND o.current_state = 'completed'
              AND o.created_at > NOW() - INTERVAL '90 days'
        ), 0.5) AS reliability_score,

        -- Utilisation: lower = more capacity available = better
        COALESCE((
            SELECT COUNT(*)::DECIMAL / NULLIF(t.weekly_capacity_bookings, 0)
            FROM orders o2
            WHERE o2.transporter_id = t.listed_by_user_id
              AND o2.current_state IN ('transport_assigned', 'ready_for_pickup', 'in_transit')
        ), 0.0) AS utilisation_rate,

        -- Price competitiveness vs district average
        t.price_bdt / NULLIF(
            AVG(t2.price_bdt) OVER (PARTITION BY t.origin_district_id, t.destination_district_id),
            0
        ) AS price_ratio
    FROM transport_offers t
    WHERE t.status = 'active'
      -- ... route and capacity filters from Section 5.3.5 ...
)
SELECT *,
    (  route_match_score  * 0.40
     + reliability_score  * 0.30
     + (1 - utilisation_rate) * 0.20
     + (CASE WHEN price_ratio < 1.0 THEN 0.10 ELSE 0.05 END)
    ) AS final_score
FROM transport_scores
ORDER BY final_score DESC
LIMIT 20;
```

**UI impact:** The matched transport offer list now shows a **reliability badge** per offer:
- ⭐⭐⭐ (≥ 90% on-time) / ⭐⭐ (70–89%) / ⭐ (< 70%) / 🆕 (no history yet)

#### 5.7.2 Dispute Evidence Auto-Compilation

When an admin opens a dispute case, the system automatically assembles a **case file** rather than requiring the admin to manually navigate across screens:

```
[Admin opens dispute #D-2026-0042]
        │
        ▼
[Edge Function: GET /functions/v1/dispute-case-file/{dispute_id}]
    Compiles in parallel:
    ├── Full order timeline (all order_status_history rows, formatted in Bengali)
    ├── Chat transcript extract (all messages for this order's thread)
    ├── Payment proof screenshots (side-by-side: product + transport)
    ├── Pickup confirmation photo (if submitted by transporter)
    ├── Delivery confirmation photo (if submitted by buyer)
    ├── Both parties' ratings and previous dispute history
    └── Similar resolved cases (fuzzy-matched by product category + dispute reason)
        │
        ▼
[Admin sees single scrollable case view — estimated review time: 3 min vs 15 min manual]
```

**`dispute_case_files` Cache Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| dispute_id | UUID FK → disputes.id | Parent dispute |
| compiled_json | JSONB | Full auto-compiled case file |
| similar_cases | JSONB | Array of up to 3 similar resolved cases with outcomes |
| compiled_at | TIMESTAMP | When compiled (re-compile on new evidence) |
| is_stale | BOOLEAN DEFAULT false | Set true when order state or chat changes after compile |

#### 5.7.3 Predictive Fraud Graph Analysis

The nightly `batch_fraud_analysis` pg_cron job (Section 3.3.5) is extended with **graph-based network analysis** to catch coordinated fraud rings:

```sql
-- Flag users involved in circular transaction patterns (A→B→C→A within 48h)
WITH payment_graph AS (
    SELECT
        o.buyer_id      AS source_user,
        p.listed_by_user_id AS target_user,
        o.created_at
    FROM orders o
    JOIN products p ON p.id = o.product_id
    WHERE o.current_state IN ('payment_verified', 'completed')
      AND o.created_at > NOW() - INTERVAL '48 hours'
),
cycles AS (
    -- Recursive walk: detect paths that return to the starting node within 4 hops
    WITH RECURSIVE walk(start_user, current_user, path, depth) AS (
        SELECT source_user, target_user,
               ARRAY[source_user, target_user], 1
        FROM payment_graph
        UNION ALL
        SELECT w.start_user, pg.target_user,
               w.path || pg.target_user, w.depth + 1
        FROM walk w
        JOIN payment_graph pg ON pg.source_user = w.current_user
        WHERE w.depth < 4
          AND NOT (pg.target_user = ANY(w.path[2:]))  -- no non-start revisits
    )
    SELECT DISTINCT UNNEST(path) AS flagged_user
    FROM walk
    WHERE current_user = start_user  -- cycle detected
)
UPDATE users
SET fraud_flag = true,
    updated_at = NOW()
WHERE id IN (SELECT flagged_user FROM cycles)
  AND fraud_flag = false;
```

Flagged users are added to the admin fraud investigation queue with evidence: "সন্দেহজনক লেনদেন চক্র শনাক্ত হয়েছে।"

#### 5.7.4 Admin Companion Mobile App

The admin panel (web) is complemented by a **lightweight SvelteKit (Capacitor) mobile app** for on-the-go payment verification, enabling 24/7 SLA coverage without requiring admins to be at a desk.

**Admin Mobile App — Core Screens:**

| Screen | Functionality |
|--------|--------------|
| **Verification Queue** | Swipeable card stack of pending payments. Swipe right = approve, swipe left = reject. OCR pre-fill shown on each card. |
| **SLA Alerts** | Push notification when any payment approaches its SLA deadline (T−2h). Tap to open that payment directly. |
| **Fraud Alerts** | Real-time feed of new fraud flags with one-tap "Investigate / Dismiss" actions. |
| **Quick Stats** | Today's verified count, pending count, average verification time. Motivational daily target: "আজকের লক্ষ্য: ২০টি যাচাই সম্পন্ন করুন" |

**Access control:** Admin mobile app uses the same `admin_users` table and RBAC as the web panel (Section 22, Appendix D). Biometric unlock required on app open (Section 18.5.1).

---

## 6. Transaction & Logistics Workflow — Complete State Machines

This section defines the **complete end-to-end lifecycle** of a transaction on HaatBazar, from the moment a Buyer initiates a purchase to final delivery confirmation and rating. It is the most complex workflow in the system and involves coordination between three user roles (Buyer, Farmer, Transporter) and one system role (Admin).

### 6.1 Transaction Architecture Overview

A single "transaction" on HaatBazar is NOT a single event — it is a **compound workflow** consisting of:

1. **Product Order** — Buyer purchases product from Farmer (payment: Buyer → Farmer)
2. **Transport Booking** — Buyer arranges transport for the purchased product (payment: Buyer → Transporter)
3. **Delivery Confirmation** — Physical handoff at pickup, transit, and delivery
4. **Settlement** — All manual payments verified by Admin
5. **Completion** — Ratings exchanged, order archived

**Critical Design Rule:** The system must **NEVER** mark a transaction as complete after product payment alone. The transaction is only complete when:
- Product payment is verified by Admin ✅
- Transport is assigned (either via offer selection or RFQ) ✅
- Transport payment is verified by Admin ✅
- Transporter confirms pickup ✅
- Buyer confirms delivery with photo proof ✅
- Rating window has passed (7 days) or ratings submitted ✅

### 6.2 Order Entity — Complete Data Model

**`orders` Table:**

| Field | Bengali Label | Type | Required | Description |
|-------|-------------|------|----------|-------------|
| id | অর্ডার আইডি | UUID PK | Auto | Unique order identifier. Displayed to users as first 8 chars uppercase (e.g., "A3F8B2C1"). |
| order_number | অর্ডার নম্বর | VARCHAR(20) UNIQUE | Auto | Human-readable order number. Format: `HB-{YYMMDD}-{4-digit-seq}` (e.g., "HB-260715-0042"). Auto-generated by database sequence. |
| product_id | — | UUID FK → products.id | Yes | The product being purchased |
| buyer_id | — | UUID FK → users.id | Yes | The buyer |
| farmer_id | — | UUID FK → users.id | Auto | Denormalized from product.farmer_id for query efficiency |
| transporter_id | — | UUID FK → users.id NULL | No | Assigned after transport selection. NULL until transport arranged. |
| transport_offer_id | — | UUID FK → transport_offers.id NULL | No | If transport was selected from an existing offer (vs. RFQ) |
| rfq_id | — | UUID FK → rfqs.id NULL | No | If transport was arranged via RFQ bidding |
| quantity_ordered | অর্ডার পরিমাণ | DECIMAL(10,2) | Yes | How much the buyer is ordering (may be partial quantity of listing) |
| unit | একক | VARCHAR(20) | Yes | Unit of measure (copied from product at time of order) |
| unit_price | একক মূল্য (৳) | DECIMAL(10,2) | Yes | Price per unit at time of order (locked — does not change if farmer updates product price later) |
| product_total_bdt | পণ্যের মোট মূল্য (৳) | DECIMAL(12,2) | Auto | `quantity_ordered * unit_price`. Computed and stored at order creation. |
| transport_price_bdt | পরিবহন খরচ (৳) | DECIMAL(12,2) NULL | No | Transport cost. Set when transport is assigned. NULL until then. |
| grand_total_bdt | সর্বমোট (৳) | DECIMAL(12,2) NULL | Auto | `product_total_bdt + transport_price_bdt`. NULL until transport assigned. |
| current_state | বর্তমান অবস্থা | VARCHAR(30) | Auto | Current state in the order state machine (see 6.3) |
| pickup_location_id | সংগ্রহস্থল | UUID FK → locations.id | Auto | Copied from product.pickup_location_id at order creation |
| pickup_address_detail | সংগ্রহ ঠিকানা | TEXT | No | Copied from product |
| delivery_location_id | ডেলিভারি স্থান | UUID FK → locations.id | Yes | Buyer's delivery location |
| delivery_address_detail | ডেলিভারি ঠিকানা | TEXT | No | Buyer's detailed delivery address |
| product_payment_proof_url | পণ্যের পেমেন্ট প্রমাণ | TEXT NULL | No | Screenshot of payment to farmer |
| product_payment_tx_id | পণ্যের লেনদেন আইডি | VARCHAR(100) NULL | No | Transaction ID for product payment |
| product_payment_method | পেমেন্ট মাধ্যম | VARCHAR(20) NULL | No | `bkash`, `nagad`, `bank_transfer`, `cash` |
| product_payment_verified_at | পণ্য পেমেন্ট যাচাই তারিখ | TIMESTAMP NULL | Auto | When admin verified product payment |
| product_payment_verified_by | — | UUID FK → admin_users.id NULL | Auto | Which admin verified |
| transport_payment_proof_url | পরিবহন পেমেন্ট প্রমাণ | TEXT NULL | No | Screenshot of payment to transporter |
| transport_payment_tx_id | পরিবহন লেনদেন আইডি | VARCHAR(100) NULL | No | Transaction ID for transport payment |
| transport_payment_method | পরিবহন পেমেন্ট মাধ্যম | VARCHAR(20) NULL | No | Same enum as product payment |
| transport_payment_verified_at | পরিবহন পেমেন্ট যাচাই তারিখ | TIMESTAMP NULL | Auto | When admin verified transport payment |
| transport_payment_verified_by | — | UUID FK → admin_users.id NULL | Auto | Which admin verified |
| pickup_confirmed_at | পিকআপ নিশ্চিত | TIMESTAMP NULL | No | When transporter confirmed goods pickup |
| pickup_photo_url | পিকআপ ছবি | TEXT NULL | No | Photo taken by transporter at pickup |
| delivery_confirmed_at | ডেলিভারি নিশ্চিত | TIMESTAMP NULL | No | When buyer confirmed goods received |
| delivery_photo_url | ডেলিভারি ছবি | TEXT NULL | No | Photo taken by buyer at delivery |
| estimated_delivery_date | আনুমানিক ডেলিভারি | DATE NULL | No | Set by transporter when assigned |
| cancellation_reason | বাতিলের কারণ | TEXT NULL | No | Reason for cancellation (if cancelled) |
| cancelled_by | — | UUID NULL | No | User ID of who cancelled (buyer, farmer, admin) |
| cancelled_at | বাতিলের তারিখ | TIMESTAMP NULL | No | When cancelled |
| admin_notes | অ্যাডমিন নোট | TEXT NULL | No | Internal notes from admin (not visible to users) |
| idempotency_key | — | VARCHAR(64) UNIQUE | Yes | Client-generated UUID to prevent duplicate order creation on retry |
| created_at | তৈরির তারিখ | TIMESTAMP | Auto | Order creation timestamp |
| updated_at | — | TIMESTAMP | Auto | Last state change timestamp |

**Indexes:**
- `idx_orders_state` ON `(current_state)` — for admin dashboard queries (e.g., "all pending_payment orders")
- `idx_orders_buyer` ON `(buyer_id, current_state)` — for buyer's "my orders" view
- `idx_orders_farmer` ON `(farmer_id, current_state)` — for farmer's "my orders" view
- `idx_orders_transporter` ON `(transporter_id, current_state)` WHERE `transporter_id IS NOT NULL` — for transporter's active jobs
- `idx_orders_product` ON `(product_id)` — for product order history
- `idx_orders_product_tx_id` ON `(product_payment_tx_id)` WHERE `product_payment_tx_id IS NOT NULL` — for fraud: duplicate TX ID check
- `idx_orders_transport_tx_id` ON `(transport_payment_tx_id)` WHERE `transport_payment_tx_id IS NOT NULL` — same
- `idx_orders_created_at` ON `(created_at DESC)` — for chronological listing
- `UNIQUE(idempotency_key)` — prevents duplicate orders on network retry

**RLS Policies:**
- Buyers can SELECT their own orders (`buyer_id = auth.uid()`). Can UPDATE only specific fields during allowed state transitions.
- Farmers can SELECT orders for their products (`farmer_id = auth.uid()`). Can UPDATE only pickup-related confirmations.
- Transporters can SELECT orders assigned to them (`transporter_id = auth.uid()`). Can UPDATE only transit-related fields.
- Admins have full SELECT/UPDATE access via service role (Edge Functions).

### 6.3 Order State Machine — Complete Definition

This is the **definitive** state machine for product orders. Every state, transition, trigger, timeout, and notification is specified.

```
                                      ┌──────────────────────┐
                                      │                      │
                                      ▼                      │
┌───────────────┐    ┌─────────────────────────┐             │
│               │    │                         │             │
│  CREATED      │───►│  PENDING_PAYMENT        │─────────────┤
│  (instant)    │    │                         │  (timeout:  │
│               │    │  Buyer must upload      │   24 hours) │
└───────────────┘    │  payment proof for      │             │
                     │  product purchase       │             │
                     └───────────┬─────────────┘             │
                                 │                           │
                          [Buyer uploads                     │
                           payment proof]                    │
                                 │                           │
                                 ▼                           │
                     ┌─────────────────────────┐             │
                     │                         │             │
                     │  PAYMENT_PROOF_UPLOADED  │─────────────┤
                     │                         │  (timeout:  │
                     │  Waiting for admin      │   48 hours) │
                     │  to verify payment      │             │
                     └───────────┬─────────────┘             │
                                 │                           │
                          [Admin verifies                    │
                           payment proof]                    │
                                 │                           │
                          ┌──────┴──────┐                    │
                          │             │                    │
                    [Verified]    [Rejected]                 │
                          │             │                    │
                          ▼             ▼                    │
          ┌────────────────────┐  ┌──────────┐              │
          │                    │  │          │              │
          │  PAYMENT_VERIFIED  │  │ PAYMENT  │              │
          │                    │  │ REJECTED │──────────────►│
          │  Product payment   │  │          │ (Buyer can   │
          │  confirmed. Now    │  │ Buyer    │  re-upload   │
          │  transport needed. │  │ notified │  or cancel)  │
          └────────┬───────────┘  └──────────┘              │
                   │                                        │
                   ▼                                        │
          ┌────────────────────┐                            │
          │                    │                            │
          │ TRANSPORT_REQUIRED │────────────────────────────┤
          │                    │  (timeout: 72 hours)       │
          │ System shows       │  Auto-notify buyer.        │
          │ matching offers.   │  After 120h total →        │
          │ Buyer selects one  │  admin notified for        │
          │ OR creates RFQ.    │  manual intervention.      │
          └───┬────────────┬───┘                            │
              │            │                                │
       [Buyer selects  [Buyer creates                      │
        transport       RFQ and later                      │
        offer]          accepts a bid]                     │
              │            │                                │
              └──────┬─────┘                                │
                     │                                      │
                     ▼                                      │
          ┌────────────────────────┐                        │
          │                        │                        │
          │  TRANSPORT_ASSIGNED    │────────────────────────┤
          │                        │  (timeout: 48 hours    │
          │  Transport booked.     │   for transport        │
          │  Buyer must pay        │   payment proof)       │
          │  transporter.          │                        │
          └───────────┬────────────┘                        │
                      │                                     │
               [Buyer uploads                               │
                transport payment                           │
                proof]                                      │
                      │                                     │
                      ▼                                     │
          ┌────────────────────────┐                        │
          │                        │                        │
          │  TRANSPORT_PAYMENT_    │────────────────────────┤
          │  UPLOADED              │  (timeout: 48 hours    │
          │                        │   for admin to verify) │
          │  Waiting for admin     │                        │
          │  to verify transport   │                        │
          │  payment               │                        │
          └───────────┬────────────┘                        │
                      │                                     │
               [Admin verifies                              │
                transport payment]                          │
                      │                                     │
               ┌──────┴──────┐                              │
               │             │                              │
         [Verified]    [Rejected]                           │
               │             │                              │
               ▼             ▼                              │
┌──────────────────┐ ┌──────────────┐                      │
│                  │ │ TRANSPORT    │                       │
│  READY_FOR_      │ │ PAYMENT     │                       │
│  PICKUP          │ │ REJECTED    │───────────────────────►│
│                  │ │             │ (Buyer can re-upload)  │
│ All payments     │ └─────────────┘                        │
│ verified.        │                                        │
│ Transporter must │                                        │
│ pick up goods.   │                                        │
└────────┬─────────┘                                        │
         │  (timeout: transporter                           │
         │   must pickup within                             │
         │   estimated_delivery_date                        │
         │   or 72 hours, whichever                         │
         │   is sooner)                                     │
         │                                                  │
  [Transporter confirms                                     │
   pickup with photo]                                       │
         │                                                  │
         ▼                                                  │
┌────────────────────┐                                      │
│                    │                                      │
│  IN_TRANSIT        │                                      │
│                    │                                      │
│  Goods picked up.  │  (timeout: estimated_delivery_date   │
│  In transit to     │   + 48 hours buffer. If exceeded →   │
│  delivery point.   │   admin alerted, all parties         │
│                    │   notified)                          │
└────────┬───────────┘                                      │
         │                                                  │
  [Buyer confirms                                           │
   delivery with                                            │
   photo proof]                                             │
         │                                                  │
         ▼                                                  │
┌────────────────────┐                                      │
│                    │                                      │
│  DELIVERED         │                                      │
│                    │  (auto-complete after 7 days          │
│  Goods received.   │   if no dispute raised)              │
│  Rating window     │                                      │
│  open (7 days).    │                                      │
│  Dispute can be    │                                      │
│  raised.           │                                      │
└───┬──────────┬─────┘                                      │
    │          │                                            │
    │    [Dispute raised                                    │
    │     within 7 days]                                    │
    │          │                                            │
    │          ▼                                            │
    │   ┌──────────────┐                                    │
    │   │              │                                    │
    │   │  DISPUTED    │  (admin resolution                 │
    │   │              │   deadline: 14 days)               │
    │   │  Under admin │                                    │
    │   │  review      │                                    │
    │   └──────┬───────┘                                    │
    │          │                                            │
    │     [Admin resolves]                                  │
    │          │                                            │
    └──────┬───┘                                            │
           │                                                │
           ▼                                                │
    ┌──────────────┐                                        │
    │              │                                        │
    │  COMPLETED   │  Terminal state.                       │
    │              │  Ratings finalized.                    │
    │              │  Order archived.                       │
    └──────────────┘                                        │
                                                            │
                           ┌────────────────┐               │
                           │                │               │
              ◄────────────│   CANCELLED    │◄──────────────┘
                           │                │
                           │  Can be reached│
                           │  from multiple │
                           │  states (see   │
                           │  6.4 below)    │
                           └────────────────┘
```

### 6.3.1 State Definitions Table

| State | DB Value | Bengali Label | Description | Who Can Trigger Next State | Timeout |
|-------|----------|---------------|-------------|---------------------------|---------|
| Pending Payment | `pending_payment` | পেমেন্ট অপেক্ষমান | Order created. Buyer must upload product payment proof. Product `remaining_quantity` already deducted. | Buyer (upload proof), Buyer/System (cancel) | **24 hours** → auto-cancel, restore product quantity |
| Payment Proof Uploaded | `payment_proof_uploaded` | পেমেন্ট প্রমাণ আপলোড হয়েছে | Buyer has uploaded screenshot + TX ID. Waiting for admin verification. | Admin (verify/reject) | **48 hours** → escalate to senior admin, notify buyer of delay |
| Payment Verified | `payment_verified` | পেমেন্ট যাচাই হয়েছে | Admin confirmed product payment. System auto-transitions to `transport_required`. | System (auto-transition) | Instant transition to `transport_required` |
| Payment Rejected | `payment_rejected` | পেমেন্ট প্রত্যাখ্যাত | Admin rejected payment proof (invalid screenshot, amount mismatch, etc.). Buyer can re-upload or cancel. | Buyer (re-upload or cancel) | **48 hours** → auto-cancel if no re-upload |
| Transport Required | `transport_required` | পরিবহন প্রয়োজন | Product payment confirmed. System shows matching transport offers. Buyer must select transport or create RFQ. | Buyer (select offer or accept RFQ bid) | **72 hours** → notify buyer. **120 hours** → admin intervention alert. **168 hours (7 days)** → auto-cancel with refund note. |
| Transport Assigned | `transport_assigned` | পরিবহন নির্ধারিত | Transport booked. Buyer must now pay the transporter. | Buyer (upload transport payment proof) | **48 hours** → notify buyer. **96 hours** → admin alert. |
| Transport Payment Uploaded | `transport_payment_uploaded` | পরিবহন পেমেন্ট প্রমাণ আপলোড হয়েছে | Buyer uploaded transport payment proof. Waiting for admin verification. | Admin (verify/reject) | **48 hours** → escalate |
| Transport Payment Rejected | `transport_payment_rejected` | পরিবহন পেমেন্ট প্রত্যাখ্যাত | Admin rejected transport payment proof. Buyer can re-upload. | Buyer (re-upload) | **48 hours** → admin intervention |
| Ready for Pickup | `ready_for_pickup` | পিকআপের জন্য প্রস্তুত | All payments verified. Transporter must go to farmer's location and pick up goods. | Transporter (confirm pickup with photo) | `min(estimated_delivery_date, created_at + 72h)` → admin alert if transporter hasn't picked up |
| In Transit | `in_transit` | পরিবহনে আছে | Transporter has picked up goods and is in transit. | Buyer (confirm delivery) | `estimated_delivery_date + 48 hours` → admin alert if no delivery update |
| Delivered | `delivered` | ডেলিভারি হয়েছে | Buyer confirmed receipt of goods with photo. Rating window open. Dispute window open. | System (auto-complete after 7 days) or Any party (raise dispute) | **7 days** → auto-complete if no dispute |
| Disputed | `disputed` | বিতর্কিত | One or more parties raised a dispute. Under admin review. | Admin (resolve dispute) | **14 days** → escalate to senior admin |
| Completed | `completed` | সম্পন্ন | Order fully completed. All payments settled. Ratings finalized. | Terminal state — no further transitions | None |
| Cancelled | `cancelled` | বাতিল | Order cancelled. See Section 6.4 for cancellation rules. | Terminal state — no further transitions | None |

### 6.3.2 State Transition Rules (Formal Definition)

Each transition is defined as: `FROM_STATE → TO_STATE : trigger [guard] / action`

```
pending_payment → payment_proof_uploaded
    : buyer_uploads_proof
    [proof_url IS NOT NULL AND tx_id IS NOT NULL AND tx_id NOT IN existing_tx_ids]
    / store proof, check tx_id uniqueness, notify admin, start 48h admin timer

pending_payment → cancelled
    : buyer_cancels OR timeout_24h
    [no guard]
    / restore product.remaining_quantity, notify farmer, log cancellation

payment_proof_uploaded → payment_verified
    : admin_verifies
    [admin confirms amount matches, screenshot is valid]
    / set product_payment_verified_at, verified_by, auto-transition to transport_required,
      notify buyer "পেমেন্ট যাচাই সফল", notify farmer "পেমেন্ট পেয়েছেন"

payment_proof_uploaded → payment_rejected
    : admin_rejects
    [admin provides rejection_reason]
    / notify buyer with reason: "পেমেন্ট প্রমাণ প্রত্যাখ্যাত। কারণ: {reason}। পুনরায় আপলোড করুন।"

payment_proof_uploaded → cancelled
    : timeout_48h_no_admin_action (escalation only, not auto-cancel)
    [requires senior admin approval for cancel at this stage]
    / escalate alert, do NOT auto-cancel (admin may just be slow)

payment_rejected → payment_proof_uploaded
    : buyer_re_uploads
    [new proof_url AND new tx_id]
    / replace proof, reset admin timer, notify admin

payment_rejected → cancelled
    : buyer_cancels OR timeout_48h
    [no guard]
    / restore product.remaining_quantity, notify farmer

payment_verified → transport_required
    : system_auto_transition
    [immediate, no delay]
    / run transport matching algorithm (Section 5.3.5), cache results,
      notify buyer "পরিবহন নির্বাচন করুন", start 72h transport timer

transport_required → transport_assigned
    : buyer_selects_offer OR buyer_accepts_rfq_bid
    [transport offer has remaining_capacity >= order weight OR RFQ bid accepted]
    / set transporter_id, transport_offer_id or rfq_id, transport_price_bdt,
      deduct transport capacity, create transport_payment record,
      notify transporter, notify farmer, notify buyer to pay transporter

transport_required → cancelled
    : buyer_cancels OR timeout_168h
    [cancellation penalty applies if > 24h in this state — see Section 6.4]
    / restore product.remaining_quantity, notify farmer, create refund note for admin
      (product payment was already verified — admin must track manual refund)

transport_assigned → transport_payment_uploaded
    : buyer_uploads_transport_proof
    [proof_url IS NOT NULL AND tx_id IS NOT NULL]
    / store proof, notify admin, start 48h admin timer

transport_assigned → cancelled
    : buyer_cancels
    [transport cancellation penalty applies — see Section 6.4]
    / release transport capacity, restore product quantity, create refund notes for both
      product payment and transport booking, notify all parties

transport_payment_uploaded → ready_for_pickup
    : admin_verifies_transport_payment
    [admin confirms amount matches]
    / set transport_payment_verified_at, notify transporter "পিকআপ করুন",
      notify farmer "পরিবহনকারী পিকআপে আসবে",
      notify buyer "সব পেমেন্ট যাচাই হয়েছে, পিকআপ অপেক্ষমান"

transport_payment_uploaded → transport_payment_rejected
    : admin_rejects
    [admin provides reason]
    / notify buyer with reason

transport_payment_rejected → transport_payment_uploaded
    : buyer_re_uploads
    [new proof]
    / replace proof, reset admin timer

ready_for_pickup → in_transit
    : transporter_confirms_pickup
    [pickup_photo_url IS NOT NULL]
    / set pickup_confirmed_at, store pickup photo,
      notify buyer "পণ্য পিকআপ হয়েছে, পরিবহনে আছে",
      notify farmer "পণ্য পিকআপ হয়েছে"

ready_for_pickup → cancelled
    : admin_cancels (manual intervention due to transporter no-show)
    [only admin can cancel at this stage]
    / complex: release transport, create refund notes, potentially re-match transport,
      penalize transporter

in_transit → delivered
    : buyer_confirms_delivery
    [delivery_photo_url IS NOT NULL]
    / set delivery_confirmed_at, store delivery photo,
      start 7-day auto-complete timer,
      notify farmer "ডেলিভারি সম্পন্ন",
      notify transporter "ডেলিভারি নিশ্চিত হয়েছে, ধন্যবাদ",
      prompt all parties to rate each other

delivered → completed
    : timeout_7_days_no_dispute OR all_ratings_submitted
    [no active dispute on this order]
    / mark completed, finalize ratings (make permanent), archive order,
      notify all parties "অর্ডার সম্পন্ন হয়েছে। ধন্যবাদ!"

delivered → disputed
    : any_party_raises_dispute
    [within 7-day window, dispute evidence provided]
    / create dispute record, pause auto-complete timer,
      notify admin "নতুন বিতর্ক: অর্ডার #{order_number}",
      notify other parties "একটি বিতর্ক দায়ের করা হয়েছে"

disputed → completed
    : admin_resolves_dispute
    [resolution recorded, all actions taken]
    / apply resolution (refund/penalty/dismiss), finalize,
      notify all parties of resolution
```

### 6.4 Cancellation Policy — Tiered Rules

Cancellation rules vary depending on the current order state and who is cancelling. The system is designed to be fair but to discourage frivolous cancellations that waste other parties' time and money.

#### 6.4.1 Buyer-Initiated Cancellation

| Current State | Allowed? | Penalty | Product Quantity Restored? | Refund Needed? |
|---------------|----------|---------|---------------------------|----------------|
| `pending_payment` | ✅ Yes — Free cancellation | None | Yes | No (no payment made) |
| `payment_proof_uploaded` | ✅ Yes — Free cancellation | None. Payment proof hasn't been verified yet, so no actual payment confirmed. | Yes | No (payment unverified, buyer's bank handles their own money) |
| `payment_rejected` | ✅ Yes — Free cancellation | None | Yes | No |
| `transport_required` | ⚠️ Yes — With warning | **Soft penalty:** Buyer gets a cancellation count increment. After 3 cancellations at this stage within 30 days → 24h cooldown before placing new orders. | Yes | ⚠️ **Yes** — Product payment was verified. Admin must create manual refund note. Farmer must return payment to buyer. |
| `transport_assigned` | ⚠️ Yes — With confirmation | **Medium penalty:** Cancellation count + transport booking fee may be forfeited (if transporter incurred costs). | Yes + transport capacity restored | ⚠️ **Yes** — Both product payment refund AND transport booking review needed. |
| `transport_payment_uploaded` | ⚠️ Yes — Admin approval required | Buyer cannot self-cancel. Must request cancellation which goes to admin. | Pending admin decision | Pending admin decision |
| `ready_for_pickup` | ❌ No — Not allowed via UI | Buyer must contact admin. Admin can cancel under exceptional circumstances. | Admin decision | Admin decision + all payments must be reconciled |
| `in_transit` | ❌ No — Not allowed | Cannot cancel while goods are in transit. Must wait for delivery and raise dispute if unsatisfied. | No | No — use dispute flow |
| `delivered` | ❌ No — Not allowed | Use dispute flow instead | No | Via dispute resolution |

#### 6.4.2 Farmer-Initiated Cancellation

Farmers can only cancel under limited circumstances because the buyer has already committed to purchase.

| Current State | Allowed? | Penalty | Action |
|---------------|----------|---------|--------|
| `pending_payment` | ✅ Yes | **Warning:** Farmer gets a cancellation count. After 5 cancellations within 30 days → 48h listing cooldown. | Restore product quantity. Notify buyer: "দুঃখিত, বিক্রেতা এই অর্ডার বাতিল করেছেন।" |
| `payment_proof_uploaded` | ⚠️ Admin approval required | Farmer must provide valid reason (e.g., product damaged, natural disaster). Admin decides. | If approved: cancel order, admin creates refund note. |
| `payment_verified` or later | ❌ Not allowed via UI | Farmer cannot cancel after payment is verified. Must negotiate with buyer via chat or contact admin. | Admin intervention only |

#### 6.4.3 Transporter-Initiated Cancellation

| Current State | Allowed? | Penalty | Action |
|---------------|----------|---------|--------|
| `transport_assigned` (before transport payment) | ⚠️ Yes — With penalty | **Hard penalty:** Cancellation recorded. Rating impact. After 3 transport cancellations → temporary suspension of bidding/offer creation for 7 days. | Release capacity. Order reverts to `transport_required`. Buyer re-selects transport or creates RFQ. |
| `ready_for_pickup` | ❌ Admin only | Serious penalty. Suspension possible. | Admin re-assigns transport or helps buyer find alternative. Refund notes created for transport payment. |
| `in_transit` | ❌ Not allowed | Emergency only — admin intervention. | Admin coordinates resolution. |

#### 6.4.4 System-Initiated Cancellation (Timeouts)

| Timeout Trigger | Action | Notifications |
|----------------|--------|---------------|
| `pending_payment` + 24 hours | Auto-cancel order | Buyer: "আপনার অর্ডার #{order_number} সময়সীমা অতিক্রম করায় বাতিল হয়েছে।" Farmer: "অর্ডার #{order_number} ক্রেতা পেমেন্ট না করায় বাতিল হয়েছে।" |
| `payment_rejected` + 48 hours | Auto-cancel order | Buyer: "পেমেন্ট প্রমাণ পুনরায় আপলোড না করায় অর্ডার বাতিল হয়েছে।" |
| `transport_required` + 168 hours (7 days) | Auto-cancel, create admin refund note | Buyer + Farmer notified. Admin: "অর্ডার #{order_number} পরিবহন ব্যবস্থা না হওয়ায় বাতিল হয়েছে। কৃষককে ৳{amount} ফেরত দেওয়া দরকার।" |

#### 6.4.5 Cancellation Tracking

**`cancellation_records` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| order_id | UUID FK → orders.id | Cancelled order |
| cancelled_by_user_id | UUID FK → users.id | Who initiated cancellation |
| cancelled_by_role | VARCHAR(20) | `buyer`, `farmer`, `transporter`, `admin`, `system` |
| state_at_cancellation | VARCHAR(30) | Order state when cancelled |
| reason | TEXT | Reason for cancellation |
| penalty_applied | VARCHAR(30) NULL | Type of penalty: `none`, `cooldown_24h`, `cooldown_48h`, `suspension`, `rating_impact` |
| refund_required | BOOLEAN | Whether product payment refund is needed |
| refund_amount_bdt | DECIMAL(12,2) NULL | Amount to refund (if applicable) |
| refund_status | VARCHAR(20) NULL | `pending`, `refunded`, `waived` |
| created_at | TIMESTAMP | When cancellation occurred |

This table serves as an audit trail for all cancellations and is used by the pg_cron job to enforce cooldown penalties.

### 6.5 Order Status History — Audit Trail

Every state transition is recorded in a separate history table for audit, debugging, and user-facing order timeline display.

**`order_status_history` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| order_id | UUID FK → orders.id | Parent order |
| from_state | VARCHAR(30) | Previous state (NULL for initial creation) |
| to_state | VARCHAR(30) | New state |
| changed_by_user_id | UUID | User who triggered the change (or system UUID for auto-transitions) |
| changed_by_role | VARCHAR(20) | `buyer`, `farmer`, `transporter`, `admin`, `system` |
| notes | TEXT NULL | Optional notes (e.g., admin rejection reason, cancellation reason) |
| metadata | JSONB NULL | Additional context (e.g., `{"proof_url": "...", "tx_id": "..."}` for payment uploads) |
| created_at | TIMESTAMP | Timestamp of the transition |

**Index:** `idx_order_status_history_order` ON `(order_id, created_at ASC)` — for chronological timeline query.

**UI Display:** The order detail screen shows a timeline of all state changes with Bengali labels and timestamps:

```
┌─────────────────────────────────────────┐
│  অর্ডার টাইমলাইন — #HB-260715-0042     │
│─────────────────────────────────────────│
│                                         │
│  ✅ অর্ডার তৈরি হয়েছে                    │
│     ১৫ জুলাই ২০২৬, ১০:৩০ AM             │
│     │                                   │
│  ✅ পেমেন্ট প্রমাণ আপলোড হয়েছে            │
│     ১৫ জুলাই ২০২৬, ১১:১৫ AM             │
│     │                                   │
│  ✅ পেমেন্ট যাচাই হয়েছে                   │
│     ১৫ জুলাই ২০২৬, ০৩:৪৫ PM             │
│     অ্যাডমিন কর্তৃক যাচাইকৃত               │
│     │                                   │
│  ✅ পরিবহন নির্ধারিত হয়েছে                 │
│     ১৬ জুলাই ২০২৬, ০৯:০০ AM             │
│     পরিবহনকারী: করিম ট্রান্সপোর্ট          │
│     │                                   │
│  ✅ পরিবহন পেমেন্ট যাচাই হয়েছে            │
│     ১৬ জুলাই ২০২৬, ০৪:৩০ PM             │
│     │                                   │
│  ✅ পিকআপ সম্পন্ন                        │
│     ১৭ জুলাই ২০২৬, ০৮:০০ AM             │
│     📷 পিকআপ ছবি দেখুন                   │
│     │                                   │
│  🔄 পরিবহনে আছে                         │
│     আনুমানিক ডেলিভারি: ১৮ জুলাই          │
│                                         │
└─────────────────────────────────────────┘
```

### 6.6 RFQ (Request for Quotation) — Complete Transport Bidding System

When the transport matching algorithm (Section 5.3.5) returns no suitable offers, or when the Buyer prefers to get competitive bids, the Buyer creates an RFQ.

#### 6.6.1 RFQ Data Model

**`rfqs` Table:**

| Field | Bengali Label | Type | Required | Description |
|-------|-------------|------|----------|-------------|
| id | — | UUID PK | Auto | Unique identifier |
| order_id | — | UUID FK → orders.id | Yes | The order that needs transport |
| buyer_id | — | UUID FK → users.id | Auto | The buyer (denormalized from order) |
| from_location_id | সংগ্রহস্থল | UUID FK → locations.id | Auto | Product pickup location (from order) |
| to_location_id | গন্তব্য | UUID FK → locations.id | Auto | Delivery location (from order) |
| weight_ton | ওজন (টন) | DECIMAL(10,2) | Yes | Total weight to transport (converted from order quantity + unit) |
| preferred_date | পছন্দের তারিখ | DATE | Yes | When the buyer wants transport |
| needs_refrigeration | শীতল পরিবহন দরকার | BOOLEAN DEFAULT false | Auto | Derived from product category |
| notes | বিশেষ নির্দেশনা | TEXT (max 500 chars) | No | Special instructions from buyer |
| max_budget_bdt | সর্বোচ্চ বাজেট (৳) | DECIMAL(12,2) NULL | No | Optional: maximum the buyer is willing to pay |
| status | অবস্থা | VARCHAR(20) | Auto | Lifecycle status |
| bid_count | বিড সংখ্যা | INTEGER DEFAULT 0 | Auto | Denormalized counter |
| selected_bid_id | — | UUID FK → rfq_bids.id NULL | No | The winning bid |
| bid_deadline | বিড শেষ তারিখ | TIMESTAMP | Auto | Auto-set to `created_at + 48 hours`. After this, no new bids accepted. |
| created_at | তারিখ | TIMESTAMP | Auto | Creation timestamp |
| updated_at | — | TIMESTAMP | Auto | Last update |

**Indexes:**
- `idx_rfqs_status` ON `(status)` — for active RFQ queries
- `idx_rfqs_buyer` ON `(buyer_id)` — for buyer's "my RFQs" view
- `idx_rfqs_order` ON `(order_id)` UNIQUE — one RFQ per order (buyer can create a new RFQ if previous expired, but only one active at a time)
- `idx_rfqs_locations` ON `(from_location_id, to_location_id)` — for transporter matching

**RFQ Status Values:**

| Status | Bengali Label | Description |
|--------|--------------|-------------|
| `open` | চলমান | Accepting bids. Within bid_deadline. |
| `closed` | বন্ধ | Buyer selected a bid. No more bids accepted. |
| `expired` | মেয়াদ শেষ | bid_deadline passed with no bid selected. Buyer can create new RFQ. |
| `cancelled` | বাতিল | Buyer cancelled the RFQ (e.g., found transport via direct offer instead). |

#### 6.6.2 RFQ Bids — Normalized Table (V3 Improvement over V2's JSONB anti-pattern)

**`rfq_bids` Table:**

| Field | Bengali Label | Type | Required | Description |
|-------|-------------|------|----------|-------------|
| id | — | UUID PK | Auto | Unique bid identifier |
| rfq_id | — | UUID FK → rfqs.id | Yes | Parent RFQ |
| transporter_id | — | UUID FK → users.id | Yes | The transporter placing this bid |
| price_bdt | দাম (৳) | DECIMAL(12,2) | Yes | Transport price offered |
| vehicle_type | গাড়ির ধরন | VARCHAR(30) | Yes | What vehicle type the transporter will use |
| estimated_pickup_date | আনুমানিক পিকআপ | DATE | Yes | When transporter can pick up |
| estimated_delivery_date | আনুমানিক ডেলিভারি | DATE | Yes | Expected delivery date |
| is_refrigerated | শীতল পরিবহন | BOOLEAN DEFAULT false | No | Whether the vehicle has cold chain |
| notes | বিশেষ দ্রষ্টব্য | TEXT (max 300 chars) | No | Notes from transporter (e.g., "রাতে চলবে, সকালে পৌঁছাবে") |
| status | অবস্থা | VARCHAR(20) | Auto | `pending`, `accepted`, `rejected`, `withdrawn` |
| created_at | তারিখ | TIMESTAMP | Auto | Bid submission time |

**Indexes:**
- `idx_rfq_bids_rfq` ON `(rfq_id, status)` — for listing bids on an RFQ
- `idx_rfq_bids_transporter` ON `(transporter_id)` — for transporter's "my bids" view
- `UNIQUE(rfq_id, transporter_id)` — one bid per transporter per RFQ (can update existing bid)

**Constraints:**
- `CHECK (price_bdt > 0)`
- `CHECK (estimated_delivery_date >= estimated_pickup_date)`

#### 6.6.3 RFQ Complete Flow

```
[Buyer creates RFQ from order detail page or transport matching screen]
        │
        ▼
[RFQ Creation]
    INSERT INTO rfqs (order_id, buyer_id, from_location_id, to_location_id,
        weight_ton, preferred_date, needs_refrigeration, notes, max_budget_bdt,
        status, bid_deadline)
    VALUES (..., 'open', NOW() + INTERVAL '48 hours')
        │
        ▼
[Transporter Notification]
    Step 1: Find matching transporters
        SELECT DISTINCT u.id, u.fcm_token
        FROM users u
        JOIN transport_offers t ON t.transporter_id = u.id
        WHERE u.role = 'transporter'
          AND u.is_suspended = false
          AND (
              -- Transporter has offers on similar routes
              (SELECT parent_id FROM locations WHERE id = t.from_location_id)
                  = (SELECT parent_id FROM locations WHERE id = :from_location_id)
              AND
              (SELECT parent_id FROM locations WHERE id = t.to_location_id)
                  = (SELECT parent_id FROM locations WHERE id = :to_location_id)
          )
        UNION
        -- Also notify transporters subscribed to the district-level RFQ topic
        SELECT u.id, u.fcm_token
        FROM users u
        WHERE u.role = 'transporter'
          AND u.is_suspended = false
          AND u.location_id IN (
              SELECT id FROM locations
              WHERE parent_id = (SELECT parent_id FROM locations WHERE id = :from_location_id)
          )
        LIMIT 50;

    Step 2: Send push notification (Bengali)
        "নতুন পরিবহন RFQ: {from_location} → {to_location}, {weight} টন, {preferred_date}। বিড করুন।"

    Step 3: Also broadcast to FCM topic: rfq_{from_district_id}
        │
        ▼
[Transporters view RFQ and place bids]
    Each transporter sees:
    ┌─────────────────────────────────────────┐
    │  পরিবহন RFQ বিস্তারিত                     │
    │─────────────────────────────────────────│
    │                                         │
    │  📍 সংগ্রহ: শেরপুর, বগুড়া               │
    │  📍 গন্তব্য: সাভার, ঢাকা                  │
    │  📦 ওজন: ২.৫ টন                        │
    │  📅 পছন্দের তারিখ: ২০ জুলাই ২০২৬        │
    │  ❄️ শীতল পরিবহন: না                     │
    │  💰 সর্বোচ্চ বাজেট: ৳৮,০০০              │
    │  💬 নোট: "সকালের মধ্যে ডেলিভারি চাই"    │
    │                                         │
    │  ⏰ বিড শেষ: ১৬ ঘণ্টা ২৩ মিনিট বাকি     │
    │  📊 বিড সংখ্যা: ৩ টি                     │
    │                                         │
    │       [বিড দিন]                          │
    │                                         │
    └─────────────────────────────────────────┘

    Transporter submits bid:
    INSERT INTO rfq_bids (rfq_id, transporter_id, price_bdt, vehicle_type,
        estimated_pickup_date, estimated_delivery_date, is_refrigerated, notes, status)
    VALUES (..., 'pending')

    UPDATE rfqs SET bid_count = bid_count + 1 WHERE id = :rfq_id

    Notify buyer: "আপনার RFQ-তে নতুন বিড: {transporter_name} — ৳{price}"
        │
        ▼
[Buyer reviews bids]
    Bids sorted by: price ASC, then transporter rating DESC, then estimated delivery ASC

    ┌─────────────────────────────────────────┐
    │  বিড তালিকা — ৩ টি বিড পাওয়া গেছে       │
    │─────────────────────────────────────────│
    │                                         │
    │  ┌─────────────────────────────────┐    │
    │  │ 🥇 সেরা দাম                      │    │
    │  │ 👤 করিম ট্রান্সপোর্ট ✅           │    │
    │  │ ⭐ ৪.৫ (২৩ রিভিউ)               │    │
    │  │ 🚛 মাঝারি ট্রাক                  │    │
    │  │ 💰 ৳৬,০০০                       │    │
    │  │ 📅 পিকআপ: ২০ জুলাই              │    │
    │  │ 📅 ডেলিভারি: ২১ জুলাই            │    │
    │  │ 💬 "সকাল ৬টায় পিকআপ করব"       │    │
    │  │                                 │    │
    │  │ [গ্রহণ করুন]  [চ্যাট করুন]        │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    │  ┌─────────────────────────────────┐    │
    │  │ 👤 রহিম লজিস্টিকস               │    │
    │  │ ⭐ ৪.২ (১১ রিভিউ)               │    │
    │  │ 🚛 বড় ট্রাক                     │    │
    │  │ 💰 ৳৭,৫০০                       │    │
    │  │ 📅 ডেলিভারি: ২০ জুলাই (একই দিন)  │    │
    │  │                                 │    │
    │  │ [গ্রহণ করুন]  [চ্যাট করুন]        │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    └─────────────────────────────────────────┘
        │
        ▼
[Buyer accepts a bid]
    BEGIN TRANSACTION;

    -- Update the selected bid
    UPDATE rfq_bids SET status = 'accepted' WHERE id = :selected_bid_id;

    -- Reject all other pending bids
    UPDATE rfq_bids SET status = 'rejected'
    WHERE rfq_id = :rfq_id AND id != :selected_bid_id AND status = 'pending';

    -- Close the RFQ
    UPDATE rfqs SET status = 'closed', selected_bid_id = :selected_bid_id, updated_at = NOW()
    WHERE id = :rfq_id;

    -- Update the order with transport details
    UPDATE orders
    SET transporter_id = :bid_transporter_id,
        rfq_id = :rfq_id,
        transport_price_bdt = :bid_price_bdt,
        estimated_delivery_date = :bid_estimated_delivery_date,
        current_state = 'transport_assigned',
        updated_at = NOW()
    WHERE id = :order_id;

    -- Record state transition
    INSERT INTO order_status_history (order_id, from_state, to_state, changed_by_user_id, notes)
    VALUES (:order_id, 'transport_required', 'transport_assigned', :buyer_id,
            'RFQ bid accepted from ' || :transporter_name);

    -- Create transport payment record
    INSERT INTO transport_payments (order_id, buyer_id, transporter_id, amount_bdt, status)
    VALUES (:order_id, :buyer_id, :bid_transporter_id, :bid_price_bdt, 'pending_payment');

    COMMIT;

    -- Notifications
    → Winning transporter: "অভিনন্দন! আপনার বিড গৃহীত হয়েছে। অর্ডার: #{order_number}"
    → Rejected transporters: "দুঃখিত, আপনার বিড এবার নির্বাচিত হয়নি।"
    → Farmer: "পরিবহন ব্যবস্থা হয়েছে। পরিবহনকারী: {transporter_name}"
    → Buyer: "পরিবহন বুকিং সফল! পরিবহনকারীকে ৳{price} পরিশোধ করুন।"
        │
        ▼
[Order continues to transport_assigned → transport payment flow (Section 8)]
```

#### 6.6.4 RFQ Auto-Expiry

```sql
-- pg_cron: runs every 5 minutes
-- Expire open RFQs past their bid deadline with no accepted bids
UPDATE rfqs
SET status = 'expired', updated_at = NOW()
WHERE status = 'open'
  AND bid_deadline < NOW();

-- For expired RFQs: notify buyer
-- "আপনার পরিবহন RFQ এর সময়সীমা শেষ হয়েছে। নতুন RFQ তৈরি করুন বা পরিবহন অফার থেকে নির্বাচন করুন।"

-- Reject all pending bids on expired RFQs
UPDATE rfq_bids
SET status = 'rejected'
WHERE rfq_id IN (SELECT id FROM rfqs WHERE status = 'expired')
  AND status = 'pending';
```

### 6.7 Pickup & Delivery Confirmation Flows

#### 6.7.1 Transporter Pickup Confirmation

When the order reaches `ready_for_pickup`, the Transporter must physically go to the Farmer's location and confirm pickup.

**Transporter UI:**

```
┌─────────────────────────────────────────┐
│  পিকআপ নিশ্চিত করুন                      │
│  অর্ডার: #HB-260715-0042                │
│─────────────────────────────────────────│
│                                         │
│  📦 পণ্য: পাকা আম — হিমসাগর জাত          │
│  📏 পরিমাণ: ৫০ কেজি                      │
│  👤 কৃষক: {farmer_name}                  │
│  📍 সংগ্রহ ঠিকানা:                         │
│     শেরপুর বাজারের পাশে, জামাল...          │
│     শেরপুর, বগুড়া                         │
│  📞 কৃষকের ফোন: ০১XXXXXXXX              │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  পিকআপ যাচাইকরণ:                        │
│                                         │
│  📸 পণ্যের ছবি তুলুন (লোডিং অবস্থায়) *     │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   [📷 ছবি তুলুন]                │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  পণ্যের অবস্থা *                          │
│  ( ) ভালো অবস্থায় আছে ✅                 │
│  ( ) সামান্য ক্ষতিগ্রস্ত ⚠️                │
│  ( ) মারাত্মকভাবে ক্ষতিগ্রস্ত ❌             │
│                                         │
│  মন্তব্য (ঐচ্ছিক)                          │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☑ আমি নিশ্চিত করছি যে পণ্য               │
│    আমার গাড়িতে লোড করা হয়েছে।           │
│                                         │
│       [✅ পিকআপ নিশ্চিত করুন]             │
│                                         │
└─────────────────────────────────────────┘
```

**On Confirmation:**
1. `pickup_photo_url` stored.
2. `pickup_confirmed_at = NOW()`.
3. `current_state = 'in_transit'`.
4. If product condition = "ক্ষতিগ্রস্ত" → automatic alert to admin and buyer with photo.
5. Notifications sent to buyer and farmer.

#### 6.7.2 Buyer Delivery Confirmation

When the Transporter arrives at the delivery location:

**Buyer UI:**

```
┌─────────────────────────────────────────┐
│  ডেলিভারি নিশ্চিত করুন                    │
│  অর্ডার: #HB-260715-0042                │
│─────────────────────────────────────────│
│                                         │
│  📦 পণ্য: পাকা আম — হিমসাগর জাত          │
│  📏 অর্ডার পরিমাণ: ৫০ কেজি                │
│  👤 কৃষক: {farmer_name}                  │
│  🚛 পরিবহনকারী: {transporter_name}       │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  ডেলিভারি যাচাইকরণ:                      │
│                                         │
│  📸 পণ্যের ছবি তুলুন (প্রাপ্তির পরে) *      │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   [📷 ছবি তুলুন]                │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  পণ্য কি সঠিকভাবে পেয়েছেন? *             │
│  ( ) হ্যাঁ, সব ঠিক আছে ✅                │
│  ( ) পরিমাণ কম আছে ⚠️                   │
│  ( ) পণ্যের মান খারাপ ⚠️                  │
│  ( ) ক্ষতিগ্রস্ত অবস্থায় পেয়েছি ❌          │
│                                         │
│  [If ⚠️ or ❌ selected:]                 │
│  বিস্তারিত সমস্যা লিখুন:                   │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☑ আমি নিশ্চিত করছি যে আমি              │
│    পণ্যটি গ্রহণ করেছি।                     │
│                                         │
│       [✅ ডেলিভারি নিশ্চিত করুন]           │
│                                         │
│  ─────────────────────────────────      │
│  ⚠️ সমস্যা থাকলে ডেলিভারি নিশ্চিত করার    │
│  পরেও ৭ দিনের মধ্যে বিতর্ক দায়ের         │
│  করতে পারবেন।                           │
│                                         │
└─────────────────────────────────────────┘
```

**On Confirmation:**
1. `delivery_photo_url` stored.
2. `delivery_confirmed_at = NOW()`.
3. `current_state = 'delivered'`.
4. If condition ≠ "সব ঠিক আছে" → system suggests raising a dispute immediately, but does not force it.
5. 7-day auto-complete timer starts.
6. All parties prompted to rate each other (see Section 6.8).

### 6.8 Rating System

After delivery is confirmed, all parties can rate each other. Ratings contribute to search ranking and trust signals.

**`ratings` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| order_id | UUID FK → orders.id | Which order this rating is for |
| rater_user_id | UUID FK → users.id | Who is giving the rating |
| rated_user_id | UUID FK → users.id | Who is being rated |
| rating_type | VARCHAR(20) | `product_quality`, `buyer_reliability`, `transport_quality` |
| rating | INTEGER | 1–5 stars |
| review_text | TEXT (max 500 chars) NULL | Optional Bengali review comment |
| is_visible | BOOLEAN DEFAULT true | Admin can hide inappropriate reviews |
| created_at | TIMESTAMP | When rating was submitted |

**Rating Rules:**

| Rater | Can Rate | Rating Type | Bengali Prompt |
|-------|----------|------------|----------------|
| Buyer | Farmer | `product_quality` | "পণ্যের মান কেমন ছিল?" |
| Buyer | Transporter | `transport_quality` | "পরিবহন সেবা কেমন ছিল?" |
| Farmer | Buyer | `buyer_reliability` | "ক্রেতার সাথে কাজ করার অভিজ্ঞতা কেমন?" |
| Transporter | Buyer | `buyer_reliability` | "ক্রেতার সাথে কাজ করার অভিজ্ঞতা কেমন?" |

**Constraints:**
- `UNIQUE(order_id, rater_user_id, rated_user_id)` — one rating per pair per order
- `CHECK (rating >= 1 AND rating <= 5)`
- Rating can only be submitted when order is in `delivered` or `completed` state
- Ratings become permanent (cannot be edited) once order reaches `completed` state
- Admin can hide (but not delete) ratings flagged as abusive

**Aggregate Rating Computation (for display):**

```sql
-- Computed on read, or cached in a materialized view refreshed every 15 minutes
SELECT
    rated_user_id,
    rating_type,
    COUNT(*) as total_reviews,
    ROUND(AVG(rating), 1) as avg_rating,
    COUNT(*) FILTER (WHERE rating >= 4) as positive_count,
    COUNT(*) FILTER (WHERE rating <= 2) as negative_count
FROM ratings
WHERE is_visible = true
GROUP BY rated_user_id, rating_type;
```

### 6.9 Timeout Enforcement — pg_cron Job Specification

All timeouts defined in the state machine are enforced by a single pg_cron job that runs every **5 minutes**.

**Job: `enforce_order_timeouts`**

```sql
-- Schedule: every 5 minutes
-- SELECT cron.schedule('enforce_order_timeouts', '*/5 * * * *', $$

-- 1. Auto-cancel orders stuck in pending_payment > 24 hours
WITH cancelled_pending AS (
    UPDATE orders
    SET current_state = 'cancelled',
        cancellation_reason = 'পেমেন্ট সময়সীমা অতিক্রম',
        cancelled_by = '00000000-0000-0000-0000-000000000000', -- SYSTEM UUID
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE current_state = 'pending_payment'
      AND created_at < NOW() - INTERVAL '24 hours'
    RETURNING id, product_id, quantity_ordered, buyer_id, farmer_id
)
-- Restore product quantities for cancelled orders
UPDATE products p
SET remaining_quantity = p.remaining_quantity + cp.quantity_ordered,
    status = CASE WHEN p.status = 'sold' THEN 'active' ELSE p.status END
FROM cancelled_pending cp
WHERE p.id = cp.product_id;
-- Note: Notification triggers handle buyer/farmer notifications

-- 2. Auto-cancel orders stuck in payment_rejected > 48 hours
WITH cancelled_rejected AS (
    UPDATE orders
    SET current_state = 'cancelled',
        cancellation_reason = 'পুনরায় পেমেন্ট প্রমাণ আপলোড না করায় বাতিল',
        cancelled_by = '00000000-0000-0000-0000-000000000000',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE current_state = 'payment_rejected'
      AND updated_at < NOW() - INTERVAL '48 hours'
    RETURNING id, product_id, quantity_ordered
)
UPDATE products p
SET remaining_quantity = p.remaining_quantity + cr.quantity_ordered,
    status = CASE WHEN p.status = 'sold' THEN 'active' ELSE p.status END
FROM cancelled_rejected cr
WHERE p.id = cr.product_id;

-- 3. Escalate payment_proof_uploaded > 48 hours (admin hasn't reviewed)
-- Don't auto-cancel, just alert senior admin
INSERT INTO admin_alerts (type, severity, order_id, message, created_at)
SELECT 'payment_verification_overdue', 'high', id,
    'অর্ডার #' || order_number || ' এর পেমেন্ট ৪৮ ঘণ্টার বেশি সময় ধরে যাচাই করা হয়নি।',
    NOW()
FROM orders
WHERE current_state = 'payment_proof_uploaded'
  AND updated_at < NOW() - INTERVAL '48 hours'
  AND id NOT IN (SELECT order_id FROM admin_alerts WHERE type = 'payment_verification_overdue' AND created_at > NOW() - INTERVAL '24 hours');

-- 4. Warn buyer for transport_required > 72 hours
INSERT INTO notification_queue (user_id, title, body, type, reference_id, created_at)
SELECT buyer_id, 'পরিবহন নির্বাচন করুন',
    'অর্ডার #' || order_number || ' এর পরিবহন ব্যবস্থা করুন। ৭ দিনের মধ্যে পরিবহন না হলে অর্ডার বাতিল হবে।',
    'transport_reminder', id, NOW()
FROM orders
WHERE current_state = 'transport_required'
  AND updated_at < NOW() - INTERVAL '72 hours'
  AND updated_at >= NOW() - INTERVAL '73 hours'; -- Only send once (5-min window)

-- 5. Auto-cancel transport_required > 168 hours (7 days)
WITH cancelled_transport AS (
    UPDATE orders
    SET current_state = 'cancelled',
        cancellation_reason = 'পরিবহন ব্যবস্থা না হওয়ায় বাতিল। কৃষককে ফেরত দেওয়া প্রয়োজন।',
        cancelled_by = '00000000-0000-0000-0000-000000000000',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE current_state = 'transport_required'
      AND updated_at < NOW() - INTERVAL '168 hours'
    RETURNING id, product_id, quantity_ordered, buyer_id, farmer_id, product_total_bdt
)
-- Restore product quantities
UPDATE products p
SET remaining_quantity = p.remaining_quantity + ct.quantity_ordered,
    status = CASE WHEN p.status = 'sold' THEN 'active' ELSE p.status END
FROM cancelled_transport ct
WHERE p.id = ct.product_id;
-- Also: create refund_notes for admin (product payment was verified)
-- INSERT INTO refund_notes ... (handled by trigger)

-- 6. Alert admin for ready_for_pickup where transporter hasn't picked up
INSERT INTO admin_alerts (type, severity, order_id, message, created_at)
SELECT 'pickup_overdue', 'medium', id,
    'অর্ডার #' || order_number || ' পিকআপ হয়নি। পরিবহনকারী: ' ||
    (SELECT display_name FROM users WHERE id = transporter_id),
    NOW()
FROM orders
WHERE current_state = 'ready_for_pickup'
  AND updated_at < NOW() - INTERVAL '72 hours'
  AND id NOT IN (SELECT order_id FROM admin_alerts WHERE type = 'pickup_overdue' AND created_at > NOW() - INTERVAL '24 hours');

-- 7. Alert for in_transit exceeding estimated delivery
INSERT INTO admin_alerts (type, severity, order_id, message, created_at)
SELECT 'delivery_overdue', 'high', id,
    'অর্ডার #' || order_number || ' আনুমানিক ডেলিভারি তারিখ পেরিয়ে গেছে।',
    NOW()
FROM orders
WHERE current_state = 'in_transit'
  AND estimated_delivery_date IS NOT NULL
  AND estimated_delivery_date + INTERVAL '48 hours' < NOW()
  AND id NOT IN (SELECT order_id FROM admin_alerts WHERE type = 'delivery_overdue' AND created_at > NOW() - INTERVAL '24 hours');

-- 8. Auto-complete delivered orders after 7 days with no dispute
UPDATE orders
SET current_state = 'completed',
    updated_at = NOW()
WHERE current_state = 'delivered'
  AND delivery_confirmed_at < NOW() - INTERVAL '7 days'
  AND id NOT IN (SELECT order_id FROM disputes WHERE status = 'open');

-- $$ );
```

### 6.10 Order Creation — Complete Flow from Product Purchase

This section details the exact steps when a Buyer purchases a product, tying together Sections 4, 5, and 6.

```
[Buyer on Product Detail screen taps "কিনুন" (Buy)]
        │
        ▼
[Order Quantity Selection Screen]
    "কত পরিমাণ কিনতে চান?"

    📦 {product_title}
    💰 ৳{price}/{unit}
    📏 পাওয়া যাচ্ছে: {remaining_quantity} {unit}
    📏 সর্বনিম্ন অর্ডার: {min_order_quantity} {unit}

    পরিমাণ: [____] {unit}
    (Numeric input with +/- buttons)

    ডেলিভারি স্থান:
    বিভাগ: [____▼]  জেলা: [____▼]  উপজেলা: [____▼]
    বিস্তারিত ঠিকানা: [____________________]

    ─────────────────────────────────
    সারসংক্ষেপ:
    পরিমাণ: {qty} {unit}
    একক মূল্য: ৳{unit_price}
    পণ্যের মোট: ৳{product_total}
    পরিবহন: পরবর্তী ধাপে নির্ধারিত হবে
    ─────────────────────────────────
    ☑ ০% কমিশন — কোনো চার্জ নেই

    [অর্ডার দিন]
        │
        ▼
[Validation]
    • quantity >= min_order_quantity? ✅
    • quantity <= remaining_quantity? ✅
    • delivery_location_id provided? ✅
    • Buyer is not suspended? ✅
    • Buyer has no cancellation cooldown? ✅
    • Product is still active? ✅
        │
        ▼
[Atomic Order Creation (Edge Function)]
    BEGIN TRANSACTION;

    -- Lock the product row to prevent race conditions
    SELECT remaining_quantity FROM products WHERE id = :product_id FOR UPDATE;

    -- Verify remaining quantity (re-check under lock)
    IF remaining_quantity < :order_qty THEN
        ROLLBACK;
        RETURN error: "দুঃখিত, পণ্যের পরিমাণ কমে গেছে। বর্তমানে {remaining} {unit} পাওয়া যাচ্ছে।"
    END IF;

    -- Create the order
    INSERT INTO orders (
        order_number, product_id, buyer_id, farmer_id,
        quantity_ordered, unit, unit_price, product_total_bdt,
        pickup_location_id, pickup_address_detail,
        delivery_location_id, delivery_address_detail,
        current_state, idempotency_key, created_at
    ) VALUES (
        generate_order_number(),  -- Database function: HB-YYMMDD-SEQ
        :product_id, :buyer_id, :farmer_id,
        :qty, :unit, :unit_price, :qty * :unit_price,
        :product_pickup_location_id, :product_pickup_address,
        :delivery_location_id, :delivery_address,
        'pending_payment', :idempotency_key, NOW()
    ) RETURNING id, order_number;

    -- Deduct product quantity
    UPDATE products
    SET remaining_quantity = remaining_quantity - :qty,
        status = CASE WHEN remaining_quantity - :qty <= 0 THEN 'sold' ELSE status END,
        updated_at = NOW()
    WHERE id = :product_id;

    -- Record initial state
    INSERT INTO order_status_history (order_id, from_state, to_state, changed_by_user_id, changed_by_role)
    VALUES (:new_order_id, NULL, 'pending_payment', :buyer_id, 'buyer');

    COMMIT;
        │
        ▼
[Notifications]
    → Farmer: "নতুন অর্ডার পেয়েছেন! #{order_number} — {qty} {unit} {product_title}, ৳{total}"
    → Buyer: "অর্ডার তৈরি হয়েছে! #{order_number}। ২৪ ঘণ্টার মধ্যে পেমেন্ট করুন।"
        │
        ▼
[Navigate to Payment Proof Upload Screen (Section 8)]
    Buyer sees farmer's bKash number, bank details, and payment instructions in Bengali.
    24-hour countdown timer displayed.
```

### 6.11 End-to-End Order Summary — Visual

```
TIME    BUYER                ADMIN              FARMER             TRANSPORTER
────    ─────                ─────              ──────             ───────────

T+0     Creates order
        (pending_payment)
        │
T+0.5   Uploads payment      
        proof + TX ID        
        (payment_proof_                        
        uploaded)            
                             │
T+4     ◄─────────────────── Verifies payment ─────────────────► Notified
        (payment_verified →                    (payment received   
        transport_required)                     notification)
        │
T+5     Selects transport
        offer OR creates
        RFQ & accepts bid
        (transport_assigned)
        │                                                          │
T+5.5   Uploads transport                                         Notified of
        payment proof                                              assignment
        (transport_payment_
        uploaded)
                             │
T+8     ◄─────────────────── Verifies transport                ──► Notified
        (ready_for_pickup)   payment                               (go pick up)
                                                                   │
T+24                                            │◄─────────────── Picks up goods
                                                (notified of       (in_transit)
                                                 pickup)           │
T+36    Confirms delivery                                       ──► 
        with photo                                                 (delivery
        (delivered)                                                  complete)
        │
T+36    Rates farmer &
        transporter
        │
T+43    [7 days pass,
        no dispute]
        (completed)
```

---

## 7. Monetization — Product Boosting

### 7.1 Revenue Model Overview

HaatBazar operates on a **zero-commission** model. This means:

- **0% fee** on all product sales between Farmers and Buyers.
- **0% fee** on all transport bookings between Buyers and Transporters.
- **0% fee** on RFQ bidding or any transactional activity.
- The **only revenue source** is paid **Product Boosting** by Farmers.

This must be **explicitly communicated** on every transaction confirmation screen with the Bengali text:
> "০% কমিশন — হাটবাজার কোনো বিক্রয় বা পরিবহন ফি নেয় না।"

### 7.2 Boost System — Business Rules

#### 7.2.1 What Boosting Does

A "boosted" product listing receives **elevated visibility** in the platform through the following mechanisms:

| Mechanism | Description |
|-----------|-------------|
| **Feed Placement** | Boosted products appear in the dedicated "বুস্টেড পণ্য" section at the top of the Buyer's home feed. |
| **Search Ranking Bonus** | Boosted products receive a `boost_weight` bonus in the search ranking algorithm (see Section 9), pushing them higher in search results for matching queries. |
| **Visual Badge** | Boosted products display a "🔥 বুস্টেড" badge on their listing card and detail page. |
| **Category Highlight** | In category browse views, boosted products are shown first within their category, before organic results. |
| **Notification Inclusion** | Boosted products are included in periodic "নতুন পণ্য" digest notifications sent to Buyers in matching districts, even if the Buyer hasn't specifically searched for that product category. |

#### 7.2.2 What Boosting Does NOT Do

- Boosting does **not** guarantee a sale.
- Boosting does **not** give the Farmer any transactional advantage (no priority in disputes, no special payment terms).
- Boosting does **not** affect the product's price or terms.
- Boosted products are still subject to the same moderation and reporting rules as organic listings.
- The "বুস্টেড" badge explicitly tells Buyers this is a paid promotion (transparent advertising).

### 7.3 Boost Tiers — Admin-Configurable

Boost tiers are stored in a database table, allowing admins to change pricing and durations without code deployment.

**`boost_tiers` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| name_bn | VARCHAR(50) | Bengali display name |
| slug | VARCHAR(30) UNIQUE | Identifier (e.g., "basic", "standard", "premium") |
| duration_hours | INTEGER | How long the boost lasts in hours |
| price_bdt | DECIMAL(10,2) | Cost in BDT |
| boost_weight | DECIMAL(3,2) | Multiplier added to search ranking score (e.g., 1.5, 2.0, 3.0) |
| max_impressions | INTEGER NULL | Optional: maximum number of impressions. NULL = unlimited within duration. |
| is_active | BOOLEAN DEFAULT true | Whether this tier is currently available for purchase |
| display_order | INTEGER | Sort order in the boost selection UI |
| created_at | TIMESTAMP | When this tier was created |
| updated_at | TIMESTAMP | Last modification |

**Default Tier Configuration (seeded at deployment):**

| Tier | Bengali Name | Duration | Price (BDT) | Boost Weight | Max Impressions | Description |
|------|-------------|----------|-------------|-------------|-----------------|-------------|
| Basic | বেসিক বুস্ট | 24 hours (1 day) | ৳৫০ | 1.5 | Unlimited | Entry-level boost. Good for testing effectiveness. |
| Standard | স্ট্যান্ডার্ড বুস্ট | 72 hours (3 days) | ৳১২০ | 2.0 | Unlimited | Most popular tier. Best value for money. Displayed as "সেরা মূল্য" (Best Value) badge. |
| Premium | প্রিমিয়াম বুস্ট | 168 hours (7 days) | ৳২৫০ | 3.0 | Unlimited | Maximum visibility for a full week. Displayed as "সর্বোচ্চ দৃশ্যমানতা" (Maximum Visibility) badge. |
| Flash | ফ্ল্যাশ বুস্ট | 6 hours | ৳২০ | 2.5 | 500 | Short-duration, high-intensity boost. Good for time-sensitive perishables. |

**Admin can at any time:**
- Add new tiers
- Deactivate existing tiers (is_active = false; existing active boosts on that tier continue until expiry)
- Change prices (affects new purchases only; existing boosts retain their paid tier terms)
- Adjust boost weights (takes effect immediately for all active boosts on that tier)

### 7.4 Boost Purchase Flow — Complete Specification

#### 7.4.1 Entry Points

A Farmer can initiate a boost from three places:

1. **During Product Publish** (Section 4.5, Screen 5) — "এই পণ্য বুস্ট করতে চান?" prompt after clicking publish.
2. **From Product Detail** — "🔥 বুস্ট করুন" button on their own product's detail page (visible only to the owning Farmer).
3. **From My Products List** — "বুস্ট" action button next to each active product in the Farmer's product management screen.

#### 7.4.2 Boost Selection UI

**Screen: "পণ্য বুস্ট করুন" (Boost Product)**

```
┌─────────────────────────────────────────┐
│  ← পণ্য বুস্ট করুন                       │
│─────────────────────────────────────────│
│                                         │
│  📦 পণ্য: পাকা আম — হিমসাগর জাত          │
│  💰 মূল্য: ৳১২০/কেজি                     │
│  📍 শেরপুর, বগুড়া                        │
│                                         │
│  ─────────────────────────────────      │
│  বুস্ট প্যাকেজ নির্বাচন করুন:               │
│  ─────────────────────────────────      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ⚡ ফ্ল্যাশ বুস্ট                   │    │
│  │ ৬ ঘণ্টা | ৳২০                    │    │
│  │ পচনশীল পণ্যের জন্য আদর্শ          │    │
│  │                          ( )    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📢 বেসিক বুস্ট                    │    │
│  │ ১ দিন | ৳৫০                      │    │
│  │ শুরু করার জন্য ভালো               │    │
│  │                          ( )    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ⭐ স্ট্যান্ডার্ড বুস্ট  [সেরা মূল্য]  │    │
│  │ ৩ দিন | ৳১২০                     │    │
│  │ সবচেয়ে জনপ্রিয় প্যাকেজ            │    │
│  │                          (●)    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🚀 প্রিমিয়াম বুস্ট                 │    │
│  │ ৭ দিন | ৳২৫০                     │    │
│  │ সর্বোচ্চ দৃশ্যমানতা                 │    │
│  │                          ( )    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  📊 বুস্টের সুবিধা:                       │
│  • বুস্টেড পণ্য তালিকায় শীর্ষে থাকবে      │
│  • ক্রেতাদের কাছে বিশেষ ব্যাজ দেখাবে      │
│  • নতুন পণ্য নোটিফিকেশনে অন্তর্ভুক্ত হবে   │
│                                         │
│       [পেমেন্ট করুন — ৳১২০]              │
│                                         │
│  ℹ️ ০% কমিশন — শুধু বুস্ট ফি প্রযোজ্য     │
│                                         │
└─────────────────────────────────────────┘
```

#### 7.4.3 Boost Payment Flow (Manual — No Gateway)

Since HaatBazar has **no integrated payment gateway**, boost payments follow the same manual verification pattern as all other payments.

```
[Farmer selects boost tier and taps "পেমেন্ট করুন"]
        │
        ▼
[Payment Instructions Screen: "বুস্ট পেমেন্ট"]
    ┌─────────────────────────────────────────┐
    │  বুস্ট পেমেন্ট নির্দেশনা                    │
    │─────────────────────────────────────────│
    │                                         │
    │  প্যাকেজ: স্ট্যান্ডার্ড বুস্ট (৩ দিন)       │
    │  মোট: ৳১২০                              │
    │                                         │
    │  ─────────────────────────────────      │
    │  নিচের যেকোনো একটি পদ্ধতিতে পেমেন্ট     │
    │  করুন:                                  │
    │                                         │
    │  📱 বিকাশ (bKash):                       │
    │  ┌─────────────────────────────────┐    │
    │  │ নম্বর: ০১XXXXXXXXX              │    │
    │  │ রেফারেন্স: BOOST-{order_num}    │    │
    │  │               [📋 কপি করুন]     │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    │  🏦 ব্যাংক ট্রান্সফার:                    │
    │  ┌─────────────────────────────────┐    │
    │  │ ব্যাংক: {platform_bank_name}     │    │
    │  │ হিসাব নম্বর: XXXXXXXXXXXX       │    │
    │  │ রাউটিং: XXXXXXXXX              │    │
    │  │ রেফারেন্স: BOOST-{order_num}    │    │
    │  │               [📋 কপি করুন]     │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    │  💵 নগদ (Nagad):                        │
    │  ┌─────────────────────────────────┐    │
    │  │ নম্বর: ০১XXXXXXXXX              │    │
    │  │ রেফারেন্স: BOOST-{order_num}    │    │
    │  │               [📋 কপি করুন]     │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    │  ─────────────────────────────────      │
    │  ⚠️ পেমেন্ট করার পরে নিচের তথ্য দিন:   │
    │  ─────────────────────────────────      │
    │                                         │
    │  পেমেন্ট মাধ্যম *                        │
    │  [বিকাশ] [নগদ] [ব্যাংক]                 │
    │  (chip selection)                       │
    │                                         │
    │  লেনদেন আইডি (Transaction ID) *         │
    │  ┌─────────────────────────────────┐    │
    │  │ 9A3F8B2C1D                      │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    │  📸 পেমেন্ট স্ক্রিনশট আপলোড করুন *       │
    │  ┌─────────────────────────────────┐    │
    │  │                                 │    │
    │  │   [📷 ছবি তুলুন / গ্যালারি]      │    │
    │  │                                 │    │
    │  └─────────────────────────────────┘    │
    │                                         │
    │  ─────────────────────────────────      │
    │                                         │
    │  ⏰ পেমেন্ট যাচাই সাধারণত ২৪ ঘণ্টার     │
    │  মধ্যে সম্পন্ন হয়। যাচাই হওয়ার সাথে    │
    │  সাথে বুস্ট সক্রিয় হবে।                  │
    │                                         │
    │       [📤 পেমেন্ট প্রমাণ জমা দিন]         │
    │                                         │
    └─────────────────────────────────────────┘
        │
        ▼
[OTP Verification Required (sensitive action)]
    → Native Supabase Phone OTP (Send SMS Hook → DP Relay gateway) sent to farmer's registered number
    → Farmer enters 6-digit code
    → On success → proceed
    → On failure → see Section 3.2.3 for OTP error handling
        │
        ▼
[System processes boost payment submission]
    BEGIN TRANSACTION;

    -- Create boost payment record
    INSERT INTO boost_payments (
        id, farmer_id, product_id, boost_tier_id,
        amount_bdt, payment_method, tx_id, proof_url,
        status, created_at
    ) VALUES (
        gen_random_uuid(), :farmer_id, :product_id, :tier_id,
        :tier_price, :payment_method, :tx_id, :proof_url,
        'pending_verification', NOW()
    );

    -- Check TX ID uniqueness (fraud prevention)
    -- If tx_id already exists in boost_payments OR orders → reject
    -- (handled by UNIQUE constraint and pre-check in Edge Function)

    COMMIT;
        │
        ▼
[Notifications]
    → Farmer: "আপনার বুস্ট পেমেন্ট প্রমাণ জমা হয়েছে। যাচাই চলছে..."
    → Admin: "নতুন বুস্ট পেমেন্ট যাচাই প্রয়োজন। পণ্য: {title}, ৳{amount}"
        │
        ▼
[Admin Verification (within 24-hour SLA)]
    Admin sees in dashboard:
    • Farmer name & profile
    • Product listing link
    • Boost tier selected
    • Expected amount (from tier price)
    • Payment method & TX ID
    • Screenshot image (viewable/zoomable)
    • Admin checks:
      1. Screenshot shows correct amount (±5% tolerance for bKash fees)
      2. Screenshot shows transaction to platform's account
      3. TX ID matches screenshot
      4. TX ID not previously used
      5. Payment date is recent (within 48 hours)
        │
        ├── [Admin Approves]
        │       │
        │       ▼
        │   UPDATE boost_payments
        │   SET status = 'approved',
        │       verified_by = :admin_id,
        │       verified_at = NOW()
        │   WHERE id = :boost_payment_id;
        │
        │   UPDATE products
        │   SET is_boosted = true,
        │       boost_expiry = NOW() + (tier.duration_hours || ' hours')::INTERVAL,
        │       updated_at = NOW()
        │   WHERE id = :product_id;
        │
        │   -- Record boost activation
        │   INSERT INTO boost_history (product_id, boost_tier_id, boost_payment_id,
        │       activated_at, expires_at)
        │   VALUES (:product_id, :tier_id, :boost_payment_id,
        │       NOW(), NOW() + (tier.duration_hours || ' hours')::INTERVAL);
        │
        │   → Farmer notification: "আপনার পণ্য '{title}' এর বুস্ট সক্রিয় হয়েছে! 🔥
        │     মেয়াদ: {duration} | মেয়াদ শেষ: {expiry_date_bn}"
        │
        ├── [Admin Rejects]
        │       │
        │       ▼
        │   UPDATE boost_payments
        │   SET status = 'rejected',
        │       verified_by = :admin_id,
        │       verified_at = NOW(),
        │       rejection_reason = :reason
        │   WHERE id = :boost_payment_id;
        │
        │   → Farmer notification: "আপনার বুস্ট পেমেন্ট প্রত্যাখ্যাত হয়েছে।
        │     কারণ: {rejection_reason}
        │     পুনরায় সঠিক প্রমাণ আপলোড করুন।"
        │
        │   Farmer can retry from boost payment screen (re-upload proof).
        │
        └── [Admin No Action > 24h]
                │
                ▼
            Admin alert escalation: "বুস্ট পেমেন্ট ২৪ ঘণ্টার বেশি সময় ধরে যাচাই করা হয়নি।"
            → Senior admin notified
            → Farmer notified: "আপনার বুস্ট পেমেন্ট যাচাই বিলম্বিত হচ্ছে। শীঘ্রই সম্পন্ন হবে।"
```

#### 7.4.4 Boost Stacking & Renewal Rules

| Scenario | Behavior |
|----------|----------|
| **Boost while already boosted (same tier)** | Extend: New expiry = `current_boost_expiry + new_tier_duration`. Does not restart. |
| **Boost while already boosted (different tier)** | Upgrade: If new tier has higher boost_weight → immediately apply new weight + extend from NOW. If lower → extend from current expiry with new weight applied only after current expires. |
| **Boost on a `sold` product** | Not allowed. UI hides boost button for sold products. |
| **Boost on a `suspended` product** | Not allowed. Bengali error: "স্থগিত পণ্য বুস্ট করা যায় না।" |
| **Boost on an `expired` product** | Not allowed. Farmer must re-list the product first. |
| **Multiple products boosted simultaneously** | Allowed. Each product has independent boost status and expiry. No limit on concurrent boosts per farmer (revenue-positive for platform). |

### 7.5 Boost Data Model — Complete Tables

#### 7.5.1 `boost_payments` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| farmer_id | UUID FK → users.id | Farmer who made the payment |
| product_id | UUID FK → products.id | Product to be boosted |
| boost_tier_id | UUID FK → boost_tiers.id | Selected tier |
| amount_bdt | DECIMAL(10,2) | Amount paid (should match tier price at time of purchase) |
| payment_method | VARCHAR(20) | `bkash`, `nagad`, `bank_transfer` |
| tx_id | VARCHAR(100) | Transaction ID provided by farmer |
| proof_url | TEXT | URL to payment screenshot in storage |
| status | VARCHAR(30) | `pending_verification`, `approved`, `rejected` |
| rejection_reason | TEXT NULL | Why admin rejected (Bengali) |
| verified_by | UUID FK → admin_users.id NULL | Admin who verified |
| verified_at | TIMESTAMP NULL | When verification happened |
| created_at | TIMESTAMP | When payment was submitted |

**Indexes:**
- `idx_boost_payments_status` ON `(status)` — for admin verification queue
- `idx_boost_payments_farmer` ON `(farmer_id)` — for farmer's payment history
- `idx_boost_payments_product` ON `(product_id)` — for product boost history
- `idx_boost_payments_tx_id` ON `(tx_id)` UNIQUE — fraud prevention: no TX ID reuse

**Constraints:**
- `CHECK (amount_bdt > 0)`
- `CHECK (status IN ('pending_verification', 'approved', 'rejected'))`
- `UNIQUE(tx_id)` — globally unique across boost_payments AND orders (enforced via trigger or application layer since cross-table unique constraints aren't native in Postgres)

#### 7.5.2 `boost_history` Table (Analytics & Audit)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| product_id | UUID FK → products.id | Boosted product |
| boost_tier_id | UUID FK → boost_tiers.id | Which tier was used |
| boost_payment_id | UUID FK → boost_payments.id | Link to payment record |
| activated_at | TIMESTAMP | When boost became active |
| expires_at | TIMESTAMP | When boost will expire |
| actual_expired_at | TIMESTAMP NULL | When boost actually expired (may differ from expires_at if product was sold/suspended early) |
| impressions_count | INTEGER DEFAULT 0 | How many times the boosted product appeared in search/feed (incremented by view tracking) |
| clicks_count | INTEGER DEFAULT 0 | How many times users tapped to view the boosted product detail |
| orders_during_boost | INTEGER DEFAULT 0 | Orders placed for this product during the boost period |
| revenue_during_boost | DECIMAL(12,2) DEFAULT 0 | Total order value during the boost period |

**Purpose:** This table allows the platform to show farmers ROI data for their boost investments and helps the admin team optimize tier pricing.

**Farmer Boost Analytics UI (accessible from product detail):**

```
┌─────────────────────────────────────────┐
│  বুস্ট পরিসংখ্যান — পাকা আম               │
│─────────────────────────────────────────│
│                                         │
│  সর্বশেষ বুস্ট: স্ট্যান্ডার্ড (৩ দিন)        │
│  সময়কাল: ১৫ জুলাই — ১৮ জুলাই             │
│                                         │
│  📊 পরিসংখ্যান:                            │
│  ┌────────────┬────────────────────┐    │
│  │ 👁️ দর্শন    │ ১,২৩৪ বার            │    │
│  ├────────────┼────────────────────┤    │
│  │ 👆 ক্লিক    │ ৮৯ বার               │    │
│  ├────────────┼────────────────────┤    │
│  │ 📦 অর্ডার   │ ৩ টি                 │    │
│  ├────────────┼────────────────────┤    │
│  │ 💰 বিক্রয়   │ ৳১৮,০০০             │    │
│  └────────────┴────────────────────┘    │
│                                         │
│  💡 টিপ: প্রতি ৳১ বুস্ট খরচে আপনি         │
│  ৳১৫০ বিক্রয় করেছেন!                     │
│                                         │
│       [🔥 আবার বুস্ট করুন]                │
│                                         │
└─────────────────────────────────────────┘
```

### 7.6 Boost Expiry — Automated Management

**pg_cron Job: `expire_boosts` (runs every 5 minutes)**

```sql
-- Deactivate expired boosts
WITH expired_boosts AS (
    UPDATE products
    SET is_boosted = false,
        boost_expiry = NULL,
        updated_at = NOW()
    WHERE is_boosted = true
      AND boost_expiry IS NOT NULL
      AND boost_expiry < NOW()
    RETURNING id, farmer_id
)
-- Record actual expiry time in boost_history
UPDATE boost_history bh
SET actual_expired_at = NOW()
FROM expired_boosts eb
WHERE bh.product_id = eb.id
  AND bh.actual_expired_at IS NULL
  AND bh.expires_at <= NOW();

-- Notify farmers of expired boosts
INSERT INTO notification_queue (user_id, title, body, type, reference_id, created_at)
SELECT eb.farmer_id,
    'বুস্ট মেয়াদ শেষ',
    'আপনার পণ্যের বুস্ট মেয়াদ শেষ হয়েছে। পুনরায় বুস্ট করতে চাইলে ট্যাপ করুন।',
    'boost_expired',
    eb.id,
    NOW()
FROM expired_boosts eb;
```

### 7.7 Platform Payment Accounts — Admin Configuration

The platform's bKash, Nagad, and bank account details (where farmers send boost payments) are stored in an admin-configurable settings table, NOT hardcoded.

**`platform_settings` Table (key-value store for platform configuration):**

| Key | Value (Example) | Description |
|-----|----------------|-------------|
| `platform_bkash_number` | `01XXXXXXXXX` | Platform's bKash number for receiving payments |
| `platform_nagad_number` | `01XXXXXXXXX` | Platform's Nagad number |
| `platform_bank_name` | `ব্র্যাক ব্যাংক` | Bank name for transfers |
| `platform_bank_account` | `1234567890123` | Bank account number |
| `platform_bank_routing` | `060261234` | Bank routing number |
| `platform_bank_branch` | `গুলশান শাখা, ঢাকা` | Branch name |
| `boost_payment_sla_hours` | `24` | SLA for boost payment verification |
| `order_payment_sla_hours` | `48` | SLA for order payment verification |

This allows admins to update payment account details without code changes — essential when the platform switches banks or changes bKash numbers.

---

## 8. Payments & Financials — Manual Verification System

### 8.1 Design Philosophy — Why No Payment Gateway

HaatBazar deliberately operates **without an automated payment gateway** (no bKash API, no Nagad API, no Stripe, no SSLCommerz) for the following reasons:

| Reason | Explanation |
|--------|-------------|
| **Regulatory Complexity** | Automated payment processing in Bangladesh requires Payment Service Provider (PSP) licensing, PCI DSS compliance, and regulatory approvals that are expensive and time-consuming for a startup. |
| **Target User Familiarity** | Bangladeshi farmers and small-scale buyers are highly familiar with manual bKash/Nagad "Send Money" flows. They already use these for daily transactions. |
| **Trust Model** | In rural Bangladesh, seeing a "Send Money" confirmation screenshot is a well-understood trust mechanism. Users trust this more than an abstract "payment processed" message from an unknown system. |
| **Cost** | Payment gateway integration has per-transaction fees (typically 1.5-2.5%), which would undermine the zero-commission promise. Manual verification has zero marginal cost per transaction. |
| **MVP Speed** | Manual payment allows faster time-to-market. Gateway integration can be added in Phase 2 once transaction volume justifies the investment. |

**Trade-off:** The manual verification model requires **admin human resources** proportional to transaction volume. The admin panel must be highly efficient (Section 13) to minimize verification time per transaction.

### 8.2 Payment Types in the System

HaatBazar handles **three distinct payment flows**, all using the same manual verification pattern:

| Payment Type | Payer | Payee | When | State Trigger |
|-------------|-------|-------|------|--------------|
| **Product Payment** | Buyer | Farmer | After order creation | `pending_payment` → `payment_proof_uploaded` |
| **Transport Payment** | Buyer | Transporter | After transport assigned | `transport_assigned` → `transport_payment_uploaded` |
| **Boost Payment** | Farmer | Platform | When boosting a product | `pending_verification` → `approved` |

**Important:** Product payments and transport payments go **directly between users** (peer-to-peer). The platform does NOT receive or hold these funds. The platform only facilitates verification. Only boost payments go to the platform's account.

### 8.3 Manual Payment Verification — Unified Flow

All three payment types follow the same verification pattern:

```
[Payer] ──────────────────────────── [Payee]
    │                                    ▲
    │ 1. Views payee's bKash/Bank        │
    │    details in app                  │
    │                                    │
    │ 2. Opens bKash/Nagad/Bank app      │
    │    on same phone (or separate      │
    │    phone)                          │
    │                                    │
    │ 3. Sends money to payee's          │
    │    displayed number/account ───────┘
    │
    │ 4. Takes screenshot of
    │    confirmation screen
    │
    │ 5. Returns to HaatBazar app
    │
    │ 6. Uploads screenshot +
    │    enters TX ID
    │
    │ 7. Submits proof
    │          │
    │          ▼
    │    [HaatBazar Backend]
    │          │
    │          │ 8. TX ID uniqueness check
    │          │    (across all payment tables)
    │          │
    │          │ 9. Store proof in storage
    │          │
    │          │ 10. Insert payment record
    │          │     status = 'pending_verification'
    │          │
    │          │ 11. Notify admin
    │          │
    │          ▼
    │    [Admin Dashboard]
    │          │
    │          │ 12. Admin reviews:
    │          │     • Screenshot shows correct amount
    │          │     • Screenshot shows correct recipient
    │          │     • TX ID matches screenshot
    │          │     • TX ID not reused
    │          │     • Payment date is recent
    │          │
    │          ├── [Approve] → Update status → Advance order state
    │          │                              → Notify all parties
    │          │
    │          └── [Reject] → Update status with reason
    │                        → Notify payer to re-upload
    │
    └── 13. Payer receives notification of verification result
```

### 8.4 Product Payment — Buyer Pays Farmer

#### 8.4.1 Displaying Farmer's Payment Details

When the order enters `pending_payment`, the Buyer sees the Farmer's payment details:

**Screen: "পণ্যের পেমেন্ট করুন" (Pay for Product)**

```
┌─────────────────────────────────────────┐
│  ← পণ্যের পেমেন্ট করুন                    │
│  অর্ডার: #HB-260715-0042                │
│─────────────────────────────────────────│
│                                         │
│  📦 পণ্য: পাকা আম — হিমসাগর জাত          │
│  📏 পরিমাণ: ৫০ কেজি                      │
│  💰 মোট: ৳৬,০০০                          │
│                                         │
│  ─────────────────────────────────      │
│  বিক্রেতার পেমেন্ট তথ্য:                    │
│  ─────────────────────────────────      │
│                                         │
│  👤 বিক্রেতা: {farmer_display_name}       │
│     {✅ যাচাইকৃত if nid_verified}         │
│                                         │
│  📱 বিকাশ: ০১XXXXXXXXX                  │
│           [📋 কপি করুন]                  │
│                                         │
│  🏦 ব্যাংক: {farmer_bank_name}            │
│     হিসাব: {farmer_bank_account}         │
│     রাউটিং: {farmer_bank_routing}        │
│           [📋 কপি করুন]                  │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  ⚠️ গুরুত্বপূর্ণ নির্দেশনা:                  │
│  • বিকাশ বা ব্যাংক ট্রান্সফারের মাধ্যমে     │
│    ঠিক ৳৬,০০০ পাঠান                     │
│  • পেমেন্টের স্ক্রিনশট নিন                 │
│  • লেনদেন আইডি (TxID) নোট করুন         │
│  • ২৪ ঘণ্টার মধ্যে পেমেন্ট করুন           │
│                                         │
│  ⏰ সময় বাকি: ২৩ ঘণ্টা ১৫ মিনিট         │
│                                         │
│  ─────────────────────────────────      │
│  পেমেন্ট প্রমাণ আপলোড করুন:               │
│  ─────────────────────────────────      │
│                                         │
│  পেমেন্ট মাধ্যম *                        │
│  [বিকাশ] [নগদ] [ব্যাংক] [নগদ অর্থ]       │
│                                         │
│  লেনদেন আইডি *                          │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📸 স্ক্রিনশট আপলোড *                    │
│  ┌─────────────────────────────────┐    │
│  │   [📷 ছবি তুলুন / গ্যালারি]      │    │
│  └─────────────────────────────────┘    │
│                                         │
│       [📤 পেমেন্ট প্রমাণ জমা দিন]         │
│                                         │
│  ─────────────────────────────────      │
│  [অর্ডার বাতিল করুন]                     │
│  ℹ️ ০% কমিশন — পুরো টাকা বিক্রেতা পাবেন  │
│                                         │
└─────────────────────────────────────────┘
```

**Privacy Consideration:** The Buyer can see the Farmer's bKash number and bank account ONLY for the specific order they placed. This data is fetched on-demand from the order detail screen and is NOT cached locally. When the order is completed or cancelled, the payment details are no longer accessible to the Buyer.

#### 8.4.2 Payment Proof Submission Processing

```
[Buyer taps "পেমেন্ট প্রমাণ জমা দিন"]
        │
        ▼
[Client-side validation]
    • Payment method selected? ✅
    • TX ID not empty? (min 4 chars, max 100 chars) ✅
    • Screenshot uploaded? (image file present) ✅
    • TX ID format check per payment method:
        - bKash: alphanumeric, 10+ chars
        - Nagad: alphanumeric, 8+ chars
        - Bank: alphanumeric, varies
        - Cash: "CASH-" prefix auto-added (for in-person payments)
        │
        ▼
[OTP Verification (sensitive action)]
    → Phone OTP sent and verified (see Section 3.2.3)
        │
        ▼
[Edge Function: POST /functions/v1/submit-payment-proof]

    Step 1: Validate session → extract buyer_id
    Step 2: Verify order exists and belongs to buyer
    Step 3: Verify order is in 'pending_payment' or 'payment_rejected' state

    Step 4: TX ID FRAUD CHECK — Cross-table uniqueness
        SELECT COUNT(*) FROM (
            SELECT tx_id FROM orders
            WHERE product_payment_tx_id = :tx_id
               OR transport_payment_tx_id = :tx_id
            UNION ALL
            SELECT tx_id FROM boost_payments
            WHERE tx_id = :tx_id
        ) AS all_tx_ids;

        IF count > 0:
            → Set buyer fraud_flag = true
            → Insert fraud_alert
            → Return 409: "এই লেনদেন আইডি আগে ব্যবহার করা হয়েছে। একটি নতুন লেনদেন করুন।"

    Step 5: Upload screenshot to Supabase Storage
        Bucket: payment-proofs/{order_id}/product_payment.jpg
        (Private bucket — only admin and the payer can access)

    Step 6: Update order
        UPDATE orders
        SET product_payment_proof_url = :proof_url,
            product_payment_tx_id = :tx_id,
            product_payment_method = :method,
            current_state = 'payment_proof_uploaded',
            updated_at = NOW()
        WHERE id = :order_id;

    Step 7: Record state transition in order_status_history

    Step 8: Notify admin
        Insert into notification_queue for all admin users with 'payment_verifier' role
        Push notification: "পেমেন্ট যাচাই প্রয়োজন — অর্ডার #{order_number}, ৳{amount}"

    Step 9: Notify farmer
        "ক্রেতা পেমেন্ট প্রমাণ জমা দিয়েছেন। অ্যাডমিন যাচাই করছে।"

    Step 10: Return success to client
        → Client shows: "পেমেন্ট প্রমাণ জমা হয়েছে! অ্যাডমিন যাচাই করবে।"
        → Client navigates to order tracking screen with real-time state subscription
```

### 8.5 Transport Payment — Buyer Pays Transporter

The transport payment flow is nearly identical to the product payment flow but occurs after `transport_assigned`.

**Key Differences from Product Payment:**
- The payee is the **Transporter** (not the Farmer).
- The Buyer sees the Transporter's bKash/Bank details.
- The amount is the `transport_price_bdt` (not product total).
- State transition: `transport_assigned` → `transport_payment_uploaded`.
- Separate fields in orders table: `transport_payment_proof_url`, `transport_payment_tx_id`, `transport_payment_method`.

**`transport_payments` Tracking Table:**

While transport payment data is stored directly on the `orders` table (transport_payment_* fields), a separate tracking table provides audit and analytics:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| order_id | UUID FK → orders.id | Parent order |
| buyer_id | UUID FK → users.id | Payer |
| transporter_id | UUID FK → users.id | Payee |
| amount_bdt | DECIMAL(12,2) | Transport price |
| payment_method | VARCHAR(20) | Same enum as product payments |
| tx_id | VARCHAR(100) | Transaction ID |
| proof_url | TEXT | Screenshot URL |
| status | VARCHAR(30) | `pending_payment`, `proof_uploaded`, `verified`, `rejected` |
| verified_by | UUID FK → admin_users.id NULL | Verifying admin |
| verified_at | TIMESTAMP NULL | Verification time |
| rejection_reason | TEXT NULL | If rejected |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

**Index:** `UNIQUE(tx_id)` — same fraud prevention as product payments.

**Transport Payment Screen: "পরিবহন পেমেন্ট করুন" (Pay for Transport)**

Same UI pattern as product payment (Section 8.4.1) but showing:
- Transporter's name, bKash, and bank details
- Transport price
- Order reference with product and route summary

### 8.6 Cash Payment Option

For in-person transactions (common in rural areas where both buyer and farmer are in the same market):

| Field | Bengali Label | Behavior |
|-------|-------------|----------|
| Payment Method = "নগদ অর্থ" | নগদ অর্থ (Cash) | Buyer selects "Cash" as payment method |
| TX ID | — | Auto-generated: `CASH-{order_id_first8}-{timestamp}` |
| Screenshot | — | Buyer takes a photo of cash handover or a signed receipt |
| Admin Verification | — | Admin must call BOTH buyer and farmer to confirm cash exchange before approving |

**Cash Payment Rules:**
- Cash is only available for product payments (not transport, not boost).
- Cash is only suggested when buyer and farmer are in the **same district** (detected from location_ids).
- Cash payments have a **lower verification SLA** (admin may need to call both parties — 48 hours instead of 24 hours).
- Cash orders skip the transport flow if buyer opts to self-transport ("নিজে নিয়ে যাব" option).

### 8.7 Admin Payment Verification — Dashboard Specification

The admin verification queue is the **most critical operational workflow** in the system. It must be highly efficient to prevent bottlenecks.

#### 8.7.1 Verification Queue View

```
┌────────────────────────────────────────────────────────────────────┐
│  পেমেন্ট যাচাই ড্যাশবোর্ড                          [রিফ্রেশ] [ফিল্টার] │
│────────────────────────────────────────────────────────────────────│
│                                                                    │
│  সারসংক্ষেপ:                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ 📋 মোট    │ │ ⏰ জরুরি  │ │ ✅ আজকের  │ │ ❌ প্রত্যা. │              │
│  │ ১২ টি     │ │ ৩ টি     │ │ যাচাই: ৮  │ │ খ্যাত: ২   │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                    │
│  ── পেমেন্ট সারি (জরুরিত্ব অনুযায়ী সাজানো) ──                     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ⏰ ৪৭ ঘণ্টা আগে | 🔴 জরুরি                                  │ │
│  │ অর্ডার: #HB-260714-0038 | পণ্য পেমেন্ট                       │ │
│  │ ক্রেতা: {buyer_name} → কৃষক: {farmer_name}                   │ │
│  │ পরিমাণ: ৳১২,০০০ | মাধ্যম: বিকাশ | TxID: 9A3F8B2C1D         │ │
│  │                                                              │ │
│  │ [📷 স্ক্রিনশট দেখুন]  [✅ অনুমোদন]  [❌ প্রত্যাখ্যান]          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ⏰ ৫ ঘণ্টা আগে | 🟡 সাধারণ                                   │ │
│  │ অর্ডার: #HB-260715-0042 | পণ্য পেমেন্ট                       │ │
│  │ ক্রেতা: {buyer_name} → কৃষক: {farmer_name}                   │ │
│  │ পরিমাণ: ৳৬,০০০ | মাধ্যম: ব্যাংক | TxID: BK20260715001      │ │
│  │                                                              │ │
│  │ [📷 স্ক্রিনশট দেখুন]  [✅ অনুমোদন]  [❌ প্রত্যাখ্যান]          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ⏰ ২ ঘণ্টা আগে | 🟢 নতুন                                     │ │
│  │ বুস্ট পেমেন্ট                                                 │ │
│  │ কৃষক: {farmer_name} | পণ্য: {product_title}                  │ │
│  │ পরিমাণ: ৳১২০ | স্ট্যান্ডার্ড বুস্ট | মাধ্যম: বিকাশ             │ │
│  │                                                              │ │
│  │ [📷 স্ক্রিনশট দেখুন]  [✅ অনুমোদন]  [❌ প্রত্যাখ্যান]          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### 8.7.2 Admin Verification Checklist (per payment)

When an admin clicks "স্ক্রিনশট দেখুন" (View Screenshot), they see the full verification screen:

```
┌────────────────────────────────────────────────────────────────────┐
│  পেমেন্ট যাচাই — অর্ডার #HB-260715-0042                           │
│────────────────────────────────────────────────────────────────────│
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐   │
│  │                  │  │ অর্ডার তথ্য:                          │   │
│  │                  │  │ • ক্রেতা: {name} (ID: xxx)            │   │
│  │  [Screenshot     │  │ • কৃষক: {name} (ID: xxx)             │   │
│  │   Image —        │  │ • পণ্য: {title}                       │   │
│  │   Zoomable]      │  │ • পরিমাণ: ৫০ কেজি × ৳১২০            │   │
│  │                  │  │ • মোট: ৳৬,০০০                        │   │
│  │                  │  │                                      │   │
│  │                  │  │ পেমেন্ট তথ্য:                         │   │
│  │                  │  │ • মাধ্যম: ব্যাংক                       │   │
│  │                  │  │ • TxID: BK20260715001                │   │
│  │                  │  │ • জমা: ১৫ জুলাই ০৭:৩০ PM            │   │
│  └──────────────────┘  │                                      │   │
│                        │ প্রাপকের তথ্য (কৃষকের):               │   │
│                        │ • বিকাশ: ০১XXXXXXXXX                 │   │
│                        │ • ব্যাংক: {bank} {account}            │   │
│                        └──────────────────────────────────────┘   │
│                                                                    │
│  ─────────────────────────────────────────────────────────────    │
│  যাচাই চেকলিস্ট:                                                 │
│  ─────────────────────────────────────────────────────────────    │
│                                                                    │
│  ☐ স্ক্রিনশটে পরিমাণ সঠিক (৳৬,০০০ ± ৫%)                         │
│  ☐ স্ক্রিনশটে প্রাপকের নম্বর/হিসাব সঠিক                          │
│  ☐ লেনদেন আইডি স্ক্রিনশটের সাথে মিলে                            │
│  ☐ লেনদেন আইডি আগে ব্যবহার হয়নি                                │
│  ☐ পেমেন্টের তারিখ সাম্প্রতিক (৪৮ ঘণ্টার মধ্যে)                   │
│  ☐ ক্রেতার অ্যাকাউন্টে কোনো জালিয়াতি ফ্ল্যাগ নেই                 │
│                                                                    │
│  ─────────────────────────────────────────────────────────────    │
│                                                                    │
│  প্রত্যাখ্যানের কারণ (যদি প্রত্যাখ্যান করেন):                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  অ্যাডমিন নোট (অভ্যন্তরীণ — ব্যবহারকারী দেখবেন না):              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│       [✅ অনুমোদন করুন]        [❌ প্রত্যাখ্যান করুন]               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### 8.7.3 Admin Verification Business Rules

| Check | Rule | On Failure |
|-------|------|-----------|
| **Amount Match** | Screenshot amount must be within ±5% of order total (to account for bKash fees that buyer may have deducted or added) | Reject with reason: "স্ক্রিনশটের পরিমাণ অর্ডারের সাথে মেলেনি।" |
| **Recipient Match** | Screenshot must show payment to the correct bKash number or bank account (as displayed to buyer) | Reject: "পেমেন্ট ভুল নম্বরে পাঠানো হয়েছে।" |
| **TX ID Match** | TX ID entered by buyer must appear in the screenshot | Reject: "লেনদেন আইডি স্ক্রিনশটের সাথে মেলেনি।" |
| **TX ID Uniqueness** | TX ID must not exist in any other payment record (cross-checked across orders + boost_payments) | Reject + Flag fraud: "এই লেনদেন আইডি আগে ব্যবহৃত হয়েছে।" |
| **Recency** | Payment date in screenshot must be within 48 hours of proof upload time | Reject: "পেমেন্ট খুব পুরনো। নতুন পেমেন্ট করুন।" |
| **Fraud Flag** | Check if buyer's account has fraud_flag = true | Admin sees warning but can still approve (fraud flag is advisory, not blocking for admin) |
| **Screenshot Quality** | Screenshot must be readable (not blurry, not cropped to hide info) | Reject: "স্ক্রিনশট পড়া যাচ্ছে না। পরিষ্কার স্ক্রিনশট আপলোড করুন।" |

#### 8.7.4 Admin Action Audit

Every admin verification action is logged in the `audit_log` table:

```sql
INSERT INTO audit_log (
    admin_user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    created_at
) VALUES (
    :admin_id,
    'payment_verified',  -- or 'payment_rejected'
    'order',             -- or 'boost_payment'
    :order_id,           -- or :boost_payment_id
    jsonb_build_object(
        'payment_type', 'product',  -- or 'transport', 'boost'
        'amount', :amount,
        'tx_id', :tx_id,
        'decision', 'approved',  -- or 'rejected'
        'rejection_reason', :reason,  -- null if approved
        'checklist_completed', true,
        'admin_notes', :notes
    ),
    NOW()
);
```

### 8.8 Refund Process (Manual)

Since there is no payment gateway, refunds must also be handled manually. The system tracks refund obligations but cannot execute them.

#### 8.8.1 When Refunds Occur

| Trigger | Refund From | Refund To | Amount |
|---------|------------|-----------|--------|
| Order cancelled after product payment verified (e.g., transport timeout) | Farmer | Buyer | Full product_total_bdt |
| Dispute resolved in buyer's favor (product quality issue) | Farmer | Buyer | Full or partial (admin decides) |
| Dispute resolved in buyer's favor (transport damage) | Transporter | Buyer | Full or partial transport_price_bdt |
| Transport cancelled by transporter after transport payment verified | Transporter | Buyer | Full transport_price_bdt |
| Admin error (wrongly verified a fraudulent payment) | Platform responsibility | Affected party | Admin decides |

#### 8.8.2 `refund_notes` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| order_id | UUID FK → orders.id | Related order |
| from_user_id | UUID FK → users.id | Who should pay the refund |
| to_user_id | UUID FK → users.id | Who should receive the refund |
| amount_bdt | DECIMAL(12,2) | Refund amount |
| reason | TEXT | Bengali reason for refund |
| created_by_admin_id | UUID FK → admin_users.id | Admin who created the refund note |
| status | VARCHAR(20) | `pending`, `refund_confirmed`, `waived`, `disputed` |
| refund_proof_url | TEXT NULL | Screenshot of refund transaction (uploaded by the user who paid the refund) |
| refund_tx_id | VARCHAR(100) NULL | Refund transaction ID |
| confirmed_by_admin_id | UUID FK → admin_users.id NULL | Admin who confirmed the refund was completed |
| confirmed_at | TIMESTAMP NULL | When refund was confirmed |
| created_at | TIMESTAMP | When refund note was created |
| updated_at | TIMESTAMP | Last update |

**Refund Process:**

```
[Admin creates refund note]
        │
        ▼
[System notifies the party who must issue the refund]
    "আপনাকে ৳{amount} ফেরত দিতে হবে। অর্ডার: #{order_number}
     প্রাপক: {recipient_name}
     কারণ: {reason}
     অনুগ্রহ করে দ্রুত ফেরত দিন এবং প্রমাণ আপলোড করুন।"
        │
        ▼
[Refunding party sends money (same manual bKash/Bank flow)]
        │
        ▼
[Refunding party uploads proof in app — refund_proof_url + refund_tx_id]
        │
        ▼
[Admin verifies refund was completed]
    UPDATE refund_notes SET status = 'refund_confirmed', confirmed_by_admin_id = ..., confirmed_at = NOW()
        │
        ▼
[Recipient notified: "আপনার ৳{amount} ফেরত পাওয়া গেছে।"]

[If refunding party does not comply within 72 hours:]
    → Admin escalation
    → Warning sent to refunding party
    → After 7 days: potential account suspension
    → Platform may use internal wallet credit as temporary resolution
```

### 8.9 Internal Wallet — Admin-Managed Credits

The internal wallet is a **simple ledger** for admin-managed credits. It is NOT a payment method and NOT accessible to users for making payments. It exists solely for:

1. **Dispute refund credits** — When admin resolves a dispute with a refund, but the responsible party hasn't paid yet, admin can issue a wallet credit to the victim as a temporary measure.
2. **Goodwill credits** — For platform errors, delays, or compensation.
3. **Boost credits** — Admin can grant free boost credits to farmers (promotional campaigns).

**`wallet_transactions` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| user_id | UUID FK → users.id | Wallet owner |
| transaction_type | VARCHAR(20) | `credit`, `debit` |
| amount_bdt | DECIMAL(12,2) | Amount |
| balance_after | DECIMAL(12,2) | Running balance after this transaction |
| reason | TEXT | Bengali description of why this credit/debit was issued |
| reference_type | VARCHAR(30) NULL | `dispute`, `refund_note`, `boost_promo`, `admin_adjustment` |
| reference_id | UUID NULL | FK to the related record |
| created_by_admin_id | UUID FK → admin_users.id | Admin who authorized this transaction |
| created_at | TIMESTAMP | Transaction timestamp |

**Wallet Balance Calculation:**
```sql
-- Current balance for a user
SELECT COALESCE(
    (SELECT balance_after FROM wallet_transactions WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1),
    0
) AS current_balance;
```

**Wallet Credits Usage:**
- If a Farmer has wallet credits >= boost tier price → they can use credits instead of manual payment for boosting (auto-approved, no admin verification needed).
- Wallet credits **cannot** be cashed out (no withdrawal feature).
- Wallet credits have a **90-day expiry** from the date of issuance. Expired credits are voided by pg_cron job.

### 8.10 Financial Reporting — Admin Analytics

The admin panel includes financial analytics dashboards:

| Metric | Query Description | Display |
|--------|------------------|---------|
| **Daily Revenue** | SUM of approved boost payments grouped by date | Line chart (last 30 days) |
| **Pending Verifications** | COUNT of payments in pending_verification state | Real-time counter with SLA color coding (green < 12h, yellow < 24h, red > 24h) |
| **Verification Throughput** | COUNT of verifications per admin per day | Bar chart per admin (performance tracking) |
| **Average Verification Time** | AVG time between proof upload and admin action | Metric card with trend arrow |
| **Fraud Detection Rate** | COUNT of rejected payments with fraud flags / total payments | Percentage metric |
| **Refund Obligations** | SUM of pending refund_notes | Alert counter with total BDT outstanding |
| **Transaction Volume** | SUM of all verified payment amounts by type (product, transport, boost) | Stacked bar chart per week |
| **Revenue per Boost Tier** | SUM of approved boost payments grouped by tier | Pie chart |
| **Cancellation Rate** | COUNT of cancelled orders / total orders by week | Trend line |
| **Cash vs Digital** | Breakdown of payment methods across all verified payments | Donut chart |

### 8.11 Payment-Related Bengali Error Messages

| Error Code | Bengali Message | Trigger |
|-----------|----------------|---------|
| `PAYMENT_TX_DUPLICATE` | এই লেনদেন আইডি আগে ব্যবহার করা হয়েছে। একটি নতুন লেনদেন করুন। | TX ID found in existing records |
| `PAYMENT_PROOF_MISSING` | পেমেন্ট স্ক্রিনশট আপলোড করুন। | Screenshot not provided |
| `PAYMENT_TX_ID_MISSING` | লেনদেন আইডি লিখুন। | TX ID field empty |
| `PAYMENT_TX_ID_TOO_SHORT` | লেনদেন আইডি কমপক্ষে ৪ অক্ষরের হতে হবে। | TX ID < 4 chars |
| `PAYMENT_METHOD_REQUIRED` | পেমেন্ট মাধ্যম নির্বাচন করুন। | No payment method selected |
| `PAYMENT_ORDER_WRONG_STATE` | এই অর্ডারের জন্য এখন পেমেন্ট প্রমাণ জমা দেওয়া যায় না। | Order not in expected state |
| `PAYMENT_ORDER_NOT_FOUND` | অর্ডার পাওয়া যায়নি। | Invalid order ID |
| `PAYMENT_UNAUTHORIZED` | আপনি এই অর্ডারের পেমেন্ট প্রমাণ জমা দিতে পারবেন না। | User is not the order's buyer |
| `PAYMENT_TIMEOUT` | পেমেন্টের সময়সীমা শেষ হয়ে গেছে। অর্ডার বাতিল হয়েছে। | 24h timeout exceeded |
| `PAYMENT_PROOF_TOO_LARGE` | ছবির আকার ৫MB এর বেশি হতে পারবে না। দয়া করে ছোট ছবি আপলোড করুন। | Image > 5MB |
| `PAYMENT_REJECTED_AMOUNT` | স্ক্রিনশটের পরিমাণ অর্ডারের সাথে মেলেনি। সঠিক পরিমাণ পাঠান এবং আবার আপলোড করুন। | Admin rejection: amount mismatch |
| `PAYMENT_REJECTED_RECIPIENT` | পেমেন্ট ভুল নম্বরে পাঠানো হয়েছে। সঠিক নম্বরে পাঠান। | Admin rejection: wrong recipient |
| `PAYMENT_REJECTED_UNCLEAR` | স্ক্রিনশট পড়া যাচ্ছে না। পরিষ্কার স্ক্রিনশট আপলোড করুন। | Admin rejection: unreadable |
| `BOOST_PRODUCT_NOT_ACTIVE` | এই পণ্য বুস্ট করা যায় না। পণ্যটি সক্রিয় থাকতে হবে। | Product not in 'active' state |
| `BOOST_ALREADY_PROCESSING` | এই পণ্যের জন্য একটি বুস্ট পেমেন্ট যাচাইয়ের অপেক্ষায় আছে। | Existing pending boost payment |

### 8.12 Automated Payment Verification Intelligence

To reduce the manual admin bottleneck, an automated intelligence layer runs **before** the proof reaches the admin queue. This layer routes payments to one of three tracks based on risk score, enabling up to 40% straight-through processing without any human review.

#### 8.12.1 On-Device OCR Pre-Verification (Google ML Kit Text Recognition)

OCR runs **on the device, before upload**. When a buyer attaches a bKash/Nagad/bank screenshot, the SvelteKit app runs **Google ML Kit Text Recognition** through `@capacitor-mlkit/text-recognition` (Latin-script recognizer — bKash/Nagad amounts and TrxIDs are Latin digits/letters) and extracts the structured fields **locally**, before the image is uploaded to Supabase Storage. This eliminates the per-upload cloud OCR call (extraction cost → $0) and shows the extracted fields in the UI instantly, without a network round-trip.

```
[Buyer selects / captures the bKash / Nagad screenshot]
        │
        ▼
[SvelteKit App → @capacitor-mlkit/text-recognition  (on-device, works offline)]
    → Extract locally:
        • Detected amount (e.g., "৳৬,০০০" digits → 6000)
        • Recipient number / account (last 4 digits matched)
        • Transaction ID string (TrxID pattern)
        • Timestamp on screenshot
    → Compute client ocr_confidence: 0.0–1.0 based on text clarity
    → UI pre-fills the TX ID + amount fields instantly (user confirms / corrects)
        │
        ▼
[POST /functions/v1/submit-payment-proof]
    → Screenshot + client payload:
      { client_ocr: { amount, tx_id, recipient_last4, ocr_confidence } }
    → Screenshot uploaded to Supabase Storage
        │
        ▼
[Edge Function: POST /functions/v1/ocr-verify-payment  (server-side comparison — unchanged)]
    → Compare against order record:
        • amount_match: |detected_amount - expected_amount| / expected_amount ≤ 0.02 (±2%)
        • recipient_match: extracted text contains last 4 digits of payee's bKash/bank
        • txid_match: extracted TX ID string contains submitted tx_id substring
        • recency_check: screenshot timestamp ≤ 48h ago
    → ocr_source = 'client_mlkit'
    → Store results in payment_ocr_results table
```

**Trust Model:** client-extracted OCR is advisory pre-fill and is **never** trusted on its own for auto-approval — the Edge Function re-validates every extracted field against the order record server-side (Section 8.12.2 risk scoring is unchanged). A **server-side OCR re-check** runs only when `ocr_confidence < 0.5` or the expected amount exceeds ৳20,000 (high-value defense); all other uploads never touch cloud OCR. Auto-approval rules (risk score 0.0) are unchanged.

**`payment_ocr_results` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| order_id | UUID FK | Related order or boost_payment |
| payment_type | VARCHAR(20) | `product`, `transport`, `boost` |
| detected_amount | DECIMAL(12,2) | Amount extracted from screenshot |
| amount_match | BOOLEAN | Within ±2% of expected amount |
| recipient_match | BOOLEAN | Recipient digits found in screenshot |
| txid_match | BOOLEAN | TX ID string found in screenshot |
| recency_ok | BOOLEAN | Screenshot timestamp ≤ 48h |
| ocr_confidence | DECIMAL(3,2) | OCR text clarity score (0–1) |
| ocr_source | VARCHAR(20) | `client_mlkit` (on-device ML Kit — V4.0 default) or `server_vision` (server re-check) |
| raw_ocr_text | TEXT | Full OCR output for admin reference |
| processed_at | TIMESTAMP | When OCR ran |

#### 8.12.2 Risk Scoring & Intelligent Queue Routing

After OCR, a risk score is computed and the payment is routed to one of three tracks:

```
[OCR results computed]
        │
        ▼
[Risk Score Calculation]

    score = 0.0  (start clean)

    + 0.3  if amount_match = FALSE          (amount mismatch — major red flag)
    + 0.2  if recipient_match = FALSE       (wrong recipient)
    + 0.2  if txid_match = FALSE            (TX ID not visible in screenshot)
    + 0.1  if recency_ok = FALSE            (screenshot too old)
    + 0.1  if ocr_confidence < 0.5          (blurry / unreadable screenshot)
    + 0.1  if user.fraud_flag = TRUE        (flagged account)
    + 0.2  if velocity_flag = TRUE          (see 8.12.3)
    + 0.3  if amount > 50000               (large payment — dual-admin required)

        │
        ├── score = 0.0  (ALL checks pass, OCR high confidence)
        │       → AUTO-APPROVE
        │       → UPDATE payment status = 'verified' (no admin action)
        │       → Advance order state immediately
        │       → Notify all parties
        │       → Log: auto_approved = true in audit_log
        │
        ├── score 0.1–0.6
        │       → STANDARD ADMIN QUEUE
        │       → Admin sees OCR pre-fill: amount ✅, recipient ✅, TX ID ✅
        │       → One-tap confirm UI — target: 30 seconds per case
        │       → SLA: 4 hours
        │
        └── score > 0.6  OR  amount > ৳50,000
                → HIGH-RISK / DUAL-ADMIN QUEUE
                → Requires TWO separate admin approvals
                → First admin reviews and marks "প্রথম যাচাই সম্পন্ন"
                → Second admin (senior role) gives final approval
                → SLA: 24 hours
```

#### 8.12.3 Velocity & Pattern Detection

The Edge Function `fraud-velocity-check` runs on every proof submission and sets `velocity_flag`:

| Pattern | Threshold | Action |
|---------|-----------|--------|
| Multiple proofs from same user | > 3 submissions within 1 hour | Flag + route to high-risk queue |
| Unusual amount (suspiciously round) | Amount is exact multiple of ৳1,000 AND first-time large payment | Flag + route to standard queue with note |
| First large payment | User's first payment AND amount > ৳20,000 | Route to standard queue with note: "প্রথমবার বড় পেমেন্ট" |
| TX ID reuse attempt | TX ID found in any other payment record | Immediate rejection + fraud flag on user |
| Rapid TX ID cycling | Same user submits > 2 different TX IDs for same order within 30 min | Flag account for review |

#### 8.12.4 Admin One-Tap Verification UI (OCR-Assisted)

When OCR data is available, the admin verification screen pre-populates the checklist:

```
┌────────────────────────────────────────────────────────────┐
│  পেমেন্ট যাচাই — অর্ডার #HB-260715-0042    [🤖 OCR সহায়]  │
│────────────────────────────────────────────────────────────│
│                                                            │
│  ┌──────────────────┐  OCR ফলাফল:                         │
│  │                  │  ✅ পরিমাণ: ৳৬,০০০ (মিলেছে)          │
│  │  [Screenshot]    │  ✅ প্রাপক: ...XXXX (মিলেছে)          │
│  │                  │  ✅ লেনদেন আইডি: পাওয়া গেছে          │
│  │                  │  ✅ সময়: ২ ঘণ্টা আগে (সাম্প্রতিক)     │
│  └──────────────────┘                                      │
│                                                            │
│  ঝুঁকি স্কোর: 0.0  ✅ কম ঝুঁকি                            │
│                                                            │
│  [✅ এক-ক্লিকে অনুমোদন]    [❌ প্রত্যাখ্যান]               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 8.12.5 Automated Nudge System for Pending Payments

An escalating reminder sequence fires automatically for any order sitting in `pending_payment` state:

| Time Since Order Created | Nudge Type | Message |
|--------------------------|-----------|---------|
| T + 12h | In-app push notification | "আপনার অর্ডার #HB-XXXX এর পেমেন্ট এখনো হয়নি। আজকেই পেমেন্ট করুন।" |
| T + 20h | SMS (via Bangladesh SMS gateway) | "হাটবাজার: অর্ডার #{number} বাতিল হওয়ার আগে পেমেন্ট করুন। সময় বাকি: ৪ ঘণ্টা।" |
| T + 23h | Admin alert | "অর্ডার #{number} ১ ঘণ্টায় সময়সীমা শেষ হবে। ক্রেতাকে সহায়তা করুন।" |
| T + 24h | System auto-cancel | Order cancelled per Section 6.4. Inventory restored. Parties notified. |

This reduces payment timeout cancellations by approximately 50%, as most users simply forgot rather than abandoned.

---

## 9. Search, Discovery & Recommendation Engine

### 9.1 Search Architecture

HaatBazar's search system must handle Bengali text effectively. PostgreSQL's built-in full-text search with custom Bengali configuration provides a cost-effective solution without requiring external search infrastructure (e.g., Elasticsearch) at MVP scale.

**Search Infrastructure:**

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Full-Text Search | PostgreSQL `tsvector` + `tsquery` with `simple` dictionary | Bengali text indexing and search. Bengali doesn't have a native Postgres dictionary, so `simple` config (whitespace tokenizer) is used with custom stop words. |
| Trigram Matching | PostgreSQL `pg_trgm` extension | Fuzzy matching for misspelled Bengali words and partial matches |
| Category Filtering | Standard B-tree indexes on `category_id` | Fast category-based filtering |
| Location Filtering | B-tree indexes on `pickup_location_id` + location hierarchy joins | Geographic filtering at Division/District/Upazila level |
| Price Range | B-tree index on `price` | Range-based price filtering |
| Boost Ranking | Custom scoring formula in ORDER BY | Boosted products ranked higher |

### 9.2 Product Search — Complete Specification

#### 9.2.1 Search Index Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search vector column to products
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Create trigram indexes for fuzzy search
CREATE INDEX idx_products_title_trgm ON products USING GIN(title gin_trgm_ops);
CREATE INDEX idx_products_short_desc_trgm ON products USING GIN(short_desc gin_trgm_ops);

-- Trigger to auto-update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.short_desc, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.long_desc, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE OF title, short_desc, long_desc
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_vector();

-- Bengali stop words (common words to exclude from indexing)
-- These would be added to a custom dictionary file: /usr/share/postgresql/tsearch_data/bengali.stop
-- Examples: এই, একটি, তার, এবং, হয়, করা, থেকে, জন্য, সাথে, আছে, নেই, হবে, করে, দিয়ে, যে, কি
```

#### 9.2.2 Search Query Algorithm

**Edge Function: `POST /functions/v1/search-products`**

**Request:**
```json
{
  "query": "পাকা আম",
  "category_id": "uuid-or-null",
  "location_id": "uuid-or-null",
  "location_level": "district",
  "min_price": 50,
  "max_price": 200,
  "unit": "কেজি",
  "sort_by": "relevance",
  "is_negotiable": null,
  "is_verified_seller": null,
  "page": 1,
  "per_page": 20
}
```

**Search Query (PostgreSQL):**

```sql
WITH search_params AS (
    SELECT
        to_tsquery('simple', regexp_replace(:query, '\s+', ' & ', 'g')) AS ts_query,
        :query AS raw_query
),
matched_products AS (
    SELECT
        p.id,
        p.title,
        p.short_desc,
        p.price,
        p.unit,
        p.remaining_quantity,
        p.is_boosted,
        p.boost_expiry,
        p.is_negotiable,
        p.view_count,
        p.created_at,
        p.pickup_location_id,
        p.farmer_id,
        u.display_name AS farmer_name,
        u.nid_verified AS is_verified_seller,
        loc.name_bn AS location_name,
        parent_loc.name_bn AS district_name,
        pi_primary.thumbnail_url AS primary_image_url,
        -- Relevance scoring
        CASE
            WHEN sp.ts_query IS NOT NULL AND p.search_vector @@ sp.ts_query
            THEN ts_rank_cd(p.search_vector, sp.ts_query, 32) * 10
            ELSE 0
        END AS text_relevance_score,
        -- Trigram similarity (fuzzy match)
        GREATEST(
            similarity(p.title, sp.raw_query),
            similarity(p.short_desc, sp.raw_query) * 0.7
        ) AS trigram_score,
        -- Boost score
        CASE
            WHEN p.is_boosted = true AND p.boost_expiry > NOW()
            THEN COALESCE(
                (SELECT bt.boost_weight FROM boost_tiers bt
                 JOIN boost_history bh ON bh.boost_tier_id = bt.id
                 WHERE bh.product_id = p.id AND bh.expires_at > NOW()
                 ORDER BY bh.expires_at DESC LIMIT 1),
                1.5  -- default boost weight if lookup fails
            )
            ELSE 0
        END AS boost_score,
        -- Verified seller bonus
        CASE WHEN u.nid_verified = true THEN 0.5 ELSE 0 END AS verified_bonus,
        -- Recency score (newer products get a small bonus, decays over 30 days)
        GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (30 * 86400)) AS recency_score,
        -- Rating score
        COALESCE(
            (SELECT AVG(r.rating) FROM ratings r
             WHERE r.rated_user_id = p.farmer_id AND r.rating_type = 'product_quality') / 5.0,
            0.5  -- neutral default for unrated sellers
        ) AS rating_score
    FROM products p
    CROSS JOIN search_params sp
    JOIN users u ON u.id = p.farmer_id
    LEFT JOIN locations loc ON loc.id = p.pickup_location_id
    LEFT JOIN locations parent_loc ON parent_loc.id = loc.parent_id
    LEFT JOIN product_images pi_primary ON pi_primary.product_id = p.id AND pi_primary.display_order = 1
    WHERE p.status = 'active'
      AND p.remaining_quantity > 0
      -- Text search (full-text OR trigram for fuzzy)
      AND (
          sp.raw_query IS NULL
          OR sp.raw_query = ''
          OR p.search_vector @@ sp.ts_query
          OR similarity(p.title, sp.raw_query) > 0.2
          OR similarity(p.short_desc, sp.raw_query) > 0.15
      )
      -- Category filter
      AND (:category_id IS NULL OR p.category_id = :category_id
           OR p.category_id IN (SELECT id FROM product_categories WHERE parent_id = :category_id))
      -- Location filter (hierarchical)
      AND (:location_id IS NULL OR
           CASE :location_level
               WHEN 'upazila' THEN p.pickup_location_id = :location_id
               WHEN 'district' THEN loc.parent_id = :location_id
               WHEN 'division' THEN parent_loc.parent_id = :location_id
               ELSE true
           END
      )
      -- Price range filter
      AND (:min_price IS NULL OR p.price >= :min_price)
      AND (:max_price IS NULL OR p.price <= :max_price)
      -- Unit filter
      AND (:unit IS NULL OR p.unit = :unit)
      -- Negotiable filter
      AND (:is_negotiable IS NULL OR p.is_negotiable = :is_negotiable)
      -- Verified seller filter
      AND (:is_verified_seller IS NULL OR u.nid_verified = :is_verified_seller)
)
SELECT *,
    -- Final composite score for ranking
    (
        text_relevance_score * 3.0 +
        trigram_score * 2.0 +
        boost_score * 2.5 +
        verified_bonus * 1.0 +
        recency_score * 1.0 +
        rating_score * 1.5
    ) AS final_score
FROM matched_products
ORDER BY
    CASE :sort_by
        WHEN 'relevance' THEN NULL  -- uses final_score below
        WHEN 'price_asc' THEN price
        WHEN 'price_desc' THEN -price
        WHEN 'newest' THEN -EXTRACT(EPOCH FROM created_at)
        WHEN 'rating' THEN NULL     -- uses rating_score below
        ELSE NULL
    END NULLS LAST,
    CASE :sort_by
        WHEN 'relevance' THEN -(text_relevance_score * 3.0 + trigram_score * 2.0 + boost_score * 2.5 + verified_bonus * 1.0 + recency_score * 1.0 + rating_score * 1.5)
        WHEN 'rating' THEN -rating_score
        ELSE -(text_relevance_score * 3.0 + trigram_score * 2.0 + boost_score * 2.5 + verified_bonus * 1.0 + recency_score * 1.0 + rating_score * 1.5)
    END
LIMIT :per_page
OFFSET (:page - 1) * :per_page;
```

#### 9.2.3 Ranking Formula Breakdown

The final ranking score is a weighted sum of six factors:

| Factor | Weight | Range | Description |
|--------|--------|-------|-------------|
| `text_relevance_score` | 3.0x | 0–10 | PostgreSQL `ts_rank_cd` score based on full-text match quality. `A`-weighted title matches score highest. |
| `trigram_score` | 2.0x | 0–1 | Fuzzy string similarity for catching misspellings and partial matches. |
| `boost_score` | 2.5x | 0–3 | Boost tier weight (0 if not boosted; 1.5/2.0/3.0 based on tier). **This is the monetization lever.** |
| `verified_bonus` | 1.0x | 0–0.5 | Bonus for NID-verified sellers. Incentivizes verification. |
| `recency_score` | 1.0x | 0–1 | Linear decay from 1.0 (just posted) to 0 (30+ days old). Keeps feed fresh. |
| `rating_score` | 1.5x | 0–1 | Normalized average rating (avg_rating / 5.0). Unrated sellers get 0.5 (neutral). |

**Example scoring for "পাকা আম" query:**

| Product | text_rel | trigram | boost | verified | recency | rating | **Final Score** |
|---------|----------|---------|-------|----------|---------|--------|----------------|
| Boosted verified farmer, exact match, 2 days old | 8.0 | 0.9 | 2.0 | 0.5 | 0.93 | 0.9 | **8×3 + 0.9×2 + 2×2.5 + 0.5×1 + 0.93×1 + 0.9×1.5 = 34.58** |
| Non-boosted farmer, exact match, 1 day old | 8.0 | 0.9 | 0 | 0 | 0.97 | 0.8 | **8×3 + 0.9×2 + 0 + 0 + 0.97 + 0.8×1.5 = 28.97** |
| Boosted, partial match, 10 days old | 3.0 | 0.4 | 3.0 | 0 | 0.67 | 0.6 | **3×3 + 0.4×2 + 3×2.5 + 0 + 0.67 + 0.6×1.5 = 19.97** |

The boosted verified farmer with an exact match ranks first — this validates the boost monetization model.

#### 9.2.4 Search UI

**Screen: "পণ্য খুঁজুন" (Search Products)**

```
┌─────────────────────────────────────────┐
│  🔍 পণ্য খুঁজুন...                [ফিল্টার]│
│  ┌─────────────────────────────────┐    │
│  │ পাকা আম                    🔍  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ফল] [সবজি] [শস্য] [মসলা] [মাছ] [>>]  │
│  (Scrollable category chips)            │
│                                         │
│  সাজান: [প্রাসঙ্গিকতা ▼]                  │
│  (Dropdown: প্রাসঙ্গিকতা, কম দাম,         │
│   বেশি দাম, নতুন, সেরা রেটিং)           │
│                                         │
│  ১২ টি পণ্য পাওয়া গেছে                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🔥 বুস্টেড                       │    │
│  │ ┌──────┐                        │    │
│  │ │ img  │ পাকা আম — হিমসাগর জাত  │    │
│  │ │      │ ৳১২০/কেজি              │    │
│  │ └──────┘ 📍 শেরপুর, বগুড়া       │    │
│  │          👤 {name} ✅            │    │
│  │          ⭐ ৪.৫ (২৩)            │    │
│  │          📏 ৫০০ কেজি পাওয়া যাচ্ছে │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ┌──────┐                        │    │
│  │ │ img  │ পাকা আম — ল্যাংড়া       │    │
│  │ │      │ ৳১৫০/কেজি              │    │
│  │ └──────┘ 📍 চাঁপাইনবাবগঞ্জ       │    │
│  │          👤 {name}               │    │
│  │          ⭐ ৪.২ (৮)              │    │
│  │          📏 ২০০ কেজি পাওয়া যাচ্ছে │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ... (scrollable list with pagination)  │
│                                         │
└─────────────────────────────────────────┘
```

**Filter Bottom Sheet:**

```
┌─────────────────────────────────────────┐
│  ফিল্টার                          [রিসেট]│
│─────────────────────────────────────────│
│                                         │
│  পণ্যের ধরন                              │
│  ┌─────────────────────────────────┐    │
│  │ ফল > আম                  ▼    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  স্থান                                   │
│  বিভাগ: [সব      ▼]                     │
│  জেলা:  [সব      ▼]                     │
│                                         │
│  মূল্য পরিসীমা (৳)                        │
│  ┌──────────┐  —  ┌──────────┐          │
│  │ ৫০       │     │ ২০০      │          │
│  └──────────┘     └──────────┘          │
│  ═══════●═══════════●═══════            │
│  (Range slider)                         │
│                                         │
│  একক                                    │
│  [সব] [কেজি] [মণ] [টন] [পিস]           │
│                                         │
│  ☐ শুধু দর কষাকষি সম্ভব                   │
│  ☐ শুধু যাচাইকৃত বিক্রেতা                  │
│                                         │
│       [ফিল্টার প্রয়োগ করুন]                │
│                                         │
└─────────────────────────────────────────┘
```

### 9.3 Search Suggestions & Auto-Complete

To assist users (especially those less comfortable with typing in Bengali), the search bar provides suggestions:

**Implementation:**
- Pre-computed from the top 500 most-searched terms, stored in `search_suggestions` table.
- Updated nightly by pg_cron from `search_log` table.
- Client-side: Debounced (300ms) API call as user types → returns up to 5 suggestions.

**`search_log` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| user_id | UUID FK → users.id NULL | Logged-in user (NULL for anonymous) |
| query | TEXT | Search query text |
| result_count | INTEGER | Number of results returned |
| clicked_product_id | UUID NULL | If user clicked a result, which product |
| created_at | TIMESTAMP | Search timestamp |

**`search_suggestions` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| suggestion_text | TEXT UNIQUE | The suggestion (Bengali) |
| search_count | INTEGER | How many times this was searched |
| last_searched_at | TIMESTAMP | Most recent search time |
| category_id | UUID FK NULL | Associated category (if identifiable) |

### 9.4 Browse by Category

In addition to text search, users can browse products by category using a visual grid:

**Screen: "ক্যাটাগরি" (Categories)**

```
┌─────────────────────────────────────────┐
│  ক্যাটাগরি অনুযায়ী খুঁজুন                   │
│─────────────────────────────────────────│
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🍎     │ │ 🥬     │ │ 🌾     │      │
│  │ ফল     │ │ সবজি   │ │ শস্য   │      │
│  │ (১৫২)  │ │ (২৩৪)  │ │ (৮৯)  │      │
│  └────────┘ └────────┘ └────────┘      │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🌶️     │ │ 🐟     │ │ 🐄     │      │
│  │ মসলা   │ │ মাছ    │ │ গবাদি  │      │
│  │ (৬৭)   │ │ (১১৩)  │ │ পশু    │      │
│  │        │ │        │ │ (৩৪)  │      │
│  └────────┘ └────────┘ └────────┘      │
│                                         │
│  ┌────────┐ ┌────────┐                  │
│  │ 🥛     │ │ 📦     │                  │
│  │ দুগ্ধজাত│ │ অন্যান্য │                  │
│  │ (৪৫)   │ │ (২৮)  │                  │
│  └────────┘ └────────┘                  │
│                                         │
│  (Numbers show active product count     │
│   in each category)                     │
│                                         │
└─────────────────────────────────────────┘
```

Tapping a category shows subcategories, then the product list for that subcategory with all search filters available.

### 9.5 View Tracking for Analytics

Every time a product detail page is viewed, the system records:

```sql
-- Increment view count (atomic)
UPDATE products SET view_count = view_count + 1 WHERE id = :product_id;

-- If product is boosted, also increment boost impression counter
UPDATE boost_history
SET impressions_count = impressions_count + 1
WHERE product_id = :product_id
  AND expires_at > NOW()
  AND actual_expired_at IS NULL;

-- Detailed view log (for analytics, sampled at 10% to reduce volume)
-- Only insert if random() < 0.1
INSERT INTO product_view_log (product_id, viewer_user_id, viewer_location_id, source, created_at)
VALUES (:product_id, :viewer_id, :viewer_location_id, :source, NOW());
-- source: 'search', 'category', 'boost_feed', 'notification', 'requirement_response', 'direct_link'
```

### 9.6 Rate Limits for Search

| Endpoint | Rate Limit | Window | Rationale |
|----------|-----------|--------|-----------|
| `POST /functions/v1/search-products` | 30 requests | per minute per user | Normal browsing pace |
| `POST /functions/v1/search-suggestions` | 60 requests | per minute per user | Auto-complete fires frequently while typing |
| Browse by category (PostgREST) | 30 requests | per minute per user | Normal browsing |

---

## 10. Notification System

### 10.1 Notification Architecture

HaatBazar uses a **dual-channel notification system**:

1. **Push Notifications** — Firebase Cloud Messaging (FCM) for real-time alerts when app is backgrounded or closed.
2. **In-App Notifications** — Stored in a `notification_log` table and displayed in an in-app notification feed.

Both channels send **identical Bengali content** to ensure users see the same message regardless of how they access it.

### 10.2 Push Notification Infrastructure

**FCM Token Management:**

| Field (in `users` table) | Type | Description |
|--------------------------|------|-------------|
| `fcm_token` | TEXT NULL | Current FCM registration token for the user's primary device |
| `fcm_token_updated_at` | TIMESTAMP NULL | When the token was last refreshed |

**Token Lifecycle:**
1. On app launch → `@capacitor-firebase/messaging` obtains the FCM token → sends to backend: `UPDATE users SET fcm_token = :token, fcm_token_updated_at = NOW()`.
2. On token refresh (FCM rotates tokens periodically) → same update.
3. On logout → `UPDATE users SET fcm_token = NULL`.
4. If sending a push notification results in an `InvalidRegistration` or `NotRegistered` error → set `fcm_token = NULL` (stale token cleanup).

**FCM Topics:**
Users are auto-subscribed to FCM topics based on their role and location:

| Topic Pattern | Subscribers | Purpose |
|--------------|------------|---------|
| `farmer_{district_id}` | All farmers in that district | District-level farmer broadcasts |
| `buyer_{district_id}` | All buyers in that district | District-level buyer broadcasts |
| `transporter_{district_id}` | All transporters in that district | District-level transporter broadcasts |
| `new_products_{district_id}` | All buyers in that district | Notify when new products listed in their area |
| `buyer_requirements_{district_id}` | All farmers in that district | Notify when buyers post requirements |
| `rfq_{district_id}` | All transporters in that district | Notify when new RFQs are posted |
| `admin_all` | All admin users | System alerts, fraud alerts, escalations |

### 10.3 In-App Notification Storage

**`notification_log` Table:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto |
| user_id | UUID FK → users.id | Recipient |
| title | VARCHAR(200) | Bengali notification title |
| body | TEXT | Bengali notification body |
| type | VARCHAR(50) | Notification category (see 10.4) |
| reference_type | VARCHAR(30) NULL | `order`, `product`, `rfq`, `requirement`, `dispute`, `boost`, `system` |
| reference_id | UUID NULL | ID of the related entity (for deep linking) |
| is_read | BOOLEAN DEFAULT false | Whether user has seen this notification |
| is_pushed | BOOLEAN DEFAULT false | Whether FCM push was sent successfully |
| push_error | TEXT NULL | If FCM send failed, the error message |
| created_at | TIMESTAMP | When the notification was created |
| read_at | TIMESTAMP NULL | When user marked it as read |

**Indexes:**
- `idx_notification_log_user_unread` ON `(user_id, is_read, created_at DESC)` — for "my notifications" feed with unread filter
- `idx_notification_log_user_created` ON `(user_id, created_at DESC)` — for chronological feed
- `idx_notification_log_type` ON `(type, created_at DESC)` — for analytics on notification types

**Data Retention:**
- Notifications older than **90 days** are soft-deleted by pg_cron nightly job.
- Read notifications older than **30 days** are eligible for archival.

### 10.4 Complete Notification Matrix

Every event in the system that generates a notification is cataloged below with exact Bengali content templates.

#### 10.4.1 Order Lifecycle Notifications

| Event | Recipient | Type | Title (Bengali) | Body Template (Bengali) |
|-------|-----------|------|-----------------|------------------------|
| Order created | Farmer | `order_created` | নতুন অর্ডার পেয়েছেন | "{buyer_name} আপনার '{product_title}' পণ্যের জন্য {quantity} {unit} অর্ডার করেছেন। অর্ডার: #{order_number}" |
| Order created | Buyer | `order_created` | অর্ডার তৈরি হয়েছে | "অর্ডার #{order_number} তৈরি হয়েছে। ২৪ ঘণ্টার মধ্যে ৳{product_total} পেমেন্ট করুন।" |
| Payment proof uploaded | Farmer | `payment_uploaded` | পেমেন্ট প্রমাণ জমা হয়েছে | "ক্রেতা অর্ডার #{order_number} এর পেমেন্ট প্রমাণ জমা দিয়েছেন। অ্যাডমিন যাচাই করছে।" |
| Payment proof uploaded | Admin | `payment_needs_verification` | পেমেন্ট যাচাই প্রয়োজন | "অর্ডার #{order_number} — ৳{amount} পেমেন্ট যাচাই করুন।" |
| Payment verified | Buyer | `payment_verified` | পেমেন্ট যাচাই হয়েছে | "আপনার ৳{amount} পেমেন্ট যাচাই হয়েছে। এখন পরিবহন নির্বাচন করুন।" |
| Payment verified | Farmer | `payment_verified` | পেমেন্ট নিশ্চিত | "অর্ডার #{order_number} এর 

## 14. Complete Database Schema

This section provides the **definitive database schema** for HaatBazar. Every table, column, constraint, index, trigger, and RLS policy required for the Technical Architect to implement the system is specified here.

**Database: PostgreSQL 15+ (via Supabase)**
**Extensions Required:** `uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_cron`

### 14.1 Entity Relationship Summary

```
users ─────────────────┬──────────────────────────────────────────────────┐
  │                    │                                                  │
  │ 1:N               │ 1:N                                             │ 1:N
  ▼                    ▼                                                  ▼
user_identifiers    products ──────────── product_images           transport_offers
  │                    │     │                                         │
  │                    │     └── product_categories                    │
  │                    │                                                │
  │                1:N │                                           1:N  │
  │                    ▼                                                ▼
  │                 orders ◄────────────────────────────────── rfqs ──── rfq_bids
  │                    │
  │         ┌──────────┼──────────┬──────────────┐
  │         │          │          │              │
  │         ▼          ▼          ▼              ▼
  │  order_status  transport  cancellation   disputes
  │  _history      _payments  _records          │
  │                                              ▼
  │                                         refund_notes
  │
  ├── buyer_requirements ──── requirement_responses
  │
  ├── boost_payments ──── boost_history ──── boost_tiers
  │
  ├── ratings
  │
  ├── chat_threads ──── chat_messages
  │
  ├── wallet_transactions
  │
  ├── user_verifications
  │
  ├── notification_log
  │
  └── fraud_alerts

admin_users ──── audit_log

locations (self-referencing hierarchy)

product_categories (self-referencing hierarchy)

platform_settings (key-value config)

product_ai_cache

search_log ──── search_suggestions

product_reports

product_view_log
```

### 14.2 Complete DDL — All Tables

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- pg_cron is enabled at the Supabase project level

-- ============================================================
-- TABLE 1: locations (reference data — seeded at deployment)
-- ============================================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_bn VARCHAR(100) NOT NULL,           -- Bengali name (e.g., "বগুড়া")
    name_en VARCHAR(100),                     -- English name for admin reference (e.g., "Bogra")
    slug VARCHAR(100) NOT NULL,               -- URL-friendly (e.g., "bogra")
    level VARCHAR(20) NOT NULL CHECK (level IN ('division', 'district', 'upazila')),
    parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    lat DECIMAL(10, 7),                       -- Optional centroid latitude
    lng DECIMAL(10, 7),                       -- Optional centroid longitude
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_level ON locations(level);
CREATE UNIQUE INDEX idx_locations_slug ON locations(slug);

-- ============================================================
-- TABLE 2: product_categories (reference data — seeded)
-- ============================================================
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_bn VARCHAR(100) NOT NULL,           -- Bengali name (e.g., "ফল")
    name_en VARCHAR(100),                     -- English name (e.g., "Fruits")
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    icon_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);

-- ============================================================
-- TABLE 3: users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- users.id = auth.users.id (native Supabase Auth): rows are created by the
    -- handle_new_auth_user() trigger on auth.users INSERT — no external auth UID column.
    google_uid TEXT UNIQUE,                    -- Google account sub (native Supabase Google OAuth)
    email TEXT,                                -- From Google Sign-In
    display_name VARCHAR(200),                -- Bengali or English full name
    photo_url TEXT,                            -- Google avatar or custom upload
    -- No 'role' column: all users have equal capabilities.
    -- Seller / Buyer / Transporter are contextual labels per transaction, not account attributes.
    phone TEXT UNIQUE,                         -- Bangladeshi mobile: 01XXXXXXXXX
    bkash_id TEXT UNIQUE,                     -- bKash number (used as payment receipt detail when acting as seller/transporter)
    bank_account TEXT UNIQUE,                 -- Bank account number
    bank_name VARCHAR(200),                   -- Bengali bank name
    bank_routing VARCHAR(9),                  -- 9-digit routing number
    business_name VARCHAR(200),               -- Optional: farm name, shop name, or transport company name
    location_id UUID REFERENCES locations(id), -- User's primary location (Upazila)
    nid_verified BOOLEAN DEFAULT false,       -- NID verification completed
    phone_verified BOOLEAN DEFAULT false,     -- Phone OTP verified
    is_profile_complete BOOLEAN DEFAULT false, -- All required fields filled
    is_suspended BOOLEAN DEFAULT false,       -- Admin-suspended account
    is_banned BOOLEAN DEFAULT false,          -- Permanently banned
    is_deleted BOOLEAN DEFAULT false,         -- Soft-deleted account
    fraud_flag BOOLEAN DEFAULT false,         -- Flagged for potential fraud
    warning_count INTEGER DEFAULT 0,          -- Admin warnings issued
    cancellation_count INTEGER DEFAULT 0,     -- Orders cancelled by this user
    cancellation_cooldown_until TIMESTAMP,    -- If set, user cannot place orders until this time
    fcm_token TEXT,                            -- Firebase Cloud Messaging token
    fcm_token_updated_at TIMESTAMP,
    device_fingerprint TEXT,                   -- For fraud detection
    onboarded_at TIMESTAMP,                   -- When profile was completed
    deleted_at TIMESTAMP,                     -- When account was soft-deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- idx_users_role removed: no role column exists
CREATE INDEX idx_users_google_uid ON users(google_uid);
CREATE INDEX idx_users_fraud_flag ON users(fraud_flag) WHERE fraud_flag = true;
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = true;
CREATE INDEX idx_users_phone ON users(phone);

-- ============================================================
-- TABLE 4: user_identifiers (fraud detection hub)
-- ============================================================
CREATE TABLE user_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    identifier_type VARCHAR(10) NOT NULL CHECK (identifier_type IN ('phone', 'bkash', 'bank')),
    identifier_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,           -- false if replaced by profile update
    created_at TIMESTAMP DEFAULT NOW(),
    deactivated_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_user_identifiers_value ON user_identifiers(identifier_value) WHERE is_active = true;
CREATE INDEX idx_user_identifiers_user ON user_identifiers(user_id);
CREATE INDEX idx_user_identifiers_type_value ON user_identifiers(identifier_type, identifier_value);

-- ============================================================
-- TABLE 5: user_verifications (NID verification)
-- ============================================================
CREATE TABLE user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nid_front_url TEXT NOT NULL,              -- NID front photo URL
    nid_back_url TEXT NOT NULL,               -- NID back photo URL
    selfie_url TEXT NOT NULL,                 -- Selfie with NID
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID,                          -- FK to admin_users (defined later)
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_status ON user_verifications(status) WHERE status = 'pending';

-- ============================================================
-- TABLE 6: fraud_alerts
-- ============================================================
CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('realtime_block', 'tx_id_reuse', 'batch_analysis', 'manual_flag')),
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    flagged_user_id UUID REFERENCES users(id),
    matched_user_ids UUID[],                  -- Array of conflicting user IDs
    matched_identifiers JSONB,                -- Details of which identifiers matched
    description TEXT,                         -- Bengali description of the alert
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'dismissed', 'warned', 'suspended', 'banned')),
    resolved_by UUID,                          -- FK to admin_users
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status, created_at DESC);
CREATE INDEX idx_fraud_alerts_user ON fraud_alerts(flagged_user_id);

-- ============================================================
-- TABLE 7: products
-- ============================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id),
    title VARCHAR(200) NOT NULL,
    short_desc TEXT NOT NULL CHECK (char_length(short_desc) <= 300),
    long_desc TEXT CHECK (char_length(long_desc) <= 2000),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    remaining_quantity DECIMAL(10,2) NOT NULL CHECK (remaining_quantity >= 0),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('কেজি', 'মণ', 'টন', 'পিস', 'বস্তা', 'লিটার')),
    pickup_location_id UUID NOT NULL REFERENCES locations(id),
    pickup_address_detail TEXT,
    harvest_date DATE,
    expiry_date DATE,
    is_negotiable BOOLEAN DEFAULT false,
    min_order_quantity DECIMAL(10,2) DEFAULT 1.0 CHECK (min_order_quantity > 0),
    is_boosted BOOLEAN DEFAULT false,
    boost_expiry TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'active', 'sold', 'expired', 'suspended', 'rejected', 'completed')),
    view_count INTEGER DEFAULT 0,
    ai_confidence_score DECIMAL(3,2),
    search_vector tsvector,                   -- Full-text search vector (auto-updated by trigger)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_farmer ON products(farmer_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_status_boost ON products(status, is_boosted) WHERE status = 'active';
CREATE INDEX idx_products_location ON products(pickup_location_id);
CREATE INDEX idx_products_price ON products(price) WHERE status = 'active';
CREATE INDEX idx_products_created ON products(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_title_trgm ON products USING GIN(title gin_trgm_ops);
CREATE INDEX idx_products_short_desc_trgm ON products USING GIN(short_desc gin_trgm_ops);

-- Trigger: auto-update search vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.short_desc, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.long_desc, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE OF title, short_desc, long_desc
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_vector();

-- Trigger: auto-set remaining_quantity on insert
CREATE OR REPLACE FUNCTION set_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.remaining_quantity IS NULL THEN
        NEW.remaining_quantity := NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_set_remaining
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_remaining_quantity();

-- ============================================================
-- TABLE 8: product_images
-- ============================================================
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 1,
    is_ai_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_product_images_product ON product_images(product_id, display_order);

-- ============================================================
-- TABLE 9: product_ai_cache
-- ============================================================
CREATE TABLE product_ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_hash VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 hash of image bytes
    response_json JSONB NOT NULL,
    model_version VARCHAR(50),
    confidence DECIMAL(3,2),
    hit_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_product_ai_cache_hash ON product_ai_cache(image_hash);
-- TTL: pg_cron deletes entries older than 30 days

-- ============================================================
-- TABLE 10: product_reports
-- ============================================================
CREATE TABLE product_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('fake_product', 'inappropriate_image', 'misleading_price', 'prohibited_item', 'duplicate_listing', 'other')),
    description TEXT,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed_valid', 'reviewed_dismissed')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, reporter_user_id)
);
CREATE INDEX idx_product_reports_product ON product_reports(product_id);
CREATE INDEX idx_product_reports_status ON product_reports(status) WHERE status = 'pending';

-- ============================================================
-- TABLE 11: transport_offers
-- ============================================================
CREATE TABLE transport_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_location_id UUID NOT NULL REFERENCES locations(id),
    from_address_detail TEXT,
    to_location_id UUID NOT NULL REFERENCES locations(id),
    to_address_detail TEXT,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('pickup', 'truck_small', 'truck_medium', 'truck_large', 'trailer', 'van', 'refrigerated_van', 'three_wheeler', 'boat')),
    capacity_ton DECIMAL(10,2) NOT NULL CHECK (capacity_ton > 0),
    remaining_capacity_ton DECIMAL(10,2) NOT NULL CHECK (remaining_capacity_ton >= 0),
    min_booking_ton DECIMAL(10,2) DEFAULT 0.5 CHECK (min_booking_ton > 0),
    price_bdt DECIMAL(10,2) NOT NULL CHECK (price_bdt > 0),
    price_per_ton_bdt DECIMAL(10,2) CHECK (price_per_ton_bdt IS NULL OR price_per_ton_bdt > 0),
    is_negotiable BOOLEAN DEFAULT false,
    available_from DATE NOT NULL,
    available_to DATE NOT NULL,
    notes TEXT,
    is_refrigerated BOOLEAN DEFAULT false,
    is_covered BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'fully_booked', 'expired', 'cancelled', 'completed')),
    booking_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (available_to >= available_from),
    CHECK (remaining_capacity_ton <= capacity_ton)
);
CREATE INDEX idx_transport_offers_route ON transport_offers(from_location_id, to_location_id, status);
CREATE INDEX idx_transport_offers_transporter ON transport_offers(transporter_id);
CREATE INDEX idx_transport_offers_availability ON transport_offers(available_from, available_to, status) WHERE status = 'active';
CREATE INDEX idx_transport_offers_capacity ON transport_offers(remaining_capacity_ton) WHERE status = 'active';

-- Trigger: auto-set remaining_capacity on insert
CREATE OR REPLACE FUNCTION set_remaining_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.remaining_capacity_ton IS NULL THEN
        NEW.remaining_capacity_ton := NEW.capacity_ton;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transport_offers_set_capacity
    BEFORE INSERT ON transport_offers
    FOR EACH ROW
    EXECUTE FUNCTION set_remaining_capacity();

-- ============================================================
-- TABLE 12: buyer_requirements
-- ============================================================
CREATE TABLE buyer_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL CHECK (char_length(description) <= 1000),
    quantity_needed DECIMAL(10,2) NOT NULL CHECK (quantity_needed > 0),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('কেজি', 'মণ', 'টন', 'পিস', 'বস্তা', 'লিটার')),
    min_price_bdt DECIMAL(10,2),
    max_price_bdt DECIMAL(10,2) NOT NULL CHECK (max_price_bdt > 0),
    delivery_location_id UUID NOT NULL REFERENCES locations(id),
    delivery_address_detail TEXT,
    preferred_location_id UUID REFERENCES locations(id),
    deadline_date DATE NOT NULL,
    is_urgent BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'partially_fulfilled', 'fulfilled', 'expired', 'cancelled')),
    response_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (min_price_bdt IS NULL OR min_price_bdt <= max_price_bdt)
);
CREATE INDEX idx_buyer_requirements_status ON buyer_requirements(status, deadline_date);
CREATE INDEX idx_buyer_requirements_category_location ON buyer_requirements(category_id, delivery_location_id) WHERE status = 'active';
CREATE INDEX idx_buyer_requirements_buyer ON buyer_requirements(buyer_id);

-- ============================================================
-- TABLE 13: requirement_responses
-- ============================================================
CREATE TABLE requirement_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES buyer_requirements(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    offered_price_bdt DECIMAL(10,2) NOT NULL CHECK (offered_price_bdt > 0),
    offered_quantity DECIMAL(10,2) NOT NULL CHECK (offered_quantity > 0),
    message TEXT,
    pickup_location_id UUID NOT NULL REFERENCES locations(id),
    available_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    UNIQUE(requirement_id, farmer_id)
);
CREATE INDEX idx_requirement_responses_requirement ON requirement_responses(requirement_id, status);
CREATE INDEX idx_requirement_responses_farmer ON requirement_responses(farmer_id);

-- ============================================================
-- TABLE 14: orders
-- ============================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    farmer_id UUID NOT NULL REFERENCES users(id),
    transporter_id UUID REFERENCES users(id),
    transport_offer_id UUID REFERENCES transport_offers(id),
    rfq_id UUID,                              -- FK added after rfqs table created
    quantity_ordered DECIMAL(10,2) NOT NULL CHECK (quantity_ordered > 0),
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    product_total_bdt DECIMAL(12,2) NOT NULL,
    transport_price_bdt DECIMAL(12,2),
    grand_total_bdt DECIMAL(12,2),
    current_state VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (current_state IN (
        'pending_payment', 'payment_proof_uploaded', 'payment_verified', 'payment_rejected',
        'transport_required', 'transport_assigned', 'transport_payment_uploaded',
        'transport_payment_rejected', 'ready_for_pickup', 'in_transit',
        'delivered', 'completed', 'disputed', 'cancelled'
    )),
    pickup_location_id UUID NOT NULL REFERENCES locations(id),
    pickup_address_detail TEXT,
    delivery_location_id UUID NOT NULL REFERENCES locations(id),
    delivery_address_detail TEXT,
    product_payment_proof_url TEXT,
    product_payment_tx_id VARCHAR(100),
    product_payment_method VARCHAR(20) CHECK (product_payment_method IS NULL OR product_payment_method IN ('bkash', 'nagad', 'bank_transfer', 'cash')),
    product_payment_verified_at TIMESTAMP,
    product_payment_verified_by UUID,
    transport_payment_proof_url TEXT,
    transport_payment_tx_id VARCHAR(100),
    transport_payment_method VARCHAR(20) CHECK (transport_payment_method IS NULL OR transport_payment_method IN ('bkash', 'nagad', 'bank_transfer', 'cash')),
    transport_payment_verified_at TIMESTAMP,
    transport_payment_verified_by UUID,
    pickup_confirmed_at TIMESTAMP,
    pickup_photo_url TEXT,
    delivery_confirmed_at TIMESTAMP,
    delivery_photo_url TEXT,
    estimated_delivery_date DATE,
    cancellation_reason TEXT,
    cancelled_by UUID,
    cancelled_at TIMESTAMP,
    admin_notes TEXT,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_orders_state ON orders(current_state);
CREATE INDEX idx_orders_buyer ON orders(buyer_id, current_state);
CREATE INDEX idx_orders_farmer ON orders(farmer_id, current_state);
CREATE INDEX idx_orders_transporter ON orders(transporter_id, current_state) WHERE transporter_id IS NOT NULL;
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_product_tx ON orders(product_payment_tx_id) WHERE product_payment_tx_id IS NOT NULL;
CREATE INDEX idx_orders_transport_tx ON orders(transport_payment_tx_id) WHERE transport_payment_tx_id IS NOT NULL;
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Order number sequence generator
CREATE SEQUENCE order_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    seq_val INTEGER;
    date_part VARCHAR(6);
BEGIN
    seq_val := nextval('order_number_seq');
    date_part := to_char(NOW(), 'YYMMDD');
    RETURN 'HB-' || date_part || '-' || lpad(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-set updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- TABLE 15: order_status_history
-- ============================================================
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_state VARCHAR(30),
    to_state VARCHAR(30) NOT NULL,
    changed_by_user_id UUID,
    changed_by_role VARCHAR(20) CHECK (changed_by_role IN ('buyer', 'farmer', 'transporter', 'admin', 'system')),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id, created_at ASC);

-- ============================================================
-- TABLE 16: rfqs (Request for Quotation)
-- ============================================================
CREATE TABLE rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    from_location_id UUID NOT NULL REFERENCES locations(id),
    to_location_id UUID NOT NULL REFERENCES locations(id),
    weight_ton DECIMAL(10,2) NOT NULL CHECK (weight_ton > 0),
    preferred_date DATE NOT NULL,
    needs_refrigeration BOOLEAN DEFAULT false,
    notes TEXT,
    max_budget_bdt DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired', 'cancelled')),
    bid_count INTEGER DEFAULT 0,
    selected_bid_id UUID,                     -- FK added after rfq_bids created
    bid_deadline TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_buyer ON rfqs(buyer_id);
CREATE INDEX idx_rfqs_order ON rfqs(order_id);
CREATE INDEX idx_rfqs_locations ON rfqs(from_location_id, to_location_id) WHERE status = 'open';

-- Add FK from orders to rfqs
ALTER TABLE orders ADD CONSTRAINT fk_orders_rfq FOREIGN KEY (rfq_id) REFERENCES rfqs(id);

-- ============================================================
-- TABLE 17: rfq_bids (normalized — V3 improvement over JSONB)
-- ============================================================
CREATE TABLE rfq_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    transporter_id UUID NOT NULL REFERENCES users(id),
    price_bdt DECIMAL(12,2) NOT NULL CHECK (price_bdt > 0),
    vehicle_type VARCHAR(30) NOT NULL,
    estimated_pickup_date DATE NOT NULL,
    estimated_delivery_date DATE NOT NULL,
    is_refrigerated BOOLEAN DEFAULT false,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (estimated_delivery_date >= estimated_pickup_date),
    UNIQUE(rfq_id, transporter_id)
);
CREATE INDEX idx_rfq_bids_rfq ON rfq_bids(rfq_id, status);
CREATE INDEX idx_rfq_bids_transporter ON rfq_bids(transporter_id);

-- Add FK from rfqs to rfq_bids
ALTER TABLE rfqs ADD CONSTRAINT fk_rfqs_selected_bid FOREIGN KEY (selected_bid_id) REFERENCES rfq_bids(id);

-- ============================================================
-- TABLE 18: transport_payments
-- ============================================================
CREATE TABLE transport_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    transporter_id UUID NOT NULL REFERENCES users(id),
    amount_bdt DECIMAL(12,2) NOT NULL CHECK (amount_bdt > 0),
    payment_method VARCHAR(20),
    tx_id VARCHAR(100) UNIQUE,
    proof_url TEXT,
    status VARCHAR(30) DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'proof_uploaded', 'verified', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_transport_payments_order ON transport_payments(order_id);
CREATE INDEX idx_transport_payments_status ON transport_payments(status) WHERE status IN ('pending_payment', 'proof_uploaded');

-- ============================================================
-- TABLE 19: cancellation_records
-- ============================================================
CREATE TABLE cancellation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    cancelled_by_user_id UUID REFERENCES users(id),
    cancelled_by_role VARCHAR(20) NOT NULL CHECK (cancelled_by_role IN ('buyer', 'farmer', 'transporter', 'admin', 'system')),
    state_at_cancellation VARCHAR(30) NOT NULL,
    reason TEXT,
    penalty_applied VARCHAR(30),
    refund_required BOOLEAN DEFAULT false,
    refund_amount_bdt DECIMAL(12,2),
    refund_status VARCHAR(20) CHECK (refund_status IS NULL OR refund_status IN ('pending', 'refunded', 'waived')),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_cancellation_records_order ON cancellation_records(order_id);
CREATE INDEX idx_cancellation_records_user ON cancellation_records(cancelled_by_user_id);

-- ============================================================
-- TABLE 20: disputes
-- ============================================================
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    raised_by_user_id UUID NOT NULL REFERENCES users(id),
    raised_by_role VARCHAR(20) NOT NULL CHECK (raised_by_role IN ('buyer', 'farmer', 'transporter')),
    reason_code VARCHAR(30) NOT NULL CHECK (reason_code IN ('product_quality', 'product_quantity', 'wrong_product', 'payment_issue', 'transport_damage', 'transport_delay', 'transport_loss', 'fraud', 'other')),
    description TEXT NOT NULL,
    evidence_urls TEXT[],                     -- Array of evidence image URLs
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
    resolution_type VARCHAR(30) CHECK (resolution_type IS NULL OR resolution_type IN ('full_refund', 'partial_refund', 'replacement', 'no_action', 'penalty_seller', 'penalty_transporter', 'penalty_buyer')),
    resolution_notes TEXT,
    resolution_amount_bdt DECIMAL(12,2),
    assigned_admin_id UUID,
    resolved_by_admin_id UUID,
    resolved_at TIMESTAMP,
    escalated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status, created_at ASC);
CREATE INDEX idx_disputes_raised_by ON disputes(raised_by_user_id);

-- ============================================================
-- TABLE 21: refund_notes
-- ============================================================
CREATE TABLE refund_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    dispute_id UUID REFERENCES disputes(id),
    from_user_id UUID NOT NULL REFERENCES users(id),   -- Who owes the refund
    to_user_id UUID NOT NULL REFERENCES users(id),     -- Who receives the refund
    amount_bdt DECIMAL(12,2) NOT NULL CHECK (amount_bdt > 0),
    reason TEXT NOT NULL,
    created_by_admin_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'refund_confirmed', 'waived', 'disputed')),
    refund_proof_url TEXT,
    refund_tx_id VARCHAR(100),
    confirmed_by_admin_id UUID,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_refund_notes_order ON refund_notes(order_id);
CREATE INDEX idx_refund_notes_status ON refund_notes(status) WHERE status = 'pending';
CREATE INDEX idx_refund_notes_from_user ON refund_notes(from_user_id);

-- ============================================================
-- TABLE 22: boost_tiers (admin-configurable)
-- ============================================================
CREATE TABLE boost_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_bn VARCHAR(50) NOT NULL,
    slug VARCHAR(30) UNIQUE NOT NULL,
    duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
    price_bdt DECIMAL(10,2) NOT NULL CHECK (price_bdt > 0),
    boost_weight DECIMAL(3,2) NOT NULL CHECK (boost_weight > 0),
    max_impressions INTEGER,                  -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 23: boost_payments
-- ============================================================
CREATE TABLE boost_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    boost_tier_id UUID NOT NULL REFERENCES boost_tiers(id),
    amount_bdt DECIMAL(10,2) NOT NULL CHECK (amount_bdt > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('bkash', 'nagad', 'bank_transfer', 'wallet_credit')),
    tx_id VARCHAR(100) UNIQUE,
    proof_url TEXT,
    status VARCHAR(30) DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'approved', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_boost_payments_status ON boost_payments(status) WHERE status = 'pending_verification';
CREATE INDEX idx_boost_payments_farmer ON boost_payments(farmer_id);
CREATE INDEX idx_boost_payments_product ON boost_payments(product_id);

-- ============================================================
-- TABLE 24: boost_history
-- ============================================================
CREATE TABLE boost_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    boost_tier_id UUID NOT NULL REFERENCES boost_tiers(id),
    boost_payment_id UUID NOT NULL REFERENCES boost_payments(id),
    activated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    actual_expired_at TIMESTAMP,
    impressions_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    orders_during_boost INTEGER DEFAULT 0,
    revenue_during_boost DECIMAL(12,2) DEFAULT 0
);
CREATE INDEX idx_boost_history_product ON boost_history(product_id);
CREATE INDEX idx_boost_history_active ON boost_history(expires_at) WHERE actual_expired_at IS NULL;

-- ============================================================
-- TABLE 25: ratings
-- ============================================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    rater_user_id UUID NOT NULL REFERENCES users(id),
    rated_user_id UUID NOT NULL REFERENCES users(id),
    rating_type VARCHAR(20) NOT NULL CHECK (rating_type IN ('product_quality', 'buyer_reliability', 'transport_quality')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id, rater_user_id, rated_user_id)
);
CREATE INDEX idx_ratings_rated_user ON ratings(rated_user_id, rating_type);
CREATE INDEX idx_ratings_order ON ratings(order_id);

-- ============================================================
-- TABLE 26: chat_threads
-- ============================================================
CREATE TABLE chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type VARCHAR(20) NOT NULL CHECK (context_type IN ('order', 'requirement', 'dispute', 'general')),
    context_id UUID,                          -- FK to orders, buyer_requirements, disputes, etc.
    participant_1_id UUID NOT NULL REFERENCES users(id),
    participant_2_id UUID NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    unread_count_p1 INTEGER DEFAULT 0,
    unread_count_p2 INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(context_type, context_id, participant_1_id, participant_2_id)
);
CREATE INDEX idx_chat_threads_participant_1 ON chat_threads(participant_1_id, last_message_at DESC);
CREATE INDEX idx_chat_threads_participant_2 ON chat_threads(participant_2_id, last_message_at DESC);
CREATE INDEX idx_chat_threads_context ON chat_threads(context_type, context_id);

-- ============================================================
-- TABLE 27: chat_messages
-- ============================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    content TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id, created_at ASC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- ============================================================
-- TABLE 28: notification_log
-- ============================================================
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(30),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    is_pushed BOOLEAN DEFAULT false,
    push_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);
CREATE INDEX idx_notification_log_user_unread ON notification_log(user_id, is_read, created_at DESC);
CREATE INDEX idx_notification_log_user_created ON notification_log(user_id, created_at DESC);

-- ============================================================
-- TABLE 29: wallet_transactions
-- ============================================================
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    amount_bdt DECIMAL(12,2) NOT NULL CHECK (amount_bdt > 0),
    balance_after DECIMAL(12,2) NOT NULL,
    reason TEXT NOT NULL,
    reference_type VARCHAR(30),
    reference_id UUID,
    expires_at TIMESTAMP,                     -- Wallet credits expire after 90 days
    created_by_admin_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_expiry ON wallet_transactions(expires_at) WHERE expires_at IS NOT NULL AND transaction_type = 'credit';

-- ============================================================
-- TABLE 30: admin_users
-- ============================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    password_hash TEXT NOT NULL,              -- bcrypt hash
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'payment_verifier', 'dispute_resolver', 'content_moderator')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 31: audit_log
-- ============================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id),
    action_type VARCHAR(50) NOT NULL,         -- e.g., 'payment_verified', 'user_suspended', 'dispute_resolved'
    resource_type VARCHAR(30) NOT NULL,       -- e.g., 'order', 'user', 'dispute', 'boost_payment'
    resource_id UUID NOT NULL,
    details JSONB,                            -- Action-specific metadata
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_log_admin ON audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_action ON audit_log(action_type, created_at DESC);

-- ============================================================
-- TABLE 32: platform_settings (key-value config)
-- ============================================================
CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,                         -- Human-readable description of this setting
    updated_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 33: search_log
-- ============================================================
CREATE TABLE search_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    query TEXT NOT NULL,
    result_count INTEGER,
    clicked_product_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_search_log_created ON search_log(created_at DESC);

-- ============================================================
-- TABLE 34: search_suggestions
-- ============================================================
CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_text TEXT UNIQUE NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT NOW(),
    category_id UUID REFERENCES product_categories(id)
);
CREATE INDEX idx_search_suggestions_count ON search_suggestions(search_count DESC);
CREATE INDEX idx_search_suggestions_text_trgm ON search_suggestions USING GIN(suggestion_text gin_trgm_ops);

-- ============================================================
-- TABLE 35: product_view_log (sampled at 10%)
-- ============================================================
CREATE TABLE product_view_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES users(id),
    viewer_location_id UUID REFERENCES locations(id),
    source VARCHAR(30),                       -- 'search', 'category', 'boost_feed', 'notification', 'direct_link'
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_product_view_log_product ON product_view_log(product_id, created_at DESC);

-- ============================================================
-- TABLE 36: ai_usage_log (cost tracking)
-- ============================================================
CREATE TABLE ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    function_name VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_usd DECIMAL(8,6),
    was_cache_hit BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ai_usage_log_created ON ai_usage_log(created_at DESC);

-- ============================================================
-- TABLE 37: admin_alerts
-- ============================================================
CREATE TABLE admin_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    order_id UUID REFERENCES orders(id),
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES admin_users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_admin_alerts_unresolved ON admin_alerts(is_resolved, severity DESC, created_at ASC) WHERE is_resolved = false;
```

### 14.3 Seed Data Requirements

The following data must be seeded at deployment:

| Table | Source | Approximate Rows |
|-------|--------|-----------------|
| `locations` | JSON fixture with all Bangladesh divisions, districts, and upazilas | ~567 |
| `product_categories` | JSON fixture with parent + child categories | ~90 |
| `boost_tiers` | Default 4 tiers (Flash, Basic, Standard, Premium) | 4 |
| `platform_settings` | Default platform bKash/Bank/Nagad numbers + SLA values | ~15 key-value pairs |
| `admin_users` | At least 1 super_admin account | 1+ |

### 14.4 Row Level Security (RLS) Policy Summary

All user-facing tables must have RLS enabled. Below is the policy pattern:

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|-------|--------------|--------------|--------------|--------------|
| `users` | Own profile only (`id = auth.uid()`) | Via `handle_new_auth_user()` trigger + Edge Functions only | Own profile only | Soft delete only |
| `products` | All active products (public) | Farmers only (`farmer_id = auth.uid()`) | Own products only | Soft delete (set status='expired') |
| `orders` | Own orders (`buyer_id` or `farmer_id` or `transporter_id = auth.uid()`) | Buyers only (via Edge Function) | Role-specific field restrictions | Not allowed |
| `transport_offers` | All active offers (public) | Transporters only | Own offers only | Own offers only (if no bookings) |
| `buyer_requirements` | All active requirements (public) | Buyers only | Own requirements only | Own only (if no responses) |
| `rfqs` / `rfq_bids` | Participants only | Via Edge Function | Via Edge Function | Not allowed |
| `chat_messages` | Thread participants only | Thread participants only | Not allowed (immutable) | Not allowed |
| `notification_log` | Own notifications only | Via Edge Function only | Mark as read only | Not allowed |
| `boost_payments` | Own payments only | Farmers only | Not allowed | Not allowed |
| `ratings` | Public (all visible ratings) | Order participants only | Not allowed after order completed | Not allowed |

**Admin tables** (`admin_users`, `audit_log`, `admin_alerts`, `fraud_alerts`) have RLS disabled — they are accessed only via Edge Functions using the service role key.

---

## 15. API Architecture & Contracts

### 15.1 API Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Primary API** | Supabase PostgREST (auto-generated REST from Postgres schema + RLS). Used for simple CRUD. |
| **Business Logic** | Supabase Edge Functions (Deno runtime). Used for multi-step transactions, fraud checks, AI calls, notifications. |
| **Auth** | All requests require Supabase session token in `Authorization: Bearer <token>` header. |
| **Versioning** | Edge Functions are versioned via URL path: `/functions/v1/`. PostgREST endpoints are unversioned (schema-driven). |
| **Error Format** | Standardized JSON: `{ "error": true, "code": "ERROR_CODE", "message_bn": "বাংলা বার্তা", "message_en": "English message (for debugging)" }` |
| **Rate Limiting** | Per-endpoint, per-user. Enforced via Edge Function middleware + Supabase rate limiting config. |

### 15.2 Edge Function Endpoints — Complete Catalog

| # | Endpoint | Method | Auth | Rate Limit | Description |
|---|----------|--------|------|-----------|-------------|
| 1 | `/functions/v1/auth-status` | POST | Supabase JWT | 10/min | Post-auth session guard: returns profile completeness; revokes sessions of suspended/banned users. |
| 1b | `/functions/v1/sms-hook` | POST | Internal (Supabase Auth Send SMS Hook) | — | Formats the Bengali OTP message and relays it to the DP Relay gateway (`dprelay.digital-papyrus.com`). |
| 2 | `/functions/v1/complete-profile` | POST | Supabase JWT | 3/min | Complete onboarding profile + fraud check + FCM topic subscription. |
| 3 | `/functions/v1/update-profile` | PUT | Supabase JWT + OTP | 3/min | Update financial identifiers with fraud re-check. |
| 4 | `/functions/v1/fraud-check` | POST | Internal only | — | Cross-reference identifiers against user_identifiers table. |
| 5 | `/functions/v1/ai-describe` | POST | Supabase JWT (farmer) | 5/hr | Image → Bengali product description via Gemini 1.5 Flash. |
| 6 | `/functions/v1/create-product` | POST | Supabase JWT (farmer) | 10/hr | Create product listing with image processing + auto-review. |
| 7 | `/functions/v1/create-order` | POST | Supabase JWT (buyer) | 10/hr | Atomic order creation with inventory deduction + idempotency. |
| 8 | `/functions/v1/submit-payment-proof` | POST | Supabase JWT + OTP | 3/min | Upload payment proof + TX ID fraud check. Handles product, transport, and boost payments. |
| 9 | `/functions/v1/match-transport` | POST | Supabase JWT (buyer) | 10/min | Route + capacity matching algorithm for transport offers. |
| 10 | `/functions/v1/book-transport` | POST | Supabase JWT (buyer) | 5/min | Book a transport offer for an order. Atomic capacity deduction. |
| 11 | `/functions/v1/create-rfq` | POST | Supabase JWT (buyer) | 5/hr | Create RFQ for an order + notify matching transporters. |
| 12 | `/functions/v1/submit-rfq-bid` | POST | Supabase JWT (transporter) | 20/hr | Submit or update a bid on an RFQ. |
| 13 | `/functions/v1/accept-rfq-bid` | POST | Supabase JWT (buyer) | 5/min | Accept a bid + assign transport + reject other bids. |
| 14 | `/functions/v1/confirm-pickup` | POST | Supabase JWT (transporter) | 5/min | Transporter confirms goods pickup with photo. |
| 15 | `/functions/v1/confirm-delivery` | POST | Supabase JWT (buyer) | 5/min | Buyer confirms delivery with photo. |
| 16 | `/functions/v1/cancel-order` | POST | Supabase JWT | 5/min | Cancel order with role-based rules + penalty enforcement. |
| 17 | `/functions/v1/raise-dispute` | POST | Supabase JWT | 3/hr | Create dispute with evidence upload. |
| 18 | `/functions/v1/search-products` | POST | Supabase JWT | 30/min | Full-text Bengali search with filters and boost ranking. |
| 19 | `/functions/v1/search-suggestions` | GET | Supabase JWT | 60/min | Auto-complete suggestions for search bar. |
| 20 | `/functions/v1/send-notification` | POST | Internal only | — | Compose Bengali notification + send via FCM + store in notification_log. |
| 21 | `/functions/v1/storage-webhook` | POST | Internal (webhook) | — | Post-upload image processing: thumbnail, NSFW check. |
| 22 | `/functions/v1/respond-to-requirement` | POST | Supabase JWT (farmer) | 10/hr | Farmer responds to a buyer requirement with an offer. |
| 23 | `/functions/v1/accept-requirement-response` | POST | Supabase JWT (buyer) | 5/min | Buyer accepts a farmer's response → creates order. |
| 24 | `/functions/v1/ai-diagnose` | POST | Supabase JWT | 5/hr | Crop & Fish Doctor: Gemini 1.5 Flash diagnosis + treatment keywords for marketplace cross-selling (Section 4.10). |

### 15.3 PostgREST Endpoints (Auto-Generated)

Standard CRUD for simple reads/writes (RLS enforces authorization):

| Resource | GET (list) | GET (single) | Supabase Realtime |
|----------|-----------|-------------|-------------------|
| `products` | Browse active products with filters | Product detail by ID | Subscribe to product status changes |
| `transport_offers` | Browse active offers with route filter | Offer detail by ID | Subscribe to capacity changes |
| `buyer_requirements` | Browse active requirements | Requirement detail by ID | Subscribe to new responses |
| `orders` | My orders (filtered by RLS) | Order detail by ID | **Subscribe to state changes** (critical for real-time order tracking) |
| `rfqs` | My RFQs / open RFQs matching my routes | RFQ detail with bids | Subscribe to new bids |
| `chat_messages` | Messages in a thread (paginated) | — | **Subscribe to new messages** |
| `notification_log` | My notifications (paginated) | — | **Subscribe to new notifications** |
| `ratings` | Ratings for a user or product | — | — |
| `product_categories` | All active categories | — | — |
| `locations` | All locations (cached client-side) | — | — |
| `boost_tiers` | Active boost tiers | — | — |

### 15.4 Supabase Realtime Subscriptions

Critical real-time channels that the SvelteKit client subscribes to (via `@supabase/supabase-js` channel subscriptions):

| Channel | Filter | Subscriber | Events |
|---------|--------|-----------|--------|
| `orders:buyer_id=eq.{uid}` | Buyer's own orders | Buyer | State changes (e.g., `payment_verified`, `in_transit`, `delivered`) |
| `orders:farmer_id=eq.{uid}` | Farmer's orders | Farmer | New orders, state changes |
| `orders:transporter_id=eq.{uid}` | Transporter's jobs | Transporter | New assignments, state changes |
| `chat_messages:thread_id=eq.{thread_id}` | Specific chat thread | Thread participants | New messages |
| `rfq_bids:rfq_id=eq.{rfq_id}` | Bids on a specific RFQ | RFQ buyer | New bids, bid updates |
| `notification_log:user_id=eq.{uid}` | User's notifications | All users | New notifications |

---

## 16. AI Implementation Strategy

### 16.1 Model Selection & Cost Analysis

| Model | Use Case | Cost (per 1M tokens) | Latency | Bengali Quality |
|-------|---------|---------------------|---------|----------------|
| **Gemini 1.5 Flash** (primary) | Product description generation from image | ~$0.075 input / $0.30 output | 2-4s | Good — fine-tuned on multilingual data including Bengali |
| **GPT-4o-mini** (fallback) | Same — if Gemini is unavailable | ~$0.15 input / $0.60 output | 3-6s | Good |
| **Google ML Kit** (on-device, bundled TFLite) | Offline crop classification, camera-first product scan, payment OCR | $0 (on-device) | <500ms | Limited — label-only, no descriptions |

**Estimated Monthly AI Cost (at scale):**

| Metric | Value |
|--------|-------|
| Active farmers per month | 5,000 |
| Average product listings per farmer per month | 3 |
| AI calls per listing | 1 (with 30% cache hit rate → 0.7 actual API calls) |
| Total monthly API calls | 5,000 × 3 × 0.7 = 10,500 |
| Average tokens per call | ~500 input + ~300 output |
| Monthly cost (Gemini 1.5 Flash) | ~$2.70 (extremely affordable) |

### 16.2 AI Prompt Engineering — Bengali Agricultural Context

The system prompt is critical for high-quality Bengali output. Key considerations:

1. **Domain specificity:** The prompt references Bangladeshi agricultural context (crop varieties, units like মণ, local quality descriptors).
2. **Output structure:** JSON format enforced for reliable parsing.
3. **Honesty constraint:** AI must not exaggerate quality or make claims about organic/chemical-free status unless visually evident.
4. **Safety:** If image is not agricultural, AI returns `is_agricultural: false` gracefully.
5. **Fallback handling:** If AI response is unparseable, system falls back to on-device classification + template.

### 16.3 On-Device Model Training Data Requirements

The TFLite crop classification model requires a custom training dataset:

| Requirement | Specification |
|-------------|--------------|
| **Total images** | 10,000+ (minimum 200 per crop class) |
| **Classes** | ~50 Bangladeshi crop types (see Section 4.4.3) |
| **Image sources** | Field photos from Bangladeshi farms, market photos, agricultural extension databases |
| **Image quality** | Mix of high-quality and low-quality (simulating real phone cameras in field conditions) |
| **Labeling** | Bengali and English labels per image |
| **Augmentation** | Rotation, brightness variation, crop (to simulate partial views), noise addition |
| **Model architecture** | MobileNetV3-Small (TFLite optimized) with custom classification head |
| **Target metrics** | Top-1 accuracy > 85%, Top-3 accuracy > 95% |
| **Model size** | < 10MB quantized (INT8) |

### 16.4 AI Model Update Strategy

| Component | Update Mechanism | Frequency |
|-----------|-----------------|-----------|
| Cloud prompt (Gemini) | Update prompt text in Edge Function code → deploy via CI/CD | As needed (A/B testing of prompts) |
| ML Kit custom model | New model file hosted on Supabase Storage. App compares versions against `platform_settings.ml_model_version` on launch and downloads over Wi-Fi; swap applied on next start. | Monthly or on significant accuracy improvement |
| Bengali stop words | Updated in Postgres `ts_config` via migration | Rarely |
| Product category labels | Update `product_categories` table via admin panel | As new crop types are identified |

---

## 17. Offline-First & Performance Strategy

### 17.1 Offline Capabilities Matrix

| Feature | Offline Support | Behaviour |
|---------|----------------|-----------|
| Browse cached product listings | ✅ Full | Last-synced listings available via the `@capacitor-community/sqlite` local DB. Stale badge shown: "অফলাইন ডেটা — সর্বশেষ আপডেট: {time}" |
| Create product listing (draft) | ✅ Full | Saved locally; auto-published on reconnect via sync queue |
| Capture product image | ✅ Full | Stored in local app storage; uploaded when online |
| Scan product (camera-first entry) | ✅ Full | ML Kit classifies on-device and auto-selects `category_id`; Gemini auto-fills descriptions on reconnect (Section 4.9.4) |
| Crop & Fish Doctor diagnosis | ⚠️ Partial | Needs connectivity (Gemini); photo queued in the sync queue and diagnosed automatically on reconnect (Section 4.10) |
| AI description generation | ⚠️ Partial | On-device ML Kit labeling + template fallback (Section 4.4.3); full Gemini description on reconnect |
| Place order | ✅ With reservation | Stored in sync queue; server validates inventory on reconnect with 10-minute hold |
| Upload payment proof | ✅ Queued | Screenshot stored locally with `priority = critical`; submitted immediately on reconnect |
| Chat messaging | ✅ Read + queue | Read cached messages; outgoing messages queued (FIFO), delivered on reconnect |
| View own orders | ✅ Full | Cached order data with last-known state |
| Search products | ⚠️ Limited | Searches against cached listings only; full server search on reconnect |
| Push notifications | ❌ | Delivered by FCM when connectivity resumes |

### 17.2 Optimistic UI with Conflict Resolution

**Architecture:** `@capacitor-community/sqlite` is the single source of truth on the SvelteKit client. All UI reads go through the local repository layer; Svelte 5 Runes-based reactive stores (`$state` / `$derived` fed by SQLite query results) automatically update only the components that read the changed slice — the rest of the DOM is never touched (no Virtual DOM diffing of the tree). A Capacitor Background Task (`@capacitor/background-runner`) executes the sync runner inside a Web Worker and writes server responses back into the local DB. Local table definitions mirror the server schema subset; version upgrades are applied through the `schemaVersion` migration hooks described in Section 2.7.

**Optimistic Write Pattern:**
```
[User taps "পণ্য প্রকাশ করুন" (Publish Product)]
        │
        ▼
[Write to the local @capacitor-community/sqlite DB immediately]
    → UI updates instantly — no loading spinner
    → Product appears in "আমার পণ্য" with "সিঙ্ক হচ্ছে..." badge
        │
        ▼
[Capacitor Background Task enqueues sync task with priority = HIGH]
        │
        ▼
[On connectivity → POST /functions/v1/create-product]
    ├── [Success] → Update local record with server_id; remove "সিঙ্ক হচ্ছে..." badge
    └── [Conflict: record already exists] → Three-way merge UI (see below)
```

**Three-Way Merge UI (for edit conflicts):**

When both the server version and the local version of a record have changed since last sync:

```
┌────────────────────────────────────────────────┐
│  ⚠️ তথ্য পরিবর্তনের দ্বন্দ্ব                    │
│  "পাকা আম" — মূল্য পরিবর্তন                     │
│────────────────────────────────────────────────│
│  আপনার পরিবর্তন:   ৳১২০/কেজি                    │
│  সার্ভারের তথ্য:    ৳১৩০/কেজি                    │
│                                                │
│  [আমারটি রাখুন]  [সার্ভারেরটি রাখুন]  [বাতিল]  │
└────────────────────────────────────────────────┘
```

### 17.3 Intelligent Sync Queue with Priority

All offline operations enter a local priority queue **inside the device SQLite database**. A Capacitor Background Task (`@capacitor/background-runner`) runs the sync runner in a Web Worker and drains the queue respecting bandwidth and battery constraints — fired on connectivity-regained events and on a bounded OS-level background interval.

**Local Sync Queue Table (SQLite via `@capacitor-community/sqlite` — mirrors `sync_queue` server-side contract):**

```sql
CREATE TABLE sync_queue (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type   TEXT NOT NULL,
    -- 'create_product' | 'submit_order' | 'upload_payment_proof' |
    -- 'send_chat_message' | 'post_requirement' | 'post_transport_offer'
    payload_json     TEXT NOT NULL,
    priority         INTEGER DEFAULT 5,
    -- 1 = critical (payment proofs)
    -- 3 = high (orders, listings)
    -- 5 = normal (requirements, transport offers)
    -- 9 = background (analytics, view tracking)
    retry_count      INTEGER DEFAULT 0,
    max_retries      INTEGER DEFAULT 3,
    last_error       TEXT,
    created_at       INTEGER NOT NULL,  -- Unix timestamp ms
    scheduled_at     INTEGER NOT NULL,  -- Supports exponential backoff
    dependencies     TEXT,             -- JSON array of queue IDs that must complete first
    wifi_only        INTEGER DEFAULT 0  -- 1 = defer until Wi-Fi (large image uploads)
);
```

This table is created by `schemaVersion` migration v1 and is only upgraded **additively** (nullable columns are added by later `up` steps). It is explicitly excluded from any drop/recreate migration so a pending offline write can never be lost across an app update (see Section 2.7 — Local Schema Mirroring & Migration Strategy).

**Queue Draining Strategy:**

| Priority | Operation Types | Network Condition | Retry Policy |
|----------|---------------|------------------|-------------|
| 1 — Critical | Payment proof uploads | Any (2G+) | Immediate, max 5 retries, 30s backoff |
| 3 — High | Order creation, listing publish | Any (2G+) | 1-min delay, max 3 retries, exponential backoff |
| 5 — Normal | Requirements, transport offers, chat | 3G+ preferred | 5-min delay, max 3 retries |
| 9 — Background | View tracking, analytics | Wi-Fi only | Best effort; dropped after 7 days |

### 17.4 Offline Order Creation with Deferred Validation

Buyers in the field can create orders without connectivity using an **inventory reservation pattern**:

```
[Buyer creates order offline]
        │
        ▼
[Stored in sync_queue with priority = HIGH]
[Local order record created with state = 'pending_sync']
[UI shows: "অর্ডার সংরক্ষিত। সংযোগ পেলে নিশ্চিত হবে।"]
        │
        ▼
[On reconnect → POST /functions/v1/create-order]
    ├── [Inventory available]
    │       → Server creates order; reserves inventory for 10 minutes
    │       → Local record updated: server order ID, state = 'pending_payment'
    │       → Push: "আপনার অর্ডার নিশ্চিত হয়েছে! ১০ মিনিটের মধ্যে পেমেন্ট করুন।"
    │
    └── [Inventory sold out since offline creation]
            → Local order marked cancelled
            → Push: "দুঃখিত, পণ্যটি বিক্রি হয়ে গেছে। অন্য পণ্য দেখুন।"
```

### 17.5 Background Sync Status UI

A persistent, non-intrusive sync indicator is shown in the app header bar:

```
┌──────────────────────────────────────────┐
│  হাটবাজার         [🔄 ৪টি সিঙ্ক হচ্ছে]   │
└──────────────────────────────────────────┘
```

Tapping the sync badge opens a bottom sheet:

```
┌──────────────────────────────────────────┐
│  সিঙ্ক অবস্থা                             │
│────────────────────────────────────────  │
│  ✅ পণ্য তালিকা আপলোড — সম্পন্ন            │
│  🔄 পেমেন্ট প্রমাণ আপলোড — চলছে...         │
│  ⏳ অর্ডার তৈরি — অপেক্ষায়                │
│  ⏳ চ্যাট বার্তা (৩টি) — অপেক্ষায়          │
│                                          │
│  শেষ সিঙ্ক: ৫ মিনিট আগে                 │
│       [এখনই সিঙ্ক করুন]                   │
└──────────────────────────────────────────┘
```

### 17.6 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| App cold start (mid-range Android) | < 3 seconds | Time from app launch to home screen render |
| App warm start | < 1 second | Time from background to foreground |
| API response time (PostgREST) | < 500ms on 4G, < 2s on 3G | 95th percentile server-side |
| API response time (Edge Functions) | < 2s on 4G, < 5s on 3G | 95th percentile |
| AI description generation (cloud) | < 8s total (including image upload) | 95th percentile on 3G |
| Image upload time (compressed) | < 5s per image on 3G | 95th percentile for 500KB image |
| Offline order creation → sync confirmation | < 30s after reconnect | From Capacitor Background Task trigger |
| Search latency (materialized view) | < 50ms | 95th percentile, server-side |
| App APK size | **< 6MB** | Release APK/AAB build (self-hosted fonts + web bundle + Capacitor runtime; TFLite model is OTA, not bundled) |
| Local SQLite DB size (`@capacitor-community/sqlite`) | < 100MB | After 6 months of typical usage |
| DOM nodes rendered in a 100+ item feed | 5–6 item nodes | `svelte-virtual-list` virtualization; verified with Chrome DevTools DOM-size panel on a 1GB Android Go device |
| UI thread long tasks during scroll | None > 50ms | No Virtual DOM diffing; image resize/EXIF work runs in an OffscreenCanvas Web Worker |
| Memory usage (runtime) | < 200MB | During active browsing on a 1GB–2GB RAM Android Go device |
| Battery impact | < 5% per hour of active use | Mid-range Android device |

### 17.7 Image Optimization Pipeline

| Stage | Action | Result |
|-------|--------|--------|
| Capture/Select | Original image from camera/gallery | 2–10MB, various formats |
| Client compress | OffscreenCanvas Web Worker: resize to max 1024px, JPEG 80% quality, extract then strip EXIF (GPS retained for location suggestion) | ~200–500KB |
| Queue classification | Images > 500KB tagged `wifi_only = true` in sync queue | Saves mobile data |
| Upload | Resumable upload via Supabase Storage `tus` protocol | Resilient to network interruption |
| Server process | Generate 200×200 thumbnail, WebP conversion for CDN | ~20–50KB thumbnail |
| CDN delivery | Cloudflare CDN with Bangladesh edge server | < 200ms delivery from cache |

### 17.8 Data Architecture — Scalability & Performance

#### 17.8.1 Time-Based Table Partitioning

High-volume tables are partitioned by `created_at` month using PostgreSQL declarative partitioning, managed by the `pg_partman` extension:

```sql
-- Example: partitioned orders table
CREATE TABLE orders (
    -- ... all columns per Section 14.2 ...
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions auto-created by pg_partman
CREATE TABLE orders_2026_07 PARTITION OF orders
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Same pattern applied to:
-- chat_messages, notification_log, order_status_history,
-- financial_audit_log, product_views
```

Queries scoped to recent data scan only the current-month partition, keeping 10M+ row tables under 100ms.

#### 17.8.2 Materialized View for Search Ranking

Pre-compute product search scores to achieve < 50ms search latency:

```sql
CREATE MATERIALIZED VIEW product_search_rankings AS
SELECT
    p.id,
    p.title,
    p.short_desc,
    p.price_per_unit,
    p.unit,
    p.remaining_quantity,
    p.location_id,
    p.category_id,
    p.is_boosted,
    p.boost_expiry,
    (
        EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400.0
        + COALESCE(bt.boost_weight, 0)
            * (CASE WHEN p.is_boosted AND p.boost_expiry > NOW() THEN 1 ELSE 0 END)
        + (CASE WHEN u.nid_verified THEN 0.5 ELSE 0 END)
        + COALESCE(AVG(r.score), 3.0) * 0.1
    ) AS ranking_score,
    to_tsvector('simple',
        p.title || ' ' || COALESCE(p.short_desc, '')) AS search_vector
FROM products p
JOIN users u ON u.id = p.listed_by_user_id
LEFT JOIN boost_tiers bt ON bt.id = (
    SELECT boost_tier_id FROM boost_history
    WHERE product_id = p.id AND actual_expired_at IS NULL LIMIT 1
)
LEFT JOIN ratings r ON r.ratee_id = u.id
WHERE p.current_status = 'active' AND p.remaining_quantity > 0
GROUP BY p.id, u.id, bt.boost_weight;

CREATE INDEX idx_psrank_location ON product_search_rankings(location_id);
CREATE INDEX idx_psrank_category ON product_search_rankings(category_id);
CREATE INDEX idx_psrank_score    ON product_search_rankings(ranking_score DESC);
CREATE INDEX idx_psrank_search   ON product_search_rankings USING GIN(search_vector);

-- Refresh every 15 minutes via pg_cron
SELECT cron.schedule('refresh_search_rankings', '*/15 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY product_search_rankings');
```

#### 17.8.3 Redis Cache Layer

A Redis instance (Upstash for Edge Function compatibility) caches hot-read data:

| Cache Key Pattern | TTL | Content | Invalidated By |
|------------------|-----|---------|---------------|
| `product:{id}` | 5 min | Full product detail JSON | Any product update |
| `user_session:{user_id}` | 1 hour | Fraud score, suspension status | Admin action |
| `transport_offers:available:{district_id}` | 2 min | Available offers for a district | New offer posted or booking confirmed |
| `fraud_check:{identifier_hash}` | 24 hours | Fraud check result for an identifier set | Admin fraud resolution |
| `boost_tiers:active` | 30 min | All active boost tier configs | Admin tier update |
| `location_tree` | 24 hours | Full Division → District → Upazila hierarchy | Never (static reference data) |

Reduces PostgreSQL read load by ~70% for the most common query patterns.

#### 17.8.4 Data Archival Strategy

| Data Type | Active Retention | Archival Trigger | Archive Destination | Query Access |
|-----------|-----------------|-----------------|--------------------|-----------:|
| Completed orders | Indefinite in hot DB | Order age > 1 year AND state = 'completed' | Compressed Parquet → S3 | AWS Athena |
| Chat messages | 1 year post-order completion | Per Section 22, Appendix B | S3 cold storage | Admin request only |
| Read notifications | 90 days | `is_read = true AND created_at < NOW() - 90 days` | Soft-delete + batch purge | N/A |
| AI cache entries | 30 days | Per Section 4.4.4 cache policy | Deleted (not archived) | N/A |
| Financial audit log | 7 years (hot) | After 7 years | WORM S3 (legal hold) | Athena + admin portal |
| Anonymous analytics | 2 years | Aggregate only after 1 year | S3 Parquet aggregates | Athena |

---

## 18. Security Architecture

### 18.1 Authentication Security

| Measure | Implementation |
|---------|---------------|
| OAuth 2.0 | Google Sign-In via native Supabase Auth (OpenID Connect ID-token exchange via `signInWithIdToken`) |
| JWT Validation | Supabase JWT (GoTrue) verified server-side; Edge Functions resolve the session via `supabase.auth.getUser()` with automatic JWKS rotation |
| Session Tokens | Supabase JWT with 1-hour expiry + 7-day refresh token |
| Token Storage | Supabase session persisted by `@supabase/supabase-js` through a Keystore-encrypted storage adapter (Android Keystore / iOS Keychain) — never in `localStorage` or plain files |
| Certificate Pinning | SSL certificate pinning for the Supabase domain and the DP Relay SMS gateway (`dprelay.digital-papyrus.com`) |
| OTP Security | Native Supabase Phone OTP delivered via the Send SMS Hook, with per-number throttling (3 requests/hour/number) enforced in the hook and at the gateway |

### 18.2 Data Security

| Measure | Implementation |
|---------|---------------|
| Encryption at Rest | Supabase manages PostgreSQL encryption at rest (AES-256) |
| Encryption in Transit | TLS 1.3 for all API calls |
| Row Level Security | RLS enabled on all user-facing tables (see Section 14.4) |
| PII Protection | Financial identifiers (phone, bKash, bank) displayed only in authorized contexts. Never logged in application logs. |
| Image Privacy | Payment proof screenshots stored in private Supabase Storage bucket. Access via signed URLs with 1-hour expiry. |
| NID Documents | Verification documents in separate private bucket. Admin-only access. Auto-deleted after verification or 90-day retention. |
| API Keys | Server-side keys (Gemini, FCM, service role) stored as Supabase Edge Function secrets. Never in client code. |
| Attestation | Google Play Integrity API verdict validated server-side before rate-limited AI/SMS-bound calls (replaces Firebase App Check — V4.0) |
| Chat Message Encryption | Signal Protocol-based E2E encryption for all order-context chat threads. Keys generated per thread, stored in the native encrypted vault (Android Keystore / iOS Keychain). Server stores only ciphertext. | Privacy protection for sensitive negotiation |

### 18.3 Fraud Prevention Security

| Measure | Implementation |
|---------|---------------|
| Identifier Uniqueness | DB-level UNIQUE constraints + application-level cross-reference |
| TX ID Reuse Detection | Cross-table check across orders + boost_payments before accepting any payment proof |
| Device Fingerprinting | `@capacitor/device` collects device ID, model, and OS version for batch fraud analysis |
| Rate Limiting | Per-endpoint, per-user rate limits (see Section 15.2) |
| Cooldown Penalties | Automated cancellation cooldowns to prevent order spamming |
| Admin Audit Trail | Every admin action logged in `audit_log` with IP address |
| Content Moderation | NSFW image check via Google Cloud Vision SafeSearch on all uploads |
| Velocity & Pattern Detection | Flag for manual review: >3 payment proofs/hour from same user, unusual amount patterns (e.g., fractional amounts), first-time payments above ৳20,000. Handled by Edge Function `fraud-velocity-check`. | Catches structured fraud pre-verification |
| Circular Transaction Detection | Nightly pg_cron graph analysis flags users involved in circular payment patterns (A→B→C→A) within 48 hours using a recursive CTE walk on orders + boost_payments. | Proactive fraud vs reactive |

### 18.4 Rate Limiting Configuration

| Endpoint Category | Limit | Window | On Exceed |
|------------------|-------|--------|-----------|
| Authentication (auth-status, OTP send) | 10 requests | 1 minute | 429 + Bengali: "অনেক বার চেষ্টা করেছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।" |
| Read operations (search, browse) | 30 requests | 1 minute | 429 |
| Write operations (create, update) | 10 requests | 1 minute | 429 |
| Payment proof upload | 3 requests | 1 minute | 429 + Bengali: "পেমেন্ট প্রমাণ জমা দেওয়ার সীমা অতিক্রম হয়েছে।" |
| AI description | 5 requests | 1 hour | 429 + Bengali: "AI বিবরণের সীমা শেষ। পরে চেষ্টা করুন।" |
| AI diagnosis (ai-diagnose) | 5 requests | 1 hour | 429 + Bengali: "রোগ নির্ণয়ের সীমা শেষ। পরে চেষ্টা করুন।" |
| Chat messages | 60 messages | 1 minute | 429 |

### 18.5 Advanced Security Hardening

#### 18.5.1 Biometric Authentication for Sensitive Actions

Replace OTP re-verification (Section 3.2.3) with **biometric authentication as the primary method** for sensitive actions on supported devices, with OTP as the fallback:

| Action | Primary Auth | Fallback |
|--------|-------------|----------|
| Upload payment proof (order or boost) | Fingerprint / Face unlock via the Capacitor biometric plugin (`capacitor-native-biometric`) | Phone OTP |
| Change bKash ID or bank account | Fingerprint / Face unlock | Phone OTP |
| Delete account | Fingerprint / Face unlock | Phone OTP |
| Approve payment (Admin only) | Admin PIN (6-digit) | Admin OTP |

**Implementation:**
```ts
// SvelteKit + Capacitor biometric authentication
import { NativeBiometric } from 'capacitor-native-biometric';

const { isAvailable } = await NativeBiometric.isAvailable({ useFallback: true });

if (isAvailable) {
  await NativeBiometric.verifyIdentity({
    reason: 'পেমেন্ট প্রমাণ আপলোড করতে আঙুলের ছাপ দিন',
    useFallback: true,
  });
} else {
  // Fall back to OTP flow (Section 3.2.3)
}
```

#### 18.5.2 SIM Swap & Device Change Detection

| Trigger | Detection Method | Response |
|---------|-----------------|----------|
| New device fingerprint on login | Compare `device_fingerprint` from `@capacitor/device` against stored value | Push notification to old device: "নতুন ডিভাইস থেকে লগইন হয়েছে। আপনি না হলে অ্যাকাউন্ট লক করুন।" + OTP re-verification required |
| SIM change detected | Native Supabase Phone Auth detects a phone number change or re-registration | Require full re-verification of phone number. Freeze financial actions for 24 hours. Admin alerted. |
| Login from unusual location | Significant geolocation change within short time (>500km in <1 hour) | Soft flag: require OTP confirmation. Log anomaly in `audit_log`. |
| Multiple failed OTP attempts | >5 failed OTPs within 1 hour | Lock account for 2 hours. Notify user via push. Admin alerted if user has pending orders. |

#### 18.5.3 Bangladesh Bank Cybersecurity Guidelines Compliance

Per Bangladesh Bank's Mobile Financial Services (MFS) guidelines and BRPD Circular requirements:

| Requirement | Implementation |
|------------|---------------|
| Transaction Signing | All payment proof submissions signed with HMAC-SHA256 using a per-session derived key before transmission. Signature verified server-side. |
| Device Binding | First-time financial action on a new device triggers a binding step: OTP + biometric enrollment stored as `device_binding` record. Subsequent actions on unbound devices are blocked. |
| Inactivity Timeout | Auto-lock app UI after 5 minutes of inactivity if user has pending payment actions. User must re-authenticate with biometric/OTP to resume. |
| Sensitive Data Masking | bKash numbers, bank accounts displayed as `01*******45` in logs, analytics, and notifications. Full value shown only in authorized payment screen contexts. |
| Audit Log Retention | All financial state transitions retained for minimum **7 years** in `financial_audit_log` (append-only, no UPDATE/DELETE allowed via RLS). Exported nightly to WORM-configured S3 bucket. |

#### 18.5.4 Immutable Financial Audit Trail

A dedicated append-only audit ledger for all financial events:

```sql
-- Append-only financial audit table (no UPDATE, no DELETE via RLS)
CREATE TABLE financial_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    event_type  VARCHAR(50) NOT NULL,
    -- e.g. 'order_created', 'payment_proof_submitted', 'payment_approved',
    --      'payment_rejected', 'boost_activated', 'refund_issued', 'dispute_resolved'
    user_id     UUID REFERENCES users(id),
    order_id    UUID REFERENCES orders(id),
    amount_bdt  DECIMAL(14,2),
    before_state VARCHAR(50),
    after_state  VARCHAR(50),
    actor_id     UUID,          -- user_id or admin_user_id who triggered the event
    actor_type   VARCHAR(10),   -- 'user' | 'admin' | 'system'
    ip_address   INET,
    device_fingerprint TEXT,
    payload_json JSONB,         -- Full event snapshot for forensic reconstruction
    signature    TEXT,          -- HMAC-SHA256 of row content for tamper detection
    created_at   TIMESTAMP DEFAULT NOW()
);

-- RLS: No user or admin can UPDATE or DELETE. Only INSERT allowed.
CREATE POLICY "financial_audit_insert_only"
ON financial_audit_log FOR INSERT
TO authenticated WITH CHECK (true);
-- No UPDATE or DELETE policies created — effectively immutable.

-- Nightly export to WORM S3
-- Handled by pg_cron job: archive_financial_audit (see Section 22, Appendix C)
```

---

## 19. Localization & Bengali UI Catalog

### 19.1 Bengali Language Policy

- **All** user-facing text is in Bengali (Bangla script: বাংলা).
- No English text is shown to users except: proper nouns (Google, bKash), technical identifiers (Transaction IDs), and the app name "HaatBazar" (which is transliterated Bengali: হাটবাজার).
- **Font:** Noto Sans Bengali (self-hosted local WOFF2, packaged inside the APK — `Noto Sans Bengali` primary, `Hind Siliguri` secondary). No runtime CDN font request is ever issued. Fallback: system Bengali font.
- **Number Format:** Bengali digits (০১২৩৪৫৬৭৮৯) used in all UI displays. Input fields accept both Bengali and Arabic numerals (0-9) — client converts Arabic to Bengali for display.
- **Date Format:** Bengali date format: `{day} {month_name_bn} {year}` (e.g., "১৫ জুলাই ২০২৬")
- **Currency Format:** ৳{amount} (e.g., "৳১২,০০০.০০") with Bengali digit rendering.

### 19.2 Navigation & Common UI Labels

| Element | Bengali |
|---------|--------|
| Home | হোম |
| Search | খুঁজুন |
| My Orders | আমার অর্ডার |
| My Products | আমার পণ্য |
| My Offers | আমার অফার |
| Chat | চ্যাট |
| Notifications | বিজ্ঞপ্তি |
| Profile | প্রোফাইল |
| Settings | সেটিংস |
| Logout | লগআউট |
| Back | ফিরে যান |
| Next | পরবর্তী |
| Submit | জমা দিন |
| Cancel | বাতিল |
| Confirm | নিশ্চিত করুন |
| Edit | সম্পাদনা |
| Delete | মুছে ফেলুন |
| Save | সংরক্ষণ করুন |
| Refresh | রিফ্রেশ |
| Loading | লোড হচ্ছে... |
| Error | ত্রুটি |
| Success | সফল |
| Warning | সতর্কতা |
| Retry | আবার চেষ্টা করুন |
| Close | বন্ধ করুন |
| See All | সব দেখুন |
| No Results | কোনো ফলাফল পাওয়া যায়নি |
| Required Field | * আবশ্যিক |

### 19.3 Validation Error Messages Catalog

| Error Context | Bengali Message |
|--------------|----------------|
| Field empty (generic) | এই ক্ষেত্রটি পূরণ করা আবশ্যক। |
| Phone format invalid | সঠিক মোবাইল নম্বর দিন (১১ সংখ্যা, ০১ দিয়ে শুরু)। |
| bKash format invalid | সঠিক বিকাশ নম্বর দিন। |
| Bank account format | ব্যাংক অ্যাকাউন্ট নম্বর ১০-১৭ সংখ্যার হতে হবে। |
| Bank routing format | রাউটিং নম্বর ৯ সংখ্যার হতে হবে। |
| Price must be positive | মূল্য ০ এর বেশি হতে হবে। |
| Quantity must be positive | পরিমাণ ০ এর বেশি হতে হবে। |
| Quantity exceeds available | পর্যাপ্ত পরিমাণ নেই। বর্তমানে {remaining} {unit} পাওয়া যাচ্ছে। |
| Min order not met | সর্বনিম্ন অর্ডার পরিমাণ {min_qty} {unit}। |
| Date in past | তারিখ ভবিষ্যতের হতে হবে। |
| Image too large | ছবির আকার ৫MB এর বেশি হতে পারবে না। |
| Text too long | বিবরণ {max_chars} অক্ষরের মধ্যে রাখুন। |
| Network error | ইন্টারনেট সংযোগ নেই। অনুগ্রহ করে সংযোগ পরীক্ষা করুন। |
| Server error | সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন। |
| Session expired | আপনার সেশন শেষ হয়েছে। আবার লগইন করুন। |
| Account suspended | আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে। সহায়তার জন্য যোগাযোগ করুন। |
| Duplicate identifier | এই তথ্য ইতিমধ্যে অন্য একটি অ্যাকাউন্টের সাথে যুক্ত। |
| OTP invalid | ভুল কোড। আবার চেষ্টা করুন। |
| OTP expired | কোডের মেয়াদ শেষ। নতুন কোড পাঠান। |
| OTP rate limited | অনেকবার ভুল কোড দেওয়া হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন। |
| Cancellation cooldown | আপনি সম্প্রতি অর্ডার বাতিল করেছেন। {hours} ঘণ্টা পর নতুন অর্ডার দিতে পারবেন। |
| Max active listings | আপনি সর্বোচ্চ সংখ্যক সক্রিয় পণ্য তালিকায় পৌঁছেছেন। |
| Max active requirements | আপনি সর্বোচ্চ ১০টি সক্রিয় চাহিদা পোস্ট করতে পারবেন। |

---

## 20. Deployment, CI/CD & Monitoring

### 20.1 Deployment Strategy

| Component | Deployment Target | CI/CD |
|-----------|------------------|-------|
| SvelteKit App (Android, Capacitor) | Google Play Store (production + internal testing tracks) | GitHub Actions → `npm run build` (adapter-static) → `npx cap sync android` → Gradle build APK/AAB → upload to Play Console |
| SvelteKit App (iOS, Capacitor) | Apple App Store (production + TestFlight) | GitHub Actions → `npm run build` → `npx cap sync ios` → Xcode build IPA → upload to App Store Connect |
| Supabase Backend | Supabase Cloud (or self-hosted) | Supabase CLI migrations + Edge Function deploys via GitHub Actions |
| Edge Functions | Supabase Edge Functions (Deno Deploy) | `supabase functions deploy` in CI pipeline |
| Admin Panel | Vercel or Supabase-hosted (Next.js/React) | GitHub Actions → build → deploy to Vercel |
| ML Kit Model | Supabase Storage (OTA download; executed on-device by the `HaatBazarTFLite` plugin wrapping Google ML Kit) | Manual upload after model training + validation |
| Database Migrations | Supabase Migrations (SQL files in `/supabase/migrations/`) | Applied via `supabase db push` in CI |
| Seed Data | SQL seed files in `/supabase/seed/` | Applied via `supabase db seed` on initial deployment |

### 20.2 Environment Strategy

| Environment | Purpose | Data |
|-------------|---------|------|
| `local` | Developer workstation | Supabase local (Docker). Seeded test data. |
| `staging` | Pre-release testing | Supabase staging project. Anonymized production-like data. |
| `production` | Live users | Supabase production project. Real data. |

### 20.3 Monitoring & Alerting

| System | Tool | Key Metrics |
|--------|------|-------------|
| App Crashes | Sentry (SvelteKit Browser SDK + Capacitor native SDK) | Crash-free rate > 99.5%. Alert on new crash types. |
| API Errors | Sentry (Edge Function SDK) | 5xx rate < 0.1%. Alert on 5xx spike. |
| API Latency | Supabase Dashboard + custom PostHog events | P95 < 2s. Alert on P95 > 5s. |
| Database Performance | Supabase Dashboard (pg_stat_statements) | Slow query log (> 1s). Connection pool utilization < 80%. |
| Payment Verification SLA | Custom admin dashboard metric | Alert when any payment pending > 24h. |
| Fraud Alert Volume | Custom admin dashboard metric | Alert on > 10 fraud alerts/day (unusual spike). |
| Push Notification Delivery | FCM Dashboard | Delivery rate > 95%. |
| Storage Usage | Supabase Dashboard | Alert at 80% storage quota. |
| Cron Job Health | pg_cron logs + admin alert on failure | All 5-minute jobs must complete within 60 seconds. |

### 20.4 Backup & Disaster Recovery

| Component | Backup Strategy | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|-----------|----------------|------|------|
| PostgreSQL Database | Supabase automated daily backups + Point-in-Time Recovery (PITR) | 5 minutes (PITR) | < 1 hour |
| File Storage (images) | Supabase Storage with redundancy | 0 (real-time replication) | < 30 minutes |
| Edge Function Code | Git repository (GitHub) | 0 (git history) | < 15 minutes (redeploy) |
| Environment Secrets | Stored in Supabase project settings + documented in encrypted vault | 0 | < 15 minutes |

---

## 21. Risk Matrix & Mitigation

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|-----------|
| 1 | **AI model produces inaccurate Bengali descriptions** | Medium | Low (user can edit) | Fallback to on-device classification + template. Confidence score threshold (< 0.5 → show warning). User always edits before publish. |
| 2 | **Manual payment verification bottleneck** (admin can't keep up with volume) | High | High | Admin dashboard optimized for speed (< 30 seconds per verification). SLA tracking with escalation. Hire additional verifiers as volume grows. Future: partial automation with screenshot OCR. |
| 3 | **Duplicate/fraudulent accounts bypass detection** | Medium | High | Multi-layer detection: DB constraints + real-time cross-reference + nightly batch analysis + device fingerprinting. Admin fraud resolution workflow. |
| 4 | **Poor network connectivity in rural Bangladesh** | High | Medium | Offline-first architecture. Resumable uploads. Aggressive image compression. Background sync queue with retry logic. |
| 5 | **Payment disputes where farmer/transporter refuses refund** | Medium | High | Dispute resolution workflow with admin mediation. Internal wallet credits as temporary relief. Penalty escalation (warning → suspension → ban). Clear terms of service. |
| 6 | **App store rejection** (Google Play or Apple App Store) | Low | High | Follow platform guidelines strictly. No hidden functionality. Privacy policy and terms of service in Bengali. Data deletion feature (GDPR/Apple requirement). |
| 7 | **Supabase service outage** | Low | Critical | Offline-first design minimizes impact. Consider multi-region setup for production. Monitoring + automatic failover if self-hosted. |
| 8 | **Gemini API price increase or deprecation** | Low | Medium | Abstraction layer for AI provider. GPT-4o-mini as fallback. On-device classification as last resort. Evaluate open-source Bengali LLMs periodically. |
| 9 | **Low initial user adoption** (chicken-and-egg marketplace problem) | High | High | Launch in 2-3 specific districts first (e.g., Bogra, Rajshahi — major agricultural regions). Seed supply side (onboard farmers directly). Free boost credits for early adopters. |
| 10 | **Bengali text rendering issues across Android devices** | Low | Medium | Use self-hosted local WOFF2 `Noto Sans Bengali` (`Hind Siliguri` secondary) — never a CDN fetch. Test on 10+ Android devices across Android 11–13 Go Edition with different WebView versions. Fallback to system Bengali font. |
| 11 | **Admin account compromise** | Low | Critical | Strong passwords + 2FA for admin panel. IP allowlisting for admin endpoints. All actions logged in audit_log. Session expiry: 4 hours. |
| 12 | **Data privacy regulation (Bangladesh Digital Security Act)** | Medium | Medium | Minimal PII collection. Data retention policies. Account deletion feature. NID documents auto-deleted after verification. Privacy policy in Bengali. |
| 13 | **Transaction ID screenshot forgery** | Medium | High | Admin visual verification is the primary defense. Future enhancement: OCR-based automated screenshot verification. TX ID cross-check prevents reuse even if forged. |

---

## 22. Appendices

### Appendix A: Glossary — Bengali Terms for UI

| English | Bengali | Transliteration | Usage Context |
|---------|--------|----------------|---------------|
| Add Product | পণ্য যোগ করুন | Ponno Jog Korun | Farmer action button |
| Post Requirement | চাহিদা পোস্ট করুন | Chahida Post Korun | Buyer action button |
| Transport Offer | পরিবহন অফার | Poribohon Offer | Transporter feature |
| Payment Proof | পেমেন্ট প্রমাণ | Payment Proman | Payment flow |
| Dispute | বিতর্ক / বিবাদ | Bitorko / Bibad | Dispute flow |
| Boost | বুস্ট করুন | Boost Korun | Monetization feature |
| Verified | যাচাইকৃত | Jachai-krito | Trust badge |
| Order | অর্ডার | Order | Transaction |
| Delivery | ডেলিভারি | Delivery | Logistics |
| Pickup | পিকআপ | Pickup | Logistics |
| Rating | রেটিং | Rating | Review system |
| Cancel | বাতিল | Batil | Action button |
| Confirm | নিশ্চিত করুন | Nishchit Korun | Action button |
| Farmer | কৃষক | Krishok | User role |
| Buyer | ক্রেতা | Kreta | User role |
| Transport Company | পরিবহন কোম্পানি | Poribohon Company | User role |
| Admin | অ্যাডমিন | Admin | System role |
| Commission | কমিশন | Commission | Financial term |
| Refund | ফেরত | Feret | Financial term |
| Wallet | ওয়ালেট | Wallet | Financial term |
| OTP | ওটিপি / কোড | OTP / Code | Authentication |
| Screenshot | স্ক্রিনশট | Screenshot | Payment proof |
| Transaction ID | লেনদেন আইডি | Lenden ID | Payment proof |

### Appendix B: Data Retention Policies

| Data Category | Active Retention | Archive | Purge |
|-------------- |-----------------|---------|-------|
| User profiles (active) | Indefinite | — | — |
| User profiles (soft-deleted) | 90 days | — | Anonymize PII after 90 days |
| Product listings (active/sold) | Indefinite | — | — |
| Product listings (expired) | 1 year | Move to archive table | Purge after 2 years |
| Orders (completed) | Indefinite | — | — |
| Orders (cancelled) | 1 year | Archive | Purge after 2 years |
| Payment proofs (screenshots) | 1 year after order completion | — | Delete from storage |
| NID verification documents | 30 days after verification decision | — | Delete from storage |
| Chat messages | 1 year after order completion | Archive | Purge after 2 years |
| Notification log | 90 days | — | Hard delete |
| Search log | 90 days | — | Hard delete |
| Product view log | 90 days | — | Hard delete |
| AI cache | 30 days | — | Hard delete |
| Audit log | 2 years | — | Archive to cold storage |
| Fraud alerts | 3 years | — | Archive to cold storage |

### Appendix C: pg_cron Schedule Summary

| Job Name | Schedule | Description |
|----------|---------|-------------|
| `enforce_order_timeouts` | `*/5 * * * *` (every 5 min) | Cancel stale orders, escalate overdue verifications, auto-complete delivered orders |
| `expire_products` | `*/5 * * * *` (every 5 min) | Expire products past expiry_date or 90-day stale |
| `expire_boosts` | `*/5 * * * *` (every 5 min) | Deactivate expired product boosts |
| `expire_buyer_requirements` | `*/5 * * * *` (every 5 min) | Expire requirements past deadline_date |
| `expire_transport_offers` | `*/5 * * * *` (every 5 min) | Expire transport offers past available_to |
| `expire_rfqs` | `*/5 * * * *` (every 5 min) | Expire open RFQs past bid_deadline |
| `expire_wallet_credits` | `0 3 * * *` (daily 3 AM BDT) | Void expired wallet credits (90-day expiry) |
| `batch_fraud_analysis` | `0 2 * * *` (daily 2 AM BDT) | Fuzzy matching, device fingerprint analysis, self-dealing detection |
| `update_search_suggestions` | `0 4 * * *` (daily 4 AM BDT) | Regenerate top search suggestions from search_log |
| `purge_stale_notifications` | `0 5 * * 0` (weekly Sun 5 AM) | Delete notifications older than 90 days |
| `purge_ai_cache` | `0 5 * * 0` (weekly Sun 5 AM) | Delete AI cache entries older than 30 days |
| `purge_view_logs` | `0 5 1 * *` (monthly 1st 5 AM) | Delete product view logs older than 90 days |
| `refresh_rating_materialized_view` | `*/15 * * * *` (every 15 min) | Refresh aggregated rating scores for search ranking |
| `cleanup_orphan_images` | `0 6 * * 0` (weekly Sun 6 AM) | Delete uploaded images not linked to any product (draft abandoned) |

### Appendix D: Admin Panel RBAC Matrix

| Permission | super_admin | payment_verifier | dispute_resolver | content_moderator |
|-----------|:-----------:|:----------------:|:----------------:|:-----------------:|
| View payment verification queue | ✅ | ✅ | ❌ | ❌ |
| Approve/reject payments | ✅ | ✅ | ❌ | ❌ |
| View disputes | ✅ | ❌ | ✅ | ❌ |
| Resolve disputes | ✅ | ❌ | ✅ | ❌ |
| Create refund notes | ✅ | ❌ | ✅ | ❌ |
| View fraud alerts | ✅ | ✅ | ✅ | ❌ |
| Resolve fraud alerts | ✅ | ❌ | ❌ | ❌ |
| Suspend/ban users | ✅ | ❌ | ❌ | ❌ |
| Review product reports | ✅ | ❌ | ❌ | ✅ |
| Suspend/restore product listings | ✅ | ❌ | ❌ | ✅ |
| Review NID verifications | ✅ | ❌ | ❌ | ✅ |
| Manage boost tiers | ✅ | ❌ | ❌ | ❌ |
| Manage platform settings | ✅ | ❌ | ❌ | ❌ |
| Manage admin users | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |
| View financial analytics | ✅ | ✅ | ❌ | ❌ |
| Issue wallet credits | ✅ | ❌ | ✅ | ❌ |
| Force-cancel orders | ✅ | ❌ | ✅ | ❌ |
| View all users | ✅ | ✅ | ✅ | ✅ |

---

**END OF DOCUMENT — V3.0**

**Document Version:** 3.0
**Total Tables Defined:** 37
**Total API Endpoints:** 23 Edge Functions + ~15 PostgREST auto-endpoints
**Total State Machines:** 6 (Product, Order, RFQ, Transport Offer, Buyer Requirement, Boost Payment)
**Total Bengali UI Labels Cataloged:** 50+ navigation + 25+ error messages + 20+ notification templates
**Total pg_cron Jobs:** 14

This PRD provides a **complete technical blueprint** for the Technical Architect Agent to generate a detailed coding plan, database migration scripts, Edge Function implementations, SvelteKit screen specifications, and admin panel requirements without ambiguity.

---
---
---

# Product Requirements Document (PRD) — Version 4.0

**HaatBazar (হাটবাজার) — Agricultural Marketplace Platform**
**Mobile Application**
**Version 4.0 — Subscription System, AI Usage Quota & Unified Activity Logging**
**Supersedes PRD-V3.0 in sections explicitly marked. All un-amended V3.0 sections remain in force.**
**Prepared by: Senior Product Manager**
**Classification: Internal — Technical**

---

## Table of Contents (V4.0)

1. [V4.0 Changelog & Scope](#v40-changelog--scope)
2. [Section 7 Addendum — Subscription System](#section-7-addendum--subscription-system)
   - 7.8 Subscription Model Overview
   - 7.9 Subscription Tiers
   - 7.10 Free Trial Mechanics & Degradation Ladder
   - 7.11 Subscription State Machine
   - 7.12 Subscription Purchase & Manual Payment Flow
   - 7.13 Subscription Data Model
   - 7.14 AI Usage Quota System
   - 7.15 Subscription Expiry & Renewal Automation
3. [Section 7 Amendment — Admin-Configurable Boost Rates](#section-7-amendment--admin-configurable-boost-rates)
4. [Section 13 Addendum — Admin Settings Panel](#section-13-addendum--admin-settings-panel)
   - 13.7 Boost Tier Rate & Duration Management
   - 13.8 Subscription Rate Management
5. [Section 23 — Activity & Audit Logging System](#section-23--activity--audit-logging-system)
   - 23.1 Logging Architecture
   - 23.2 Activity Log Data Model
   - 23.3 Log Categories & Event Matrix
   - 23.4 User Activity Log — Self-View Screen
   - 23.5 Admin Master Log View
   - 23.6 Log Retention & Archival Policy
6. [Database Schema Supplement](#database-schema-supplement)
7. [API Endpoints Supplement](#api-endpoints-supplement)
8. [Notification Matrix Supplement](#notification-matrix-supplement)
9. [Bengali UI Catalog Supplement](#bengali-ui-catalog-supplement)
10. [Updated Admin RBAC Matrix](#updated-admin-rbac-matrix)
11. [Risk Matrix Addendum](#risk-matrix-addendum)
12. [Appendix E: V4.0 pg_cron Schedule Additions](#appendix-e-v40-pg_cron-schedule-additions)
13. [Appendix F: V4.0 Document Statistics](#appendix-f-v40-document-statistics)

---

## V4.0 Changelog & Scope

### 1.1 Summary of Changes

| # | Area | Change Type | V3.0 State | V4.0 State |
|---|------|-------------|------------|------------|
| 1 | Revenue Model | Addition | Boosting only | Boosting + Subscriptions |
| 2 | Subscription System | New | Not present | Full subscription lifecycle with free trial ladder |
| 3 | AI Usage | Modified | Unlimited per user | Quota-gated per subscription tier |
| 4 | Free Trial | New | Not present | 1x Free Monthly (3 AI uses) → 1x Free Weekly (1 AI use) |
| 5 | Admin Settings — Boost | Enhancement | DB-configurable but no UI spec | Explicit admin panel screen with rate & duration fields |
| 6 | Admin Settings — Subscription | New | Not present | Admin panel screen to set Monthly and Yearly subscription prices |
| 7 | Activity Logging | New | audit_log (admin only) | activity_log (all events) + user self-view + admin master view |
| 8 | Database Schema | Addition | 37 tables | +6 new tables: subscription_tiers, user_subscriptions, subscription_payments, ai_usage_log, activity_log, activity_log_archive |
| 9 | RBAC | Extension | 4 admin roles | +2 permissions: manage_subscription_settings, view activity_log per-user during case |
| 10 | Notification Matrix | Extension | 14 notification types | +11 notification types for subscription lifecycle + AI quota alerts |

### 1.2 Unchanged V3.0 Sections

The following V3.0 sections are **unchanged** and remain the canonical specification:

- Section 2: System Architecture
- Section 3: User Roles, Authentication & Fraud Prevention
- Section 4: Product Listings & AI Integration *(except Section 4.4 — quota enforcement integrated per Section 7.14 below)*
- Section 5: Marketplace Dynamics
- Section 6: Transaction & Logistics
- Section 8: Payments & Financials
- Section 9: Search, Discovery & Recommendation
- Section 10: Notification System *(extended in Section 8 below)*
- Section 11: Chat & Messaging
- Section 12: Dispute Resolution
- Section 14: Complete Database Schema *(extended, not replaced)*
- Section 15: API Architecture *(extended in Section 7 below)*
- Section 16: AI Implementation Strategy
- Section 17: Offline-First & Performance
- Section 18: Security Architecture
- Section 19: Localization & Bengali UI Catalog *(extended in Section 9 below)*
- Section 20: Deployment, CI/CD & Monitoring
- Section 21: Risk Matrix *(extended in Section 11 below)*
- Section 22: Appendices *(extended in Appendices E & F below)*

### 1.3 Scope

**In Scope:**
- Subscription tier definition and lifecycle
- Free trial degradation mechanics
- AI usage quota enforcement and UI
- Admin panel screens for boost rate/duration management and subscription rate management
- Unified activity logging system accessible to users and admin

**Out of Scope:**
- Automated recurring billing (deferred to future phase)
- Usage analytics dashboards for subscriptions (future phase)
- Per-feature gating beyond AI quota (all other features remain free)

---

## Section 7 Addendum — Subscription System

### 7.8 Subscription Model Overview

#### 7.8.1 Revenue Position

HaatBazar generates revenue from 2 sources as of V4.0:

| Revenue Source | Mechanism | Who Pays |
|----------------|-----------|----------|
| Product Boosting | One-time manual payment per boost | Any user who lists products |
| Subscriptions | Periodic manual payment per billing cycle | Any user who wants AI product description quota above free tier |

- Core marketplace features (listing, browsing, buying, selling, transport, RFQ) remain **free with 0% commission**.
- AI-powered product description generation (Section 4.4) is **quota-gated** by subscription tier.
- A user with 0 remaining AI quota can still list products manually; they cannot use AI assistance.

#### 7.8.2 Platform Statement

Display the following on the subscription selection screen and every subscription confirmation screen:

> "সাবস্ক্রিপশন শুধুমাত্র AI সহায়তার জন্য। কেনাবেচায় শূন্য কমিশন — সবসময়।"

---

### 7.9 Subscription Tiers

#### 7.9.1 Tier Definitions

| Tier Slug | Bengali Name | Type | Duration | Price (BDT) | AI Uses / 30-day Period | Max Activations per User |
|-----------|-------------|------|----------|-------------|------------------------|--------------------------|
| `free_monthly` | বিনামূল্যে মাসিক | Free trial | 30 days | ৳0 | 3 | 1 lifetime |
| `free_weekly` | বিনামূল্যে সাপ্তাহিক | Free trial | 7 days | ৳0 | 1 | 1 lifetime |
| `paid_monthly` | মাসিক সাবস্ক্রিপশন | Paid | 30 days | Admin-configurable | 30 | Unlimited |
| `paid_yearly` | বার্ষিক সাবস্ক্রিপশন | Paid, Default | 365 days | Admin-configurable | 30 per 30-day period (360 total) | Unlimited |

#### 7.9.2 AI Quota Rules

- "30 AI uses per 30-day period" applies to both `paid_monthly` and `paid_yearly`.
- For `paid_yearly`: The 30-use quota refreshes every 30 calendar days from the subscription start date. Unused AI uses **do not roll over**.
- For `free_monthly`: 3 AI uses are granted at trial activation. They do not refresh.
- For `free_weekly`: 1 AI use is granted at trial activation. It does not refresh.
- At 0 remaining AI uses, the AI button shows an upsell prompt, not an error message.

#### 7.9.3 Default Selection Rule

- The subscription upgrade screen **pre-selects** `paid_yearly` as the default option.
- The user must actively switch to select `paid_monthly`.
- New users enter via free trial, not direct paid selection.

#### 7.9.4 Admin-Configurable Prices

- Prices for `paid_monthly` and `paid_yearly` are stored in `subscription_tiers` and managed via admin panel (Section 13.8).
- Price changes apply to new subscriptions only.
- `price_at_purchase` is stored on each `user_subscriptions` record to preserve historical pricing.

---

### 7.10 Free Trial Mechanics & Degradation Ladder

#### 7.10.1 Trial Lifecycle

```
[New user registers]
        │
        ▼
[System auto-activates: free_monthly trial]
    • Duration: 30 days from registration timestamp
    • AI quota: 3 uses granted immediately
    • No payment required. No admin verification required.
        │
        ▼
[free_monthly expires at T+30 days]
        │
        ▼
[System auto-activates: free_weekly trial]
    • Duration: 7 days from free_monthly expiry timestamp
    • AI quota: 1 use granted immediately
    • No payment required. No admin verification required.
    • Notification: "আপনার বিনামূল্যে মাসিক সাবস্ক্রিপশন শেষ হয়েছে।
      ৭ দিনের বিনামূল্যে ট্রায়াল শুরু হয়েছে।"
        │
        ▼
[free_weekly expires at T+37 days from registration]
        │
        ▼
[Subscription status: expired]
    • AI quota: 0
    • User sees upsell prompt every time they tap AI button
    • All other app functions remain unaffected
    • Notification: "আপনার বিনামূল্যে ট্রায়াল শেষ হয়েছে।
      AI সহায়তা চালু রাখতে সাবস্ক্রিপশন নিন।"
```

#### 7.10.2 Degradation Rules

- `free_monthly` activates exactly **once** per account. Flag `lifetime_free_monthly_used = true` is set on the `users` record at activation.
- `free_weekly` activates exactly **once** per account. Flag `lifetime_free_weekly_used = true` is set at activation.
- Both flags are cross-checked against the fraud fingerprint (device ID + phone number) from Section 3.3.
- A user who attempts to re-register with the same phone or device to reclaim free trials receives: "এই নম্বরের জন্য বিনামূল্যে ট্রায়াল আগে ব্যবহার করা হয়েছে।"
- Users with `fraud_risk_score > 0.5` at registration are denied free trial and must subscribe immediately.

#### 7.10.3 Intentional Friction Design

| Phase | Trial | Duration | AI Uses | User Experience |
|-------|-------|----------|---------|----------------|
| 1 | Free Monthly | 30 days | 3 | Adequate onboarding |
| 2 | Free Weekly | 7 days | 1 | Constrained — wants more |
| 3 | Expired | 0 days | 0 | Must pay or list manually |

- The upsell screen in Phase 3 cannot be dismissed for **3 seconds** (admin-configurable via `platform_settings.ai_quota_exhausted_upsell_dismiss_delay_seconds`).
- The upsell screen displays the exact number of AI uses the user attempted since quota exhaustion.

---

### 7.11 Subscription State Machine

#### 7.11.1 States

| State | Description | AI Quota |
|-------|-------------|----------|
| `free_monthly_active` | Free monthly trial running | 3 (minus used) |
| `free_weekly_active` | Free weekly trial running | 1 (minus used) |
| `expired` | All trials used, no paid subscription | 0 |
| `pending_payment` | Payment proof submitted; awaiting admin verification | 0 |
| `paid_monthly_active` | Active paid monthly subscription | 30 (minus used in current 30-day window) |
| `paid_yearly_active` | Active paid yearly subscription | 30 per period (minus used) |
| `payment_rejected` | Admin rejected payment proof | 0 |

#### 7.11.2 State Transitions

| From State | Event | To State | Notes |
|------------|-------|----------|-------|
| *(new user)* | Registration completes | `free_monthly_active` | Auto; no action required |
| `free_monthly_active` | T+30 days (pg_cron) | `free_weekly_active` | Auto; quota reset to 1 |
| `free_weekly_active` | T+7 days (pg_cron) | `expired` | Auto; quota set to 0 |
| `expired` | User submits subscription payment | `pending_payment` | User selects Monthly or Yearly |
| `paid_monthly_active` | Subscription expires (T+30) | `expired` | Unless renewed |
| `paid_yearly_active` | Subscription expires (T+365) | `expired` | Unless renewed |
| `pending_payment` | Admin approves payment | `paid_monthly_active` or `paid_yearly_active` | Based on tier selected |
| `pending_payment` | Admin rejects payment | `payment_rejected` | User notified with reason |
| `payment_rejected` | User re-submits proof | `pending_payment` | Max 3 re-submissions per 24h |
| `paid_monthly_active` | User submits renewal | `pending_payment` | Old subscription continues until new one approved |
| `paid_yearly_active` | User submits renewal | `pending_payment` | Old subscription continues until new one approved |

#### 7.11.3 Concurrent Subscription Rules

- 1 active subscription per user at any time.
- When upgrading from Monthly to Yearly: old subscription remains active until new one is approved, then terminated.
- Remaining AI uses from the previous subscription **do not carry over** on upgrade.

---

### 7.12 Subscription Purchase & Manual Payment Flow

#### 7.12.1 Entry Points

| # | Entry Point | Trigger |
|---|-------------|---------|
| 1 | AI Quota Upsell Prompt | User taps AI button with 0 remaining uses |
| 2 | Profile > সাবস্ক্রিপশন | Dedicated subscription management screen |
| 3 | Subscription Expiry Notification | Deep-link from expiry push notification |

#### 7.12.2 Subscription Selection Screen

```
┌─────────────────────────────────────────┐
│  ← সাবস্ক্রিপশন নির্বাচন করুন              │
│─────────────────────────────────────────│
│  🤖 AI সহায়তা আনলক করুন                  │
│  প্রতিটি প্যাকেজে মাসে ৩০টি AI ব্যবহার     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🌟 বার্ষিক সাবস্ক্রিপশন  [সুপারিশ]  │    │
│  │ ১ বছর | ৳{yearly_price}          │    │
│  │ মাসে মাত্র ৳{yearly_price/12}     │    │
│  │ ৩৬০টি AI ব্যবহার (মাসে ৩০টি)      │    │
│  │                          (●)    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📅 মাসিক সাবস্ক্রিপশন              │    │
│  │ ১ মাস | ৳{monthly_price}         │    │
│  │ মাসে ৩০টি AI ব্যবহার               │    │
│  │                          ( )    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ✅ পণ্য তালিকা: সীমাহীন               │
│  ✅ কেনাবেচা: ০% কমিশন                │
│  ✅ AI বর্ণনা তৈরি: ৩০টি/মাস           │
│  ✅ স্বয়ংক্রিয় নবায়ন নেই               │
│                                         │
│       [পেমেন্ট করুন — ৳{price}]          │
└─────────────────────────────────────────┘
```

#### 7.12.3 Payment Flow

The subscription payment flow is **identical** to the boost payment flow (Section 7.4.3) with these substitutions:

| Boost Payment | Subscription Payment Equivalent |
|---------------|---------------------------------|
| `boost_tier_id` | `subscription_tier_id` |
| Reference prefix `BOOST-` | Reference prefix `SUB-` |
| Table: `boost_payments` | Table: `subscription_payments` |
| Admin queue label: "বুস্ট পেমেন্ট" | Admin queue label: "সাবস্ক্রিপশন পেমেন্ট" |

The same OCR pre-verification (Section 8.12.1) and risk scoring (Section 8.12.2) apply to subscription payments.

#### 7.12.4 Subscription Activation on Admin Approval

```sql
BEGIN TRANSACTION;

-- Deactivate overlapping subscriptions
UPDATE user_subscriptions
SET status = 'superseded', ended_at = NOW()
WHERE user_id = :user_id
  AND status IN ('paid_monthly_active', 'paid_yearly_active');

-- Create new subscription record
INSERT INTO user_subscriptions (
    id, user_id, subscription_tier_id,
    price_at_purchase, payment_id, status,
    starts_at, expires_at,
    ai_uses_remaining, ai_uses_total,
    current_period_start, current_period_end
) VALUES (
    gen_random_uuid(), :user_id, :tier_id,
    :tier_price, :payment_id, :new_status,
    NOW(), NOW() + :tier_duration,
    30, 30, NOW(), NOW() + INTERVAL '30 days'
);

-- Update user cache
UPDATE users
SET subscription_status = :new_status,
    subscription_expires_at = NOW() + :tier_duration,
    ai_uses_remaining = 30,
    updated_at = NOW()
WHERE id = :user_id;

-- Log the activation
INSERT INTO activity_log (user_id, event_type, event_category, metadata)
VALUES (:user_id, 'subscription_activated', 'SUBSCRIPTION',
    jsonb_build_object('tier', :tier_slug, 'expires_at', NOW() + :tier_duration));

COMMIT;
```

---

### 7.13 Subscription Data Model

#### 7.13.1 `subscription_tiers` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| slug | VARCHAR(30) UNIQUE | `free_monthly`, `free_weekly`, `paid_monthly`, `paid_yearly` |
| name_bn | VARCHAR(100) | Bengali display name |
| type | VARCHAR(20) | `free_trial` or `paid` |
| duration_days | INTEGER | 30, 7, 30, 365 |
| price_bdt | DECIMAL(10,2) | 0.00 for free; admin-set for paid |
| ai_uses_per_period | INTEGER | 3, 1, 30, 30 |
| ai_period_days | INTEGER NULL | Quota refresh window in days. NULL for free tiers (no refresh). |
| is_active | BOOLEAN DEFAULT true | Whether available for new subscriptions |
| max_lifetime_activations | INTEGER NULL | 1 for free tiers; NULL (unlimited) for paid tiers |
| display_order | INTEGER | Sort order in selection UI |
| created_at | TIMESTAMP | When tier was created |
| updated_at | TIMESTAMP | Last admin modification |

**Constraints:** `CHECK (price_bdt >= 0)`, `CHECK (ai_uses_per_period > 0)`, `CHECK (duration_days > 0)`

#### 7.13.2 `user_subscriptions` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| user_id | UUID FK → users.id | Subscriber |
| subscription_tier_id | UUID FK → subscription_tiers.id | Which tier |
| payment_id | UUID FK → subscription_payments.id NULL | NULL for free trials |
| price_at_purchase | DECIMAL(10,2) | Locked-in price at time of purchase |
| status | VARCHAR(30) | See state machine (7.11.1) |
| starts_at | TIMESTAMP | When subscription became active |
| expires_at | TIMESTAMP | When subscription ends |
| ended_at | TIMESTAMP NULL | When terminated or superseded |
| ai_uses_remaining | INTEGER | Current remaining AI uses in this period |
| ai_uses_total | INTEGER | Total AI uses granted in this period |
| current_period_start | TIMESTAMP NULL | Start of current AI quota window |
| current_period_end | TIMESTAMP NULL | End of current AI quota window |
| created_at | TIMESTAMP | Record creation timestamp |

**Indexes:**
- `idx_user_subscriptions_user` ON `(user_id, status)`
- `idx_user_subscriptions_expires` ON `(expires_at)`

**Constraints:** `CHECK (ai_uses_remaining >= 0)`, status CHECK matching all valid states

#### 7.13.3 `subscription_payments` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| user_id | UUID FK → users.id | Subscriber |
| subscription_tier_id | UUID FK → subscription_tiers.id | Tier selected |
| amount_bdt | DECIMAL(10,2) | Amount at time of submission |
| payment_method | VARCHAR(20) | `bkash`, `nagad`, `bank_transfer` |
| tx_id | VARCHAR(100) | Transaction ID provided by user |
| proof_url | TEXT | Screenshot URL in Supabase Storage |
| status | VARCHAR(30) | `pending_verification`, `approved`, `rejected` |
| rejection_reason | TEXT NULL | Admin rejection reason (Bengali) |
| verified_by | UUID FK → admin_users.id NULL | Admin who verified |
| verified_at | TIMESTAMP NULL | When verification completed |
| resubmission_count | INTEGER DEFAULT 0 | Times re-submitted after rejection (max 3 per 24h) |
| created_at | TIMESTAMP | When proof was submitted |

**Constraints:** `CHECK (amount_bdt > 0)`, `UNIQUE(tx_id)` — enforced cross-table via trigger against `boost_payments.tx_id` and `orders.tx_id`

#### 7.13.4 `users` Table — New Fields (V4.0)

| New Field | Type | Default | Description |
|-----------|------|---------|-------------|
| `subscription_status` | VARCHAR(30) | `free_monthly_active` | Cached from active `user_subscriptions` |
| `subscription_expires_at` | TIMESTAMP NULL | NULL | Cached expiry |
| `ai_uses_remaining` | INTEGER | 3 | Cached quota for low-latency checks |
| `lifetime_free_monthly_used` | BOOLEAN | false | True after free_monthly trial first activates |
| `lifetime_free_weekly_used` | BOOLEAN | false | True after free_weekly trial first activates |

Cache is reconciled against `user_subscriptions` every 15 minutes by pg_cron `reconcile_subscription_cache`.

---

### 7.14 AI Usage Quota System

#### 7.14.1 Quota Enforcement Flow

```
[User taps "AI বর্ণনা তৈরি করুন" on product creation screen]
        │
        ├── ai_uses_remaining = 0
        │       ▼
        │   [Show Upsell Prompt — cannot dismiss for 3 seconds]
        │   "AI ব্যবহারের সীমা শেষ হয়েছে।
        │   সাবস্ক্রিপশন নিন এবং মাসে ৩০টি AI ব্যবহার পান।"
        │   [সাবস্ক্রিপশন নিন] [পরে করব (3s countdown)]
        │
        └── ai_uses_remaining > 0
                ▼
        [Edge Function: POST /functions/v1/ai-describe-product]
            → Server-side re-check quota (prevents race conditions)
            → If server quota = 0: return error AI_QUOTA_EXHAUSTED
                ▼
        [AI call executes (Gemini 1.5 Flash / fallback chain)]
                ▼
        [On AI success — atomic quota decrement]
            BEGIN TRANSACTION;
            UPDATE users
            SET ai_uses_remaining = ai_uses_remaining - 1
            WHERE id = :user_id AND ai_uses_remaining > 0;

            UPDATE user_subscriptions
            SET ai_uses_remaining = ai_uses_remaining - 1
            WHERE user_id = :user_id
              AND status IN ('free_monthly_active','free_weekly_active',
                             'paid_monthly_active','paid_yearly_active')
              AND ai_uses_remaining > 0;

            INSERT INTO ai_usage_log (...) VALUES (...);
            INSERT INTO activity_log (...) VALUES (...);
            COMMIT;
```

#### 7.14.2 Quota Display Rules

| Location | Display Format | Update Frequency |
|----------|----------------|------------------|
| Product creation screen, near AI button | "AI বর্ণনা: {N} বার বাকি" | Real-time post-use |
| Profile screen, subscription section | "এই মাসে AI ব্যবহার: {used}/{total}" | On screen load |
| Subscription management screen | Progress bar + "{used} / {total} ব্যবহার হয়েছে" | On screen load |
| Push notification (when quota drops to 5) | "মাত্র ৫টি AI ব্যবহার বাকি।" | Triggered once at threshold |

#### 7.14.3 Yearly Quota Refresh (pg_cron: daily 00:00 UTC)

```sql
WITH yearly_to_refresh AS (
    SELECT us.id, us.user_id
    FROM user_subscriptions us
    WHERE us.status = 'paid_yearly_active'
      AND us.current_period_end <= NOW()
      AND us.expires_at > NOW()
)
UPDATE user_subscriptions us
SET ai_uses_remaining = 30, ai_uses_total = 30,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM yearly_to_refresh ytr
WHERE us.id = ytr.id;

UPDATE users u
SET ai_uses_remaining = 30
FROM (
    SELECT user_id FROM user_subscriptions
    WHERE status = 'paid_yearly_active'
      AND current_period_start >= NOW() - INTERVAL '1 hour'
) refreshed
WHERE u.id = refreshed.user_id;
```

#### 7.14.4 `ai_usage_log` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| user_id | UUID FK → users.id | Who used AI |
| subscription_id | UUID FK → user_subscriptions.id | Which subscription was charged |
| product_id | UUID FK → products.id NULL | Product being described |
| ai_model_used | VARCHAR(50) | `gemini-1.5-flash`, `gpt-4o-mini`, `tflite_local` |
| input_tokens | INTEGER NULL | Tokens sent to cloud AI |
| output_tokens | INTEGER NULL | Tokens received from cloud AI |
| quota_before | INTEGER | ai_uses_remaining before this use |
| quota_after | INTEGER | ai_uses_remaining after this use |
| success | BOOLEAN | Whether AI returned a usable result |
| error_code | VARCHAR(50) NULL | Error code if success = false |
| created_at | TIMESTAMP | When AI was called |

**RLS Policy:** SELECT own records only (`user_id = auth.uid()`) OR admin via service role.

---

### 7.15 Subscription Expiry & Renewal Automation

#### 7.15.1 pg_cron Jobs

| Job Name | Schedule | Action |
|----------|----------|--------|
| `activate_free_weekly` | Every 5 minutes | Transition `free_monthly_active` → `free_weekly_active` where `expires_at <= NOW()` |
| `expire_free_weekly` | Every 5 minutes | Transition `free_weekly_active` → `expired` where `expires_at <= NOW()` |
| `expire_paid_subscriptions` | Every 5 minutes | Transition paid active → `expired` where `expires_at <= NOW()` |
| `refresh_yearly_ai_quota` | Daily 00:00 UTC | Refresh AI quota for yearly subscribers entering new 30-day window |
| `subscription_expiry_warning_7d` | Daily 09:00 UTC | Notify users whose paid subscription expires in exactly 7 days |
| `subscription_expiry_warning_1d` | Daily 09:00 UTC | Notify users whose paid subscription expires in exactly 1 day |
| `reconcile_subscription_cache` | Every 15 minutes | Sync `users.subscription_status` and `users.ai_uses_remaining` with `user_subscriptions` |

#### 7.15.2 Renewal Rules

- HaatBazar does **not** support automatic recurring billing. Renewal is user-initiated.
- Existing subscription remains active until the renewal payment is admin-verified and approved.
- If the subscription expires before renewal is verified, user enters `expired` state. AI quota = 0 during the gap.
- Renewal subscriptions start from `NOW()` on approval — no backdating to the previous expiry date.

---

## Section 7 Amendment — Admin-Configurable Boost Rates

**Amendment to V3.0 Section 7.3:** The `boost_tiers` database table is already defined. V4.0 adds the explicit admin panel UI screen (Section 13.7 below) for managing boost tier rates and durations.

**Amendment to `platform_settings` table — add the following keys:**

| Key | Default Value | Description |
|-----|--------------|-------------|
| `boost_settings_last_updated` | NULL | ISO timestamp of last admin change to any boost tier |
| `subscription_settings_last_updated` | NULL | ISO timestamp of last admin change to subscription pricing |
| `ai_quota_exhausted_upsell_dismiss_delay_seconds` | `3` | Seconds before upsell can be dismissed |
| `free_trial_fraud_score_threshold` | `0.5` | Risk score above which free trial is denied at registration |

---

## Section 13 Addendum — Admin Settings Panel

### 13.7 Boost Tier Rate & Duration Management

#### 13.7.1 Screen: "বুস্ট প্যাকেজ পরিচালনা"

**Location:** Admin Panel > সেটিংস > বুস্ট প্যাকেজ

```
┌──────────────────────────────────────────────────────────┐
│  ← বুস্ট প্যাকেজ পরিচালনা          [+ নতুন প্যাকেজ যোগ]   │
│──────────────────────────────────────────────────────────│
│  ┌────────────────────────────────────────────────────┐  │
│  │  ⚡ ফ্ল্যাশ বুস্ট               [সক্রিয় ✅]  [✏️]  │  │
│  │  মূল্য: ৳২০  |  সময়কাল: ৬ ঘণ্টা  |  ওজন: ২.৫    │  │
│  │  সর্বোচ্চ ইম্প্রেশন: ৫০০                           │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📢 বেসিক বুস্ট                [সক্রিয় ✅]  [✏️]  │  │
│  │  মূল্য: ৳৫০  |  সময়কাল: ২৪ ঘণ্টা  |  ওজন: ১.৫   │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ⭐ স্ট্যান্ডার্ড বুস্ট           [সক্রিয় ✅]  [✏️]  │  │
│  │  মূল্য: ৳১২০  |  সময়কাল: ৭২ ঘণ্টা  |  ওজন: ২.০  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🚀 প্রিমিয়াম বুস্ট              [সক্রিয় ✅]  [✏️]  │  │
│  │  মূল্য: ৳২৫০  |  সময়কাল: ১৬৮ ঘণ্টা  |  ওজন: ৩.০ │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### 13.7.2 Edit Boost Tier Fields

| Field | Input Type | Validation | Bengali Label |
|-------|-----------|------------|---------------|
| Bengali Name | Text | Max 50 chars, required | প্যাকেজের নাম |
| Price (BDT) | Number | > 0, max 99999.99, required | মূল্য (৳) |
| Duration (hours) | Number | > 0, max 8760, required | সময়কাল (ঘণ্টায়) |
| Boost Weight | Decimal | 0.1–10.0, required | বুস্ট ওজন |
| Max Impressions | Number | >= 0; 0 = unlimited | সর্বোচ্চ ইম্প্রেশন (০ = সীমাহীন) |
| Active Status | Toggle | — | সক্রিয় / নিষ্ক্রিয় |

#### 13.7.3 Save Behavior

- Price and duration changes apply to **new boost purchases only**.
- Boost weight changes apply **immediately** to all active boosts on that tier.
- Deactivating a tier hides it from the user-facing UI. Existing active boosts continue until natural expiry.
- Minimum 1 active tier must exist at all times. Save is blocked with: "সর্বশেষ সক্রিয় বুস্ট প্যাকেজ নিষ্ক্রিয় করা যাবে না।"
- Every save is recorded in `audit_log` and `activity_log` (category: `ADMIN`, event: `admin_boost_tier_updated`).
- Confirmation dialog shown before save: "এই পরিবর্তনগুলো সংরক্ষণ করবেন?"

---

### 13.8 Subscription Rate Management

#### 13.8.1 Screen: "সাবস্ক্রিপশন মূল্য পরিচালনা"

**Location:** Admin Panel > সেটিংস > সাবস্ক্রিপশন মূল্য

```
┌──────────────────────────────────────────────────────────┐
│  ← সাবস্ক্রিপশন মূল্য পরিচালনা                             │
│──────────────────────────────────────────────────────────│
│  ⚠️ মূল্য পরিবর্তন শুধুমাত্র নতুন সাবস্ক্রিপশনে প্রযোজ্য।   │
│                                                          │
│  📅 মাসিক সাবস্ক্রিপশন                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  বর্তমান মূল্য: ৳{current_monthly}                   │  │
│  │  মেয়াদ: ৩০ দিন  |  AI ব্যবহার: ৩০টি/মাস             │  │
│  │  নতুন মূল্য (৳):  [____________]                    │  │
│  │               [💾 মাসিক মূল্য সংরক্ষণ]               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🌟 বার্ষিক সাবস্ক্রিপশন                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  বর্তমান মূল্য: ৳{current_yearly}                    │  │
│  │  মেয়াদ: ৩৬৫ দিন  |  AI ব্যবহার: ৩০টি/৩০ দিন         │  │
│  │  নতুন মূল্য (৳):  [____________]                    │  │
│  │               [💾 বার্ষিক মূল্য সংরক্ষণ]              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ℹ️ বিনামূল্যে ট্রায়ালের শর্তাবলী পরিবর্তনযোগ্য নয়।        │
│  (বিনামূল্যে মাসিক: ৩০ দিন, ৩টি AI — স্থায়ী নিয়ম)       │
│  (বিনামূল্যে সাপ্তাহিক: ৭ দিন, ১টি AI — স্থায়ী নিয়ম)    │
└──────────────────────────────────────────────────────────┘
```

#### 13.8.2 Validation Rules

| Rule | Detail |
|------|--------|
| Minimum monthly price | ৳1 |
| Maximum monthly price | ৳99,999 |
| Minimum yearly price | ৳1 |
| Maximum yearly price | ৳999,999 |
| Yearly < 12 × monthly | System enforces; blocked with: "বার্ষিক মূল্য ১২ মাসিক মূল্যের চেয়ে কম হতে হবে।" |
| Free trial terms | Not admin-configurable. Hardcoded in business logic. |
| Effective date | Immediately on save for new purchases |
| Audit | Every save recorded in `audit_log` and `activity_log` (category: ADMIN, event: `admin_subscription_price_updated`) |

#### 13.8.3 Price Change Propagation

- `subscription_tiers.price_bdt` is updated immediately on save.
- `platform_settings.subscription_settings_last_updated` is set to `NOW()`.
- Active `pending_payment` records retain the `amount_bdt` at submission time.
- Admin verifies submitted amount against `subscription_payments.amount_bdt`, not the live price.
- If price changed between user starting payment and admin verifying: admin sees a yellow warning banner — "মূল্য পরিবর্তিত হয়েছে। জমার সময়: ৳{old_price}. বর্তমান: ৳{new_price}. জমার পরিমাণ অনুযায়ী যাচাই করুন।"

---

## Section 23 — Activity & Audit Logging System

### 23.1 Logging Architecture

#### 23.1.1 Design Principles

- Every user-initiated and system-initiated action is written to `activity_log`.
- Every admin-initiated action is written to both `activity_log` and `audit_log`.
- `activity_log` is the single queryable source for both users (own records) and admin (all records).
- `audit_log` from V3.0 Section 18.5.4 remains for immutable financial audit trail.
- Log writes are **synchronous** for all financial, subscription, and AI-use events.
- Log writes are **asynchronous (best-effort)** for navigation and view events.
- Logs are **append-only**. No UPDATE or DELETE is ever issued on `activity_log` rows. A trigger raises an exception on any non-INSERT operation.
- All entries include a `correlation_id` (UUID) linking related events in one action chain.

#### 23.1.2 Two-Tier Visibility Model

| Log Level | Who Can Read | Scope | Access Location |
|-----------|-------------|-------|----------------|
| User Log | The user themselves | Own records only | Profile > কার্যক্রম লগ |
| Admin Log | All admin roles (filtered by RBAC) | All records | Admin Panel > লগ ব্যবস্থাপনা |

---

### 23.2 Activity Log Data Model

#### 23.2.1 `activity_log` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| user_id | UUID FK → users.id NULL | The user who performed the action. NULL for system events. |
| actor_type | VARCHAR(20) | `user`, `system`, `admin` |
| admin_id | UUID FK → admin_users.id NULL | Set when actor_type = 'admin' |
| event_type | VARCHAR(60) | Specific event identifier (see 23.3) |
| event_category | VARCHAR(20) | Top-level category (see 23.3) |
| entity_type | VARCHAR(30) NULL | Type of entity acted on (e.g., `product`, `order`, `subscription`) |
| entity_id | UUID NULL | ID of the entity acted on |
| ip_address | INET NULL | Client IP address |
| device_fingerprint | VARCHAR(100) NULL | Device fingerprint hash |
| metadata | JSONB NULL | Event-specific structured data |
| status | VARCHAR(20) | `success`, `failure`, `pending` |
| error_code | VARCHAR(60) NULL | If status = 'failure' |
| correlation_id | UUID NULL | Links related events in one user action chain |
| created_at | TIMESTAMP DEFAULT NOW() | When the event occurred |

**Indexes:**
- `idx_activity_log_user_created` ON `(user_id, created_at DESC)`
- `idx_activity_log_category_created` ON `(event_category, created_at DESC)`
- `idx_activity_log_entity` ON `(entity_type, entity_id)`
- `idx_activity_log_correlation` ON `(correlation_id)`
- `idx_activity_log_created` ON `(created_at DESC)`
- Partitioned by `created_at` in monthly ranges (same strategy as Section 17.8.1)

**Append-only enforcement:**

```sql
CREATE OR REPLACE FUNCTION prevent_activity_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'activity_log is append-only. Mutations are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_log_immutable
BEFORE UPDATE OR DELETE ON activity_log
FOR EACH ROW EXECUTE FUNCTION prevent_activity_log_mutation();
```

---

### 23.3 Log Categories & Event Matrix

#### 23.3.1 AUTH Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `login_success` | user | Google/Phone sign-in succeeded | `method`, `device_id` |
| `login_failure` | user | Sign-in attempt failed | `method`, `reason`, `attempt_count` |
| `logout` | user | User explicitly signed out | — |
| `otp_sent` | system | OTP sent for sensitive action | `action_type` |
| `otp_verified` | user | OTP verified successfully | `action_type` |
| `otp_failed` | user | OTP verification failed | `attempt_number` |
| `session_expired` | system | Session token expired | `last_active_at` |
| `device_change_detected` | system | New device for existing account | `old_device_fp`, `new_device_fp` |
| `sim_swap_detected` | system | SIM swap signal detected | `confidence_score` |
| `account_locked` | system | Account locked after failed attempts | `lock_duration_minutes` |

#### 23.3.2 PROFILE Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `profile_created` | user | New user profile completed | `name`, `district_id` |
| `profile_updated` | user | Profile fields changed | `changed_fields` (array) |
| `phone_updated` | user | Phone number changed | `old_phone_last4`, `new_phone_last4` |
| `payment_info_updated` | user | bKash/bank details changed | `payment_type` |
| `verification_submitted` | user | NID documents uploaded | — |
| `verification_approved` | admin | NID verification approved | `admin_id` |
| `verification_rejected` | admin | NID verification rejected | `reason` |
| `account_deleted` | user | User initiated deletion | — |
| `account_suspended` | admin | Admin suspended account | `reason`, `duration_days` |
| `fraud_flag_set` | system | Fraud flag applied | `fraud_type`, `risk_score` |

#### 23.3.3 PRODUCT Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `product_created` | user | New listing created (draft) | `product_id`, `category_id` |
| `product_published` | user | Listing set to active | `product_id`, `title_bn` |
| `product_edited` | user | Product fields modified | `product_id`, `changed_fields` |
| `product_image_uploaded` | user | Image added | `product_id`, `image_count` |
| `product_deleted` | user | Product soft-deleted | `product_id` |
| `boost_activated` | admin | Boost payment approved, boost live | `product_id`, `tier_slug`, `expires_at` |
| `boost_expired` | system | Boost expired by pg_cron | `product_id`, `tier_slug` |
| `product_suspended` | admin | Product suspended | `product_id`, `reason` |
| `product_reported` | user | Product reported | `product_id`, `report_reason` |
| `inventory_updated` | system | Quantity reduced after purchase | `product_id`, `quantity_sold`, `remaining` |
| `product_sold_out` | system | Quantity reached 0 | `product_id` |

#### 23.3.4 AI Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `ai_requested` | user | User tapped AI describe button | `product_id`, `quota_before` |
| `ai_used` | user | AI call succeeded, quota decremented | `product_id`, `model_used`, `quota_after` |
| `ai_quota_exhausted` | system | AI request blocked — 0 quota | `product_id`, `subscription_status` |
| `ai_failed` | system | AI call failed | `error_code`, `fallback_used` |
| `ai_cache_hit` | system | AI result served from cache | `product_id`, `cache_age_seconds` |
| `ai_upsell_shown` | system | Subscription upsell displayed | `product_id`, `subscription_status` |
| `ai_diagnosis_run` | user | Crop & Fish Doctor diagnosis completed | `diagnosis_id`, `subject_hint`, `severity`, `model_used`, `quota_after` |
| `ai_diagnosis_offline_queued` | user | Diagnosis deferred offline — image stored, request enqueued in the sync queue | `subject_hint`, `queued_priority` |

#### 23.3.5 ORDER Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `order_created` | user | New order placed | `order_id`, `product_id`, `quantity`, `amount_bdt` |
| `order_confirmed` | user/admin | Farmer confirmed order | `order_id` |
| `order_payment_submitted` | user | Payment proof uploaded | `order_id`, `amount_bdt`, `method` |
| `order_payment_verified` | admin | Payment approved | `order_id`, `admin_id` |
| `order_payment_rejected` | admin | Payment rejected | `order_id`, `reason`, `admin_id` |
| `order_payment_auto_verified` | system | OCR auto-approval (risk score 0.0) | `order_id`, `ocr_confidence` |
| `order_status_changed` | user/system/admin | Order moved to new state | `order_id`, `from_status`, `to_status` |
| `order_cancelled` | user/system | Order cancelled | `order_id`, `initiator`, `reason` |
| `order_completed` | system | Order marked complete | `order_id` |
| `order_timeout` | system | Order expired due to inaction | `order_id`, `timeout_type` |

#### 23.3.6 PAYMENT Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `payment_proof_uploaded` | user | Screenshot uploaded | `payment_id`, `payment_type`, `amount_bdt` |
| `payment_ocr_processed` | system | OCR ran on screenshot | `payment_id`, `ocr_confidence`, `risk_score` |
| `payment_auto_approved` | system | Zero-risk auto-approval | `payment_id`, `risk_score` |
| `payment_approved` | admin | Admin manually approved | `payment_id`, `admin_id` |
| `payment_rejected` | admin | Admin manually rejected | `payment_id`, `admin_id`, `reason` |
| `refund_issued` | admin | Refund note created | `payment_id`, `refund_amount_bdt`, `admin_id` |
| `wallet_credited` | admin | Wallet credit issued | `user_id`, `amount_bdt`, `reason` |
| `wallet_debited` | admin | Wallet debit applied | `user_id`, `amount_bdt`, `reason` |

#### 23.3.7 SUBSCRIPTION Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `subscription_free_monthly_started` | system | Free monthly trial activated | `expires_at`, `ai_quota` |
| `subscription_free_weekly_started` | system | Free weekly trial activated | `expires_at`, `ai_quota` |
| `subscription_expired` | system | Any subscription tier expired | `tier_slug`, `ai_uses_used`, `ai_uses_total` |
| `subscription_payment_submitted` | user | Payment proof uploaded | `payment_id`, `tier_slug`, `amount_bdt` |
| `subscription_payment_approved` | admin | Payment approved | `subscription_id`, `tier_slug`, `expires_at`, `admin_id` |
| `subscription_payment_rejected` | admin | Payment rejected | `payment_id`, `reason`, `admin_id` |
| `subscription_activated` | system | Paid subscription made active | `subscription_id`, `tier_slug`, `expires_at` |
| `subscription_renewed` | system | Renewal payment approved | `old_subscription_id`, `new_subscription_id` |
| `subscription_ai_quota_refreshed` | system | Yearly subscriber quota refreshed | `subscription_id`, `new_quota` |
| `subscription_upgrade_upsell_clicked` | user | User tapped upsell | `from_tier`, `destination_tier` |

#### 23.3.8 BOOST Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `boost_payment_submitted` | user | Boost proof submitted | `boost_payment_id`, `tier_slug`, `amount_bdt` |
| `boost_payment_approved` | admin | Boost approved | `boost_payment_id`, `product_id`, `admin_id` |
| `boost_payment_rejected` | admin | Boost rejected | `boost_payment_id`, `reason` |
| `boost_activated` | system | Boost live on product | `product_id`, `tier_slug`, `expires_at` |
| `boost_expired` | system | Boost expired | `product_id`, `tier_slug`, `total_impressions` |

#### 23.3.9 ADMIN Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `admin_login` | admin | Admin signed in | `admin_id`, `role` |
| `admin_boost_tier_updated` | admin | Boost tier price/duration changed | `tier_slug`, `old_values`, `new_values` |
| `admin_subscription_price_updated` | admin | Subscription price changed | `tier_slug`, `old_price`, `new_price` |
| `admin_platform_settings_updated` | admin | Platform payment account changed | `key`, `admin_id` |
| `admin_user_suspended` | admin | User account suspended | `target_user_id`, `reason`, `duration` |
| `admin_user_unsuspended` | admin | User account restored | `target_user_id` |
| `admin_fraud_resolved` | admin | Fraud alert actioned | `fraud_alert_id`, `action_taken` |
| `admin_dispute_resolved` | admin | Dispute closed | `dispute_id`, `resolution`, `admin_id` |
| `admin_wallet_issued` | admin | Wallet credit issued | `user_id`, `amount_bdt`, `reason` |
| `admin_log_exported` | admin | Log CSV exported | `filter_params`, `row_count` |

#### 23.3.10 FRAUD Category

| Event Type | Actor | Description | Key Metadata Fields |
|------------|-------|-------------|---------------------|
| `fraud_tx_id_reuse_detected` | system | TX ID reuse attempted | `tx_id`, `original_payment_id` |
| `fraud_duplicate_phone_detected` | system | Phone linked to multiple accounts | `phone_last4`, `account_count` |
| `fraud_velocity_flag` | system | Payment velocity threshold exceeded | `payment_count`, `window_minutes` |
| `fraud_risk_score_high` | system | Payment risk score > 0.6 | `payment_id`, `risk_score` |
| `fraud_multi_account_detected` | system | Multi-account cluster detected | `cluster_account_ids`, `signal_type` |
| `fraud_trial_reuse_attempt` | system | User attempted to re-claim free trial | `user_id`, `attempt_type` |

---

### 23.4 User Activity Log — Self-View Screen

#### 23.4.1 Screen: "কার্যক্রম লগ"

**Location:** Profile > কার্যক্রম লগ

```
┌─────────────────────────────────────────┐
│  ← কার্যক্রম লগ                           │
│─────────────────────────────────────────│
│  বিভাগ ফিল্টার:                           │
│  [সব] [অর্ডার] [পেমেন্ট] [AI] [সাবস্ক্রি] │
│  [পণ্য] [লগইন]                           │
│  ─────────────────────────────────      │
│  ● আজ, ১৫ জুলাই ২০২৫                     │
│  │                                      │
│  ├─ 🤖 ১০:২৩ AM                         │
│  │    AI ব্যবহার                          │
│  │    "পাকা আম" এর বর্ণনা তৈরি হয়েছে     │
│  │    বাকি: ২৯টি AI ব্যবহার              │
│  │                                      │
│  ├─ 📦 ০৯:৪৫ AM                         │
│  │    নতুন পণ্য প্রকাশ                     │
│  │    "পাকা আম — হিমসাগর জাত" প্রকাশিত   │
│  │                                      │
│  ● গতকাল, ১৪ জুলাই                       │
│  │                                      │
│  ├─ 💳 ০৩:২২ PM                         │
│  │    পেমেন্ট যাচাই সম্পন্ন                  │
│  │    অর্ডার #HB-140725-0031            │
│  │    ৳৬,০০০ — বিকাশ — ✅ অনুমোদিত       │
│  │                                      │
│  ├─ 🌟 ১১:০০ AM                         │
│  │    সাবস্ক্রিপশন সক্রিয়                    │
│  │    বার্ষিক সাবস্ক্রিপশন শুরু হয়েছে       │
│  │    মেয়াদ: ১৪/০৭/২৫ — ১৪/০৭/২৬        │
│       [আরও লোড করুন]                      │
└─────────────────────────────────────────┘
```

#### 23.4.2 User Log Display Rules

| Rule | Detail |
|------|--------|
| Visible categories | AUTH, PRODUCT, AI, ORDER, PAYMENT, SUBSCRIPTION, BOOST |
| Hidden categories | FRAUD, ADMIN (never shown to users) |
| Event status shown | `success` events shown normally. `failure` events shown with ❌ icon. |
| Pagination | 25 events per page. Load more on scroll. |
| Date range filter | Last 7 days (default), Last 30 days, Last 90 days, Custom range |
| Deep link | Tapping an order event navigates to that order detail screen |
| Sensitive fields | IP address and device fingerprint never shown to users |
| Retention visible | User sees up to 90 days. Older logs archived, not shown. |

#### 23.4.3 AI Usage History Sub-Screen

**Location:** Profile > সাবস্ক্রিপশন > AI ব্যবহারের ইতিহাস

```
┌─────────────────────────────────────────┐
│  ← AI ব্যবহারের ইতিহাস                   │
│─────────────────────────────────────────│
│  এই মাসে ব্যবহার: ২ / ৩০                  │
│  [████░░░░░░░░░░░░░░░░░░░░░░░] ৭%      │
│  বাকি সময়কাল রিসেট পর্যন্ত: ২৮ দিন        │
│  ─────────────────────────────────      │
│  ১৫ জুলাই ২০২৫ — ১০:২৩ AM              │
│  পণ্য: পাকা আম — হিমসাগর জাত            │
│  মডেল: Gemini 1.5 Flash | ✅ সফল        │
│                                         │
│  ১৪ জুলাই ২০২৫ — ০২:১৫ PM              │
│  পণ্য: টমেটো — রাজশাহী জাত              │
│  মডেল: Gemini 1.5 Flash | ✅ সফল        │
└─────────────────────────────────────────┘
```

---

### 23.5 Admin Master Log View

#### 23.5.1 Screen: "লগ ব্যবস্থাপনা"

**Location:** Admin Panel > লগ ব্যবস্থাপনা
**Access:** `super_admin` only

```
┌──────────────────────────────────────────────────────────┐
│  লগ ব্যবস্থাপনা                              [📤 রপ্তানি]  │
│──────────────────────────────────────────────────────────│
│  ব্যবহারকারী: [___________] বিভাগ: [সব ▼]                │
│  তারিখ থেকে: [__] পর্যন্ত: [__]  Actor: [সব ▼]            │
│                    [🔍 ফিল্টার প্রয়োগ]                     │
│  ──────────────────────────────────────────────────      │
│  সর্বমোট ফলাফল: {N} টি লগ এন্ট্রি                         │
│                                                          │
│  সময়      | ব্যবহারকারী | বিভাগ | ঘটনা          | স্ট্যাটাস │
│  ──────────────────────────────────────────────────      │
│  ১০:২৩ AM  | রহিম মিয়া   | AI    | ai_used       | ✅      │
│  ১০:১৫ AM  | করিম সাহেব | ORDER | order_created | ✅      │
│  ০৯:৫৮ AM  | admin@hb   | ADMIN | boost_tier_✏  | ✅      │
│  ০৯:৩২ AM  | সিস্টেম     | FRAUD | tx_id_reuse   | ✅      │
│                                                          │
│  [পূর্ববর্তী] পৃষ্ঠা ১/{total_pages} [পরবর্তী]              │
│  (প্রতি পৃষ্ঠায় ২৫ এন্ট্রি)                                 │
└──────────────────────────────────────────────────────────┘
```

#### 23.5.2 Log Entry Detail Fields (Modal)

| Field | Shown To |
|-------|----------|
| Event ID (UUID) | Admin only |
| Timestamp (full datetime + timezone) | Admin only |
| Actor Type | Admin only |
| Actor (name + phone last 4 / admin name) | Admin only |
| Category (colored badge) | Admin only |
| Event Type | Admin only |
| Entity (type + ID + quick link) | Admin only |
| Status | Admin only |
| IP Address | Admin only |
| Device Fingerprint | Admin only |
| Metadata (formatted JSON) | Admin only |
| Correlation ID + "view full chain" link | Admin only |
| Error Code (if failure) | Admin only |

#### 23.5.3 Admin Log Filters

| Filter | Options |
|--------|---------|
| User | Free-text by name, phone, or user ID |
| Category | All, AUTH, PROFILE, PRODUCT, AI, ORDER, PAYMENT, SUBSCRIPTION, BOOST, ADMIN, FRAUD |
| Actor Type | All, User, System, Admin |
| Status | All, Success, Failure, Pending |
| Date Range | Today, Last 7 days, Last 30 days, Custom |
| Event Type | Searchable dropdown of all event types |
| Entity | Filter by entity_type + entity_id |

#### 23.5.4 Log Export

- `[📤 রপ্তানি]` exports filtered results as CSV.
- Export is limited to **10,000 rows** per request.
- `ip_address` is SHA-256 hashed in the exported CSV.
- The export action itself is logged: `event_type = 'admin_log_exported'`, `metadata = { filter_params, row_count }`.

#### 23.5.5 User-Specific Log (from User Management)

**Path:** Admin > ব্যবহারকারী ব্যবস্থাপনা > [User] > কার্যক্রম লগ

- Identical to admin master view, pre-filtered to `user_id = :selected_user_id`.
- Used during fraud investigation, payment dispute resolution, and account review.

---

### 23.6 Log Retention & Archival Policy

| Log Category | Hot Storage (queryable) | Cold Archive | Purge |
|-------------|------------------------|-------------|-------|
| AUTH | 90 days | 1 year | After 2 years |
| PROFILE | 180 days | 2 years | After 3 years |
| PRODUCT | 180 days | 2 years | After 3 years |
| AI | 90 days | 1 year | After 2 years |
| ORDER | 365 days | 7 years | Never (financial) |
| PAYMENT | 365 days | 7 years | Never (financial) |
| SUBSCRIPTION | 365 days | 7 years | Never (financial) |
| BOOST | 180 days | 2 years | After 3 years |
| ADMIN | 365 days | 7 years | Never |
| FRAUD | 365 days | 7 years | Never |

**Archival execution:** pg_cron job `archive_old_activity_logs` runs **weekly on Sunday 02:00 UTC**. Rows past hot storage threshold move to `activity_log_archive` (same schema, separate partition). Archive is not indexed for real-time queries. Admin can request archive reports via bulk export.

---

## Database Schema Supplement

### New Tables Summary

| Table | Purpose | Rows at Deploy |
|-------|---------|---------------|
| `subscription_tiers` | Subscription tier definitions | 4 (seeded) |
| `user_subscriptions` | Per-user subscription lifecycle records | 0 |
| `subscription_payments` | Manual payment proof records for subscriptions | 0 |
| `ai_usage_log` | Every AI product description call | 0 |
| `activity_log` | All system-wide activity events | 0 |
| `activity_log_archive` | Cold storage for archived logs | 0 |
| `crop_diagnoses` | Crop & Fish Doctor diagnosis history — "আমার রোগ নির্ণয়" (Section 4.10.3) | 0 |
| `payment_ocr_results` | On-device ML Kit OCR extraction + server-side comparison results (Section 8.12.1) | 0 |

### `subscription_tiers` Seed Data

| slug | name_bn | type | duration_days | price_bdt | ai_uses_per_period | ai_period_days | max_lifetime_activations |
|------|---------|------|--------------|-----------|-------------------|----------------|--------------------------|
| `free_monthly` | বিনামূল্যে মাসিক ট্রায়াল | free_trial | 30 | 0.00 | 3 | NULL | 1 |
| `free_weekly` | বিনামূল্যে সাপ্তাহিক ট্রায়াল | free_trial | 7 | 0.00 | 1 | NULL | 1 |
| `paid_monthly` | মাসিক সাবস্ক্রিপশন | paid | 30 | 199.00 | 30 | 30 | NULL |
| `paid_yearly` | বার্ষিক সাবস্ক্রিপশন | paid | 365 | 1499.00 | 30 | 30 | NULL |

*Default prices (৳199/month, ৳1499/year) are admin-overridable from day 1.*

### `platform_settings` Additional Keys

| Key | Default Value | Description |
|-----|--------------|-------------|
| `subscription_monthly_price_bdt` | `199.00` | Current monthly price |
| `subscription_yearly_price_bdt` | `1499.00` | Current yearly price |
| `subscription_settings_last_updated` | `NULL` | Timestamp of last admin price change |
| `boost_settings_last_updated` | `NULL` | Timestamp of last admin boost tier change |
| `ai_quota_exhausted_upsell_dismiss_delay_seconds` | `3` | Upsell dismiss delay in seconds |
| `free_trial_fraud_score_threshold` | `0.5` | Risk score above which free trial is denied |

### `users` Table — New Columns (V4.0)

```sql
ALTER TABLE users
    ADD COLUMN subscription_status VARCHAR(30) NOT NULL DEFAULT 'free_monthly_active',
    ADD COLUMN subscription_expires_at TIMESTAMP NULL,
    ADD COLUMN ai_uses_remaining INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN lifetime_free_monthly_used BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN lifetime_free_weekly_used BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_subscription_expires ON users(subscription_expires_at)
    WHERE subscription_expires_at IS NOT NULL;

ALTER TABLE users ADD CONSTRAINT chk_users_ai_uses
    CHECK (ai_uses_remaining >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_subscription_status
    CHECK (subscription_status IN (
        'free_monthly_active','free_weekly_active','expired',
        'pending_payment','paid_monthly_active','paid_yearly_active','payment_rejected'
    ));
```

### RLS Policy Additions

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `subscription_tiers` | All (public read) | Admin service role only | Admin service role only | Not allowed |
| `user_subscriptions` | Own records only | Via Edge Function only | Not allowed | Not allowed |
| `subscription_payments` | Own records only | Via Edge Function only | Not allowed | Not allowed |
| `ai_usage_log` | Own records only | Via Edge Function only | Not allowed | Not allowed |
| `activity_log` | Own records (`user_id = auth.uid()`) | Via Edge Function / system only | Not allowed | Not allowed |
| `crop_diagnoses` | Own records only (`user_id = auth.uid()`) | Via the `ai-diagnose` Edge Function only | Not allowed | Own records only |
| `payment_ocr_results` | Admin + the order's buyer and seller | Via the `submit-payment-proof` Edge Function only | Via the `ocr-verify-payment` Edge Function only | Not allowed |

---

## API Endpoints Supplement

Add the following to V3.0 Section 15.2:

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/functions/v1/activate-free-trial` | POST | Auto-called at registration; creates free_monthly record | Service role |
| `/functions/v1/submit-subscription-payment` | POST | User submits payment proof for subscription | JWT required |
| `/functions/v1/verify-subscription-payment` | POST | Admin approves or rejects subscription payment | Admin JWT |
| `/functions/v1/ai-describe-product` | POST | **(Modified)** Checks quota before AI call; decrements on success | JWT required |
| `/functions/v1/get-subscription-status` | GET | Returns subscription, AI quota, and trial phase | JWT required |
| `/functions/v1/get-activity-log` | GET | Paginated user activity log (own records only) | JWT required |
| `/functions/v1/admin-get-activity-log` | GET | Admin paginated activity log with full filters | Admin JWT |
| `/functions/v1/admin-update-boost-tier` | PUT | Admin updates boost tier rate/duration/weight | Admin JWT |
| `/functions/v1/admin-update-subscription-price` | PUT | Admin updates subscription tier price | Admin JWT |
| `/functions/v1/export-activity-log` | POST | Admin exports filtered log as CSV (max 10,000 rows) | Admin JWT |
| `/functions/v1/sms-hook` | POST | Supabase Send SMS Hook: formats the Bengali OTP and relays it to the DP Relay gateway | Internal (service role) |
| `/functions/v1/ai-diagnose` | POST | Crop & Fish Doctor: Gemini 1.5 Flash diagnosis + treatment cross-sell keywords (Section 4.10) | JWT required |

**Rate Limits for new endpoints:**

| Endpoint | Rate Limit |
|----------|-----------|
| `/functions/v1/ai-describe-product` | 5 req/min per user (unchanged) |
| `/functions/v1/submit-subscription-payment` | 3 req/hour per user |
| `/functions/v1/get-activity-log` | 30 req/min per user |
| `/functions/v1/admin-get-activity-log` | 60 req/min per admin |
| `/functions/v1/export-activity-log` | 5 req/hour per admin |

---

## Notification Matrix Supplement

Add to V3.0 Section 10.4:

### Subscription Lifecycle Notifications

| Event | Recipient | Type | Title (Bengali) | Body Template (Bengali) |
|-------|-----------|------|-----------------|------------------------|
| Free monthly starts | User | `sub_free_monthly_started` | বিনামূল্যে ট্রায়াল শুরু | "আপনার ৩০ দিনের বিনামূল্যে ট্রায়াল শুরু হয়েছে। ৩টি AI ব্যবহার পাচ্ছেন।" |
| Free weekly starts | User | `sub_free_weekly_started` | সাপ্তাহিক ট্রায়াল শুরু | "মাসিক ট্রায়াল শেষ। ৭ দিনের বিনামূল্যে ট্রায়াল চলছে — ১টি AI ব্যবহার পাচ্ছেন।" |
| Free weekly expires | User | `sub_free_weekly_expired` | বিনামূল্যে ট্রায়াল শেষ | "আপনার বিনামূল্যে ট্রায়াল শেষ। সাবস্ক্রিপশন নিন এবং মাসে ৩০টি AI ব্যবহার পান।" |
| AI quota drops to 5 | User | `sub_quota_low` | AI ব্যবহার সীমিত হয়ে আসছে | "এই মাসে মাত্র ৫টি AI ব্যবহার বাকি।" |
| AI quota reaches 0 | User | `sub_quota_exhausted` | AI ব্যবহার শেষ | "এই মাসে AI ব্যবহার শেষ। পরবর্তী রিসেট: {days} দিন পরে।" |
| Paid sub expiry warning 7d | User | `sub_expiry_warning_7d` | সাবস্ক্রিপশন শেষ হচ্ছে | "আপনার সাবস্ক্রিপশন ৭ দিনে শেষ হবে। নবায়ন করুন।" |
| Paid sub expiry warning 1d | User | `sub_expiry_warning_1d` | সাবস্ক্রিপশন আগামীকাল শেষ | "আপনার সাবস্ক্রিপশন আগামীকাল শেষ হবে। এখনই নবায়ন করুন।" |
| Payment approved | User | `sub_payment_approved` | সাবস্ক্রিপশন সক্রিয় | "আপনার {tier_name} সক্রিয় হয়েছে! মেয়াদ: {expires_date_bn}. মাসে ৩০টি AI।" |
| Payment rejected | User | `sub_payment_rejected` | সাবস্ক্রিপশন পেমেন্ট প্রত্যাখ্যাত | "কারণ: {reason}. সঠিক প্রমাণ আপলোড করুন।" |
| New payment (admin) | Admin | `sub_payment_needs_verification` | সাবস্ক্রিপশন পেমেন্ট যাচাই | "{user_name} — {tier_name} ৳{amount} যাচাই করুন।" |
| Yearly quota refreshed | User | `ai_quota_refreshed` | AI কোটা রিসেট হয়েছে | "আপনার মাসিক AI কোটা রিসেট হয়েছে। এই মাসে ৩০টি AI ব্যবহার পাচ্ছেন।" |

---

## Bengali UI Catalog Supplement

Add to V3.0 Section 19:

### Subscription & AI Labels

| Key | Bengali Text | Context |
|-----|-------------|---------|
| `sub_screen_title` | সাবস্ক্রিপশন | Screen title |
| `sub_select_title` | সাবস্ক্রিপশন নির্বাচন করুন | Selection screen |
| `sub_ai_count_label` | AI বর্ণনা: {N} বার বাকি | Near AI button |
| `sub_ai_usage_label` | AI ব্যবহার: {used}/{total} | Subscription screen |
| `sub_quota_reset_label` | কোটা রিসেট: {N} দিনে | Subscription screen |
| `sub_upgrade_prompt` | AI সহায়তা আনলক করুন | Upsell modal title |
| `sub_trial_active` | বিনামূল্যে ট্রায়াল চলছে | Status badge |
| `sub_paid_active` | সাবস্ক্রিপশন সক্রিয় | Status badge |
| `sub_expired` | মেয়াদ শেষ | Status badge |
| `sub_pending_payment` | যাচাইয়ের অপেক্ষায় | Status badge |
| `sub_yearly_recommended` | সুপারিশকৃত | Yearly tier badge |
| `sub_save_amount` | মাসে মাত্র ৳{monthly_equivalent} | Yearly value label |
| `log_screen_title` | কার্যক্রম লগ | Log screen title |
| `log_filter_all` | সব | Filter chip |
| `log_load_more` | আরও লোড করুন | Pagination button |
| `log_no_entries` | এই সময়ের মধ্যে কোনো কার্যক্রম নেই | Empty state |

### New Error Messages

| Error Code | Bengali Message | Trigger |
|-----------|----------------|---------|
| `AI_QUOTA_EXHAUSTED` | এই মাসে AI ব্যবহারের সীমা শেষ হয়েছে। সাবস্ক্রিপশন নবায়ন করুন বা পরের মাসের জন্য অপেক্ষা করুন। | ai_uses_remaining = 0 |
| `AI_QUOTA_CHECK_FAILED` | AI কোটা যাচাই করা যায়নি। পুনরায় চেষ্টা করুন। | Server quota fetch failed |
| `SUB_FREE_TRIAL_USED` | এই ফোন নম্বরের জন্য বিনামূল্যে ট্রায়াল আগে ব্যবহার করা হয়েছে। সাবস্ক্রিপশন নিন। | Re-claim attempt |
| `SUB_ALREADY_ACTIVE` | আপনার ইতিমধ্যেই একটি সক্রিয় সাবস্ক্রিপশন আছে। | Duplicate subscription |
| `SUB_PAYMENT_PROOF_MISSING` | সাবস্ক্রিপশন পেমেন্টের স্ক্রিনশট আপলোড করুন। | Screenshot missing |
| `SUB_PAYMENT_TX_MISSING` | লেনদেন আইডি লিখুন। | TX ID empty |
| `SUB_PAYMENT_TX_DUPLICATE` | এই লেনদেন আইডি আগে ব্যবহার করা হয়েছে। একটি নতুন লেনদেন করুন। | TX ID exists |
| `SUB_PAYMENT_RESUBMIT_LIMIT` | ২৪ ঘণ্টায় ৩ বারের বেশি পুনরায় জমা দেওয়া যাবে না। | resubmission_count >= 3 |
| `SUB_PRICE_CHANGED` | সাবস্ক্রিপশনের মূল্য পরিবর্তিত হয়েছে। নতুন মূল্য: ৳{new_price}। | Price changed mid-flow |
| `BOOST_PRICE_CHANGED` | বুস্টের মূল্য পরিবর্তিত হয়েছে। নতুন মূল্য: ৳{new_price}। | Boost price changed mid-flow |
| `BOOST_LAST_TIER_ACTIVE` | সর্বশেষ সক্রিয় বুস্ট প্যাকেজ নিষ্ক্রিয় করা যাবে না। | Deactivating last boost tier |

---

## Updated Admin RBAC Matrix

*Replaces Appendix D of PRD-V3.0.*

| Permission | super_admin | payment_verifier | dispute_resolver | content_moderator |
|-----------|:-----------:|:----------------:|:----------------:|:-----------------:|
| View payment verification queue | ✅ | ✅ | ❌ | ❌ |
| Approve/reject order payments | ✅ | ✅ | ❌ | ❌ |
| Approve/reject subscription payments | ✅ | ✅ | ❌ | ❌ |
| View disputes | ✅ | ❌ | ✅ | ❌ |
| Resolve disputes | ✅ | ❌ | ✅ | ❌ |
| Create refund notes | ✅ | ❌ | ✅ | ❌ |
| View fraud alerts | ✅ | ✅ | ✅ | ❌ |
| Resolve fraud alerts | ✅ | ❌ | ❌ | ❌ |
| Suspend/ban users | ✅ | ❌ | ❌ | ❌ |
| Review product reports | ✅ | ❌ | ❌ | ✅ |
| Suspend/restore product listings | ✅ | ❌ | ❌ | ✅ |
| Review NID verifications | ✅ | ❌ | ❌ | ✅ |
| Manage boost tier rates & durations | ✅ | ❌ | ❌ | ❌ |
| Manage subscription prices | ✅ | ❌ | ❌ | ❌ |
| Manage platform payment settings | ✅ | ❌ | ❌ | ❌ |
| Manage admin users | ✅ | ❌ | ❌ | ❌ |
| View activity log (all users) | ✅ | ❌ | ❌ | ❌ |
| View activity log (per-user, during case) | ✅ | ✅ | ✅ | ✅ |
| Export activity log | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |
| View financial analytics | ✅ | ✅ | ❌ | ❌ |
| View subscription analytics | ✅ | ✅ | ❌ | ❌ |
| Issue wallet credits | ✅ | ❌ | ✅ | ❌ |
| Force-cancel orders | ✅ | ❌ | ✅ | ❌ |
| View all users | ✅ | ✅ | ✅ | ✅ |

---

## Risk Matrix Addendum

Add to V3.0 Section 21:

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-15 | Free trial fraud — multiple accounts to reclaim 1-per-lifetime trial | High | Medium | Device fingerprint + phone cross-check at trial grant; fraud_risk_score > 0.5 blocks trial; nightly batch cross-checks trial activations against device clusters |
| R-16 | Subscription gap — paid sub expires while renewal awaits verification | Medium | Low | User notified at T-7d and T-1d; old subscription active until new one approved; all marketplace features still work without AI |
| R-17 | AI quota race condition — concurrent calls consuming > available quota | Low | Low | Atomic `UPDATE ... WHERE ai_uses_remaining > 0`; double-deduction structurally impossible |
| R-18 | activity_log performance degradation at scale | Medium | Medium | Monthly partitioning; indexes on (user_id, created_at); user view limited to 90 days; async writes for non-financial events |
| R-19 | Price change mid-payment — user submitted proof at old price, admin changes price before verification | Low | Low | `amount_bdt` stored at submission; admin verifies against stored value; admin sees price-change warning banner |
| R-20 | Yearly quota window drift — pg_cron UTC offset vs user-local subscription start | Low | Low | Quota refresh checks `current_period_end <= NOW()` (offset from exact subscription start, never calendar month boundary) |

---

## Appendix E: V4.0 pg_cron Schedule Additions

Add to V3.0 Appendix C:

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `activate_free_weekly` | `*/5 * * * *` | Transition free_monthly_active → free_weekly_active where expires_at <= NOW() |
| `expire_free_weekly` | `*/5 * * * *` | Transition free_weekly_active → expired where expires_at <= NOW() |
| `expire_paid_subscriptions` | `*/5 * * * *` | Expire paid subscriptions past expires_at |
| `refresh_yearly_ai_quota` | `0 0 * * *` | Refresh 30-use quota for yearly subscribers entering new 30-day period |
| `subscription_expiry_warning_7d` | `0 9 * * *` | Notify users with paid sub expiring in 7 days |
| `subscription_expiry_warning_1d` | `0 9 * * *` | Notify users with paid sub expiring in 1 day |
| `reconcile_subscription_cache` | `*/15 * * * *` | Sync users.subscription_status cache with user_subscriptions |
| `archive_old_activity_logs` | `0 2 * * 0` | Move activity_log rows past hot retention to activity_log_archive |

**Updated total pg_cron jobs: 22** (14 from V3.0 + 8 new from V4.0)

---

## Appendix F: V4.0 Document Statistics

| Metric | Value |
|--------|-------|
| New database tables | 8 (`subscription_tiers`, `user_subscriptions`, `subscription_payments`, `ai_usage_log`, `activity_log`, `activity_log_archive`, `crop_diagnoses`, `payment_ocr_results`) |
| Modified tables | 1 (`users` — 5 new columns) |
| New Edge Function endpoints | 12 |
| New pg_cron jobs | 8 |
| New notification types | 11 |
| New Bengali UI labels | 16 |
| New Bengali error messages | 11 |
| New admin screens | 3 (Boost Tier Management, Subscription Price Management, Log Management) |
| Camera-first AI capabilities | 2 (Zero-Typing Camera Product Entry — Sections 4.5 / 4.9.4; "ফসল ও মাছের ডাক্তার" Crop & Fish Doctor — Section 4.10) |
| On-device AI engines | 2 (Google ML Kit Image Labeling via `HaatBazarTFLite`; Google ML Kit Text Recognition via `@capacitor-mlkit/text-recognition`) |
| Total log event categories | 10 |
| Total log event types defined | 66 |
| Total subscription tiers | 4 (2 free, 2 paid) |
| Free trial total duration | 37 days (30 days monthly + 7 days weekly) |
| Total free AI uses across trials | 4 (3 monthly + 1 weekly) |
| Paid subscription AI quota | 30 uses per 30-day period |
| Yearly subscription total AI uses | 360 (30/month x 12 months) |
| Admin RBAC permissions total | 25 |

---

**END OF DOCUMENT — V4.0**

**Combined V3.0 + V4.0 totals:**
- Total tables: 45 (37 V3.0 + 8 V4.0)
- Total Edge Functions: 35 (23 V3.0 + 12 V4.0)
- Total pg_cron jobs: 22 (14 V3.0 + 8 V4.0)
- Total state machines: 7 (6 V3.0 + 1 Subscription V4.0)
- Total Bengali error messages: 60+ (50+ V3.0 + 11 V4.0)

