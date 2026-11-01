# CHC-T-036 — §12.4 enforcement closure: RLS-level auto-hide + queue tie-break

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. Work exactly within SCOPE. The ruling behind this task is **CHC-D-044** (DECISIONS.md): the auto-hide gap found in CHC-T-033/P3 is closed in RLS, because the anon key ships in the bundle and app-layer-only hiding is not enforcement.

## Context (verified facts you build on)

- Live finding (confirmed twice — the builder's P3 and the orchestrator's rollback-wrapped reproduction): `products_পঠন_সবার`'s qual is `((NOT hidden) OR (seller_id = auth.uid()))` — it never references `auto_hidden_at`, so an auto-hidden listing is readable by anon and any buyer via direct REST. Hiding currently works only via the app's feed filter (`apps/web/src/lib/server-feed.ts:72`).
- The admin bypass is the separate permissive policy `products_অ্যাডমিন_পঠন` (RLS policies are OR'd) — it must keep working untouched.
- The auto-hide trigger (`reports_স্বয়ংক্রিয়_লুকানো` → function `স্বয়ংক্রিয়_লুকানো`) sets `products.auto_hidden_at` when ভুয়া ≥ 2 or স্প্যাম ≥ 3 and writes no audit row (correct — system action, not admin action). **The canonical report category literal is the SPACED `ভুয়া বিজ্ঞাপন / প্রতারণা`** (per `apps/web/src/lib/logic/safety.ts`); the unspaced form does not trip the trigger.
- Admin queue (`apps/web/src/routes/admin/+page.svelte`) sorts count-desc → created_at-desc with no final tie-break (Finding 2 of T-033).
- Current live state: policies = 23, counts = users 1 / products 0 / reports 0 / blocks 0 / admin_audit 0. `main` @ `957ff01` = origin/main.

## Objective

Auto-hidden listings become invisible at the RLS layer to everyone except their seller and admins; the operator queue gains a deterministic tie-break; the working tree's pending orchestrator docs hunks land; hygiene items close.

## Scope (the ONLY files you may create/modify)

- `supabase/migrations/00008_auto_hide_rls.sql` — create
- `apps/web/src/routes/admin/+page.svelte` — modify (the sort comparator only)
- `.tmp/db.js`, `.tmp/keys.js`, `.tmp/p0-count.js` — delete (stale harness leftovers; do NOT read `keys.js` contents into the report)
- `docs/orchestration/DECISIONS.md` — modify: ONE surgical deletion (see R5)
- `docs/orchestration/LEDGER.md` — modify: the CHC-T-036 row
- `docs/orchestration/reports/CHC-T-036.md` — create: the evidence report

## Out of scope

- Any other policy, table, RPC, or migration file; `logic/feed.ts` (locked); `server-feed.ts`; any other app file; any OTP send; fixing anything outside the listed items.

## Requirements (each testable)

**R1 — Migration 00008.** `DROP POLICY IF EXISTS products_পঠন_সবার ON public.products;` then `CREATE POLICY products_পঠন_সবার ON public.products FOR SELECT` with the SAME TO roles as the current policy (read them from pg_policies first and state them in the report) and qual exactly: `((NOT hidden AND auto_hidden_at IS NULL) OR (seller_id = auth.uid()))`. Comment header: purpose + CHC-D-044 ref. Apply via apply_migration.

**R2 — Live acceptance (the T-033 repro inverted).** One rollback-wrapped transaction: 2 fixture users + 1 admin fixture user + 1 product (hidden=false) + 2 reports (category exactly `ভুয়া বিজ্ঞাপন / প্রতারণা`, spaced) → then counts under each context: anon-claims `{}` → **0**; seller-own → **1**; fixture-admin → **1**; owner uid `101c646b-e74e-426c-9a0e-3329fe7ad151` → **1**. Also a second fixture product with `hidden=true` → anon **0**, seller-own **1** (manual-hide behavior unchanged). Rollback; re-count → 1/0/0/0/0, policies **23** (a replacement, not an addition).

**R3 — Queue tie-break.** In the admin page's comparator, after the existing count and created_at keys, add a final deterministic key on the report/listing id (e.g. `a.id.localeCompare(b.id)` direction chosen so ids sort ascending — state which). No other logic changes; all §12.4 ordering strings stay Bengali per `bn.ts`.

**R4 — Hygiene.** Delete the three named `.tmp/` files. Do not print their contents.

**R5 — Docs surgical fix.** In `docs/orchestration/DECISIONS.md`, on the line starting `| CHC-D-043 |`: delete the trailing duplicated fragment that begins `| Verification: 15-point run ALL_CLAIMS_VERIFIED` and runs to end-of-line — the row must end at `...close-out commit per branch-per-task rule. |`. Nothing else on that line changes. (This repairs a glue artifact from an earlier orchestrator edit.)

**R6 — Land the pending orchestrator hunks.** The working tree carries my uncommitted `DECISIONS.md`, `LEDGER.md`, and `briefs/` changes (D-042 restoration, D-044, the T-033/T-035/T-036 rows, the T-033 brief). Commit them ON THIS BRANCH in a separate commit titled `docs(orchestration): land pending orchestrator records (CHC-D-042/044, T-033/035 rows)` + `Refs: CHC-T-036`, BEFORE the code commit. Verify with `git diff` that only expected files move.

## Acceptance + verification (paste real output, in order)

1. `pg_policies` qual for `products_পঠন_সবার` after 00008 → paste (must contain `auto_hidden_at IS NULL`).
2. R2's five context counts + the manual-hide pair + the post-rollback counts.
3. Gates: `node scripts/validate.mjs` → ALL CHECKS PASSED; `npm run build` → exit 0; report file count + total bytes **and the measurement method** (CHC-D-044 requires the method stated).
4. R5: paste the CHC-D-043 line's final 200 characters (must end `branch-per-task rule. |`).
5. `git status --short apps/web supabase docs` after landing → EMPTY; `git ls-remote --heads origin main` → paste.
6. Branch `task/CHC-T-036`, commit format `type(scope): subject` + `Refs: CHC-T-036`, merge `--no-ff` to main, push.

## Stop conditions

- If R2's anon count is not 0 after 00008: STOP, report BLOCKED with the qual verbatim — do not iterate policy variants.
- If any other policy's qual changes or policy count ≠ 23 after apply: STOP, report.
- If the working tree contains unexpected changes beyond the known pending hunks: STOP, report `git status` verbatim.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-036 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R1–R6 PASS|FAIL with one-line evidence / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
