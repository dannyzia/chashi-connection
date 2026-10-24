# CHC-T-027 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-027
TITLE:           Stage-boundary docs refresh #2: archives + evolved records
ASSIGNED TO:      A-IMP-1 (Implementer, housekeeping hat)
PRIORITY:        P1
DEPENDS ON:      none (main @ d667158 — verify at preflight; use the actual tip if it moved)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS CHC-D-018/032/035 (archive discipline), §13.1 stage-boundary reconciliation; CHC-D-032 lesson (never assert archives exist without checking)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. ZERO non-docs edits. Only landing files as they exist on disk.
4. Paste real output for every step; evidence or reject.
5. Never print secrets. NEVER read or stage .env or .mcp.json.
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The §13.1 stage-boundary cadence is due: the Supabase backend stage (T-013…T-019, T-023…T-026) closed with the reports/blocks persistence (T-025), and the orchestration records have evolved in the working tree — DECISIONS through CHC-D-036, LEDGER stage closures through CHC-T-026, RISKS updates (CHC-R-001 mitigating, CHC-R-013 resolved, CHC-R-017/018) — plus report archives for T-014, T-016, T-019, T-021, T-022, T-023, T-024, T-025, T-026 written by the orchestrator. CHC-D-032's lesson governs this task: COMMIT ONLY WHAT EXISTS — assert nothing about archives that are not on disk. The commit message must state the ACTUAL inventory (paste-driven), not an expected one.

OBJECTIVE
Land docs/ as it exists on disk as one docs-only commit; merge --no-ff to main; verify zero non-docs delta; confirm the reports/ archive inventory in the commit matches the disk inventory exactly.

SCOPE (the ONLY paths to stage)
- docs/   (the entire directory)

OUT OF SCOPE (must remain uncommitted — do not stage, do not edit)
- apps/web/**, supabase/**, AGENTS.md, ORCHESTRATOR.md, .agents/**, .gitignore, .kilo/** (deletions AND the untracked BD resources tree), .clinerules/, .kilocode/, CLAUDE.md, .agent-tracker.json, "10 mcp-local-tunnel.bat", .env, .mcp.json
- The archived T-023's local-only state: after this task, origin/main and local main both carry the docs; the T-023/T-024/T-026 task branches (task/CHC-T-023 etc.) are NOT yours to push or delete — leave them.

INPUTS (read first)
- git status --short (pre-state; paste)
- docs/orchestration/reports/ and docs/orchestration/briefs/ listings (paste; the commit message's inventory line comes from these ACTUAL counts)

REQUIREMENTS (numbered; testable)
R1. Preflight: git switch main && git pull; git log --oneline -3; git status --short (paste pre-state). git switch -c task/CHC-T-027.
R2. Inventory: paste full listings of docs/orchestration/reports/ and docs/orchestration/briefs/ with file counts (these numbers go into the commit message verbatim).
R3. Stage docs/ (single pathspec). Verify git diff --cached --name-status: EVERY path under docs/orchestration/, NOTHING else. Paste. Anything outside docs/ staged → unstage, report BLOCKED.
R4. Commit — compose the body from your R2 ACTUAL inventory (do not invent counts). Required shape (subject exact, body truthful to your R2 numbers):
   docs(orchestration): Supabase-stage boundary — archives + evolved records

   Reports archived as they exist on disk (reports/ = <N> files: <list
   the NEW names only>); DECISIONS through CHC-D-036 (Supabase stage
   closures T-013…T-026, dP Relay decisions, spend-guard live), LEDGER
   closures T-013…T-026, RISKS (CHC-R-001 mitigating, CHC-R-013 resolved,
   CHC-R-017 mitigated, CHC-R-018 closed) — per §13.1 stage-boundary
   reconciliation.

   Refs: CHC-T-027
R5. Push task/CHC-T-027; merge per CHC-D-015: git switch main && git pull; git merge --no-ff task/CHC-T-027 -m "Merge task/CHC-T-027: Supabase-stage boundary docs refresh" -m "Docs-only: report archives + evolved governance records. Zero code paths." -m "Refs: CHC-T-027"; git push origin main. Paste everything.
R6. Close-out: git diff --name-only <pre-merge-main-tip> 6f?HEAD — use the actual pre-merge main tip captured in R5's merge output; confirm EVERY path under docs/orchestration/; from apps/web node scripts/validate.mjs → ALL CHECKS PASSED; git status --short → docs/ absent.

ACCEPTANCE CRITERIA
A1. Pre-state + inventories pasted.
A2. Staged set ⊆ docs/orchestration/ — pasted.
A3. Commit message: subject exact, body matches the ACTUAL R2 inventory (no invented counts) — pasted log -1 --format=%B.
A4. Merged --no-ff; merge diff only docs/ paths — pasted (explicit range or --first-parent).
A5. validate green on main — pasted.
A6. Post-merge status: docs/ clean, remainder = pre-state minus docs/ — pasted.

STOP CONDITIONS
- .env or .mcp.json appears anywhere — STOP.
- Any non-docs path would be staged — stop, unstage, report.
- Push rejection or conflict — report, never force.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING (zero expected — state the apps/web tree-hash proof)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
