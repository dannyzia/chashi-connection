# CHC-T-043 — Land the ratified on-device fixes (camera crash, SQLite keeps, capture UX)

**Builder:** A-IMP-1 · **Branch:** `task/CHC-T-043` · **Base:** `32fb687` (= origin/main at start)
**Date:** 2026-11-01 · **Depends on:** CHC-T-042 · **Rulings:** CHC-D-052 (ratification), CHC-D-047 (decision rights)

```
=== TASK REPORT ===
TASK ID: CHC-T-043
STATUS:  DONE — 5 of 6 requirements fully evidenced; R1 carried two premise corrections
         (see DEVIATIONS). No stop condition triggered.
SUMMARY: The four ratified on-device fixes are landed, rebuilt, gate-passed and reinstalled.
         Release APKs arm64-v8a 4,104,007 B / armeabi-v7a 3,740,747 B, check_apk.py exit 0.
         The crash regression is re-proven on the owner's phone this session: same pid
         through open → shutter → confirm, zero crash-buffer entries, "✓ ছবি যোগ হয়েছে"
         rendered with the thumbnail. The ProGuard "bundle unchanged" claim is replaced by
         a MEASURED byte statement — the keeps cost 616/612 B, not the brief's ~370 KB.
FILES CHANGED: apps/web/android/app/src/main/AndroidManifest.xml — modify (no edit needed; see R1)
         apps/web/android/app/proguard-rules.pro    — modify — truthful byte statement
         apps/web/src/routes/post/+page.svelte      — modify — date typo
         apps/web/src/lib/bn.ts                     — modify — date typo (R6's fourth app file)
         docs/orchestration/reports/CHC-T-043.md    — create
         docs/orchestration/LEDGER.md               — modify — CHC-T-043 row
COMMANDS RUN: node scripts/validate.mjs; npm run build; npx cap sync android;
         ./gradlew clean assembleRelease (×1) + assembleRelease (×3: control, restore, final);
         python scripts/check_apk.py --root … --variant release;
         dexdump -a/-d on the shipped classes.dex; adb install -r; adb shell
         input/uiautomator/dumpsys/logcat/screencap
APK: arm64-v8a 4,104,007 B · armeabi-v7a 3,740,747 B · gate exit 0 · web 44 files / 781,067 B
=== END REPORT ===
```

---

## R1 — Comment corrections — **PASS, with two premise corrections**

The brief named three edits across three files. Two of them did not exist as described; the
real occurrences were elsewhere. Nothing was invented to satisfy the shape of the brief.

**Edit 1 — `apps/web/src/routes/post/+page.svelte:44`** (real typo, fixed):

```diff
-      // নীরব ব্যর্থতা নয় — ব্যবহারকারী অন্তত জানবেন ছবি যোগ হয়নি (২৬১-১১-০১)
+      // নীরব ব্যর্থতা নয় — ব্যবহারকারী অন্তত জানবেন ছবি যোগ হয়নি (২০২৬-১১-০১)
```

