# CHC-T-013 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-013
TITLE:           Supabase foundation: schema+RLS migration, typed client, env wiring
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-011 (main @ efc4bf5 base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: AGENTS.md (🔐 locked stack — Supabase is THE backend; bright lines); PRD-V5.0.md §19 (table specs — READ IT, the sections marked "✅ Keep" ONLY) and §17.1 (MVP list); DECISIONS CHC-D-020 (supabase-js authorized; project exists; migration application is orchestrator work)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) before every commit.
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step. An acceptance line without pasted evidence = an automatic reject.
5. Never print, store in a report, or echo any secret, token, or key value. Values may be written ONLY into apps/web/.env (gitignored). If any command output would print a secret, pipe it through a redactor or write it straight to the file without displaying.
6. One question max under QUESTIONS; BLOCKED with exact reason if a step fails outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
A Supabase project exists (ref bgnndfwksjukvhbpipxb, region ap-southeast-2, created 2026-09-24) and a live personal access token sits in the repo's gitignored .mcp.json (NEVER print it; reference it by path only). The app has never been wired to it: no apps/web/.env, no @supabase/supabase-js, no schema. This task AUTHORS the backend foundation: the initial migration (schema + RLS) as a versioned SQL file in the repo, a typed client module, and the env wiring. You do NOT apply the migration — the orchestrator reviews the SQL (bright-line + PRD conformance), applies it via the Supabase Management API, and verifies the live schema as the stage's live-surface pillar. Auth (phone OTP) is a LATER task; this migration must therefore work without auth.users dependencies (design user ids as uuid PKs that will later link to auth, but create NO triggers on auth.users and depend on NO auth function except auth.uid() inside RLS policies, which is safe to reference before wiring).

OBJECTIVE
Ship: (1) apps/web/.env with the project URL + anon key derived WITHOUT displaying them, (2) @supabase/supabase-js installed and a typed lazy client at src/lib/supabase.ts, (3) supabase/migrations/00001_init.sql containing the MVP schema + RLS per PRD §19 "✅ Keep" tables, bright-line clean, (4) gates green with byte accounting, (5) committed and merged per the standing pattern.

SCOPE (the ONLY files you may create or modify)
- apps/web/.env — create (gitignored; NEVER staged)
- apps/web/package.json + package-lock.json — add @supabase/supabase-js only (AUTHORIZED as locked-stack implementation, CHC-D-020)
- apps/web/src/lib/supabase.ts — create (typed client)
- supabase/migrations/00001_init.sql — create (repo-root supabase/ dir; new)
- Branch/commit/merge/push operations

