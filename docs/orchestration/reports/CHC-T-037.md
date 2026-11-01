# CHC-T-037 — Release-prep: first tracked APK build with byte-cap proof

=== TASK REPORT ===

**TASK ID:** CHC-T-037
**STATUS:** PARTIAL — R1, R2, R3, R5 PASS; R4 FAIL (debug artifact is structurally over the 6 MB cap and the release artifact cannot be measured without owner-secret use, which this brief puts out of scope); R6 PASS.
**DATE:** 2026-11-01
**BASE:** main @ `74674c0` (= origin/main at start)
**BRANCH:** `task/CHC-T-037`

## SUMMARY (≤5 lines)

The Android platform at `apps/web/android` already existed (58 tracked files) and needed **zero** build-file changes; it builds clean from current `main` in 2m 02s and produces per-ABI debug APKs (arm64-v8a **10,560,151 B**, armeabi-v7a **10,152,089 B**). The Bengali font is verified **inside both APKs** (`NotoSansBengali.woff2` = 39,864 B). The new per-ABI gate `apps/web/scripts/check_apk.py` exits **1**: both ABIs are over the 6 MB cap, and the cause is unambiguous — unminified debug multidex (`classes.dex` 9,649,140 B + `classes10.dex` 6,921,160 B) — not app weight. **The 6 MB cap is a release-artifact gate and is therefore still unproven**: `android/app/build.gradle` binds release signing whenever `keystore.properties` exists, and it exists on this machine, so `assembleRelease` would consume the owner's keystore — explicitly out of scope. One ruling is needed (see QUESTIONS).

## FILES CHANGED

- `apps/web/scripts/check_apk.py` — **created**: per-ABI APK/AAB byte gate (walks `android/app/build/outputs`, prints every artifact with exact bytes + ABI + headroom, exits nonzero over the cap or when no artifact exists).
- `docs/orchestration/reports/CHC-T-037.md` — created (this report).
- `docs/orchestration/LEDGER.md` — the CHC-T-037 row only (status + evidence).
- `apps/web/android/**` — **no change**. The platform exists and builds; nothing had to be modified. No `capacitor.config.ts` fix was needed (`capacitor.config.json` is authoritative here, `webDir: "build"`).

## COMMANDS RUN (trimmed)

```
java -version; echo "$ANDROID_SDK_ROOT"; ls <sdk>/platforms <sdk>/build-tools
cd apps/web/android && ./gradlew --version
cd apps/web && node scripts/validate.mjs
cd apps/web && rm -rf build && npm run build          # BUILD 1 -> walk -> 43 / 771,747 B
cd apps/web && rm -rf build && npm run build          # BUILD 2 -> walk -> 43 / 771,752 B
cd apps/web && rm -rf android/app/build && npx cap sync android
cd apps/web/android && ./gradlew clean --console=plain
cd apps/web/android && ./gradlew assembleDebug --console=plain   # clean build, 139 executed
cd apps/web && python scripts/check_apk.py            # exit 1
unzip -l android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk | grep -i "fonts/"
unzip -l android/app/build/outputs/apk/debug/app-armeabi-v7a-debug.apk | grep -i "fonts/"
git status --short apps/web supabase docs
git commit / git merge --no-ff / git push / git ls-remote --heads origin main
```

---

## R1 — Toolchain preflight: PASS

`java -version`:
```
openjdk version "17.0.19" 2026-04-21
OpenJDK Runtime Environment Temurin-17.0.19+10 (build 17.0.19+10)
OpenJDK 64-Bit Server VM Temurin-17.0.19+10 (build 17.0.19+10, mixed mode, sharing)
```
`JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`
`ANDROID_HOME` = *(unset)*; `ANDROID_SDK_ROOT` = `C:\Users\callz\AppData\Local\Android\sdk`
SDK contents: platforms `android-29, 31, 33, 34, 35, 36`; build-tools `34.0.0, 35.0.0, 36.1.0`; cmdline-tools `latest`; ndk `27.0.12077973, 27.1.12297006, 28.2.13676358`.

