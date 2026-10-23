# CHC-T-004 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-009): verified — commit 0f01eee = origin head, 3 files; gates re-run by orchestrator; APKs on disk at claimed bytes; persistence code audited line-by-line. DONE.

```
=== TASK REPORT ===
TASK ID: CHC-T-004 | AGENT ID: A-IMP-1 | STATUS: PARTIAL
(Native SQLite read/write path not runtime-verified: no device/emulator attached — adb devices empty. Everything else pasted evidence.)

SUMMARY: Capacitor unified on v8 (core 8.5.2 transitive, cli/android 8.5.3, camera 8.2.6, sqlite 8.1.1) — CHC-R-003 resolved. সংরক্ষণ() writes the same JSON payload to SQLite kv (chashi.state) on native; native boot restores from SQLite over localStorage; web path unchanged, verified live in browser. Gates pass; web assets 562,822 B (+32,402, four native-only lazy chunks). First measured release APKs: 3,731,526 B (arm64-v8a), 3,368,864 B (armeabi-v7a).

FILES CHANGED: package.json (Capacitor v8 alignment) · package-lock.json · src/lib/app-state.svelte.ts (native guard নেটিভপ্ল্যাটফর্ম(), ডিবিতেসংরক্ষণ write, ডিবিথেকেলোড non-blocking restore preserving অনলাইন flag; all 10 exports unchanged).

KEY EVIDENCE: npm view ×5 (all stable v8 exist) → npm install (4 packages, no invalid/peer warnings) · import exit 0 (8/64/499/4617, 100% match) · validate ALL CHECKS PASSED · build exit 0, 562,822 B (delta +32,402 fully attributed: BFwr9Nao 3,981 + D3AXVJHL 1,676 + VvAT4SO3 14,007 + YZnyenrI 8,316 = 27,980 native-only chunks never fetched on web + ~4.4 KB re-baselined shared chunks; browser probe: only app-state chunk fetched, window.Capacitor undefined on web) · cap sync exit 0 (2 plugins seen) · assembleDebug BUILD SUCCESSFUL 2m52s · assembleRelease BUILD SUCCESSFUL 5m3s (R8 minify+shrinkResources, signed via keystore.properties — no secrets printed; apksigner verify passed, CN=Chashi Connection) · git: task/CHC-T-004 @ 0f01eee (3 files, 65+/24−), push exit 0, ls-remote = local.

BYTE ACCOUNTING: web 562,822 B (+32,402, cause named). Release APKs: arm64 3,731,526 B (3.559 MB) / armeabi 3,368,864 B (3.213 MB). Debug APKs 12.5/12.1 MB (not user figures). APK composition (arm64): libsqlcipher.so 2,100,040 · classes.dex 2,127,952 · resources.arsc 873,164 · res/ 655,590 · assets/public (our app) 562,822 (4.3%). Native shell = 3,168,704 B before app bytes → ≤1 MB infeasible (ruled CHC-D-009/010).

ACCEPTANCE: A1–A5 all PASS (coherent major evidenced; wiring diffed; gates pasted; APKs measured; branch pushed, remote matched).

DEVIATIONS: (1) bash instead of PowerShell; (2) window.Capacitor.isNativePlatform() instead of importing @capacitor/core (keeps web chunk graph small; same truth value, verified undefined on web); (3) restore preserves live অনলাইন flag; (4) also built assembleRelease (permitted; overwrote stale 2026-09-23 APKs); (5) gradle logs kept outside repo; (6) no AI attribution footer (exact message required).

OPEN ISSUES: stale APKs existed from unrecorded earlier build (CHC-R-012 premise corrected); native persistence not runtime-verified → CHC-T-006; ~28 KB native chunks in web build; npm audit 11 vulns no baseline (CHC-R-014); NotoSansBengali.woff2 decode failure spotted (→ CHC-R-013, later root-caused as fabricated container).

QUESTIONS: none
=== END REPORT ===
```
