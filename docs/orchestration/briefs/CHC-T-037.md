# CHC-T-037 — Release-prep: first tracked APK build with byte-cap proof

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. Work exactly within SCOPE. Per AGENTS.md: every report MUST state total web-asset bytes and APK/ABB bytes per ABI; unexplained bundle growth = rejection. The contract's prior measured release APK ≈ 3.5 MB per ABI (arm64 3,731,526 B / armeabi 3,368,864 B) — reproduce and restate, never invent.

## Context

The server-backed app is complete and verified through migration 00008 (`main` @ `74674c0` = origin/main; policies 23; §12.4 enforced at the data layer per CHC-D-045). Web assets: 43 files / ~771,747 B, **nondeterministic ±5 B** (per-build timestamp in `_app/version.json`) — state your measurement method and tolerate ±5 B (CHC-D-045). Release-prep now produces the first tracked APK artifact. **This task builds DEBUG (and unsigned-release if the gradle config permits without secrets); release SIGNING is a later stage** — `android/keystore.properties` / `*.keystore` are owner secrets (gitignored) and must never be created, read, printed, or referenced by content.

## Objective

A reproducible debug APK from current main, byte-cap-proven per ABI, Bengali fonts verified bundled, with a reusable measurement script — all landed as evidence.

## Scope (the ONLY files you may create/modify)

- `scripts/check_apk.py` — use if it exists; otherwise create (walks the APK/ABB outputs, prints per-ABI bytes, exits nonzero over the cap)
- `android/**` build files — modify ONLY the minimum needed for the build to run (no new plugins, no dependencies beyond the locked stack)
- `capacitor.config.ts` — only if a build-blocking fix is required (state the diff)
- `docs/orchestration/reports/CHC-T-037.md` — create
- `docs/orchestration/LEDGER.md` — the CHC-T-037 row

## Out of scope

- Release signing or any keystore handling; FCM / AI / any new plugin; changes to `apps/web/src/**` or `logic/**`; Play Store metadata; deleting or regenerating the `android/` platform from scratch if it exists and builds.

## Requirements (each testable)

**R1 — Toolchain preflight (paste real output).** `java -version`; `echo $env:ANDROID_HOME` (or the gradle-resolved SDK path); `gradle -v` / the wrapper's version; confirm `android/gradlew` exists. **If any is missing: STOP, report BLOCKED with the exact one-time install list** (name, version, source) — no improvisation, no silent tool installs.

**R2 — Web build.** From `apps/web`: `node scripts/validate.mjs` → ALL CHECKS PASSED; `npm run build` → exit 0; report file count + total bytes + the method; run the build TWICE and report both byte totals (the ±5 B probe).

**R3 — APK build.** `npx cap sync android` (paste output tail); `.\gradlew assembleDebug` from `android/`. Report every produced APK's path + exact bytes. Then, **only if** `android/app/build.gradle`'s release config builds without `keystore.properties` (inspect the signing logic; many setups fall back to debug signing), run `.\gradlew assembleRelease` too and report the same. If release requires the missing secrets: state that explicitly and deliver debug-only — that is a PASS for this task, not a deviation.

**R4 — Byte cap.** `python scripts/check_apk.py` (or the equivalent invocation) → per-ABI bytes, exit 0 under the 6 MB cap. Compare each ABI against the contract's prior ≈3.5 MB figures and state the delta with its explanation (debug APKs are legitimately larger than release — say so if measured).

**R5 — Bengali font bundling.** List the bundled WOFF2 font files (Noto Sans Bengali / Hind Siliguri) inside the APK assets (`android/app/src/main/assets/public/...`) with exact byte sizes. If fonts are absent from the APK assets: STOP, report BLOCKED — a Bengali-only app without bundled Bengali fonts violates the contract.

**R6 — Land.** Branch `task/CHC-T-037`; commits in `type(scope): subject` + `Refs: CHC-T-037` format; merge `--no-ff` to main; push; paste the merge SHA + `git ls-remote --heads origin main`. The bright-line scan on your diff: if it fires on a filename (`fee` class, CHC-D-045), reword content — never suppress the scan.

## Acceptance + verification (paste real output, in order)

1. R1's toolchain lines.
2. R2's two build byte totals + validate output.
3. R3's APK paths + exact per-ABI bytes (+ release outcome).
4. R4's cap-check output (exit 0, per-ABI bytes, delta vs contract figures).
5. R5's font listing.
6. `git status --short apps/web supabase docs` after landing → EMPTY (pre-existing CHC-D-018 churn excluded as before); `git ls-remote --heads origin main` → paste.

## Stop conditions

- Toolchain gaps (R1) → BLOCKED with the install list.
- Any APK over 6 MB → STOP (contract cap breach; report sizes, do not attempt shrink-on-your-own fixes).
- Any keystore/secret file creation or content exposure → STOP immediately.
- If `android/` does not exist: `npx cap add android` per the locked stack IS in scope, but if `cap add` fails, STOP and report.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-037 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R1–R6 PASS|FAIL|BLOCKED with one-line evidence / **WEB ASSETS: N files / N bytes / method** / **APK: per-ABI bytes** / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