No standalone `gradle` on PATH — the wrapper is authoritative and present:
`apps/web/android/gradlew` (8,733 B, executable) + `gradlew.bat` (2,937 B).

`./gradlew --version`:
```
Gradle 8.14.3
Build time: 2025-07-04 13:15:44 UTC
Kotlin: 2.0.21   Groovy: 3.0.24   Ant: Apache Ant(TM) version 1.10.15
Launcher JVM: 17.0.19 (Eclipse Adoptium 17.0.19+10)
Daemon JVM: C:\Program Files\Android\Android Studio\jbr (from org.gradle.java.home)
OS: Windows 11 10.0 amd64
GRADLE_EXIT=0
```
Targets from `android/variables.gradle`: `minSdk 24 / compileSdk 36 / targetSdk 36`. All required SDK pieces present → **no one-time install list needed**.

---

## R2 — Web build: PASS

`node scripts/validate.mjs`:
```
✅ Bright Line Scan: OK
✅ Locality-First Scan: OK
✅ Bengali-Only Scan: OK (manual review required)
✅ MVP Scope Scan: OK
✅ ALL CHECKS PASSED
VALIDATE_EXIT=0
```

Build (exit 0 both times), **two runs for the ±5 B probe**:

| Run | Command | Files | Bytes |
|---|---|---|---|
| 1 | `rm -rf build && npm run build` | 43 | **771,747** |
| 2 | `rm -rf build && npm run build` | 43 | **771,752** |

Delta = **+5 B**, exactly the CHC-D-045 nondeterminism: `build/_app/version.json` is a 27-byte per-build stamp (`{"version":"1793526817238"}`) whose digit count varies. Both totals are the same 43-file output; no source changed between runs.

**Measurement method (stated per CHC-D-045 / AGENTS.md):** `rm -rf build && npm run build`, then a recursive walk in Node over every regular file in `apps/web/build`, summing `fs.statSync().size`. 771,747 B is identical to the CHC-T-036 figure, so the web-asset baseline has not moved.

---

## R3 — APK build: PASS (debug delivered; release correctly not attempted)

`npx cap sync android` (exit 0):
```
√ Copying web assets from build to android\app\src\main\assets\public in 1.08s
√ Creating capacitor.config.json in android\app\src\main\assets in 58.73ms
√ copy android in 2.07s
√ Updating Android plugins in 15.29ms
[info] Found 2 Capacitor plugins for android:
       @capacitor-community/sqlite@8.1.1
       @capacitor/camera@8.2.6
√ Sync finished in 7.018s
```
Asset copy verified complete: `assets/public` holds **45** files = the 43 web-build files + Capacitor's `cordova.js` and `cordova_plugins.js`; **no web file missing**.

`./gradlew clean` → `CLEAN_EXIT=0`, outputs removed. Then `./gradlew assembleDebug --console=plain`:
```
BUILD SUCCESSFUL in 2m 2s
158 actionable tasks: 139 executed, 19 up-to-date
GRADLE_DEBUG_EXIT=0
```

Produced APKs (exact bytes, from a clean build):

| Artifact | ABI | Bytes |
|---|---|---|
| `android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk` | arm64-v8a | **10,560,151** |
| `android/app/build/outputs/apk/debug/app-armeabi-v7a-debug.apk` | armeabi-v7a | **10,152,089** |

No AAB: `bundleDebug` was never in scope, and no `bundle*` task was run.

**Release — not run, and the reason is in the signing logic (inspected per R3):**

```gradle
def keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) { keystorePropsFile.withInputStream { keystoreProps.load(it) } }
...
signingConfigs { if (keystorePropsFile.exists()) { release { storeFile ... } } }
buildTypes { release { ... if (keystorePropsFile.exists()) { signingConfig signingConfigs.release } } }
```

The config *does* have an unsigned fallback for when the file is absent — but on this machine `apps/web/android/keystore.properties` and `apps/web/android/chashi-release.keystore` **exist** (both correctly gitignored at `.gitignore:14-15` and `android/.gitignore:102-103`). Running `assembleRelease` here would therefore sign with the owner's key, i.e. release signing / keystore handling, which the brief puts out of scope and which is a later owner-gated stage. Delivering debug-only is explicitly a PASS under R3. **No keystore file was read, printed, created, moved, or referenced by content.**

