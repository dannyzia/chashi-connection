# CHC-T-013 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-021): verified (ALL_CLAIMS_VERIFIED: YES — 4-file commit 88900a9, one-dependency diff, no .env ever tracked, validate green) → reviewed from disk (bright-line clean; §19 "✅ Keep" conformance) → APPROVED → applied via Management API (HTTP 201) → live-verified (6 tables / RLS×6 / 17 policies / 7 indexes / anon REST 200 []). DONE — BACKEND LIVE (CHC-D-021).

```
=== TASK REPORT ===
TASK ID: CHC-T-013 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-REVIEW

SUMMARY: Derived project URL + anon key from Management API without displaying either; .env written (291 B, 2 keys, gitignored, never tracked); @supabase/supabase-js@2.118.0 installed as the only dependency change; src/lib/supabase.ts authored (typed, lazy, null without env, imported by nobody); supabase/migrations/00001_init.sql authored — 6 tables, 17 RLS policies, 7 indexes, bright-line clean, parses under libpg_query (36 statements) — APPLIED NOWHERE.

FILES CHANGED: apps/web/.env (disk-only) · package.json (+1 line) · package-lock.json (+104: @supabase/{supabase-js,auth-js,postgrest-js,realtime-js,storage-js,functions-js} + iceberg-js) · src/lib/supabase.ts (172 lines) · supabase/migrations/00001_init.sql (203 lines).

KEY EVIDENCE: check-ignore .gitignore:16 · key-names-only listing · tsc --strict exit 0 against Database generic · no importers · build with .env moved aside → exit 0, 506,931 B identical (null-safe proven by actual env-less build) · bright-line scan on SQL: zero matches (cart|checkout|order|payment|escrow|refund|invoice|payout|fee|commission|transaction, case-insensitive) · libpg_query: 6 CreateStmt, 7 IndexStmt, 6 AlterTableStmt, 17 CreatePolicyStmt · gates green · merge 0b78863, pushed.

MIGRATION (full SQL in repo at this commit; 203 lines): users/products(sale|wanted via type CHECK)/chats/messages(reports/blocks + RLS: products SELECT anon+auth with hidden filter, writes owner-only; users SELECT authed, own-row writes; chats/messages participants; reports own-insert/own-select; blocks own-CRUD; messages.kind CHECK text|image|location — no voice; expires_at 30-day default).

DEVIATIONS: union column → union_name (reserved word; PostgREST filter ergonomics) · unit default 'কেজি' + quantity default 1 (wishlist validity) · lat/lng NOT NULL (locality-first invariant at data layer) · legacy anon key chosen over new publishable key (matches VITE_SUPABASE_ANON_KEY name) · SQL syntax proved by pgsql-parser --no-save then pruned (lock hashes unchanged) · gh absent → local --no-ff merge per CHC-D-015.

OPEN ISSUES (→ 00002/00003/00004 and auth task): chats has no UPDATE policy (ended_at gate); products lacks needed_by (PRD §11.2); anon cannot read users (seller joins would silently empty — public view decided later); signup must insert with auth uid; first route import of supabase-js will add real bytes (measure then).
QUESTIONS: none
=== END REPORT ===
```
