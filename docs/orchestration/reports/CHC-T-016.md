# CHC-T-016 — Task Report (archived from builder relay, 2026-10-24)

> Orchestrator postscript (CHC-D-033b): verified → APPROVED → applied via Management API (HTTP 201; idempotent double-run harmless) → live-verified (authenticated table-wide chats UPDATE revoked; ended_at column grant true; buyer_id false; relacl/attacl exact; 18 policies + 3 chats policies unchanged). DONE — 00003 LIVE.

```
=== TASK REPORT ===
TASK ID: CHC-T-016 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-APPLY

SUMMARY: 00003_chats_hardening.sql — exactly two statements: revoke update on public.chats from authenticated; grant update (ended_at) on public.chats to authenticated. Closes the trust-model gap where a participant could rewrite buyer_id/seller_id/listing_id (PRD §12 women's safety). Parse-tree proof distinguishes revoke vs grant by the cols asymmetry (libpg_query GrantStmt is_grant=false + no cols vs is_grant=true + cols=[ended_at]). Parse harness in .tmp/pgparse with its own manifest (lockfiles hash-identical, pruned). Bright-line zero. Gates green. Merged 468c631.

KEY EVIDENCE: PARSE OK, 2 statements · field dump (revoke table-wide / grant cols=[ended_at]) · bright-line 0 + codepoint sweep (Bengali only) · gates ×2 · merged 468c631, ls-remote exact · lockfile hashes identical.

ACCEPTANCE: A1 full SQL pasted, two statements only · A2 PARSE OK + field-level proof · A3 bright-line 0 · A4 gates green both env states, 0 B delta · A5 merged with PENDING-APPLY.

DEVIATIONS: (1) parse harness in .tmp/pgparse (guarantees manifest cleanliness by construction); (2) field-level parse pass beyond count; (3) CRLF to match sibling migrations; (4) no AI footer; (5) no IF EXISTS guards (natively idempotent).

OPEN ISSUES: not applied (orchestrator); practical consequence for CHC-T-024: post-00003, chat writes must send .update({ended_at}) only — full-row updates fail 42501 (intended); anon chats-UPDATE left alone (RLS already denies).
QUESTIONS: none
=== END REPORT ===
```