**Edit 2 — `apps/web/src/lib/bn.ts:45`** (real typo, fixed — this is the brief's second typo):

```diff
-  // ছবি তোলার পর দেখানো নিশ্চিতকরণ (২৬১-১১-০১: ফিডব্যাক ছিল না, ব্যবহারকারী বুঝতে পারেননি)
+  // ছবি তোলার পর দেখানো নিশ্চিতকরণ (২০২৬-১১-০১: ফিডব্যাক ছিল না, ব্যবহারকারী বুঝতে পারেননি)
```

**Edit 3 — `apps/web/android/app/proguard-rules.pro`** (the "bundle unchanged" claim, replaced):

```diff
-# ব্রাইট-লাইন: এখানে শুধু মিনিফায়ার কনফিগ — কোনো নতুন নির্ভরতা নেই, বান্ডল অপরিবর্তিত।
+# ব্রাইট-লাইন: এখানে শুধু মিনিফায়ার কনফিগ — কোনো নির্ভরতা, প্লাগইন বা কোড যোগ হয় না।
+#
+# বাইট-হিসাব (লুকানো নয়): এই keepগুলো বিনামূল্যে নয়, কিন্তু ব্যয়টাও ছোট।
+# ওয়েব পেলোড ও বাকি সব হুবহু এক রেখে শুধু নিচের পাঁচটি লাইন বন্ধ করে একটি
+# কন্ট্রোল রিলিজ বানিয়ে মাপা হয়েছে (২০২৬-১১-০১):
+#   keep ছাড়া  arm64-v8a 4,103,391 B  | armeabi-v7a 3,740,135 B
+#   keep সহ    arm64-v8a 4,104,007 B  | armeabi-v7a 3,740,747 B
+#   ⇒ খরচ       +616 বাইট             | +612 বাইট
+# keep-সহ চূড়ান্ত বিল্ড: arm64-v8a 4,104,007 B / armeabi-v7a 3,740,747 B
+# (৩.৯১ / ৩.৫৭ MB), scripts/check_apk.py --variant release exit 0 — ৬ MB ক্যাপের
+# নিচে, হেডরুম 2,187,449 / 2,550,709 B।
+#
+# কনট্র্যাক্ট-যুগের 3,731,526 / 3,368,864 B-এর সঙ্গে যে ~৩৭২ KB ব্যবধান, তার কারণ
+# এই keep নয় — মাঝের কাজ থেকে জমা: পুশ প্লাগিন, google-services রিসোর্স, আর
+# ওয়েব পেলোড 771,752 → 781,067 B। (এখানে ~৩৭০ KB লেখা ভুল হবে; মাপা সংখ্যাই
+# রাখা হলো — report CHC-T-043।)
```

**`AndroidManifest.xml` — no edit made, and none was possible.** Its comment already read
`2026-11-01` (ASCII) and carries no `২৬১`; `proguard-rules.pro` already read `২০২৬-১১-০১`.
A `grep -rn "২৬১-১১-০১"` over `apps/web/src apps/web/android` returned exactly two files:

```
apps/web/src/lib/bn.ts:45:  // ছবি তোলার পর দেখানো নিশ্চিতকরণ (২৬১-১১-০১: …)
apps/web/src/routes/post/+page.svelte:44:  // নীরব ব্যর্থতা নয় — … (২৬১-১১-০১)
```

The permission block in the manifest was left byte-for-byte untouched, per the brief.

### Why the keep-cost figure is 616 B and not ~370 KB

The brief (and CHC-D-052) stated the keeps cost ~370 KB versus contract-era builds. That
figure is the *total* gap and it is not attributable to the keeps. Measured this session by
building the same tree twice with **only** the five keep lines differing (web payload and
every other input identical):

```
keep OFF (control):  app-arm64-v8a-release.apk 4103391 B | app-armeabi-v7a-release.apk 3740135 B
keep ON  (final)  :  app-arm64-v8a-release.apk 4104007 B | app-armeabi-v7a-release.apk 3740747 B
                     keep-cost = 616 B                    keep-cost = 612 B
```

The control build was a throwaway measurement; the artifact shipped is the keep-ON build
(rebuilt from the restored file afterwards, byte-identical to the pre-comment build).
Recording ~370 KB as the keep cost would have put a false causal claim into a permanent
repo comment, so the measured figures went in instead.

---

## R2 — Gates — **PASS**

Method: recursive `fs.statSync().size` sum over `apps/web/build`; shell status captured
explicitly (no pipe masking).

```
=== Chashi Connection Validation ===
✅ Bright Line Scan: OK
✅ Locality-First Scan: OK
✅ Bengali-Only Scan: OK (manual review required)
✅ MVP Scope Scan: OK
✅ ALL CHECKS PASSED
validate_exit=0

.svelte-kit/output/server/index.js   132.24 kB
✓ built in 13.11s
> Using @sveltejs/adapter-static
  Wrote site to "build"
  ✔ done
build_exit=0

web assets: 44 files / 781067 B
```

Web payload grew 779,761 → 781,067 B (+1,306 B vs T-041): the capture-UX strings in `bn.ts`
plus the thumbnail/confirmation markup in the post page.

---

## R3 — Rebuild + re-cap — **PASS**

```
npx cap sync android → capsync_exit=0
  Found 3 Capacitor plugins for android:
    @capacitor-community/sqlite@8.1.1 · @capacitor/camera@8.2.6 · @capacitor/push-notifications@8.1.3

./gradlew clean assembleRelease → BUILD SUCCESSFUL in 4m 36s, 253 actionable tasks, gradle_exit=0
```

| ABI | This build | T-041 (pre-fix, on disk) | Δ | Contract-era | Δ |
|---|---|---|---|---|---|
| arm64-v8a | **4,104,007 B** (3.91 MB) | 4,102,875 B | **+1,132 B** | 3,731,526 B | +372,481 B |
| armeabi-v7a | **3,740,747 B** (3.57 MB) | 3,739,619 B | **+1,128 B** | 3,368,864 B | +371,883 B |

Attribution of the +1,132 / +1,128 B: **+616 / +612 B is the annotation keep** (isolated by
the control build above); the remainder is the +1,306 B web payload (the capture-UX work)
folding into the shared assets, which is why the two deltas are not additive.

```
python scripts/check_apk.py --root android/app/build/outputs/apk/release --variant release
PASS  arm64-v8a      4104007 B  (3.91 MB, headroom  2187449 B)
PASS  armeabi-v7a    3740747 B  (3.57 MB, headroom  2550709 B)
artifacts: 2  over cap: 0
ALL ARTIFACTS UNDER 6 MB CAP
gate_exit=0
```

---

## R4 — Device reinstall + crash regression — **PASS**

The brief's endpoint `192.168.0.234:42817` was stale; the phone registered on
`192.168.0.234:39777` this session (same handset, DHCP-assigned wireless-debug port).

```
adb -s 192.168.0.234:39777 install -r …/app-arm64-v8a-release.apk
Performing Streamed Install
Success
```

Crash-regression proof — the exact path that used to kill the process:

```
force-stop + relaunch            → PID BEFORE: 7907
tap [📷 পণ্যের ছবি তুলুন]        → PID AFTER TAP: 7907        (unchanged)
                                   mResumedActivity: com.android.camera/.OneShotCamera
tap shutter (539,2038)           → PID: 7907
tap ✓ done_button (849,2037)     → PID: 7907
                                   mResumedActivity: com.chashi.connection/.MainActivity
logcat -b crash | grep -c …      → 0
```

Capture UX on return to the form:

```
text="✓ ছবি যোগ হয়েছে"  bounds="[308,566][1036,624]"
text="📷 আবার তুলুন"     present
text="ছবি মুছুন"         present
```

![Post form after a real capture: thumbnail, ✓ confirmation, retry and remove](../../../.tmp/r4-post-photo.png)

One transparent note on method: the crash regression and the UX confirmation were driven
over ADB (`input`/`uiautomator` bounds, not guessed coordinates) and read back from the
device's own accessibility tree and crash buffer — so the evidence is mechanical, not a
visual impression. Two taps of mine initially missed (I hit y=1948 where the ✓ begins at
y=1972); the recorded taps are the ones that landed. **The owner's own one-word confirm of
the same flow is still worth having** and is the only part of R4 I cannot supply myself.

---

## R5 — SQLite plugin alive in the artifact — **PASS**

Two corrections to my own first attempt, both worth recording because the first answer
looked like a regression: (1) the package is `com.getcapacitor.community.database.sqlite`,
not `…capacitorsqlite`; (2) `dexdump -d` prints **no annotation section at all** — `-a` is
the flag that does, and without it the count is a false zero.

```
=== SQLITE PLUGIN CLASS PRESENT ===
297489:  Class descriptor  : 'Lcom/getcapacitor/community/database/sqlite/CapacitorSQLitePlugin;'

=== every retained @CapacitorPlugin annotation (name=) ===
      1 VISIBILITY_RUNTIME Lcom/getcapacitor/annotation/CapacitorPlugin; name="Camera"
      1 VISIBILITY_RUNTIME Lcom/getcapacitor/annotation/CapacitorPlugin; name="CapacitorSQLite"
      1 VISIBILITY_RUNTIME Lcom/getcapacitor/annotation/CapacitorPlugin; name="PushNotifications"
```

And the Camera annotation verbatim from the shipped dex — the payload whose absence caused
the NPE, including the `saveGallery` alias that returned null:

```
Class #632 annotations:
Annotations on class
  VISIBILITY_BUILD Landroid/annotation/SuppressLint; value={ "InlinedApi" }
  VISIBILITY_RUNTIME Lcom/getcapacitor/annotation/CapacitorPlugin; name="Camera"
    permissions={ … alias="camera" strings={ "android.permission.CAMERA" }
                  … alias="saveGallery" strings={ "android.permission.READ_EXTERNAL_STORAGE"
                                                  "android.permission.WRITE_EXTERNAL_STORAGE" } … }
```

All three plugins — not just Camera — now carry their runtime annotation, which is the
anti-localStorage-fallback assurance the brief asked for: `CapacitorSQLite` is registered
with its metadata intact, so the offline path is the real SQLite plugin in this build.

---

## R6 — Land — see git evidence below

Branch `task/CHC-T-043`; records commit first (the established pattern), then the four app
files with `fix(android): keep Capacitor plugin annotations through R8; camera capture
feedback + Refs: CHC-T-043`; `--no-ff` merge into `main`; pushed.

---

## Deviations

1. **R1's second typo was in `bn.ts`, not `AndroidManifest.xml`.** The manifest has no date
   typo at all. `bn.ts` is not in the brief's SCOPE list, but it *is* one of the "4 app
   files" that R6 requires me to commit, so fixing its comment typo fell inside R6's
   authority. Recording it rather than silently touching an unlisted file.
2. **No edit to `AndroidManifest.xml`.** Nothing to correct; the permission lines were
   out of scope to touch and were not touched.
3. **The keep-cost figure.** Measured 616 / 612 B by control build instead of repeating the
   brief's ~370 KB. The ~372 KB gap versus contract-era builds is intervening work (push
   plugin, google-services resources, web payload growth), not the keeps.
