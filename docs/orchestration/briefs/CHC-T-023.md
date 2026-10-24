# CHC-T-023 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-023
TITLE:           Server-backed post creation + first real queue flush
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-022 (main @ b9851f0 is the base; server-feed merge logic exists)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §8.2 (post creation ≤5 taps), §16.1 (offline-first — queue then flush); CHC-D-021 (users row with auth uid); AGENTS.md (Bengali-only, bright lines, byte rules)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env values — variables only, never echoed).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Posts are created locally only: the post page adds to app-state and সংরক্ষণ()s; the offline queue (সারিতেযোগ) collects entries but সারিফ্লাশ() is a historical no-op. The backend is live with RLS: products INSERT requires an authenticated session whose auth.uid() matches seller_id (products_যোগ). A real session now exists after the dP Relay signup flow (CHC-T-017/029), and the local user carries id?: string (CHC-T-015). The feed is server-backed (CHC-T-022): server items are fetched on boot and deduped against local ones. THE DUPLICATE HAZARD: after a successful insert, the same post would exist locally AND arrive from the server on the next boot fetch — the reconciliation design below is mandatory. Offline-first remains absolute: no session, no network, or any failure → EXACTLY today's local behavior (create locally, queue, continue; the UI never waits on the network).

OBJECTIVE
(1) When a Supabase session exists, post creation INSERTs into products (seller_id = session uid) and tags the local post with the returned server id so the feed dedupes it, (2) the offline queue gains its first real flush (boot + after each local creation, session-gated; successes leave the queue, failures stay), (3) zero behavior change without a session, (4) gates green, byte delta stated, (5) commit/push/merge with ORCHESTRATOR-PENDING-VERIFICATION.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/routes/post/+page.svelte — modify (session-gated insert path)
- apps/web/src/lib/app-state.svelte.ts — modify (real সারিফ্লাশ + post id tagging)
- apps/web/src/lib/server-feed.ts — modify ONLY if the dedupe needs it for inserted posts (see R4)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is required (reuse first)
- Branch/commit/merge/push

OUT OF SCOPE
- Editing photos/upload, location pickers, any other route, chat, moderation, admin
- Supabase Auth changes, migrations, the Edge Function, docs/orchestration/**, package.json
- Applying anything to the database; any service-role key outside the existing function

INPUTS (read first)
- apps/web/src/routes/post/+page.svelte — the create flow (state → সংরক্ষণ → সারিতেযোগ)
- apps/web/src/lib/app-state.svelte.ts — সারি shape, সারিতেযোগ/সারিফ্লাশ, ব্যবহারকারী.id
- apps/web/src/lib/server-feed.ts — the T-022 hydration + dedupe (serverId marker semantics)
- apps/web/src/lib/supabase.ts — getSupabase()
- supabase/migrations/00001_init.sql — products columns (union_name! needed_by null for sale)

REQUIREMENTS (numbered; each testable)
R1. Post insert path in the post page's submit (after the existing local creation succeeds):
    a. If getSessionUserId() AND hasAuthClient(): map the created post to a products INSERT row — seller_id = session uid, type ('sale'|'wanted' → server 'sale'|'wanted'), title, price (null when blank), unit, quantity, category, description null-if-empty, photo = the local thumbnail dataURL (column is text — dataURL is acceptable MVP storage), division/district/upazila/union_name/village (NOTE: union_name, not union), lat, lng, negotiable, hidden=false. Do NOT send created_at/expires_at (server defaults).
    b. On success: store the returned server id onto the local post (so server-feed's dedupe reconciles it — verify the exact marker mechanics from server-feed.ts and use them; if the dedupe keys on serverId+id, set both consistently) and সংরক্ষণ(). The post must appear EXACTLY ONCE in the feed after reload.
    c. On failure (any error): সারিতেযোগ('পোস্ট', payload) (Bengali-consistent with the existing queue item shape — READ the current queue usage first and mirror it) and continue. The user is never shown a network error for an offline-created post.
    d. No session → queue immediately (today's queue entry), zero network attempts.
R2. Real সারিফ্লাশ(): if a session exists, iterate the সারি and INSERT each 'পোস্ট' entry per R1's mapping; successes are REMOVED from the queue (and their local twins tagged with server ids if the payload carries one); failures stay queued. Call it (a) on boot after সেশনসিঙ্ক(), (b) after each locally-created post when a session exists. Offline/failed → queue untouched. Fire-and-forget with catch — never blocks UI.
R3. No-duplicate invariant (testable): after insert + full page reload, the created post appears EXACTLY ONCE in the rendered feed (band order per the algorithm). This must hold because either (i) the local twin is reconciled to the server id so the T-022 hydration dedupes it, or (ii) an equivalent mechanism — DOCUMENT which in the report.
R4. Demo/offline invariance: with no client, the create path is byte-for-byte today's behavior (local + queue entry, no network).
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 both env states; byte delta vs the post-T-022 baseline (rebuild parent if needed) — expect < 5,000 B; state it.
R6. Commit (explicit pathspec):
   feat(posts): server-backed creation with real offline-queue flush

   Session-gated products INSERT (seller_id = auth.uid()) tagged onto the
   local twin so the server-backed feed dedupes it; সারিফ্লাশ() now really
   flushes (boot + post-creation, session-gated, failures stay queued);
   no-session behavior unchanged. Offline-first absolute.

   Refs: CHC-T-023
   Push task/CHC-T-023; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. Insert path session-gated + exact column mapping (union_name!, no created_at/expires_at) — pasted diff excerpt.
A2. No-duplicate invariant implemented per the chosen mechanism, documented — pasted diff excerpt + explanation.
A3. Queue flush real: successes removed, failures stay, boot + post-creation triggers, session-gated — pasted diff excerpt.
A4. No-session invariance — pasted diff excerpt proving zero network on the no-client path.
A5. Gates green both env states; byte delta stated — pasted.
A6. Merged with PENDING-VERIFICATION; .env untracked; no secrets in the commit (counts only) — pasted.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- products INSERT requires anything beyond the session-anon client (service key in client code = absolute STOP).
- The dedupe requires editing logic/feed.ts — STOP (mapping/queue design issue, report instead).
- Byte delta > 20,000 B; gate failure; push rejection — BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
