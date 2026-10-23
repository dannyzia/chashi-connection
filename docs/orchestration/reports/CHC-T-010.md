# CHC-T-010 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-019): verified — 11-point run ALL_CLAIMS_VERIFIED: main @ d963e78 (parents 52b988a+93724fd), rename commit exact 2 files, fonts dir clean of .py, font blob d84a0b45 unchanged, build 506,931 B (−5,410, residual 0), PENDING marker in merge message (no premature VERIFIED stamp — exemplary). DONE.

```
=== TASK REPORT ===
TASK ID: CHC-T-010 | AGENT ID: A-IMP-1 | STATUS: DONE (two disclosed method deviations)

SUMMARY: Relocated subset script to apps/web/scripts/subset-font.py (venv resolved one hop up; default output ../static/fonts/NotoSansBengali.woff2; same flags as constants; Bengali header updated with pinned versions). Deleted static/fonts/subset_woff2.py. Reproduction proved sha256-identical. Build no longer contains any .py. Committed 93724fd (git shows R077 rename), pushed, merged --no-ff (d963e78) with ORCHESTRATOR-PENDING-VERIFICATION marker, pushed main.

KEY EVIDENCE: R3 — zlib trick impossible on the new genuine WOFF2 (as expected); source TTF recovered from pre-fix blob `git show 164b6da:…` (94,819 B, magic wOFF) → zlib.decompress → 200,048 B sfnt 00010000 — same source as CHC-T-005r2; relocated script ran from venv (running: line proves apps\web\.venv-font\Scripts\python.exe) → 39,864 B wOF2; sha256 a9db5165… both sides, BYTE-IDENTICAL. R4 — import exit 0 100% match; validate ALL PASSED; build 506,931 B (−5,410, residual 0, 40→39 files); build/fonts = [fonts.css, NotoSansBengali.woff2]; no .py under build/. R5 — git add pathspec atomic-reject on deleted path (fatal: pathspec did not match) → staged only new file; git rm had already staged the deletion; rename recorded R077. A2 — font blob d84a0b45 identical across 52b988a/HEAD/worktree; built artifact 774f4632 39864.

ACCEPTANCE: A1–A5 all PASS.

BYTE ACCOUNTING: web 512,341 → 506,931 B (−5,410, residual 0 — whole-file deletion, no chunk-hash drift). APKs unchanged this task; next native build inherits −5,410.

DEVIATIONS: (1) TTF derivation path corrected — brief's zlib-decode of the committed font impossible (it is now real Brotli WOFF2); recovered identical source from history blob 164b6da — same reproduction criterion met; (2) single git add with both paths impossible (atomic pathspec reject); staged new file only, deletion pre-staged by git rm. Minor: rename detection vs A+D presentation — tree identical.

OPEN ISSUES: static/ has no guardrail against future non-asset files shipping (validate-time check suggested); CHC-T-006 hardware; Latin A-Z fallback.

QUESTIONS: none
=== END REPORT ===
```
