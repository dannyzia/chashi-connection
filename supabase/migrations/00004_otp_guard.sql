-- ─────────────────────────────────────────────────────────────────────────────
-- ০০০০৪ — OTP পাঠানোর খরচ-সীমা (spend guard)। সূত্র: সিদ্ধান্ত CHC-D-028,
-- ঝুঁকি CHC-R-017, টাস্ক CHC-T-019।
--
-- কেন: auth-otp ফাংশনের send পথে প্রতিটি গৃহীত ডাকে dP Relay-এর একটি
-- টাকা-খরচা ক্রেডিট লাগে। anon কী অ্যাপের সঙ্গেই যায়, তাই যে কেউ বারবার send
-- ডাকতে পারে। dP-র নিজের per-number cooldown একক নম্বর সামলায়, কিন্তু সামগ্রিক
-- খরচ নয়।
--
-- এই টেবিল দিন-ভিত্তিক (UTC) দুটি কাউন্টার রাখে: প্রতি নম্বর ও প্রতি IP।
-- এটি ব্যবহারকারীর অভিজ্ঞতার সীমা নয় — খরচের সীমা। কোনো UI এই টেবিল দেখে না,
-- কোনো নতুন স্ক্রিন বা স্ট্রিং যোগ হয় না।
--
-- কেবল Edge Function (service-role) এই টেবিলে হাত দেয়। তাই RLS চালু কিন্তু
-- শূন্য policy: anon ও authenticated-এর জন্য সব সারি DENY, আর service-role
-- RLS নিজেই বাইপাস করে। বাড়তি কোনো grant নেই।
--
-- সম্পূর্ণ additive — কোনো drop/alter of existing object নেই।
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.otp_sends (
  kind text not null check (kind in ('phone', 'ip')),
  key text not null,
  day date not null default (now() at time zone 'utc')::date,
  cnt integer not null default 0,
  primary key (kind, key, day)
);

alter table public.otp_sends enable row level security;

-- ইচ্ছাকৃতভাবে কোনো policy নেই: RLS চালু + শূন্য policy = anon/authenticated-এর
-- জন্য সম্পূর্ণ deny-all (select/insert/update/delete সব)। ফাংশনের service-role
-- কী RLS বাইপাস করে, তাই কেবল auth-otp-ই কাউন্টার বাড়াতে বা পড়তে পারে।

-- ── কেন একটি ফাংশন: supabase-js-এর .upsert() বডি হিসেবে কাঁচা JSON পাঠায়,
-- তাই ON CONFLICT DO UPDATE SET cnt = otp_sends.cnt + 1 প্রকাশ করা যায় না —
-- সেট হয়ে যেত EXCLUDED.cnt, অর্থাৎ স্থির মান (কাউন্টার প্রতিবার ১-এ নেমে
-- আসত, সীমা কখনোই ট্রিগার করত না)। এই ফাংশনটি একক স্টেটমেন্টে পারমাণবিক
-- বৃদ্ধি + RETURNING দেয়, আর PostgREST-এ টাইপযুক্ত প্যারামিটার হিসেবেই ডাকা হয়
-- — কোনো SQL স্ট্রিং তৈরি হয় না, ইনজেকশনের পথ নেই।
--
-- মালিকানা: SECURITY DEFINER নয়। একমাত্র caller service_role, যে ইতিমধ্যেই RLS
-- বাইপাস করে — তাই ডিফল্ট invoker অধিকারই সর্বনিম্ন বিশেষাধিকার।
create or replace function public.otp_send_গণনা(p_kind text, p_key text, p_day date)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  নতুন_গণনা integer;
begin
  insert into public.otp_sends (kind, key, day, cnt)
  values (p_kind, p_key, p_day, 1)
  on conflict (kind, key, day)
  do update set cnt = otp_sends.cnt + 1
  returning cnt into নতুন_গণনা;
  return নতুন_গণনা;
end;
$$;

-- পোস্টগ্রেস ডিফল্টে নতুন ফাংশনে PUBLIC-এর EXECUTE থাকে — তাই স্পষ্ট revoke
-- দরকার, নইলে anon /rpc/ দিয়ে কাউন্টার বাড়াতে পারত।
revoke all on function public.otp_send_গণনা(text, text, date) from public, anon, authenticated;
grant execute on function public.otp_send_গণনা(text, text, date) to service_role;
