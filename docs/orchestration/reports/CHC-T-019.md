# CHC-T-019 — Task Report (archived from builder relay, 2026-10-24)

> Orchestrator postscript (CHC-D-031): verified → applied 00004 → redeployed function → zero-credit proof chain ALL PASS (anon RPC 401, deny-all 200 [], pre-fill 1..5, cap-trip 429 pre-dP, wallet STILL 19, counters cleaned). DONE — GUARD LIVE.

```
=== TASK REPORT ===
TASK ID: CHC-T-019 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-REVIEW-DEPLOY

SUMMARY: 00004_otp_guard.sql adds public.otp_sends (kind phone|ip, key, day UTC, cnt; PK; RLS deny-all with zero policies — service-role bypasses) + typed plpgsql RPC otp_send_গণনা doing INSERT ON CONFLICT DO UPDATE SET cnt = cnt + 1 RETURNING. The supabase-js upsert path was PROVEN unable to express the increment (static EXCLUDED literal — the brief's stop condition); the RPC receives typed parameters (no SQL string building), PUBLIC EXECUTE revoked, granted to service_role, invoker rights. auth-otp send path now atomically increments phone+IP counters AFTER phone validation and BEFORE every dP call; 429 rate_limited past 5/phone/day or 20/IP/day (blocked attempts still increment — deliberate). verify path byte-identical.

KEY EVIDENCE: merged 7a2263c (2 files +132/−0, remotes match) · parse/bright-line/gates green · supabase-js upsert limitation proven from dist/index.cjs:3255 · zero-credit proof planned/documented.

ACCEPTANCE: A1 file exact/additive/deny-all · A2 guard order proven · A3 verify byte-identical · A4 deno check + bright-line + gates · A5 merged with PENDING-REVIEW-DEPLOY.

UPSERT CONSTRUCT CHOSEN + WHY: typed RPC in the migration (the brief's stop-condition question, answered before implementation).
FAIL-OPEN JUSTIFICATION: spend cap ≠ security boundary; blocking 2G-rural signups worse than brief uncapped spend; dP cooldown sits behind.
CGNAT: flagged for orchestrator ruling (IP cap vs real fan-out).

OPEN ISSUES: (1) apply 00004 BEFORE redeploying the function (order matters — guard silently inert otherwise); (2) blocked attempts consume IP budget (burst against one phone also consumes IP budget); (3) zero-credit live proof pending (apply → RPC ×20 service-side → one send → 429 → wallet unchanged); (4) 00003 ordering gap.
QUESTIONS: none
=== END REPORT ===
```
