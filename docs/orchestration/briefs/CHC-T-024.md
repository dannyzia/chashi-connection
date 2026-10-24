# CHC-T-024 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-024
TITLE:           Server-backed chats: participant threads read through RLS into app state
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-022 (main @ b9851f0 base — server-feed pattern is the template)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §10 (chat = centerpiece, no voice), AGENTS.md (offline-first §16, Bengali-only); CHC-T-022 report (the merge pattern you are repeating for chats)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (.env, .mcp.json — variables only, never echoed; session tokens digests only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Chats are currently local-only (app-state চ্যাটথ্রেড entries, opened from listing pages; messages text-only). The live database has chats + messages with RLS: authenticated participants read their own threads (chats_পঠন_অংশীদার, messages_পঠন_অংশীদার). A session now exists after the dP Relay signup flow. This task makes the chat list/message view READ server data first, local second — the exact merge pattern CHC-T-022 established for the feed, applied to chats: server threads merged into app state, failure → local-only, zero UI regression. WRITE persistence (new chat creation + message sends through RLS) is the NEXT task — explicitly out of scope; this task is READ ONLY. Counterpart identity: a thread's counterpart is the participant whose id ≠ my uid; resolve display name/label from public.users (authenticated SELECT) or the public_sellers view — your choice, document it. Do NOT expose phone/whatsapp anywhere.

OBJECTIVE
On boot with a session: fetch the participant's chats + messages through RLS, resolve counterpart identities, merge into app-state chat state (server threads marked and deduped by id), and let the existing chat UI render the merged set — with zero behavior change when the fetch fails or no session exists.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/server-chats.ts — create (fetch + map + merge module)
- apps/web/src/routes/chat/+page.svelte — modify ONLY for hydration on mount (mirror +page.svelte's CHC-T-022 pattern)
- apps/web/src/routes/chat/[id]/+page.svelte — modify ONLY if the thread view needs the merged messages (prefer app-state being the single source)
- apps/web/src/lib/app-state.svelte.ts — modify ONLY if a minimal export/merge hook is genuinely required (document)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is needed (reuse first)
- Branch/commit/merge/push

OUT OF SCOPE
- Chat/message WRITES of any kind (no INSERTs — next task); the Edge Function; migrations; logic/feed.ts; other routes; android/; docs/
- Voice messages (forbidden forever — PRD §10)
- package.json changes

INPUTS (read first)
- apps/web/src/lib/app-state.svelte.ts — চ্যাটথ্রেড/message shapes, চ্যাটখুলুন, বার্তাপাঠান
- apps/web/src/routes/chat/+page.svelte and chat/[id]/+page.svelte — current rendering + state consumption
- apps/web/src/lib/server-feed.ts — the CHC-T-022 merge pattern (null-safe, never-throw, dedupe, offline-first)
- supabase/migrations/00001_init.sql — chats/messages/users columns + the RLS policies your queries must satisfy
- apps/web/src/lib/data/seed.ts — local chat seed shape (mapping reference)

REQUIREMENTS (numbered; testable)
R1. server-chats.ts exports a single fetch function (Bengali name per convention) returning a result object (items or {ok:false}); NEVER throws; null client → immediate {ok:false}:
    a. Query 1: .from('chats').select('*').or(`buyer_id.eq.<uid>,seller_id.eq.<uid>`).order('created_at', {ascending:false}) — RLS also enforces this; the explicit filter is belt-and-braces.
    b. Query 2: messages for those chat ids — .from('messages').select('*').in('chat_id', ids).order('created_at', {ascending:true}); batch with .in(), no per-chat queries.
    c. Counterpart map: .from('public_sellers').select('id,name,label,verified').in('id', counterpartIds) — OR .from('users') with the session client (authenticated SELECT); document which and why. Map id → {name,label,verified}. My own id → my own name from the local user.
    d. Map chats+messages into the EXACT local চ্যাটথ্রেড shape (mirror seed.ts/app-state: thread id = server uuid with a server-marker field per the T-022 pattern; পোস্টআইডি = listing_id; counterpart fields; messages with সৃষ্টিসময় mapped; kind 'text' default for legacy rows; NEVER surface phone/whatsapp).
    e. Dedupe: server threads replace/merge with local threads by id (server uuid never collides with local-format ids — but guard anyway); on refresh, replace the server set (same reasoning as T-022: deleted server rows must vanish).
    f. Mapping errors on single rows: skip the row, never the batch.
R2. Hydration: on mount (client-only) call the fetch; on ok:true with items → merge into app-state chat state (server threads FIRST or by created_at — mirror the feed pattern) + সংরক্ষণ(); on ok:false → do NOTHING (local chats render exactly as today; no spinner — offline-first).
R3. Thread view ([id]) must render merged messages identically for server threads (the local rendering path unchanged — state-driven).
R4. No logic changes to message sending (still local+queue — write path is the next task); no new UI elements beyond what existing data renders; zero English in UI.
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and env-less; byte delta stated (chat module + hydration; expect < 5,000 B — the supabase-js chunk is already in the route graph via auth, verify and state the real number).
R6. Browser + live evidence (paste console/DOM/network transitions, no tokens):
    a. Env-less build: zero supabase network calls, local chats only.
    b. With env + EMPTY chats table (it is empty): local chats only, no errors, one chats query → 200 [].
    c. Live: insert one test users row + one test chat (listing_id → an existing product row — insert a test product if products is empty, via Management API service SQL; values never printed) + two test messages through the SAME Management API path; reload → the thread appears in the chat list with the CORRECT counterpart name, and the thread view shows both messages in order. Then delete the test rows → after reload the server thread vanishes, local state intact (live reads, not cache).
    d. If you have no live session for RLS (anon fetch returns [] even with rows): prove the query shape via the service path (Management API select with the same filters) and state the anon-[] result as the RLS-behavior evidence — the participant read with a REAL session is honestly PARTIAL (a session requires the dP OTP E2E; the orchestrator folds the with-session proof into the next E2E — same rule as CHC-T-018).

ACCEPTANCE CRITERIA
A1. Module null-safe, never-throws, exact mapping, no phone/whatsapp exposure — pasted file + tsc.
A2. Hydration merge with dedupe; failure = untouched — pasted diff excerpts.
A3. Thread view renders merged messages — pasted diff excerpt + the b/c live evidence.
A4. logic/, feed, function, migrations untouched; no writes added — pasted git diff --name-only + the zero-INSERT grep.
A5. Gates green both env states; byte delta stated with cause — pasted.
A6. Merged with PENDING-VERIFICATION; .env untracked — pasted.

STOP CONDITIONS
- app-state's chat shape cannot carry server threads without editing logic/feed.ts — STOP and report (that would mean a design gap; report, don't force).
- Byte delta > 20,000 B; gate failure; push rejection; any English in UI — BLOCKED with exact output.
- Any INSERT/UPDATE/DELETE against the database from app code — absolute STOP (read-only task).

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
