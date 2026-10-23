# CHC-T-014 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-014
TITLE:           Migration 00002: chats update policy, needed_by, public sellers view
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-013 (migration 00001 is LIVE on the project — treat the database as populated; never drop or alter existing objects destructively)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §11.2 (wishlist Needed By), §10.2 (চ্যাট শেষ → rating); DECISIONS CHC-D-021 (the four 00002 items are pre-decided — implement them exactly)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (the PAT in ../.mcp.json and the anon key in .env stay unread-never-printed).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Migration 00001 is applied and live (6 tables, RLS, 17 policies — CHC-D-021). Four gaps were identified during its review and are pre-decided as 00002's exact contents: (1) chats has no UPDATE policy, so ended_at (the PRD §10.2 "চ্যাট শেষ" rating gate) cannot be written; (2) products lacks needed_by (PRD §11.2 wishlist "Needed By" date); (3) anon reads of users return 200 [] (RLS filters rather than errors), so when the feed goes server-side, seller name/label joins would silently be empty — fixed with a narrow public view that exposes NO phone/whatsapp; (4) apps/web/src/lib/data/locations-unions.ts flips dirty on every import-locations.mjs run (LF vs CRLF) — fixed with a .gitattributes rule. You AUTHOR the migration; the orchestrator reviews, applies, and verifies live exactly as in CHC-T-013.

OBJECTIVE
Author supabase/migrations/00002_updates.sql (additive only), add the .gitattributes normalization, prove the SQL parses, run gates, commit/push/merge with the PENDING-REVIEW marker.

SCOPE (the ONLY files you may create or modify)
- supabase/migrations/00002_updates.sql — create (ADDITIVE ONLY: new policies/columns/views; NO drops, NO destructive alters of existing objects)
- .gitattributes — create or append (repo root; only the locations-unions.ts rule)
- Branch/commit/merge/push operations

OUT OF SCOPE
- Applying anything to the database (orchestrator's job)
- Any change to apps/web/** source, package.json, .env, docs/orchestration/**
- Auth, realtime, storage, edge functions

INPUTS (read first)
- supabase/migrations/00001_init.sql — the live schema you are extending (read-only reference)
- docs/orchestration/DECISIONS.md CHC-D-021 — the four items and their rationale

REQUIREMENTS (numbered; testable)
R1. 00002_updates.sql contains EXACTLY these four additive statements (Bengali comment headers per project convention):
    a. create policy chats_সম্পাদনা_অংশীদার on public.chats for update to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid()) with check (buyer_id = auth.uid() or seller_id = auth.uid());
    b. alter table public.products add column if not exists needed_by date;
    c. create or replace view public.public_sellers with (security_invoker = true) as select id, name, label, verified from public.users; — THEN grant select on public.public_sellers to anon, authenticated; (security_invoker=true so RLS on users applies to the view: today that means only authenticated see rows — the anon gap closes when the users SELECT policy is widened in the auth stage; the view's job is to GUARANTEE only these 4 columns are ever exposed, never phone/whatsapp. Comment this reasoning in the file.)
    d. No other statements. The .gitattributes rule lives in .gitattributes, NOT in the SQL.
R2. .gitattributes: append (or create with) exactly: apps/web/src/lib/data/locations-unions.ts text eol=lf
    Then prove the fix: run node scripts/import-locations.mjs from apps/web; git status --short apps/web/src/lib/data/locations-unions.ts — expect CLEAN (no M). Paste both outputs. (If a spurious M already exists from earlier runs, git add --renormalize that ONE file and include it in the commit — paste that too; it is in scope as part of this fix.)
R3. Parse proof (same method as CHC-T-013): install pgsql-parser --no-save, parse 00002_updates.sql, npm prune, prove package.json/package-lock.json hashes unchanged (Get-FileHash before/after). Paste PARSE OK + statement count + hashes.
R4. Bright-line scan over the SQL (word scan incl. cart|checkout|order|payment|escrow|refund|invoice|payout|fee|commission|transaction) — paste zero matches.
R5. Gates: node scripts/import-locations.mjs → exit 0; node scripts/validate.mjs → ALL CHECKS PASSED; npm run build → exit 0; total build bytes + delta vs 506,926 (expect ~0; the SQL is not bundled).
R6. Commit (explicit pathspec, .env never staged):
   feat(supabase): migration 00002 — chats update policy, needed_by, public sellers view

   Additive follow-ups from 00001 review (CHC-D-021): participants may
   update chats (needed_by column for wishlists per PRD §11.2; narrow
   security_invoker public_sellers view; CRLF normalization for the
   generated location dataset). NOT applied — orchestrator reviews and
   applies.

   Refs: CHC-T-014
   Push task/CHC-T-014; merge --no-ff to main with marker ORCHESTRATOR-PENDING-REVIEW; push main.

ACCEPTANCE CRITERIA
A1. Migration has exactly the four additive items, no destructive SQL — verified by: pasted full SQL + statement inventory.
A2. CRLF churn fixed — verified by: post-fix import run + clean git status for the file (or the renormalize evidence).
A3. Parse OK, package hashes unchanged — pasted.
A4. Bright-line scan zero — pasted.
A5. Gates green, byte delta stated — pasted.
A6. Merged with PENDING marker; .env untouched/untracked — pasted merge + status.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- Any statement would DROP or destructively ALTER an existing object — stop, rewrite additively.
- Parse failure; renormalize pulls in files beyond the one dataset file; any gate failure; push rejection — report BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/FULL SQL PASTED/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
