# CHC-T-018 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-030): verified — git ALL_CLAIMS_VERIFIED (2 files +56/−0, merge ef4d839 with PENDING marker, secrets zero, remotes match, gates ×2) + orchestrator code audit of both functions (branches a/b/c exact, লগইন never touched, fire-and-forget logout documented) + browser evidence both env states incl. env-less demo-id survival. Deviations accepted (dual sync call-site fixes SQLite-adoption race; sync logout design). Ruling recorded: Promise.race hardening rejected for MVP. DONE — main @ ef4d839.

```
=== TASK REPORT ===
TASK ID: CHC-T-018 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-VERIFICATION

SUMMARY: auth.ts gains signOutSession() (null-safe, try-wrapped both layers, offline-tolerant via {scope:'local'} fallback — auth-js 2.118 _signOut source read to confirm _removeSession runs on transport failure for any scope except 'others'). app-state লগআউট() clears local state and সংরক্ষণ() BEFORE void signOutSession() — UI never gated on network, promise cannot reject. সেশনসিঙ্ক() sets/clears ONLY ব্যবহারকারী.id from the live session (never app.লগইন or the user object); boot sync at module init AND after native SQLite adoption (async disk load can land after init and would overwrite the synced id). +layout.svelte untouched.

FILES CHANGED: auth.ts (+24) · app-state.svelte.ts (+32). Nothing else.

KEY EVIDENCE: tsc -p exit 0 (rune declared) · import exit 0 · validate ALL PASSED · builds: with-env 741,213 B / parent-baseline re-measured 741,420 B / env-less 740,678 B / merged main 741,208 B (delta ≈ −207…−212 B NEGATIVE) · browser env-present: branch (b) fake stale id → cleared after 2.5s with লগইন/profile INTACT; branch (c) no-id → untouched; logout-no-session → clean, zero Supabase network calls · env-less: demo id SURVIVES reload (offline-first honored), logout clean, console [] · merge marker present, secrets 0, remotes match, validate on main green.

ACCEPTANCE: A1 signOutSession contract (offline contract read from auth-js source) · A2 sync branches exact · A3 env-present DOM ×3 + env-less DOM ×2 · A4 honest PARTIAL (with-session needs SMS credit; getSessionUserId itself live-proven in CHC-T-017) · A5 gates · A6 merged.

DEVIATIONS: (1) sync invoked twice (init + post-SQLite-adoption — async disk load race) — layout deliberately avoided; (2) লগআউট stays synchronous fire-and-forget (never hang/throw); (3) baseline re-measured on untouched HEAD (741,410→741,420 drift = known nondeterminism; deltas as ranges).

OPEN ISSUES: branch (a)+genuine live signOut unproven (fold into next E2E); Promise.race timeout optional hardening (ruled: rejected for MVP — CHC-D-030); token expiry not surfaced (dead session = offline branch, by design); APK not re-measured.
QUESTIONS: none
=== END REPORT ===
```
