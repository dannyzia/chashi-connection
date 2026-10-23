# CHC-T-005 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-005
TITLE:           Regenerate bundled Bengali font as true WOFF2
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P1
DEPENDS ON:      CHC-T-004 (branch task/CHC-T-004 @ 0f01eee is the base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: AGENTS.md (🔐 LOCKED TECH STACK — fonts: Noto Sans Bengali WOFF2; ⚙️ size constraints); CHC-D-008/009; RISKS CHC-R-013
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) before every commit.
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step. An acceptance line without evidence = reject.
5. Never print secrets or credentials.
6. One question max under QUESTIONS if ambiguous; BLOCKED if a step fails for reasons outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The app's bundled font static/fonts/NotoSansBengali.woff2 is BROKEN: its first four bytes are 77 4f 46 46 ("wOFF") — it is a WOFF1 file misnamed .woff2, and static/fonts/fonts.css declares src: url('/fonts/NotoSansBengali.woff2') format('woff2'). Browsers reject the format mismatch ("Failed to decode downloaded font: invalid sfntVersion") and silently fall back to system fonts. Verified by the orchestrator (CHC-D-009, risk CHC-R-013). A helper script exists at static/fonts/subset_woff2.py — inspect it to see how the current file was produced (it evidently emitted WOFF1 or the file was replaced later). AGENTS.md requires a bundled Bengali-only WOFF2 font; the size budget (CHC-D-008) favors WOFF2's better compression over WOFF1.

OBJECTIVE
Ship a genuine WOFF2 Noto Sans Bengali subset that browsers decode without error, keeping the font-face contract in fonts.css (format('woff2')) and stating the exact byte delta.

SCOPE (the ONLY files you may create or modify)
- apps/web/static/fonts/NotoSansBengali.woff2 — replace (true WOFF2)
- apps/web/static/fonts/subset_woff2.py — modify only if needed to produce WOFF2 correctly
- apps/web/static/fonts/ — a downloaded source TTF may be placed here temporarily; MUST NOT be committed (add nothing new to the commit except the two files above)
- Branch/commit operations on the resulting change set

OUT OF SCOPE
- fonts.css format declaration (it stays format('woff2') — fix the FILE, not the declaration)
- Any other route/lib file; android/; package.json; adding npm/pip dependencies to the project (a one-off local use of an already-installed tool is fine; if no subsetting tool exists on the machine, report BLOCKED with the missing-tool name rather than installing globally)
- Committing the source TTF

INPUTS (read first)
- AGENTS.md — 🔐 LOCKED TECH STACK (fonts), ⚙️ size constraints
- apps/web/static/fonts/fonts.css — the @font-face contract
- apps/web/static/fonts/subset_woff2.py — current generation script
- The current (broken) NotoSansBengali.woff2 — 94,819 bytes, WOFF1

REQUIREMENTS (numbered; testable)
R1. Inspect subset_woff2.py and report (in your report) exactly how the current broken file was produced (what tool, what flavor flag).
R2. Produce a TRUE WOFF2 subset of Noto Sans Bengali covering the Bengali Unicode block (U+0980–U+09FF) plus Latin/digits/punctuation used by the app (the existing file's character coverage is a reasonable guide — you may decode the WOFF1 to compare). Source: an OFL-licensed Noto Sans Bengali TTF obtained from Google Fonts or the Google Fonts GitHub repo. Keep the total font size as small as a correct subset allows (size budget is a hard project rule).
R3. Verify the output: first four bytes must be 77 4f 46 32 ("wOF2"). Paste the hex check (same node one-liner style: read first 4 bytes, print hex + ascii).
R4. Overwrite static/fonts/NotoSansBengali.woff2 with the true WOFF2. fonts.css must remain unchanged.
R5. Live check: run npx vite preview, open the app in a browser, confirm the console shows NO "Failed to decode downloaded font" error and the network request for /fonts/NotoSansBengali.woff2 returns 200. Paste the console/network evidence. Stop the preview server afterwards.
R6. Gates: node scripts/validate.mjs → ALL CHECKS PASSED; npm run build → exit 0; report total build bytes AND the delta vs the pre-task build (562,822 B baseline from CHC-T-004).
R7. Git: git switch -c task/CHC-T-005 (stacked on task/CHC-T-004). Stage ONLY apps/web/static/fonts/NotoSansBengali.woff2 and (if modified) subset_woff2.py. Commit message exactly:
   fix(fonts): replace misnamed WOFF1 with true WOFF2 subset

   The bundled NotoSansBengali.woff2 was a WOFF1 file (magic wOFF) declared
   as woff2 in fonts.css — browsers rejected it and fell back to system
   fonts. Regenerated as genuine WOFF2 (magic wOF2), same Bengali coverage.

   Refs: CHC-T-005
   Push: git push -u origin task/CHC-T-005. Paste push output + git log --stat -1.

ACCEPTANCE CRITERIA
A1. Root cause documented in report (R1) — verified by: pasted findings.
A2. Font magic bytes = 77 4f 46 32 — verified by: pasted hex check output.
A3. Browser console clean of font-decode errors; /fonts/NotoSansBengali.woff2 200 — verified by: pasted evidence.
A4. validate ALL CHECKS PASSED + build exit 0 + byte delta stated — verified by: pasted outputs.
A5. Commit pushed on task/CHC-T-005 with exactly the font file(s) — verified by: pasted git log --stat -1 + push output.

VERIFICATION (order): inspect script → produce font → hex check → vite preview console/network → validate → build + measure → git branch/commit/push.

STOP CONDITIONS
- No subsetting tool available on the machine (e.g. fonttools/pyftsubset missing) → BLOCKED, name the missing tool.
- True WOFF2 generation impossible for any reason → fall back ONLY with a written justification in the report: rename file to NotoSansBengali.woff1 and change fonts.css to format('woff') — this is a permitted second-best, byte-delta still reported.
- Source TTF cannot be obtained (network) → BLOCKED with the exact fetch error.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
