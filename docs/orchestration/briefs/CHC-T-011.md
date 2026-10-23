# CHC-T-011 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-011
TITLE:           Commit the report archives and evolved governance records
ASSIGNED TO:     A-IMP-1 (Implementer, housekeeping hat)
PRIORITY:        P2
DEPENDS ON:      CHC-T-010 (run after its merge so docs land on the newest main)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS.md CHC-D-018 (the archive gap this task closes)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. ZERO non-docs edits.
4. Paste real output for every step; evidence or reject.
5. Never print secrets or credentials.
6. STOP with exact output on any tip mismatch, conflict, or push rejection.

CONTEXT
CHC-T-008 landed the governance record set, but docs/orchestration/reports/ shipped with only 3 of 8 report archives (the builder's own open-issue #1, CHC-D-018). The orchestrator has since written the five missing archives (CHC-T-004, CHC-T-005r2, CHC-T-007r2, CHC-T-008, CHC-T-009) and evolved DECISIONS.md (CHC-D-017, D-018), LEDGER.md (T-005/T-007/T-008/T-009 DONE rows; T-010/T-011 rows), and RISKS.md (CHC-R-013 RESOLVED) in the working tree. All of it is uncommitted. This task lands it.

OBJECTIVE
Commit docs/orchestration/** (the 5 new report archives + the evolved DECISIONS/LEDGER/RISKS) on task/CHC-T-011, push, merge --no-ff to main, push main.

SCOPE (the ONLY paths to stage)
- docs/   (the entire directory — everything under it is orchestration-owned; nothing else belongs there)

OUT OF SCOPE
- Any file outside docs/ — apps/web/**, .agents/**, AGENTS.md, ORCHESTRATOR.md, .gitignore, .kilo/**, .clinerules/, .kilocode/, CLAUDE.md, everything else
- Editing any doc content — stage the files exactly as they are on disk (they are the orchestrator's written record; you do not modify them)

INPUTS (read first)
- git status --short (paste before staging)
- docs/orchestration/reports/ — expect 8 .md files after this task (3 already committed + 5 new)

REQUIREMENTS (numbered; testable)
R1. git switch main && git pull; verify main tip starts with the CHC-T-010 merge (git log --oneline -3 must show a "Merge task/CHC-T-010" commit). Mismatch → STOP, BLOCKED (T-010 not done). git switch -c task/CHC-T-011.
R2. Stage ONLY docs/ (explicit pathspec: git add docs). Verify: git diff --cached --name-status — expect ONLY paths under docs/orchestration/, roughly 9 entries (5 A reports + 3 M record files + possible briefs if any evolved). Anything outside docs/ staged → unstage, report BLOCKED with what appeared.
R3. Commit message exactly:
   docs(orchestration): archive CHC-T-004/005r2/007r2/008/009 reports; refresh records

   Closes the archive-completeness gap (CHC-D-018): reports/ now holds all
   eight received task reports. DECISIONS (D-017, D-018), LEDGER (stage
   closures) and RISKS (CHC-R-013 resolved) reflect verified reality.

   Refs: CHC-T-011
R4. Push task/CHC-T-011; merge per CHC-D-015: git switch main && git pull; git merge --no-ff task/CHC-T-011 -m "Merge task/CHC-T-011: orchestration record refresh" -m "Docs-only: report archives + evolved records. Zero code paths." -m "Refs: CHC-T-011"; git push origin main. Paste all outputs.
R5. Close-out: git show --stat <merge-sha> — confirm EVERY path is under docs/orchestration/; from apps/web node scripts/validate.mjs → ALL CHECKS PASSED; git status --short — confirm no docs/ entries remain dirty and nothing outside docs/ moved.

ACCEPTANCE CRITERIA
A1. Pre-task main carries the T-010 merge — pasted log.
A2. Staged set ⊆ docs/orchestration/ only — pasted --cached --name-status.
A3. Commit message exact with Refs: CHC-T-011 — pasted log -1 --format=%B.
A4. Merged + pushed; merge diff shows only docs/ paths — pasted merge/stat outputs.
A5. reports/ on main now holds 8 .md files (git ls-tree -r main --name-only docs/orchestration/reports | count) + validate green + status clean of docs/ — pasted outputs.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5.

STOP CONDITIONS
- T-010 merge absent from main — report BLOCKED (run T-010 first).
- Any non-docs path appears in the staged set or merge diff — stop, report.
- Any push rejection or conflict — report, never force.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/NEW MAIN TIP/COMMANDS RUN/ACCEPTANCE A1–A5/BYTE ACCOUNTING (zero expected — docs only)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
