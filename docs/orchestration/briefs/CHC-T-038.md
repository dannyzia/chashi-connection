# CHC-T-038 — Signed release APK: cap-proven, installable (CHC-D-047 ruling)

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. Per **CHC-D-047**, the signing stage runs under orchestrator authority: the local release keystore is used for this build under the standing handling discipline — **never read, print, copy, move, or describe the contents of `keystore.properties` or `*.keystore`; the gradle config consumes them, not you.** You may reference property NAMES in the report (e.g. "signingConfig reads storeFile/storePassword"), never values.

## Context

The debug APK exists and is measured (arm64 10,560,151 B / armeabi 10,152,089 B — structurally over cap, exempt per CHC-D-046). The release cap gate is `apps/web/scripts/check_apk.py` (exit 0 = under 6,291,456 B per artifact). `android/app/build.gradle` binds `signingConfigs.release` whenever `keystore.properties` exists — and it exists (`apps/web/android/keystore.properties` + `chashi-release.keystore`, gitignored, untracked). Contract expectation: release ≈ 3.5 MB per ABI (arm64 3,731,526 B / armeabi 3,368,864 B per contract records). Toolchain: Java 17.0.19 Temurin, SDK 36, wrapper Gradle 8.14.3 (proven in T-037).

## Objective

A signed, verified, installable release APK per ABI, byte-cap-proven (gate exit 0), plus the ABB the store format needs — landed as evidence with zero secret exposure.

## Scope (the ONLY files you may create/modify)

- `docs/orchestration/reports/CHC-T-038.md` — create
- `docs/orchestration/LEDGER.md` — the CHC-T-038 row
- `android/**` — modify ONLY if a build-blocking fix is unavoidable (state the exact diff and reason; anything beyond version-field plumbing → STOP and report instead)

## Out of scope

- Any store upload, publication, or announcement (owner-gated forever); any change to `apps/web/src/**`, `supabase/**`, `scripts/check_apk.py`; creating/regenerating any keystore material; printing or transcribing any property value or certificate subject.

## Requirements (each testable)

**R1 — Signing config preflight (no values).** Paste the `signingConfigs { release { ... } }` block from `android/app/build.gradle` with every property VALUE replaced by `<redacted-N>` (number the redactions so the structure stays readable). Confirm the release build type binds it. Confirm the keystore files exist on disk (names + sizes only: keystore.properties 110 B, chashi-release.keystore 2,728 B expected).

**R2 — Signed release build.** From `apps/web/android`: `.\gradlew assembleRelease` (clean if the daemon reports up-to-date: `.\gradlew clean assembleRelease`). Paste BUILD SUCCESSFUL/FAILED verbatim. Report every output APK path + exact bytes.

**R3 — Byte cap.** `python scripts/check_apk.py` from `apps/web` → paste output + exit code. Expect exit 0 with per-ABI sizes in the ≈3.5 MB band; state each ABI's delta vs the contract figures with explanation (minify/shrink/resource-collapse). **Exit 1 = STOP: report the breach verbatim, do not attempt shrink fixes on your own.**

**R4 — Signature verification.** Verify each release APK with the build-tools apksigner: `apksigner verify --print-certs app-<abi>-release.apk` → paste `Verifies`/`Verified` + the SHA-256 digest **truncated to its first 16 hex chars**. If the output includes the certificate SUBJECT (owner identity data), redact it entirely. Confirm DO NOT paste full fingerprints.

**R5 — Store-format bundle.** `.\gradlew bundleRelease` if the task exists → report the .aab path + exact bytes (the gate script counts .aab; include it in R3's run — rerun check_apk.py after the bundle exists so the gate covers both artifact kinds). If no bundle task exists, state that and skip.

**R6 — Installability evidence.** With the debug APK still present (or rebuilt), state the release APK's minimum SDK / target SDK from `android/app/build.gradle` (paste the `defaultConfig` block with values — these are not secrets) and confirm the release APK's ABI splits match the debug set.

**R7 — Land.** Branch `task/CHC-T-038`; commits `type(scope): subject` + `Refs: CHC-T-038`; merge `--no-ff`; push; paste the merge SHA + `git ls-remote --heads origin main`. Bright-line scan on ADDED LINES only (the CHC-D-045/046 interpretation): expect clean; if it fires on context prose, note it and move on.

## Acceptance + verification (paste real output, in order)

1. R1's redacted config block + keystore file sizes.
2. R2's build result + per-ABI APK paths/bytes.
3. R3's gate output (exit 0, per-ABI bytes, deltas vs contract).
4. R4's verify output (truncated digests, subjects redacted).
5. R5's bundle path/bytes + the post-bundle gate rerun.
6. R6's defaultConfig block.
7. `git status --short apps/web supabase docs` after landing → EMPTY (pre-existing CHC-D-018 churn excluded as always); `git ls-remote --heads origin main` → paste.

## Stop conditions

- Signing failure → paste the gradle error verbatim, report BLOCKED (do not modify the keystore, the properties file, or the signing config beyond redacted inspection).
- Gate exit 1 on release artifacts → STOP (a real cap breach is an owner-visible contract violation; report sizes, propose nothing on your own).
- Any property value, password, or certificate subject about to enter the report → redact first; if already pasted, STOP and report the exposure immediately.
- Build-blocking android/ changes beyond version-field plumbing → STOP, report the needed diff.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-038 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R1–R7 PASS|FAIL|BLOCKED with one-line evidence / **WEB ASSETS: N files / N bytes / method** / **APK: per-ABI bytes (release, signed)** / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
