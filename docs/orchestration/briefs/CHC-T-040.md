# CHC-T-040 — Push hardening + repo hygiene + records consolidation

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. All sequencing here is orchestrator-owned per CHC-D-047. This brief closes the small real gaps CHC-T-039 named and lands the accumulated records.

## Context

FCM Phase-A is live-proven (CHC-T-039, `main` @ `c6585c9` = origin/main; policies 27; send-fcm dry-run proven 200/would_send:1). Named gaps: (1) a logged-out device keeps its `device_tokens` row, so pushes would still target the previous user until the next login; (2) Profile renders a local-state marketing toggle that does not write the DB column, so it can silently disagree with `/settings`; (3) the `google-services.json` ignore rule in `apps/web/android/.gitignore` is COMMENTED OUT (lines ~64–65) — accidental-commit risk the moment the owner drops the file in Phase B; (4) `check_apk.py`'s default root mixes debug+release variants (exit 1 on exempt debug artifacts unless `--root` is hand-scoped); (5) untracked `supabase/.temp/`; (6) AGENTS.md §13 does not yet list `@capacitor/push-notifications` (ratified by CHC-D-049). Plus the recurring docs carry: the orchestrator's uncommitted `DECISIONS.md`/`LEDGER.md` hunks and untracked `briefs/CHC-T-037/038/039/040.md`.

## Objective

Token lifecycle closes on logout; profile and settings write the same column; the repo is Phase-B-safe; the gate gains variant ergonomics; AGENTS.md reflects the ratified stack; all pending records land.

## Scope (the ONLY files you may create/modify)

- `apps/web/src/lib/push.ts` — retain the last registered token; expose a cleanup function
- the logout path (`apps/web/src/lib/auth.ts` or wherever লগআউট lives) — call the cleanup before session teardown
- `apps/web/src/routes/profile/+page.svelte` — bind the marketing toggle to `users.marketing_optin` (same update path as `/settings`, revert-on-error); leave the always-on pair out of profile
- `apps/web/android/.gitignore` — uncomment the `google-services.json` rule
- root `.gitignore` (or `supabase/.gitignore`) — ignore `supabase/.temp/`
- `apps/web/scripts/check_apk.py` — add an optional `--variant <substring>` path filter + docstring note; default behavior unchanged
- `AGENTS.md` — §13 stack line only: add `@capacitor/push-notifications` to the Native line and "Supabase Edge Functions + FCM HTTP v1 (push)" where the AI/Ops lines sit; cite CHC-D-049 in a one-line comment. NOTHING else in AGENTS.md changes.
- `docs/orchestration/reports/CHC-T-040.md`, `docs/orchestration/LEDGER.md` (the CHC-T-040 row)

## Out of scope

- Any Firebase console action; any new dependency; changes to `send-fcm`, the migration set, `logic/feed.ts` (locked), or feed ranking; removing the `/settings` always-on pair; deleting (rather than ignoring) `supabase/.temp/` contents beyond gitignoring.

## Requirements (each testable)

**R1 — Logout token cleanup.** `push.ts` stores the registered token (module state + `localStorage` fallback) and exports `removePushToken()`: if a token and session exist, DELETE from `device_tokens` where the token matches (RLS self-delete); swallow-and-log failures (logout must never block on push cleanup). The logout flow calls it BEFORE clearing the session. Paste the changed logout path (≤20 lines) and the push.ts additions.

**R2 — Profile toggle consolidation.** Profile's বিপণন toggle reads `users.marketing_optin` on load and writes it through the same RLS update shape as `/settings`, reverting on error. Both surfaces now write one column. Paste the changed block (≤20 lines).

**R3 — Phase-B file safety.** Uncomment the `google-services.json` rule in `apps/web/android/.gitignore`; ignore `supabase/.temp/`. Then paste `git check-ignore -v apps/web/android/app/google-services.json` (expect a matching rule, exit 0 — the file need not exist for check-ignore to answer) and `git status --short supabase` (expect `.temp/` gone from untracked).

**R4 — Gate ergonomics.** `check_apk.py` gains `--variant <substring>` (filters artifacts by path substring; composes with `--root`). Paste the diff; run BOTH `python scripts/check_apk.py --variant release` (expect exit 0 judging only release artifacts) and `python scripts/check_apk.py` unchanged behavior documented in the docstring.

**R5 — AGENTS.md §13.** Paste the diff (expect: one Native-line addition + one Backend/Ops-line addition + the CHC-D-049 comment; zero other edits — show `git diff --stat AGENTS.md` as 1 file, small).

**R6 — Records landing FIRST.** Before any code commit, commit the pending orchestrator hunks (`DECISIONS.md`, `LEDGER.md` row refinements, untracked `briefs/CHC-T-037/038/039/040.md`) as ONE commit: `docs(orchestration): land orchestrator records (CHC-D-045..049, T-036..039 rows, briefs)` + `Refs: CHC-T-040`. The landed LEDGER must contain exactly ONE row per task (the builder's committed T-039 row is superseded by the orchestrator's consolidated row — verify with a `findstr CHC-T-03` count: 6 rows, one per task). Paste the commit stat.

**R7 — Gates + land.** validate → ALL CHECKS PASSED; `npm run build` → exit 0 (state bytes; expect ~45 files, delta ≈ 0 — no payload change); rebuild `assembleRelease` NOT required this task (no native change — state that explicitly; the APK from T-039 stands). Branch `task/CHC-T-040`; commits per format + `Refs: CHC-T-040`; merge `--no-ff`; push; paste the merge SHA + `git ls-remote --heads origin main`. Bright-line scan on added lines only.

## Acceptance + verification (paste real output, in order)

1. R1's logout path + push.ts diff.
2. R2's profile diff.
3. R3's check-ignore output (exit 0, rule visible) + the supabase status.
4. R4's two gate runs.
5. R5's AGENTS.md diff --stat + the pasted lines.
6. R6's docs commit stat + the per-task row count.
7. R7's gates, merge SHA, `git ls-remote` line, and `git status --short apps/web supabase docs` → EMPTY.

## Stop conditions

- Logout changes that block logout on push cleanup failures → redesign (cleanup must be best-effort).
- Any AGENTS.md edit beyond the two §13 lines → STOP, report the diff.
- Any Firebase action → owner-only; record, don't attempt.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-040 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R1–R7 with one-line evidence / WEB ASSETS bytes / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
