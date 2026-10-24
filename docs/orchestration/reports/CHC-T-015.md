# CHC-T-015 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-025): builder stopped at the byte guardrail with browser-verified code uncommitted — correct behavior; the QUESTION was ruled by the orchestrator (CHC-D-025: accept +231,319 B, narrow-import rejected, provider stays off). Landed as CHC-T-015r2. BLOCKED→r2.

```
=== TASK REPORT ===
TASK ID: CHC-T-015 | AGENT ID: A-IMP-1 | STATUS: BLOCKED at R6 (byte delta 231,319 > 150,000 + OTP provider disabled). All code written, typechecked, built, browser-verified; nothing committed.

SUMMARY: Built the whole auth layer — auth.ts (119 lines: toE164, hasAuthClient, sendOtp, verifyOtp, getSessionUserId, প্রোফাইলসংরক্ষণ); signup steps 1–2 real signInWithOtp/verifyOtp with demo path preserved; step-5 users insert keyed by auth uid with offline queue branch. Typechecks, builds, validate green, both paths browser-verified. Blockers: supabase-js import +231,319 B (threshold 150,000) and live project answers phone_provider_disabled.

FILES CHANGED (uncommitted): src/lib/auth.ts (new 119) · src/lib/supabase.ts (interface→type + Relationships repair — genuine fix to T-013's collapsed generics) · signup/+page.svelte (61 lines) · bn.ts (+ত্রুটি_ওটিপিপাঠানো; placeholder ৪→৪–৬) · app-state (id?: string).

KEY EVIDENCE: otp smoke → phone_provider_disabled 400 (reaches Supabase, refused by config); env-less build 737,992 B green; esbuild probe: supabase-js full 222,719 B vs auth+postgrest 121,407 B; browser: demo path (123 rejected, 4567→step 3) and env path (live round-trip → Bengali failure) both proven in DOM.

ACCEPTANCE: A1 PASS, A2 PASS (DOM-verified), A3 code-PASS/live-PARTIAL, A4 PARTIAL (as briefed), A5 gates PASS + delta FAIL, A6 deliberately not done.

OPEN ISSUES: phone provider decision (→ CHC-D-025: stays off, dP Relay path); লগআউট no signOut → T-018; no cold-start session restore → T-018; verify E2E PARTIAL; tsconfig-extends warning pre-existing.
QUESTIONS: byte-line ruling (answered CHC-D-025)
=== END REPORT ===
```
