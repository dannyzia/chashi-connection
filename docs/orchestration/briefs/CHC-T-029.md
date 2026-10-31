# CHC-T-029 + CHC-T-030 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

> Covers both ledger IDs: CHC-T-029 (audit log) and CHC-T-030 (PRD auto-hide enforcement). One migration, one cohesive §12.4 enforcement outcome.

```
=== TASK BRIEF ===
TASK ID:         CHC-T-029 + CHC-T-030 (one brief, two ledger IDs — one migration, one cohesive §12.4 enforcement outcome)
TITLE:           Moderation enforcement: admin audit log + PRD auto-hide thresholds
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-026 (main @ d667158 base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §12.4 (VERBATIM: "hide after 2 reports" ভুয়া বিজ্ঞাপন/প্রতারণা · "hide after 3 reports" স্প্যাম · "every admin action is logged"); AGENTS.md (bright lines, Bengali-only); DECISIONS CHC-D-038 (these are PRD-mandated implementation, NOT owner decisions)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env — variables only; session tokens digest-only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Two §12.4 enforcement gaps are open: (1) admin hide/unhide leaves no audit trail (PRD mandates logging every admin action); (2) the PRD's auto-hide thresholds (2 ভুয়া/প্রতারণা reports, 3 স্প্যাম reports on a listing → auto-hide) are unenforced — the dashboard is manual-only. The feed query (server-feed.ts) currently filters hidden=false only. The correct enforcement point is SERVER-SIDE (reports are SELECT-own only — the client can never count them), via a trigger on reports INSERT with a SECURITY DEFINER function (the reporter has no products-UPDATE grant, so invoker rights would fail — definer is required; search_path pinned). The client then adds ONE filter to the existing products query. The admin unhide (already wired in T-026's dashboard) clears both hidden AND auto_hidden_at, and writes an audit row.

OBJECTIVE
(1) Migration 00006: admin_audit table + products.auto_hidden_at column + the SECURITY DEFINER trigger that auto-hides at the PRD thresholds, (2) the client: feed query excludes auto-hidden, admin hide/unhide writes audit rows, (3) gates + bytes, (4) merged with ORCHESTRATOR-PENDING-APPLY-VERIFICATION. You AUTHOR — the orchestrator reviews, applies 00006, redeploys nothing (client-only change otherwise), and verifies live.

SCOPE (the ONLY files you may create or modify)
- supabase/migrations/00006_moderation_enforcement.sql — create (ADDITIVE ONLY)
- apps/web/src/lib/server-feed.ts — modify (the one-filter addition + optional audit-write helper if cleaner here than admin.ts)
- apps/web/src/lib/admin.ts — modify (setHidden writes the audit row; unhide clears auto_hidden_at too)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is needed (the admin dashboard may need an "স্বয়ংক্রিয়ভাবে লুকানো" badge label — reuse first)
- Branch/commit/merge/push

OUT OF SCOPE
- chat/**, auth.ts, supabase.ts, app-state.svelte.ts, package.json, docs/, android/, migrations beyond 00006
- Removing/altering existing policies, tables, or columns (additive only)
- The block-add surface (separate task CHC-T-031)
- Any /v5/billing/* or admin USER management (stage 2)

INPUTS (read first)
- apps/web/src/lib/server-feed.ts — the products query (your one-filter addition)
- apps/web/src/lib/admin.ts — setHidden (your audit-write addition)
- apps/web/src/routes/listing/[id]/+page.svelte — the report modal's EXACT category strings (the trigger must match them byte-for-byte — a mismatch silently disables auto-hide)
- supabase/migrations/00003_chats_hardening.sql — the grant-pattern reference
- PRD-V5.0.md §12.4 — the threshold source

REQUIREMENTS (numbered; each testable)
R1. Migration 00006_moderation_enforcement.sql (additive, Bengali comments per convention):
    a. admin_audit table: id uuid PK default gen_random_uuid(); actor uuid not null references public.users(id); action text not null; target_type text not null; target_id uuid; details jsonb; created_at timestamptz default now(). RLS enabled, ZERO policies (deny-all to anon/authenticated — service-role bypasses; comment states this). Two indexes: (actor, created_at desc) and (target_type, target_id).
    b. products.auto_hidden_at timestamptz null (add column if not exists).
    c. Trigger function public.moderation_স্বয়ংক্রিয়_লুকানো(): SECURITY DEFINER, set search_path = public; on NEW report rows for target_type='product': count that product's reports by category; if ভুয়া-category count ≥ 2 OR স্প্যাম-category count ≥ 3 → UPDATE products SET auto_hidden_at = now() WHERE id = new.target_id AND auto_hidden_at IS NULL. The category strings MUST be copied byte-for-byte from the report modal's category list (paste the modal's list in your report + the SQL literals side by side as the match proof). SECURITY DEFINER + pinned search_path justified in a comment (the reporter lacks products-UPDATE; definer is required; hijack-safe via the pinned path).
    d. Trigger: after insert on public.reports for each row → execute the function.
    e. Nothing destructive: no drops of existing objects, no policy changes, no data migrations.
R2. server-feed.ts: add .is('auto_hidden_at', null) to the products query (one filter). Paste the modified query line.
R3. admin.ts setHidden(productId, hidden): after the products update, insert an admin_audit row {actor: session uid, action: hidden?'hide':'unhide', target_type:'product', target_id: productId} — fire-and-forget with catch (audit failure must not fail the hide). For unhide (hidden=false) ALSO set auto_hidden_at: null in the same update payload (admin clears both — the 00005 admin UPDATE policy permits full-row; the column grant is table-wide for products).
R4. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 both env states; byte delta stated (expect < 2,000 B — one filter + audit insert; state it).
R5. Migration parse proof (pgsql-parser --no-save + prune + lock-hash-unchanged) — paste PARSE OK + statement inventory.
R6. Commit (explicit pathspec):
   feat(moderation): §12.4 enforcement — audit log + PRD auto-hide thresholds

   admin_audit table (deny-all RLS, service/actor writes via admin.ts);
   products.auto_hidden_at + SECURITY DEFINER trigger auto-hiding at the
   PRD §12.4 thresholds (2 ভুয়া/প্রতারণা or 3 স্প্যাম); feed query excludes
   auto-hidden; admin unhide clears both flags and writes the audit row.

   Refs: CHC-T-029, CHC-T-030
   Push task/CHC-T-029; merge --no-ff with ORCHESTRATOR-PENDING-APPLY-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. Migration exact per R1 (audit table + column + definer trigger + trigger) — pasted full file + parse inventory.
A2. Category-string match proof — pasted: the modal's category strings and the SQL literals side by side.
A3. Feed filter line — pasted diff excerpt (one line).
A4. Audit write on setHidden — pasted diff excerpt.
A5. Parse proof + lock-hash-unchanged — pasted.
A6. Gates green both env states; byte delta stated — pasted.
A7. Merged with PENDING-APPLY-VERIFICATION; no secrets — pasted.

VERIFICATION (order): R1 file → category match proof → parse → gates → commit/merge.

STOP CONDITIONS
- The trigger's SECURITY DEFINER would need anything beyond the pinned search_path — STOP (hijack risk).
- The category strings cannot be matched byte-for-byte (modal list differs from your extraction) — STOP and report both lists.
- Byte delta > 2,000 B; gate failure; push rejection — BLOCKED with exact output.
- Any suggestion of counting reports client-side — absolute STOP (reports are SELECT-own; impossible and wrong).

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A7/FULL MIGRATION SQL PASTED/CATEGORY MATCH PROOF/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
