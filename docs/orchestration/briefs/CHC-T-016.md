# CHC-T-016 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-016
TITLE:           Migration 00003: chats column-level update hardening
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P1
DEPENDS ON:      none (migrations 00001+00002+00004 are live; 00003 applies additively)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS CHC-D-022 (pre-decided content), CHC-D-031 (ratified RPC/privilege patterns)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets.
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Migration 00002 granted chats UPDATE to authenticated with a participant row-policy (chats_সম্পাদনা_অংশীদার) — but table-level UPDATE lets a participant rewrite ANY column: buyer_id, seller_id, listing_id. The trust model (PRD §12 — women's safety, anti-harassment) should not allow a participant to re-point a chat at someone else. The 00002 review (CHC-D-022) decided the hardening: revoke table-wide UPDATE and grant column-scoped UPDATE on ended_at only — the sole legitimate mutable column (the "চ্যাট শেষ" rating gate, PRD §10.2). The existing row policy continues to filter WHICH rows; the column grant narrows WHICH columns.

OBJECTIVE
Author 00003_chats_hardening.sql implementing the column-scoped grant, prove it parses, run gates, commit/push/merge with ORCHESTRATOR-PENDING-APPLY. You AUTHOR ONLY — the orchestrator applies and verifies live.

SCOPE (the ONLY files you may create or modify)
- supabase/migrations/00003_chats_hardening.sql — create (ADDITIVE ONLY)
- Branch/commit/merge/push

OUT OF SCOPE
- Any other table/column/policy; apps/web/**; docs/; applying anything

INPUTS (read first)
- supabase/migrations/00002_updates.sql — the existing chats_সম্পাদনা_অংশীদার policy (this migration narrows the GRANT side, not the policy)
- docs/orchestration/DECISIONS.md CHC-D-022 — the decision

REQUIREMENTS (numbered; testable)
R1. 00003_chats_hardening.sql contains EXACTLY (Bengali comment headers per convention, explaining the trust-model reasoning):
    revoke update on table public.chats from authenticated;
    grant update (ended_at) on table public.chats to authenticated;
    and nothing else. No policy changes (the 00002 row policy stays), no inserts into existing-policy objects, no drops.
R2. Idempotent-safe: both statements are safely re-runnable (revoke/grant are; add IF EXISTS guards only if the parse proves them necessary — otherwise plain statements are acceptable; document your choice).
R3. Parse proof (pgsql-parser --no-save + prune + lock-hash-unchanged, the CHC-T-019 method — paste PARSE OK + statement count (2)).
R4. Bright-line scan over the file → zero matches (paste).
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and with .env moved aside; byte delta ≈ 0 (SQL is not bundled) — paste all.
R6. Commit (explicit pathspec):
   feat(supabase): migration 00003 — chats update hardened to ended_at only

   00002's table-level UPDATE let a participant rewrite buyer_id/seller_id/
   listing_id. Revoked; granted column-scoped update(ended_at) — the only
   legitimate mutation (PRD §10.2 chat-end gate). Row policy unchanged.
   NOT applied — orchestrator reviews, applies, verifies live.

   Refs: CHC-T-016
   Push task/CHC-T-016; merge --no-ff with ORCHESTRATOR-PENDING-APPLY; push main.

ACCEPTANCE CRITERIA
A1. File contains exactly the two statements + comments — pasted full file.
A2. Parse OK, 2 statements — pasted.
A3. Bright-line zero — pasted.
A4. Gates green both env states, byte delta ≈ 0 — pasted.
A5. Merged with PENDING-APPLY marker — pasted merge + ls-remote.

STOP CONDITIONS
- Any parse failure; any gate failure; push rejection — BLOCKED with exact output.
- Any temptation to touch the 00002 policy — out of scope, stop.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A5/FULL SQL PASTED/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
