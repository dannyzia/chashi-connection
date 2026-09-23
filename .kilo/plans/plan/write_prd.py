import os

path = "D:/My Projects/Future Projects/Chashi Connection/.kilo/plans/plan/PRD.md"

content = """# PRD - Chashi Connection

**Version 1.0 - MVP Scope**

---

## 1. What This Is

Chashi Connection is a Bengali-only, mobile-first agricultural marketplace for Bangladesh.

The platform gives every user a shop/store. You list what you sell. Anyone can buy from you. The platform takes zero commission on every transaction - product sale, transport booking, everything.

**Who uses it:**

| User type (signup) | What they list |
|---|---|
| Farmer | Crops, fish, poultry, livestock |
| Seed seller | Seeds |
| Pesticide seller | Pesticides, fungicides |
| Feed seller | Animal feed |
| Fertilizer seller | Fertilizers |
| Medicine seller | Veterinary medicine |
| Equipment seller | Tools, pumps, machinery |
| Trader | Anything - general seller |
| Logistics | Pickup, truck, covered van |

**Everyone is a seller. Everyone is a buyer.** The signup type is a database label only - it does not create a separate flow. Every user gets the same shop, the same listing tools, the same purchase flow.

---

## 2. Core Rules

| Rule | Detail |
|------|--------|
| Zero commission | 0% on every product sale and every transport booking. Shown on every confirmation screen. |
| Everyone sells | Any user can list a product. Anyone can open a shop. |
| Everyone buys | Any user can buy from any listing. |
| Bengali only | Every screen, label, error, notification, AI prompt is in Bengali. Not a translation layer. |
| Manual payment | No payment gateway. Buyer pays seller directly, uploads screenshot + transaction ID. |
| Offline-first | Listing forms and drafts work fully offline. Sync queue processes when connectivity returns. |
| Location-first | Signup pins the user to village/home level. Discovery is local-first. |

---

## 3. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| App framework | SvelteKit (Svelte 5 Runes) + adapter-static | Single TypeScript codebase. Static SPA bundle inside Capacitor WebView. Compile-time reactivity, no Virtual DOM. |
| Mobile wrapper | Capacitor 6+ (modern Android System WebView) | Android 11+ Go Edition target. APK under 6MB. |
| Offline database | @capacitor-community/sqlite | Local-first storage with explicit schemaVersion migration hooks. |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) | All server logic lives here. |
| Auth | Supabase native (phone OTP + Google) | No Firebase. OTP via proprietary SMS hook through Edge Function. |
| Cloud AI | Gemini 1.5 Flash | Product description generation. |
| On-device AI | Google ML Kit | Image labeling (offline), OCR text recognition (payment proof), barcode scanning. |
| Push | Firebase Cloud Messaging | Push notifications. |
| Location | Native GPS + seeded Bangladesh hierarchy | Division > District > Upazila (~567 rows). Village-level pinning at signup. |
"""

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK: " + str(len(content)) + " chars")