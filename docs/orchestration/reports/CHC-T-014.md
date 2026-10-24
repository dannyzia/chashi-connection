# CHC-T-014 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-022): verified (ALL_CLAIMS_VERIFIED — pre/post states, policy count 17→18, needed_by live, view 4-column proof, REST 200 []) → APPLIED HTTP 201 → 00002 LIVE (CHC-D-022). DONE.

```
=== TASK REPORT ===
TASK ID: CHC-T-014 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-REVIEW (applied nowhere)

SUMMARY: 00002_updates.sql with exactly the four CHC-D-021 items: (1) chats_সম্পাদনা_অংশীদার UPDATE policy (participants; enables ended_at "চ্যাট শেষ" gate); (2) products.needed_by date (wishlist §11.2); (3) public_sellers view (security_invoker, 4 columns, never phone/whatsapp) + grant; (4) — outside the SQL — .gitattributes eol=lf for locations-unions.ts. Parsed (4 statements), bright-line clean, gates green, merged bcef645. Read-only REST probes proved 00002 NOT applied (404 PGRST205 view / 400 42703 column).

KEY EVIDENCE: pre-apply anon probes (view 404, needed_by 400, products 200) · parse OK 4 statements · merged bcef645 pushed · build 506,931 B ±5 nondeterminism.

ACCEPTANCE: A1–A5 all PASS per brief.

DEVIATIONS: (1) brief-authorized renormalize staged identical content (dataset file); (2) item 3 = two statements (view + grant); (3) beyond-brief read-only probes: GET /v1/projects metadata (Postgres 17.6.1 — security_invoker valid) + three absence probes; (4) sha256 reconciliation of the CHC-D-021 record (CRLF worktree variant vs LF blob — same content).

OPEN ISSUES: applied-nowhere (orchestrator applies); public_sellers not yet anon-useful until the users SELECT widens at the auth stage; 00003 ordering gap until CHC-T-016.
QUESTIONS: none
=== END REPORT ===
```
