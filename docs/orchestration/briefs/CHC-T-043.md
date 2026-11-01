# CHC-T-043 — Land the ratified on-device fixes (camera crash, SQLite keeps, capture UX)

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. **CHC-D-052 ratified your ad-hoc on-device fixes in full** — this brief lands them with the discipline they earned. The four modified files on disk are pre-verified; your job is: two small corrections, the gates, a rebuild, a device reinstall, and the landing.

## Context

Your session found and fixed a production bug: R8 stripped `@CapacitorPlugin` annotations → `getPermissionStates()` empty → Camera NPE on tap, and the same stripping silently degraded the SQLite plugin to localStorage. The four files sit uncommitted on `main` @ `32fb687` + pending docs hunks. Independent review passed all soundness checks. Known corrections required: two comments carry the Bengali date typo `২৬১-১১-০১` (→ `২০২৬-১১-০১`), and the ProGuard block's "বান্ডল অপরিবর্তিত" claim is wrong (the keeps cost ~370 KB vs contract-era builds — current 4,103,999 / 3,740,739 B is healthy and must be stated, not hidden).

## Objective

The four fixes land committed, the APK is rebuilt and reinstalled on the device, and the record states the true byte cost.

## Scope (the ONLY files you may create/modify)

- `apps/web/android/app/src/main/AndroidManifest.xml` — the two comment typos only (the permission lines are correct — do not touch them)
- `apps/web/android/app/proguard-rules.pro` — the date typo + replace the "বান্ডল অপরিবর্তিত" claim with the true byte statement (~370 KB vs contract-era builds; current totals stated; gate exit 0)
- `apps/web/src/routes/post/+page.svelte` — the one date typo only
- `docs/orchestration/reports/CHC-T-043.md`, `docs/orchestration/LEDGER.md` (the CHC-T-043 row)

## Out of scope

- The seed-data feed behavior (CHC-T-044, ruled separately); the offline round-trip re-test (the next device session, after this build is installed); any change to the permission lines, keep-rule families, or the UX markup; deleting `পরীক্ষার ধান` or other test rows (queued for the next device session's cleanup).

## Requirements (each testable)

**R1 — Comment corrections.** The three edits above, applied. Paste each diff hunk.

**R2 — Gates.** From `apps/web`: `node scripts/validate.mjs` → ALL CHECKS PASSED; `npm run build` → exit 0 (state bytes + method).

**R3 — Rebuild + re-cap.** `.\gradlew clean assembleRelease` → BUILD SUCCESSFUL; per-ABI bytes (expect ≈4,104,000 / ≈3,740,700 — state the delta vs the on-disk pre-fix builds and attribute: the annotation-keep cost); `python scripts/check_apk.py --root android/app/build/outputs/apk/release --variant release` → exit 0. Gate exit 1 → STOP with sizes.

**R4 — Device reinstall (the camera crash fix on real hardware).** `adb connect 192.168.0.234:42817` → `adb install -r .../app-arm64-v8a-release.apk` → Success. Then the crash-regression proof: `adb shell am force-stop com.chashi.connection`; relaunch; ask the owner to tap ছবি তুলুন and take one photo → confirm NO crash and the thumbnail + `✓ ছবি যোগ হয়েছে` appear (owner's one-word confirm). Paste the install output.

**R5 — SQLite plugin alive in the artifact.** From the NEW APK: confirm the SQLite plugin classes survived R8 (dexdump/grep for `SqlitePlugin` or `capacitor-community-sqlite` in the dex — paste the presence line; this is the anti-localStorage-fallback assurance).

**R6 — Land.** Branch `task/CHC-T-043`; commit the 4 app files (`fix(android): keep Capacitor plugin annotations through R8; camera capture feedback` + `Refs: CHC-T-043`); merge `--no-ff`; push; paste the merge SHA + `git ls-remote --heads origin main`. `git status --short apps/web supabase docs` → EMPTY (except any orchestrator files you preserve as always).

## Acceptance + verification (paste real output, in order)

1. R1's three diff hunks.
2. R2's validate + build outputs.
3. R3's build + per-ABI bytes + gate exit 0 + delta attribution.
4. R4's install + the owner's crash-regression confirm.
5. R5's SqlitePlugin presence line.
6. R6's merge SHA + ls-remote + clean status.

## Stop conditions

- Gate exit 1 → STOP with sizes.
- The camera crash REPRODUCES on the new build → STOP (the keep-rules didn't hold; report the dexdump evidence).
- Any change beyond the three comment fixes and the docs files → STOP.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-043 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R1–R6 with one-line evidence / WEB ASSETS + APK per-ABI bytes / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
