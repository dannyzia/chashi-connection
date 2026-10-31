# CHC-T-032 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-032
TITLE:           Stage-boundary docs refresh #3: archives + evolved records
ASSIGNED TO:      A-IMP-1 (Implementer, housekeeping hat)
PRIORITY:        P1
DEPENDS ON:      none (main @ 1fc28d6 — verify the actual tip at preflight; use it if it moved)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS CHC-D-032/040 (commit only what exists on disk — assert nothing not present); §13.1 stage-boundary reconciliation
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. ZERO non-docs edits. Only landing files as they exist on disk.
4. Paste real output for every step; evidence or reject.
5. Never print secrets. NEVER read or stage .env or .mcp.json — their absence from status is the check, their contents never.
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The §13.1 stage-boundary cadence is due for the moderation/block stages: the orchestration records (DECISIONS through CHC-D-042, LEDGER closures through CHC-T-034, RISKS updates) and the report archives (T-027, T-028, T-029+030, T-031, T-034) have accumulated in the working tree since `3a32723` (the last docs landing). CHC-D-032's lesson governs: COMMIT ONLY WHAT EXISTS — the commit message asserts the ACTUAL inventory (paste-driven), never an expected one. The previous docs pass (CHC-T-027, merge 3a32723) landed 24 files; this pass lands the accumulated delta.

OBJECTIVE
Land docs/ as it exists on disk as one docs-only commit; merge --no-ff to main; verify zero non-docs delta by tree identity; validate green; confirm the reports/ archive inventory in the commit matches the disk inventory exactly.

SCOPE (the ONLY paths to stage)
- docs/   (the entire directory)

OUT OF SCOPE (must remain uncommitted — do not stage, do not edit)
- apps/web/**, supabase/**, AGENTS.md, ORCHESTRATOR.md, .agents/**, .gitignore, .kilo/** (deletions AND the untracked BD resources tree), .clinerules/, .kilocode/, CLAUDE.md, .agent-tracker.json, "10 mcp-local-tunnel.bat", .env, .mcp.json
- task branches (task/CHC-T-023…T-026 etc. are NOT yours to push or delete)

INPUTS (read first)
- git status --short (pre-state; paste)
- docs/orchestration/reports/ and docs/orchestration/briefs/ listings (paste with counts — these numbers go into the commit message verbatim)

REQUIREMENTS (numbered; each testable)
R1. Preflight: git switch main && git pull; git log --oneline -3 (paste — expect the tip to include the CHC-T-034 merge); git status --short (paste pre-state). git switch -c task/CHC-T-032.
R2. Inventory: paste full listings of docs/orchestration/reports/ and docs/orchestration/briefs/ with file counts (these numbers go into the commit message verbatim).
R3. Stage docs/ (single pathspec). Verify: git diff --cached --name-status — EVERY path under docs/orchestration/, NOTHING else. Paste. Anything outside docs/ staged → unstage, report BLOCKED.
R4. Commit — compose the body from your R2 ACTUAL inventory (do not invent counts). Required shape (subject exact, body truthful to your R2 numbers):
   docs(orchestration): moderation-stage boundary — archives + evolved records

   Reports archived as they exist on disk (reports/ = <N> files; new:
   <list the NEW names only>). Briefs on disk = <N> files (new: <list>).
   DECISIONS through CHC-D-042 (moderation enforcement T-029+030, block
   surface T-031), LEDGER closures T-023…T-034, RISKS updates (CHC-R-001
   mitigating, CHC-R-013 resolved, CHC-R-017 mitigated, CHC-R-018 closed)
   — per §13.1 stage-boundary reconciliation.

   Docs only. No code paths touched.

   Refs: CHC-T-032
R5. Push task/CHC-T-032; merge per CHC-D-015: git switch main && git pull; git merge --no-ff task/CHC-T-032 -m "Merge task/CHC-T-032: moderation-stage boundary docs refresh" -m "Docs-only: report archives + evolved governance records. Zero code paths." -m "Refs: CHC-T-032"; git push origin main. Paste everything.
R6. Close-out: git diff --name-only <pre-merge-main-tip> <merge-sha> — confirm EVERY path under docs/orchestration/; from apps/web run node scripts/validate.mjs (ALL CHECKS PASSED — sanity); git status --short → docs/ absent.

ACCEPTANCE CRITERIA
A1. Pre-state + inventories pasted.
A2. Staged set ⊆ docs/orchestration/ — pasted --cached --name-status.
A3. Message: subject exact, body matches the ACTUAL R2 inventory (no invented counts) — pasted log -1 --format=%B.
A4. Merged --no-ff; merge diff only docs/ paths — pasted (explicit range or --first-parent, NOT bare git show --stat which is vacuous on merges — the CHC-D-019 lesson).
A5. validate green on main — pasted.
A6. Post-merge status: docs/ clean, remainder = pre-state minus docs/ — pasted.

STOP CONDITIONS
- .env or .mcp.json appears anywhere — STOP.
- Any non-docs path would be staged — stop, unstage, report.
- Push rejection or conflict — report, never force.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING (zero expected — state the apps/web tree-hash proof)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