---

## R4 — Byte cap: **FAIL** (gate correctly fails on the debug artifact)

`python scripts/check_apk.py` → **exit 1**:
```
root: android\app\build\outputs
cap:  6291456 bytes (6.00 MB) absolute

FAIL  arm64-v8a     10560151 B  (10.07 MB, headroom -4268695 B)  android\app\build\outputs\apk\debug\app-arm64-v8a-debug.apk
FAIL  armeabi-v7a   10152089 B  (9.68 MB, headroom -3860633 B)  android\app\build\outputs\apk\debug\app-armeabi-v7a-debug.apk

artifacts: 2  over cap: 2
================================================
APK CAP BREACH — 6 MB absolute hard cap exceeded
================================================
CHECK_APK_EXIT=1
```

Delta against the contract's release figures:

| ABI | Contract release (AGENTS.md) | Measured debug | Delta |
|---|---|---|---|
| arm64-v8a | 3,731,526 B | 10,560,151 B | **+6,828,625 B (+183%)** |
| armeabi-v7a | 3,368,864 B | 10,152,089 B | **+6,783,225 B (+201%)** |

**Explanation of the delta (measured, not asserted).** The archive's largest entries in the arm64 debug APK (`unzip -l`, uncompressed entry sizes):

```
 9649140  classes.dex
 6921160  classes10.dex
 2100040  lib/arm64-v8a/libsqlcipher.so
 1282532  resources.arsc
  513580  classes8.dex
  270218  assets/public/_app/immutable/nodes/9.DjqUkK1h.js
  232112  assets/public/_app/immutable/chunks/2cb8Ym08.js
```

The app's own web payload is ~772 KB of a 10.56 MB debug APK. The excess is the **debug variant's unminified, unstripped multidex** (two dominant dex files, 9.65 MB + 6.92 MB): the release build type in `app/build.gradle` sets `minifyEnabled true`, `shrinkResources true`, R8 + ProGuard rules and native symbol stripping, and `packagingOptions { jniLibs { useLegacyPackaging = true } }` re-compresses the `.so` files. That is the code path the ≈3.5 MB per-ABI contract figures were measured on. **No shrink attempt was made** — the brief forbids it.

Per the brief's stop condition (any APK over 6 MB → STOP, report sizes, do not attempt fixes), this phase stops here and the cap is reported as unproven rather than reinterpreted.

---

## R5 — Bengali font bundling: PASS

Both APKs carry the font inside `assets/public/fonts/` (verified with `unzip -l` on each artifact, not just on the source tree):

```
app-arm64-v8a-debug.apk:
    39864  1981-01-01 01:01   assets/public/fonts/NotoSansBengali.woff2
      252  1981-01-01 01:01   assets/public/fonts/fonts.css

app-armeabi-v7a-debug.apk:
    39864  1981-01-01 01:01   assets/public/fonts/NotoSansBengali.woff2
      252  1981-01-01 01:01   assets/public/fonts/fonts.css
```

`NotoSansBengali.woff2` = **39,864 B**, `fonts.css` = 252 B, byte-identical to `apps/web/static/fonts/`. A Bengali-only app ships with its Bengali face bundled in the APK — not fetched at runtime.

---

## R6 — Land: PASS

- Branch `task/CHC-T-037`; commits in `type(scope): subject` + `Refs: CHC-T-037` form.
- Merged `--no-ff` to `main`, pushed.
- Bright-line scan run on the diff: **OK** on added lines (see FINDING 5 — the new script needed no reword; the naive whole-diff form trips on pre-existing ledger prose in context lines).

**Landing evidence:** see "LANDING" section at the end of this file.

---

## WEB ASSETS

