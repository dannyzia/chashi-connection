# CHC-T-018 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-018
TITLE:           Auth lifecycle: signOut on logout, session sync on cold start
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P1
DEPENDS ON:      CHC-T-017 (function live; E2E proven CHC-D-029)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: CHC-T-015/017 open-issues #3+#4 (the defects this task fixes); AGENTS.md (offline-first, Bengali-only)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env values — counts and statuses only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Two lifecycle gaps were honestly reported by CHC-T-015/017 and remain: (a) লগআউট() forgets the local user but leaves the Supabase session alive in the browser; (b) nothing consults getSessionUserId() on boot, so a valid/expired/refreshed session is invisible to the app. OFFLINE-FIRST is the governing constraint: the local user state drives the UI; sessions enhance server writes. A missing/failed session must NEVER log the user out of the app or break the demo path — it only means server-bound operations take the existing offline-queue branch.

OBJECTIVE
(1) Logout clears the Supabase session alongside local state, (2) cold-start session sync (set/clear only the optional user.id — never the local login), (3) gates green with byte delta, (4) commit/push/merge with ORCHESTRATOR-PENDING-VERIFICATION.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/auth.ts — add signOut() helper (null-safe, never throws) and a getSessionOnBoot() (or equivalent) helper
- apps/web/src/lib/app-state.svelte.ts — call signOut inside লগআউট(); adopt the boot-sync (a small exported function the layout invokes, or invoked at module init — your design choice, document it)
- apps/web/src/routes/+layout.svelte (or +layout.ts) — ONLY if you need a mount point for the boot sync
- Branch/commit/merge/push

OUT OF SCOPE
- Any other route; bn.ts (no new strings should be needed); supabase.ts; the function; migrations; docs/

INPUTS (read first)
- apps/web/src/lib/auth.ts (existing contract: hasAuthClient, getSessionUserId, setSession adoption)
- apps/web/src/lib/app-state.svelte.ts (লগআউট at ~line 129, ব্যবহারকারী.id optional)
- The CHC-T-015r2/017 reports' open-issue wording (docs/orchestration/briefs/)

REQUIREMENTS (numbered; testable)
R1. লগআউট(): alongside existing local-state clearing, call the new auth signOut() — supabase.auth.signOut() when a client exists, wrapped so ANY failure (offline, no session) still completes local logout; the app must NEVER hang or error on logout.
R2. Boot sync: on app mount (client-only), if a Supabase client exists → getSession(): (a) valid session + local user present → set app.ব্যবহারকারী.id = session user id if currently unset (do NOT overwrite a differing id without… actually: if differing, the session is truth for the id — set it); (b) no session + local user has an id → clear ONLY the id (local login state untouched — offline-first); (c) no session + no id → no-op. The refresh path: supabase-js auto-refreshes in background — do not implement manual refresh logic.
R3. Demo path untouched: with no client (env-less build), R1's signOut is a no-op and R2's mount hook exits immediately. Prove with an env-less build + DOM check of logout behavior on the demo user.
R4. Evidence:
    a. tsc/build on both env states (with .env + moved aside) — paste.
    b. Browser (with env): logout-when-no-session → completes cleanly (no console errors); boot-sync with no session clears a fake stale id you set in the demo — demonstrate via a small paste of the console/DOM state transitions (values only, no tokens).
    c. WITH-session branches: typecheck + code-read evidence; live-session behavior is honestly PARTIAL (a fresh E2E session costs a credit+SMS — the orchestrator will fold the with-session proof into the next E2E or accept PARTIAL; do not burn credits).
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 both states; byte delta vs 741,410 B baseline (expect tiny — a few hundred bytes; state it).
R6. Commit (explicit pathspec):
   fix(auth): signOut on logout; cold-start session sync

   লগআউট now clears the Supabase session alongside local state (null-safe,
   offline-tolerant). Boot sync adopts session uid into the optional
   user.id field only — local login state and demo path untouched
   (offline-first). With-session branches typechecked; live proof PARTIAL
   by design.

   Refs: CHC-T-018
   Push task/CHC-T-018; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. signOut wired into লগআউট, never throws, offline-tolerant — pasted diff + error-path reasoning.
A2. Boot sync implements exactly (a)/(b)/(c) — pasted code excerpt.
A3. Env-less build unchanged behavior — pasted build + DOM/console evidence.
A4. With-session branches honest PARTIAL with typecheck proof — pasted.
A5. Gates green; byte delta stated — pasted.
A6. Merged; no secrets — pasted.

STOP CONDITIONS
- Any behavior that could log a local/offline user out of the app (violates offline-first) — stop, redesign within scope.
- Byte delta > 5,000 B; any gate failure; push rejection — BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