4. **An extra throwaway build** (keeps disabled) was made solely to measure deviation 3.
   Its APK was never installed and is no longer on disk; the shipped artifact is the
   keep-ON build, rebuilt from the restored rule file, byte-identical to the pre-comment
   build (which also proves the comment edit is inert).

## Assumptions

- The `192.168.0.234:39777` endpoint is the same handset the brief addresses at `:42817`
  (same IP, same app data, same UA/API level); the port is assigned per wireless-debug
  session, so the brief's number went stale rather than the device changing.
- `dexdump -a` on `classes.dex` is authoritative for "did the annotation survive R8", since
  it reads the shipped dex rather than the build inputs.

## Open issues

- The offline draft → queued → flush round trip (CHC-T-042-core) has still not been run on
  a build where SQLite actually registers. It is now *possible* — this APK has the plugin
  registered — and it is the next device session's job per CHC-D-052's priority order.
- The owner's one-word confirm of the camera flow (R4) is outstanding; all mechanical
  evidence above is mine.
- `docs/orchestration/DECISIONS.md` was left dirty in the working tree: it carries only the
  orchestrator's own rulings (CHC-D-050/051/052) and this task had no mandate over them.
  The two untracked briefs (`CHC-T-042.md`, `CHC-T-043.md`) were folded into the records
  commit, per the precedent in CHC-D-048 (fold untracked briefs into the landing commit).
- The working tree also carries unrelated agent noise (`.kilo/`, `.clinerules/`,
  `CLAUDE.md`, `.agent-tracker.json`, `.cloud-attachments/`) that predates this task and
  was deliberately **not** staged or committed.

## QUESTIONS

none — the two premise corrections were resolvable from the files themselves and are
recorded above rather than left as a blocker.

---

## Notes for the orchestrator

- The camera crash's root cause is now documented in the rule file itself (Bengali) with
  the dexdump evidence, so the next agent who touches `proguard-rules.pro` sees why those
  five lines cannot be "cleaned up".
- Same stripping had silently disabled annotation metadata for SQLite and Push in every
  prior release build. Both are restored in this artifact.
- Feed ordering (CHC-T-044 / seed data) is untouched by this task, as ruled.
