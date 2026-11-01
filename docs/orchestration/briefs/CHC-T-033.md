# CHC-T-033 — Stage-closing E2E: moderation + trust chain, zero credits

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. Do exactly what this brief says — **this is an evidence-gathering task: you RUN the system and REPORT; you change no code, no schema, no policy.** Findings go in the report, never into fixes. If a phase fails, record the output verbatim and continue with independent phases; report PARTIAL if any phase is incomplete.

## Context

The moderation/trust stage is built and individually verified (reports: T-025, T-028, T-029+030, T-031, T-034, T-035). What this stage lacks is **one continuous end-to-end run** through the whole §12.4 chain so the stage can close with a single coherent evidence set. Live DB today: `users=1` (the owner's admin row, uid `101c646b-e74e-426c-9a0e-3329fe7ad151`), all other tables 0. Total RLS policies: 23.

**Access (same harness as every prior E2E):**
- Management API SQL: `POST https://api.supabase.com/v1/projects/bgnndfwksjukvhbpipxb/database/query`, Bearer PAT from `.mcp.json` (`SUPABASE_ACCESS_TOKEN`).
- REST as real roles: anon key from `apps/web/.env` (`VITE_SUPABASE_ANON_KEY`); fixture users via `POST /auth/v1/signup` (email+password — **never OTP; zero SMS credits**).
- RLS context inside SQL: `begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<uuid>"}', true); <checks>; rollback;`
- Temp scripts in `.tmp/`, deleted after; **never print secrets**.

## Objective

One continuous fixture-based E2E proving the full moderation chain — report → auto-hide → visibility split → admin unhide + audit → §12.4 queue → block — at zero residue, then land the evidence report.

## Scope (the ONLY files you may create/modify)

- `docs/orchestration/reports/CHC-T-033.md` — create: the full evidence report
- `docs/orchestration/LEDGER.md` — modify: the CHC-T-033 row only

## Out of scope (violations = rejection)

- ANY change to `apps/web/**`, `supabase/**`, `logic/feed.ts` (locked), or any migration/policy/RPC
- ANY OTP send or wallet spend
- Fixing anything you find — findings are reported, not repaired
- Using the owner's credentials — the owner's uid is used only as an RLS context value in rollback-wrapped SQL

## The chain (run in order; every step's real output pasted)

**P0 — Preconditions.** Counts: `users=1, products=0, reports=0, blocks=0, admin_audit=0`. Policies = 23.

**P1 — Fixtures.** Via SQL: test seller A, seller B, buyer (3 `users` rows, role='user', valid `location_id` — query the location table for one valid id and state which). Capture all uuids. Products: A-1, A-2 (seller A), B-1 (seller B) — `hidden=false`, valid fields per the schema.

**P2 — Auto-hide chain.** Under the buyer's RLS context, insert `reports` rows:
1. A-1 + `ভুয়া বিজ্ঞাপন/প্রতারণা` #1 → A-1 `auto_hidden_at` IS NULL.
2. #2 → A-1 `auto_hidden_at` SET (paste the timestamp's presence, not the value). State whether the trigger wrote any `admin_audit` row (verify — do not assume).
3. #3 → idempotent (no change).
4. B-1 + `স্প্যাম` ×1, ×2 → NULL; ×3 → SET.

**P3 — Visibility split on hidden A-1.** Anon REST GET → 0 rows. Buyer context → 0. Test-admin context (create a 4th fixture user, promote to role='admin' via SQL) → 1 row. Owner-uid context → 1 row. Each pasted as a count.

**P4 — Admin unhide + audit.** Under the test-admin context: `UPDATE products SET hidden=false, auto_hidden_at=NULL WHERE id='<A-1>'` → succeeds. Read `admin_audit` as admin → report what rows exist and their actor/action/target. Read `admin_audit` as buyer → 0 rows. **Mechanism note:** state from the code (`apps/web/src/lib/admin.ts`) whether the app writes audit rows explicitly in the update flow or relies on a trigger — one sentence.

**P5 — §12.4 queue order.** As test-admin, read all `reports` rows and produce the queue in the exact order the admin page's sort produces it (`apps/web/src/routes/admin/+page.svelte`). Verify A-1's report group and B-1's group both surface; state the observed order and whether it matches the implementation's intent. Mismatch = FINDING, not a fix.

**P6 — Block chain.** Under the buyer's context: insert a `blocks` row targeting seller A's uuid. Verify: the row exists; `server-feed.ts` maps `বিক্রেতাআইডি` onto server items (paste the mapping line number — no code change); re-read the feed-shaped product query as buyer WITHOUT the client filter → A's rows still server-visible (proving the hide is the client filter's job, as browser-proven in T-031/T-034 — reference, don't re-run browsers).

**P7 — Cleanup.** Delete all fixtures in dependency order → verify `users=1, products=0, reports=0, blocks=0, admin_audit=0` (paste the count query).

**P8 — Gates.** From `apps/web`: `node scripts/validate.mjs` → ALL CHECKS PASSED; `npm run build` → exit 0 (paste file count + total bytes). `git status --short apps/web supabase docs` → empty before you start writing docs.

**Land:** branch `task/CHC-T-033`, commit `docs(orchestration): CHC-T-033 stage-closing E2E evidence` + `Refs: CHC-T-033`, merge `--no-ff` to main, push `origin main`, paste the merge SHA + `git ls-remote` line.

## Stop conditions

- Any P2–P6 step errors in a way that suggests a schema/policy defect: record verbatim, skip dependent steps, report PARTIAL with the finding.
- Counts nonzero after P7: STOP, report — never leave fixtures behind.
- Anything that would require an OTP: STOP (that's a brief defect; report it).

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-033 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN (trimmed to 40 lines) / per-phase: **P0…P8 PASS|FAIL — one-line evidence** / FINDINGS: numbered, each with verbatim output / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
