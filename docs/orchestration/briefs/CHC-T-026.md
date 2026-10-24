# CHC-T-026 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-026
TITLE:           Chat WRITE persistence: creation, sends, ended_at — through RLS
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-024 (main @ 833d270 base), CHC-T-016 (00003 applied — chats UPDATE is column-scoped to ended_at)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §10 (chat), §10.2 (চ্যাট শেষ → 2h rating gate); AGENTS.md (offline-first §16, Bengali-only); migrations 00001 (policies) + 00003 (column grant); DECISIONS CHC-D-033b
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env values — variables only; session tokens digest-only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Chat READ is server-backed (CHC-T-024): server threads hydrate into app state, keyed by counterpart uid, carrying সার্ভারথ্রেডআইডি + পোস্টআইডি + serverId. Writes are still local-only. The live schema now enforces: chats INSERT for participants (chats_যোগ), messages INSERT for participants with sender_id = auth.uid() (messages_যোগ), and — after 00003 — chats UPDATE is column-scoped to ended_at ONLY (table-wide UPDATE revoked; anything else fails 42501). Chat creation requires listing_id to reference a SERVER product (FK) — chats opened from purely-local posts (offline-created, unflushed) CANNOT be created server-side and must stay local until that post flushes (offline-first limitation; document in code). OFFLINE-FIRST absolute: no session, no network, any failure → exactly today's local behavior (create/send locally, queue where a queue exists, continue; the UI never waits).

OBJECTIVE
(1) Chat creation from a server-known listing INSERTs into chats (buyer = session uid), (2) message sends on server threads INSERT into messages, (3) চ্যাট শেষ writes ended_at through the column grant, (4) offline/no-session paths unchanged with queue coverage for messages, (5) gates + bytes, (6) merged with ORCHESTRATOR-PENDING-VERIFICATION.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/auth.ts — modify ONLY to add chat-write helpers if cleaner there (or keep them in server-chats.ts — your call, document)
- apps/web/src/lib/server-chats.ts — modify (write helpers + the flush extension for বার্তা entries)
- apps/web/src/lib/app-state.svelte.ts — modify (queue flush extension for বার্তা; thread serverId tagging on creation)
- apps/web/src/routes/listing/[id]/+page.svelte — modify ONLY the চ্যাটখুলুন entry (session-gated server creation)
- apps/web/src/routes/chat/[id]/+page.svelte — modify (message send path + চ্যাট শেষ ended_at write)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is needed (reuse first)
- Branch/commit/merge/push

OUT OF SCOPE
- 00003's policy file (already applied); migrations of any kind; realtime subscriptions; the Edge Function; FCM; logic/feed.ts; other routes (home/feed/post stay); docs/
- package.json; anything that would put service-role or dP credentials in the client
- Voice anything (forbidden forever)

INPUTS (read first)
- apps/web/src/lib/server-chats.ts — the CHC-T-024 module (fetch/merge + the session/user helpers pattern)
- apps/web/src/lib/auth.ts — hasAuthClient/getSessionUserId/প্রোফাইলসংরক্ষণ patterns
- apps/web/src/lib/app-state.svelte.ts — চ্যাটথ্রেড shape, সারি item kinds, সারিতেযোগ/সারিফ্লাশ, লগআউট/সেশনসিঙ্ক patterns
- apps/web/src/routes/listing/[id]/+page.svelte — চ্যাটখুলুন (the creation entry)
- apps/web/src/routes/chat/[id]/+page.svelte — বার্তাপাঠান + চ্যাট শেষ (ended_at local flag)
- supabase/migrations/00003_chats_hardening.sql — the column grant your ended_at write must respect

REQUIREMENTS (numbered; testable)
R1. Chat creation (listing/[id] চ্যাটখুলুন), session-gated:
    a. If hasAuthClient() AND getSessionUserId() AND the listing is server-backed (its id is the server uuid — the post was created online per CHC-T-023; detect via the item's serverId marker or the server uuid shape — document your detection): INSERT into chats {listing_id, buyer_id: session uid, seller_id: the product's seller_id — fetch it with one .from('products').select('seller_id').eq('id', listing).single() call} → on success, create the local thread tagged সার্ভারথ্রেডআইডি + serverId + পোস্টআইডি = listing, and proceed into the thread exactly as today.
    b. No session / client null / the listing is purely-local → create the LOCAL thread exactly as today (no network attempt).
    c. Insert failure (RLS/FK/anything) → fall back to the local thread silently (offline-first; no error banner for infrastructure), EXCEPT: do NOT silently proceed if the failure is a validation bug — log-free, but return the local path.
    d. Duplicate guard: if a server thread for this listing+user already exists in app state (serverId-tagged with পোস্টআইডি = this listing), open it instead of inserting again.