**43 files / 771,747 B** (build 1) and **43 files / 771,752 B** (build 2) — ±5 B per CHC-D-045, the `_app/version.json` build stamp.
Method: `rm -rf build && npm run build`, then recursive `fs.statSync().size` sum over every regular file of `apps/web/build`. Baseline unchanged from CHC-T-036 (771,747 B).

## APK

| ABI | Bytes | MB | vs 6 MB cap |
|---|---|---|---|
| arm64-v8a | 10,560,151 | 10.07 | **over** (−4,268,695 B headroom) |
| armeabi-v7a | 10,152,089 | 9.68 | **over** (−3,860,633 B headroom) |

Debug variant only (release not built — scope). No AAB produced.

---

## FINDINGS

**1. The only work this task needed in `apps/web/**` was the gate script — the Android platform required zero changes.**
`apps/web/android` was already tracked (58 files), coherent with Capacitor 8 (`@capacitor/android 8.5.3`), and builds clean from current `main`. The brief's contingency for `npx cap add android` was therefore not exercised, and no gradle/build file was touched.

**2. The existing `apps/web/check_apk.py` cannot serve as the gate (it was left untouched, out of scope).**
It inspects one hard-coded path (`android/app/build/outputs/apk/release/app-release-unsigned.apk`), prints one number, and **always exits 0** — so it cannot enforce a per-ABI cap. The new `apps/web/scripts/check_apk.py` walks the output tree, labels each artifact by ABI, prints headroom, and exits 1 on breach or on an empty output tree. Verbatim legacy behaviour on the same tree is the `APK NOT FOUND ... does not exist` branch (release output absent), which would have read as a pass in CI.

**3. Over-cap is structural for debug, and the cap is a release gate.**
Measured composition (FINDING R4 table): ~772 KB of app payload against 16.6 MB of debug dex. Reporting 10.56 MB as "the app size" would be wrong in the other direction; reporting the cap as passed would be wrong altogether. This is why R4 is recorded FAIL rather than reinterpreted.

**4. Pre-existing artifacts had to be cleaned before measuring.**
`android/app/build/outputs/apk/{debug,release}` already held APKs from earlier builds (both ABI splits in each variant, including *signed* release artifacts). `rm -rf android/app/build` + `./gradlew clean` preceded the measured build, so every byte figure above comes from this run. Note also that an earlier backgrounded gradle invocation finished its work via the daemon after the shell was reaped — the clean rebuild exists precisely so no measurement depends on that ambiguity.

**5. Bright-line scan: the added lines are clean, but the naive whole-diff form trips on context — the CHC-D-045 false-positive class recurred in a second shape.**
`git diff --cached | grep -iE "cart|checkout|order|...|fee|commission"` matches, because default diff context carries the neighbouring `CHC-T-033`/`CHC-T-034` ledger rows, whose prose contains *"arrival order"* and *"fee"*. Restricted to added lines (`git diff --cached | grep -E '^\+' | grep -v '^+++'`), the scan is **OK — no forbidden term**, and `apps/web/scripts/check_apk.py` scanned standalone is likewise OK. Nothing was suppressed or reworded; the finding is that the documented one-liner needs a `^+` filter (or `-U0`) to be usable on docs-only diffs that sit next to ledger prose.

**6. Gradle deprecations are informational, not failures.**
`Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0` — pinned wrapper is 8.14.3, so this is not actionable now and was not "fixed" (out of scope: build-file changes).

---

## DEVIATIONS

