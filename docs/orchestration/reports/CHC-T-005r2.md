# CHC-T-005r2 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-016): verified — 10-point independent run, ALL_CLAIMS_VERIFIED: YES. task/CHC-T-005 @ b465b7d = remote, exactly 3 files; font 774f4632 @ 39,864 B; script sha256-reproducible; conjuncts shaped in clean browser. Both deviations accepted (separate-index commit; temp-then-copy install). DONE.

```
=== TASK REPORT ===
TASK ID: CHC-T-005r2 | AGENT ID: A-IMP-1 | STATUS: DONE (two disclosed deviations)

SUMMARY: Preflight confirmed both merges on main (54433d2) and closed CHC-T-007's smoke. Created authorized venv, pinned fontTools 4.67.0 + Brotli 1.2.1, re-derived source TTF from committed bytes, produced genuine WOFF2 subset at 39,864 B (magic 774f4632), installed it, rewrote subset_woff2.py to drive pyftsubset, proved byte-for-byte reproduction. Browser check clean, conjuncts shape. Committed exactly three files, pushed.

FILES CHANGED: static/fonts/NotoSansBengali.woff2 (94,819 → 39,864 B) · static/fonts/subset_woff2.py (rewritten, 936 → 5,410 B) · .gitignore (+apps/web/.venv-font/ only). fonts.css/package.json untouched. Venv gitignored, never staged.

KEY EVIDENCE: R0 preflight — 4ac1759/0f01eee reachable from main (merge commits 54433d2/f9b97ac); import exit 0 100% match; validate ALL PASSED; build 562,827 B. R1 — pip install fonttools==4.67.0 brotli==1.2.1 (cp314 wheels); pip show Location=…\.venv-font\…; git check-ignore → .gitignore:29. R2 — TTF re-derivation: 200,048 B, sfnt 00010000, 17 tables. R3 — pyftsubset --flavor=woff2 --layout-features='*' --unicodes="U+0020-007E,U+00A0,U+00B7,U+0980-09FF,U+200C-200D,U+2013,U+2014,U+2018-201D,U+2026" --no-hinting → wOF2 39,864 B (−54,955); coverage audit: source has 173 codepoints (NO Latin A-Z in source at all); subset kept 145, lost nothing (ASCII missing: none; Bengali missing: none). R4 — rewritten script reproduces artifact: sha256 a9db5165… both sides, BYTE-IDENTICAL: YES; no wOFF/zlib/compress( remains. R5 — clean incognito: @font-face status loaded, document.fonts.check true, console EMPTY, GET /fonts/… 200 font/woff2; shaping probes: ক্ষ 55.15 vs 86.41 unligated, ত্র 42.9 vs 78.18 → ligatures formed. R6 — build 512,346 B (−50,481; residual 0: −54,955+4,474). R7 — commit b465b7d exactly 3 files; pushed; gh absent → compare URL reported.

ACCEPTANCE: A1–A8 all PASS.

BYTE ACCOUNTING: font −54,955 (−58%) · script +4,474 · web assets 562,827 → 512,346 B (−50,481, residual 0). APKs unchanged (not rebuilt); next APK build shrinks ~54,955 B.

DEVIATIONS: (1) .gitignore committed as HEAD+one-line via SEPARATE INDEX (.git/chc-t005.idx) so the owner's pending +kilo.json line was not swept — textbook §8.2 discipline, recorded as standing pattern; (2) subset written to temp then copied (mid-command failure safety). Minor: brief's hex line had a typo (63 vs 46) — correct magic 77 4f 46 32 shipped; script runtime output ASCII due to cp1252 console (Bengali header preserved).

OPEN ISSUES: stale browser caches hide fix on previously-loaded devices (QA note); source font has no Latin A-Z → Sack/PCS system-fallback (accepted CHC-D-016); subset_woff2.py ships in build (5,410 B) → CHC-T-010; kilo.json latent trap (→ CHC-T-008); CHC-T-006 awaiting hardware.

QUESTIONS: none
=== END REPORT ===
```