R2. Message send (chat/[id] বার্তাপাঠান), session-gated:
    a. Thread has সার্ভারথ্রেডআইডি + session → .from('messages').insert({chat_id: সার্ভারথ্রেডআইডি, sender_id: session uid, body, kind:'text'}) → optimistic local append stays as today; insert failure → the message stays local with the existing offline behavior (queue if a message-queue kind exists, else keep in-thread flagged — document your choice).
    b. Thread has NO সার্ভারথ্রেডআইডি (purely-local chat) → local-only send, exactly today.
    c. No session → today's behavior.
R3. চ্যাট শেষ (ended_at): when a session + সার্ভারথ্রেডআইডি exist → .from('chats').update({ended_at: new Date().toISOString()}).eq('id', সার্ভারথ্রেডআইডি) — the 00003 column grant makes ONLY this column writable (any other column in the payload fails 42501 by design; send ONLY ended_at). Local শেষহয়েছে flag unchanged. Failure → local flag still set (offline-first), no retry storm (one attempt, document).
R4. Queue flush extension (app-state সারিফ্লাশ): 'বার্তা' queue entries now flush like 'পোস্ট' — session-gated, thread সার্ভারথ্রেডআইডি required (entries whose thread is not server-known stay queued), successes removed. Document what happens to a বার্তা entry whose thread never became server-known (it stays queued — bounded by the thread's local lifetime; document).
R5. Offline-first absolute: every new path is session-gated and failure-tolerant; the demo path (no env) and offline path are byte-for-byte today. No new English; no new dependencies; zero changes to logic/feed.ts, supabase.ts, migrations, the function.
R6. Evidence (paste, no tokens/values):
    a. tsc/`deno check`-style: npx tsc -p .tmp/check config on changed modules.
    b. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and env-less; byte delta vs 747,971 baseline (rebuild parent if needed).
    c. Browser (with env): i) chat creation on a SERVER-backed listing → thread tagged সার্ভারথ্রেডআইডি (paste the stored thread shape, ids only); ii) message send on a server thread → row lands (prove via a Management API select — count only, never contents); iii) চ্যাট শেষ → ended_at set in DB (Management API select of ended_at is null→value — paste before/after, timestamps only); iv) offline/no-session path creates locally with zero network (network tab clean); v) 42501 negative test: simulate by attempting a full-row update? — NO, do not fabricate failures; instead paste the code path that sends ONLY ended_at and cite the 00003 grant as the proof.
    d. Empty-DB parity: with tables emptied (they are 0-row today), the demo path renders as today.
R7. Commit (explicit pathspec):
   feat(chat): server-backed chat creation, message sends, ended_at — through RLS

   Chat creation on server-known listings INSERTs chats (buyer = session
   uid); message sends INSERT messages on server threads; চ্যাট শেষ writes
   ended_at through 00003's column grant. Purely-local chats and env-less
   builds keep today's behavior; failures queue or stay local (offline-
   first absolute). Read-only task CHC-T-024 semantics unchanged.

   Refs: CHC-T-026
   Push task/CHC-T-026; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. Creation session-gated + FK-aware + duplicate-guarded — pasted diff excerpt + detection explanation.
A2. Send path: server insert / local-only branch / queue — pasted diff excerpt.
A3. ended_at write sends ONLY ended_at — pasted diff excerpt + the 00003 grant cited.
A4. Flush extension for বার্তা entries — pasted diff excerpt + the unflushable-entry documentation.
A5. Offline-first invariance (no client → zero network on all four paths) — pasted diff + build-both-states evidence.
A6. Gates green; byte delta stated; merged with PENDING marker; no secrets — pasted.

STOP CONDITIONS
- Any code path needing the service-role key in the client — absolute STOP.
- The ended_at write requires touching any other column — that means 00003 is misunderstood; STOP and report.
- Byte delta > 20,000 B; gate failure; push rejection — BLOCKED with exact output.
- Chat creation on a purely-local listing silently succeeding server-side is impossible (FK) — if you find a path that would send a local uuid, STOP and report (design issue).

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