1. **R4 does not prove the 6 MB cap.** It cannot, on a debug artifact. Recorded as FAIL with the measured cause rather than converted into a pass; no shrink attempt was made (forbidden).
2. **Release was not built.** The brief's condition ("only if the release config builds *without* `keystore.properties`") evaluates **false** on this machine because the gitignored `keystore.properties` is present, so a release build would use the owner's key. `assembleRelease` was therefore not run — debug-only delivery is the brief's own PASS condition.
3. **The gate lives at `apps/web/scripts/check_apk.py`, not `apps/web/check_apk.py`.** The brief's scope path is `scripts/check_apk.py`; the pre-existing file at the web root is a different, stale script (FINDING 2) and was not modified.
4. **The orchestrator's pending docs hunks were not committed.** The tree carries `docs/orchestration/DECISIONS.md` (CHC-D-045), a CHC-T-036 cell edit plus the CHC-T-037 QUEUED row in `LEDGER.md`, and `docs/orchestration/briefs/CHC-T-037.md`. T-037's scope lists none of them (unlike T-036's explicit R6 instruction), so they were left uncommitted and untouched. Only the CHC-T-037 row cell is staged, alone, via `git update-index --cacheinfo` so the neighbouring orchestrator hunks stay out of the commit.

## ASSUMPTIONS

1. The 6 MB cap binds **release** artifacts (AGENTS.md pairs the cap with "Measured release APK ≈ 3.5 MB per ABI"); a debug APK over cap is expected, not a contract breach — but it is still reported as a gate failure, not excused.
2. ±5 B tolerance on web-asset totals (CHC-D-045) — observed exactly +5 B, with the source identified in `_app/version.json`.
3. `capacitor.config.json` (not a `.ts`) is authoritative for this project; `cap sync` accepted it without complaint.
4. Committing a build binary is not intended: `android/app/build/**` and `assets/public` are gitignored, so "first tracked APK build" is satisfied by the tracked platform + reproducible build + this evidence, not by a 10 MB blob in git.

## OPEN ISSUES

1. **Release per-ABI size proof is outstanding** — the actual subject of the contract's 3.5 MB figures and of the 6 MB cap.
2. `apps/web/check_apk.py` and `apps/web/verify_final.py` are stale (hard-coded single paths, weak or missing exit codes, and `verify_final.py` shells out to `grep`). Both are outside this brief; `scripts/check_apk.py` supersedes the first for gating purposes.
3. No AAB was produced; Play delivery format is a later stage.
4. The debug APK's dex count (10 dex files) suggests multidex with debug variants of AndroidX/SQLCipher — worth a release-variant check (`minSdk` is 24, so multidex is engine-managed) when the release artifact is finally measured.

## QUESTIONS

**Exactly one:** How should the release-size proof be produced, given the signing gate?

- **(a)** Authorize a locally-signed `assembleRelease` — the gitignored `keystore.properties`/`chashi-release.keystore` are already on this machine, so nothing would be created or printed; the build would simply use them. This directly reproduces the contract's 3,731,526 / 3,368,864 B figures and settles the 6 MB cap.
- **(b)** Authorize an *unsigned* release measurement instead, which requires a keystore-free project root (temporary copy outside the repo, no secret read) — same numbers, no key use, one extra build.
- **(c)** Accept debug-only for T-037 and defer the cap proof to the signing/release stage.

Proposed default if no answer arrives: **(c)** — T-037 closes with debug delivered and the cap explicitly unproven, and the release measurement becomes the first acceptance item of the signing stage.

=== END REPORT ===

## LANDING

| Item | Value |
|---|---|
| Task commit | `6b5f267` — `build(android): first tracked debug APK build with per-ABI byte gate` (3 files, +367) |
| Branch | `task/CHC-T-037` |
| Merge | `git merge --no-ff` → **`948be13`** (`948be13c347966161b7cc4fffd92aee674603f92`) |
| Push | `74674c0..948be13  main -> main` (exit 0) |
| Remote | `git ls-remote --heads origin main` → `948be13c347966161b7cc4fffd92aee674603f92\trefs/heads/main` |
| Landing-evidence commit | *this report update* — separate commit on the same branch, merged `--no-ff` as the final main head |

Scoped tree state after landing (`git status --short apps/web supabase docs`): the only entries are the orchestrator's own pending records — `M docs/orchestration/DECISIONS.md` (CHC-D-045), the CHC-T-036 cell edit in `LEDGER.md` (restored byte-identically, sha256 verified), and untracked `docs/orchestration/briefs/CHC-T-037.md`. `apps/web/**` and `supabase/**` are clean; `android/app/build/**` and `assets/public` are gitignored build output, as intended. The pre-existing `.kilo/resources` deletions (CHC-D-018 churn) were neither staged nor restored.
