# CHC-T-015r2 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-015r2
TITLE:           Commit and merge the completed auth wiring (threshold ruling applied)
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-015 (your own completed-but-uncommitted work sits in the worktree — this brief only commits it)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md
SOURCE OF TRUTH: DECISIONS CHC-D-025 — the orchestrator's ruling on your QUESTION: option (a) ACCEPTED, threshold raised to 300,000 B, +231,319 B is the accepted measured cost; narrow-import (b) rejected (Realtime lands soon and returns most of the saving); phone_provider_disabled is MOOT — CHC-D-023's dP Relay flow replaces signInWithOtp entirely in CHC-T-017, so Supabase's phone provider stays OFF forever
OS / SHELL:      Windows 11 / PowerShell 7.

You are A-IMP-1. You completed CHC-T-015 and stopped at R5's guardrail before committing. The orchestrator has ruled. This brief is only the commit+merge your R6 would have been.

SCOPE
- Commit the five existing worktree changes (auth.ts new; supabase.ts type repair; signup steps; bn.ts string; app-state id?: string) — nothing else
- Merge --no-ff to main per CHC-D-015; push

REQUIREMENTS (numbered; testable)
R1. Preflight: git log --oneline -2 (expect main @ bcef645); git status --short — verify the ONLY apps/web changes are the five CHC-T-015 files (auth.ts, supabase.ts, signup/+page.svelte, bn.ts, app-state.svelte.ts); locations-unions.ts must be CLEAN (T-014 rule). Anything else dirty under apps/web → STOP, report.
R2. git switch -c task/CHC-T-015. Stage the five files by explicit pathspec. Paste git diff --cached --stat.
R3. Gates one final time before commit: import exit 0; validate ALL CHECKS PASSED; build exit 0 (with .env) — paste totals; the 738,250 B figure (±5 nondeterminism) is the accepted baseline per CHC-D-025.
R4. Commit message exactly:
   feat(auth): phone-OTP signup via Supabase with demo fallback

   Steps 1–2 call signInWithOtp/verifyOtp when a client exists; any-4-
   to-6-digits demo path preserved for env-less builds. First-login users
   row upserted with the auth uid (RLS users_যোগ/সম্পাদনা); offline failure
   queues via সারিতেযোগ. supabase.ts row types repaired (interface→type +
   Relationships) — untyped-generic fix for all future queries. First real
   supabase-js import: web assets 506,931 → ~738,250 B (+231,319,
   accepted CHC-D-025). Live OTP send remains PARTIAL until CHC-T-017
   (dP Relay) — phone provider deliberately stays disabled.

   Refs: CHC-T-015
R5. Push task/CHC-T-015; merge --no-ff to main with marker ORCHESTRATOR-PENDING-VERIFICATION (not VERIFIED); push main. Paste merge + ls-remote. Post-merge: run validate on main (from apps/web) — paste.
R6. Confirm: git status shows .env still ignored/untracked; no secrets in the commit (grep the diff for 'eyJ' and 'sbp_' — paste zero matches).

ACCEPTANCE: A1 preflight exact (pasted) · A2 five-file staged set (pasted stat) · A3 gates green, baseline recorded (pasted) · A4 exact message (pasted log -1 --format=%B) · A5 merged+pushed, validate green on main (pasted) · A6 .env clean, zero secret patterns (pasted).

STOP CONDITIONS: any unexpected dirty file; any gate failure; push rejection — report BLOCKED with exact output. NO new code changes of any kind — if you find yourself editing anything, STOP.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/NEW MAIN TIP/COMMANDS RUN/ACCEPTANCE/BYTE BASELINE CONFIRMED/DEVIATIONS/OPEN ISSUES).
=== END BRIEF ===
```