OUT OF SCOPE
- APPLYING the migration anywhere (no supabase CLI login, no SQL execution, no dashboard) — orchestrator's job
- Auth wiring, FCM, realtime subscriptions, edge functions, storage buckets
- Any change to routes, app-state, bn.ts, logic/*, schema.sql (the local SQLite schema — different store, untouched)
- Any other npm dependency; editing .mcp.json; touching docs/orchestration/**

INPUTS (read first)
- AGENTS.md — bright lines, locked stack, byte rules
- .kilo/plans/plan/PRD-V5.0.md §19 — ONLY the table sections marked "✅ Keep" (users, products, wishlists as products.type, chats, messages, reports, blocks). The ⛔ sections (orders/payments/payouts/escrow/disputes/invoices/fees/commissions) are FORBIDDEN territory — do not skim them for ideas.
- .kilo/plans/plan/PRD-V5.0.md §17.1 — the MVP feature list this schema must serve
- apps/web/src/lib/app-state.svelte.ts — the client-side types (ব্যবহারকারী, ফিডআইটেম, চ্যাটথ্রেড) the server schema must mirror

REQUIREMENTS (numbered; each is testable)
R1. Env wiring WITHOUT displaying secrets:
    a. From apps/web: read the token into a variable from ../.mcp.json (PowerShell: $tok=(Get-Content ../.mcp.json -Raw|ConvertFrom-Json).mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN) — never echo it.
    b. Fetch the API keys: curl.exe -s -H "Authorization: Bearer $tok" https://api.supabase.com/v1/projects/bgnndfwksjukvhbpipxb/api-keys — extract the anon key (the entry whose name is "anon" / default publishable key) and write BOTH lines to apps/web/.env WITHOUT printing them:
       VITE_SUPABASE_URL=https://bgnndfwksjukvhbpipxb.supabase.co
       VITE_SUPABASE_ANON_KEY=<value written, not displayed>
    c. Prove without secrets: paste `git check-ignore apps/web/.env` output (must be ignored) and paste ONLY the env file's KEY NAMES (cut -d= -f1), never values.
R2. Install @supabase/supabase-js (latest stable v2). Paste the installed version from package.json. No other dependency changes.
R3. src/lib/supabase.ts: typed module that (a) lazily creates the client from import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, (b) exports a getSupabase() accessor that returns null when env is absent (builds and dev must keep working WITHOUT .env — CI and other machines), (c) contains NO hardcoded URL or key, (d) is NOT imported by any route yet (this task wires capability, not features — zero behavior change to the app).
R4. supabase/migrations/00001_init.sql — the initial schema. Requirements:
    a. Tables (MVP subset, PRD §19 "✅ Keep"): users, products (sell AND wishlist via a type column with CHECK ('sale','wanted')), chats, messages, reports, blocks. Column sets must serve the client types in app-state plus PRD fields: users(phone unique, name, label, division, district, upazila, union, village, lat, lng, detail, whatsapp null, women_safety bool default false, verified bool default false, created_at); products(seller_id→users, type CHECK, title, price null-for-wanted, unit, quantity, category, description null, photo null, division/district/upazila/union/village, lat, lng, negotiable bool, hidden bool default false, created_at, expires_at default now()+interval '30 days'); chats(listing_id→products, buyer_id→users, seller_id→users, created_at, ended_at null); messages(chat_id→chats, sender_id→users, body, kind CHECK ('text','image','location') default 'text', created_at); reports(reporter_id→users, target_type CHECK ('product','user','message'), target_id uuid, category text, details null, created_at); blocks(blocker_id→users, blocked_id→users, created_at, UNIQUE(blocker_id, blocked_id)).
    b. BRIGHT-LINE ABSOLUTE: no table, column, comment, or trigger may reference orders, payments, transactions, carts, checkout, escrow, refunds, invoices, payouts, fees, or commissions in any form. A validate-style word scan over the file must be part of your evidence (paste it).
    c. RLS: enable on every table. Policies: products — SELECT for anon+auth (public bulletin board), INSERT/UPDATE/DELETE only seller_id = auth.uid(); users — SELECT for authed (profile display in chats), INSERT/UPDATE own row only (id = auth.uid() when auth lands; until then policies may use a placeholder pattern but MUST be written with auth.uid() so they activate correctly after the auth task); chats — SELECT/INSERT for participants (buyer_id or seller_id = auth.uid()); messages — SELECT for chat participants, INSERT for chat participants with sender_id = auth.uid(); reports — INSERT for authed, SELECT for reporter only; blocks — full CRUD for own rows only (blocker_id = auth.uid()).
    d. Indexes: products(created_at DESC), products(seller_id), products(type, created_at DESC), messages(chat_id, created_at), chats(buyer_id), chats(seller_id), reports(target_type, target_id).
    e. SQL must be idempotent-safe to review (no DROP of existing objects; CREATE TABLE IF NOT EXISTS acceptable; single migration file).
R5. Gates (paste all): node scripts/import-locations.mjs → exit 0; node scripts/validate.mjs → ALL CHECKS PASSED; npm run build → exit 0; report total build bytes and delta vs 506,931 (supabase-js will add tens of KB — state the exact delta; this is authorized growth, name it).
R6. Commit (explicit pathspec: .env NEVER staged — verify with git status that it is ignored):
   feat(supabase): initial schema+RLS migration, typed client, env wiring

   Migration authored for orchestrator review/application: users, products
   (sale|wanted), chats, messages, reports, blocks with RLS per PRD §19.
   Typed lazy client (getSupabase, null without env). supabase-js v2 added
   (locked-stack implementation). Migration NOT applied — orchestrator
   applies via Management API after bright-line review.

   Refs: CHC-T-013
   Push task/CHC-T-013; merge --no-ff to main per CHC-D-015 with marker
   ORCHESTRATOR-PENDING-REVIEW (not VERIFIED — the SQL review is pending);
   push main. Paste everything.

ACCEPTANCE CRITERIA
A1. .env exists, ignored, contains exactly the two keys — verified by: pasted check-ignore + key-names-only listing.
A2. supabase-js installed, no other deps — verified by: pasted package.json dependencies block.
A3. src/lib/supabase.ts lazy + null-safe + unimported by routes — verified by: pasted file + grep proving no route/lib imports it yet.
A4. Migration bright-line clean (word scan empty), tables/RLS/indexes per R4 — verified by: pasted scan output + the full SQL file content in your report (the orchestrator reviews it from the report AND the repo).
A5. Gates green, byte delta stated — verified by: pasted outputs.
A6. Merged to main, .env not in any commit — verified by: pasted merge output + git log --stat (no .env) + git show --stat of the commit.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- Management API key fetch fails (status ≠ 200) — report BLOCKED with the status code (no body if it contains secrets).
- The word scan in R4b matches anything — fix your SQL, do not ship it.
- Build delta exceeds 150,000 bytes without a cause you can name in one line — stop and report.
- Any gate failure; any push rejection; any tip mismatch — report BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/FULL MIGRATION SQL PASTED/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
