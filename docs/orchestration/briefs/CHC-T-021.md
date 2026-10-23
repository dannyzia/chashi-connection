# CHC-T-021 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-021
TITLE:           Stage-boundary docs refresh: archives + evolved records
ASSIGNED TO:     A-IMP-1 (Implementer, housekeeping hat)
PRIORITY:        P1
DEPENDS ON:      none (current main tip = ef4d8399193f4cade2d024eef90520b0c8945321, the CHC-T-018 merge; verify at preflight — if it moved, use the new tip and report it)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS CHC-D-018 (archive completeness), CHC-D-029/030/031 (auth stage records)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. ZERO non-docs edits. Only landing files as they exist on disk.
4. Paste real output for every step; evidence or reject.
5. Never print secrets. NEVER read or stage .env or .mcp.json — their existence in status output is fine, their contents never.
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The orchestration records (DECISIONS/LEDGER/RISKS) have evolved in the working tree since CHC-T-008 landed them (decisions D-017…D-031, stage closures T-005…T-019), and the reports/ archive is missing the reports received since then: T-013, T-015, T-015r2, T-017, T-018 (+ CHC-T-010/011 already landed). The orchestrator has written ALL of these files to disk. This task lands them as one commit — §13.1's stage-boundary reconciliation for the auth stage (CHC-D-029: auth core loop proven E2E).

OBJECTIVE
Commit docs/ as it exists on disk (the 5-7 new report archives + evolved DECISIONS/LEDGER/RISKS + any briefs written since d37cac7 that are still untracked), push, merge --no-ff to main, push main, verify.

SCOPE (the ONLY paths to stage)
- docs/   (the entire directory — everything under it is orchestration-owned)

OUT OF SCOPE (must remain uncommitted — do not stage, do not edit)
- AGENTS.md, ORCHESTRATOR.md, .agents/, .gitignore, .kilo/**, .clinerules/, .kilocode/, CLAUDE.md, .agent-tracker.json, "10 mcp-local-tunnel.bat", apps/web/**, supabase/**
- NOTE: if git status shows .env or .mcp.json anywhere — STOP immediately, report BLOCKED (they must be gitignored; their appearance would be a new problem to diagnose, not to stage)

INPUTS (read first)
- git status --short (pre-state; paste it — it is your baseline)
- ls docs/orchestration/reports/ — expected set at commit time: CHC-STATUS-2026-10-23, CHC-T-003, CHC-T-003r2, CHC-T-004, CHC-T-005r2, CHC-T-007r2, CHC-T-008, CHC-T-009, CHC-T-010, CHC-T-011, CHC-T-013, CHC-T-015, CHC-T-015r2, CHC-T-017, CHC-T-018 (15 files — report the actual list; if some are missing from DISK, paste which and continue with the rest, noting it)

REQUIREMENTS (numbered; testable)
R1. Preflight: git switch main && git pull; git log --oneline -3; git status --short (paste; this is the pre-state). Create git switch -c task/CHC-T-021.
R2. Inventory BEFORE staging: ls docs/orchestration/briefs/ and docs/orchestration/reports/ (paste full lists + file counts).
R3. Stage docs/ (single explicit pathspec: git add docs). Verify: git diff --cached --name-status — paste; confirm EVERY staged path starts with docs/orchestration/ and NOTHING else appears (the six-path pattern from CHC-T-008 is superseded: AGENTS.md/ORCHESTRATOR.md/.agents/.gitignore/kilo.json were landed then; this commit is docs-only). Anything outside docs/ staged → unstage, report BLOCKED with what appeared.
R4. Commit message exactly:
   docs(orchestration): auth-stage boundary — archives + evolved records

   Reports for T-013/T-015/T-015r2/T-017/T-018 archived; DECISIONS
   (D-017…D-031), LEDGER (T-013…T-019 stage closures) and RISKS
   (CHC-R-013 resolved, CHC-R-017 guard live, CHC-R-001 mitigating)
   landed per §13.1 stage-boundary reconciliation.

   Refs: CHC-T-021
R5. Push task/CHC-T-021; merge per CHC-D-015: git switch main && git pull; git merge --no-ff task/CHC-T-021 -m "Merge task/CHC-T-021: auth-stage boundary docs refresh" -m "Docs-only: report archives + evolved governance records. Zero code paths." -m "Refs: CHC-T-021"; git push origin main. Paste all outputs.
R6. Close-out: git show --stat <merge-sha> with --first-parent (a plain --stat on a merge prints empty — use git show --stat --first-parent or git diff --name-only <pre-merge-main> <merge-sha>); confirm EVERY path is under docs/orchestration/; from apps/web run node scripts/validate.mjs (ALL CHECKS PASSED — sanity that nothing else moved); paste git status --short after (docs/ must be absent from it).

ACCEPTANCE CRITERIA
A1. Pre-state pasted; docs/ inventories pasted.
A2. Staged set ⊆ docs/orchestration/ — pasted --cached --name-status.
A3. Message verbatim — pasted log -1 --format=%B.
A4. Merged --no-ff; merge diff shows only docs/ paths — pasted (using --first-parent or the explicit range, NOT bare git show --stat which is vacuous on merges).
A5. validate green on main post-merge — pasted.
A6. Post-merge status: no docs/ entries remain; the pre-existing non-docs set is identical to the pre-state minus the landed docs/ paths.

STOP CONDITIONS
- .env or .mcp.json appears anywhere in staging or status confusion — STOP.
- Any non-docs path would be staged — stop, unstage, report.
- Push rejection or conflict — report, never force.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING (state zero code-delta with evidence)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
