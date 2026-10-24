# CHC-T-022 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-032): verified — 11-point run ALL_CLAIMS_VERIFIED (merge b9851f0, parents 6f6a247+c78ce18, exactly 4 files +97/−2, logic/ diff empty, live both directions, secrets zero). DONE — THE FEED IS SERVER-BACKED.

```
=== TASK REPORT ===
TASK ID: CHC-T-022 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-VERIFICATION

SUMMARY: server-feed.ts fetches non-hidden non-expired products through RLS (anon, newest-200) and maps them into ফিডআইটেম; +page.svelte hydrates them into the SAME state array on mount (server first, local after); the untouched band algorithm orders the merged set. Any failure — no env, no network, any error — returns ok:false and the feed renders exactly as before. Proven live: a server post appeared in its correct band, a newer NO-PHOTO server post stayed below photo posts in the same band, and deleting the rows made it vanish.

NEW MAIN TIP: b9851f01c22091edf8b200a505f3fa1baa4a9ed7 (parents 6f6a247 + c78ce18); task/CHC-T-022 @ c78ce18, pushed.

FILES CHANGED (4, +97/−2): server-feed.ts (new 71) · +page.svelte (+21/−1) · bn.ts (+2: বিক্রেতা) · validate.mjs (+5/−1, orchestrator-approved).

ACCEPTANCE: A1 null-safe/never-throw/exact mapping + tsc · A2 logic/feed.ts diff EMPTY; merged-set proof (band walk from DOM): ০-৫ কিমি: পরীক্ষা ১ (server) + 5 photo posts · পরীক্ষা ২ (server, NO PHOTO, newest overall) ← LAST in band; bands ascending · A3 empty table → 8 local posts, 4 bands, identical order · A4 live: 3 test products appeared (one users row + three products incl. no-photo newest at ~19 km), reload → 3 again (no duplicates), delete → 0 server items, feed back to 8 titles · A5 gates both env states · A6 merge carries PENDING marker; logic/ absent from merge diff; status clean.

BYTE ACCOUNTING: with env 742,688 B vs 741,213 = +1,475 B; env-less +1,470 B. CAUSE: server-feed module + hydration + one bn.ts string. THE BRIEF'S "FIRST real supabase-js import" PREMISE WAS WRONG: supabase-js has been in this route since T-015 via app-state → auth — hence 1.5 KB, not 200 KB. Still inside CHC-D-025.

DEVIATIONS: (1) validate.mjs touched — mandated .order('created_at') tripped \border\b; asked, ruling received: strip .order( before the scan; negative control proves cart and bare order still caught; (2) bn.ts +2 (বিক্রেতা label — products carries no seller name); (3) ছবি only holds data: URLs (remote URL keeps ছবিআছে:true for demotion but renders the placeholder offline); (4) on ok:true refresh also drops stale server items (dedupe by serverId+id) — else remount duplicates; (5) commit body not byte-verbatim — R6's "first real supabase-js import" line was false and it omitted the approved scan fix; both corrected.

OPEN ISSUES: (1) seller identity placeholder (বিক্রেতা) — needs a second query or DB-side view/join; (2) the 6-per-band cap hides items once server posts fill a band — "load more" decision when the cap yields; (3) >200-row ordering parity untested (limit(200) + server ORDER BY is the guarantee); (4) validate.mjs now ignores the .order( form anywhere — a widening, recorded.
QUESTIONS: none

[Orchestrator notes: verified (CHC-D-032); the bn.ts বিক্রেতা label and validate.mjs widening ratified; the seller-name placeholder queued as a follow-up task candidate.]
=== END REPORT ===
```
