-- ─────────────────────────────────────────────────────────────────────────────
-- ০০০০৭ — অ্যাডমিন স্তর ২: কর্ম-লগ পাঠ এবং ব্যবহারকারী-যাচাই ব্যবস্থাপনা।
-- সূত্র: পিআরডি §১২.৪ (অপারেটর-তালিকা, "প্রতিটি অ্যাডমিন কাজ লগ হয়"),
-- §১২.৩ (যাচাইকৃত ব্যাজ); সিদ্ধান্ত CHC-D-016/031 (স্পষ্ট-অনুমতি ও টাইপযুক্ত
-- RPC নমুনা); টাস্ক CHC-T-035।
--
-- কেন এই ফাইল: ০০০৬ লগ লেখে, কিন্তু পড়ার কোনো পথ দেয়নি (INSERT-only grant,
-- শূন্য পঠন-নীতি) — অর্থাৎ যে লগ রাখা বাধ্যতামূলক, তা অপারেটর দেখতেই পারে না।
-- আর users.verified ইচ্ছাকৃতভাবে ক্লায়েন্টের লেখার বাইরে (০০০৫: নিজেকে
-- যাচাইকৃত বলা ঠেকাতে) — তাই যাচাইয়ের একমাত্র নিরাপদ পথ definer RPC, যেখানে
-- কলকারীর ভূমিকা সার্ভারেই যাচাই হয়, ক্লায়েন্টের দাবিতে নয়।
--
-- ⛔ সম্পূর্ণ additive: কোনো টেবিল, কলাম, নীতি বা অনুমতি মোছা/বদলানো হয় না।
-- ০০০৬-এর INSERT-only grant অটুট; এখানে কেবল SELECT যোগ হয় (grant additive),
-- আর নতুন নীতি ও নতুন ফাংশন তৈরি হয়। revoke শুধু এই ফাইলের নিজের ফাংশনের
-- PUBLIC ডিফল্টে (পোস্টগ্রেস নতুন ফাংশনে PUBLIC-কে EXECUTE দেয়)।
--
-- পুনরায় চালানো নিরাপদ: grant/revoke নিজেরাই idempotent, policy-তে
-- drop-if-exists কেবল এই ফাইলের নিজের নতুন নামের উপর, ফাংশনে create or replace।
-- ─────────────────────────────────────────────────────────────────────────────


-- ── ১) অ্যাডমিনের জন্য কর্ম-লগ পাঠের পথ ──
--
-- ০০০৬-এ authenticated-এর কাছে কেবল INSERT ছিল — SELECT ছিল না, আর কোনো
-- পঠন-নীতিও ছিল না (শূন্য নীতি = deny-all)। ফলে লগ লেখা যেত, পড়া যেত না।
-- grant আর policy আলাদা দুটি স্তর: grant টেবিলে হাত দেওয়ার অনুমতি দেয়,
-- policy ঠিক করে কোন সারি দেখা যাবে। দুটোই লাগে — একটি ছাড়া অন্যটি নিষ্ক্রিয়।
--
-- anon-এর কিছুই নেই (০০০৬-এর revoke অটুট): লগ কেবল সাইন-ইন করা অ্যাডমিন পড়ে।
grant select on table public.admin_audit to authenticated;

-- পঠন-নীতি: কেবল প্রকৃত অ্যাডমিন সব সারি দেখে। অ-অ্যাডমিনের জন্য এই নীতি
-- কোনো সারি খোলে না, আর অন্য কোনো পঠন-নীতি নেই — তাই তাদের ফল শূন্য (ব্যর্থতা
-- নয়, নীতি)। নীতিটি users.role পড়ে, আর role ক্লায়েন্টের লেখার পথেই নেই
-- (০০০৫-এর কলাম-অনুমতি) — তাই নিজেকে অ্যাডমিন বানিয়ে লগ পড়ার পথ নেই।
drop policy if exists অ্যাডমিন_কর্ম_লগ_পঠন on public.admin_audit;
create policy অ্যাডমিন_কর্ম_লগ_পঠন on public.admin_audit
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );


-- ── ২) ব্যবহারকারী-যাচাই (পিআরডি §১২.৩) ──
--
-- কেন definer: users.verified authenticated-এর UPDATE কলাম-তালিকায় নেই
-- (০০০৫) — ইচ্ছাকৃত। ইচ্ছা করলেই যে কেউ নিজেকে "যাচাইকৃত" দেখাতে পারত,
-- আর ব্যাজটির অর্থই হারিয়ে যেত। কিন্তু অপারেটরকেও তো যাচাই করতে হবে;
-- তাই লেখাটি হয় ফাংশনের ভেতরে, মালিকের (মাইগ্রেশন-চালক) অধিকারে।
--
-- কেন ভেতরে কলকারী-যাচাই: grant টেবিল-স্তরের নয়, ফাংশন-স্তরের — অর্থাৎ
-- EXECUTE পাওয়া প্রত্যেক authenticated এই ফাংশন ডাকতে পারে। তাই "কে ডাকছে"
-- যাচাই না করলে grant-টাই একটি সেল্ফ-প্রমোটের দরজা হতো। ভূমিকা পড়া হয়
-- public.users থেকে auth.uid() দিয়ে — auth.uid() আসে JWT-স্বাক্ষরিত সেশনের
-- claims থেকে, ক্লায়েন্টের পাঠানো প্যারামিটার থেকে নয়।
--
-- হাইজ্যাক-প্রতিরোধ: search_path পিন করা (= public) এবং প্রতিটি টেবিল পুরো
-- নামে (public.users) — কোনো ব্যবহারকারী নিজের স্কিমায় users বসিয়ে definer-এর
-- ক্ষমতা নিজের দিকে ঘুরাতে পারে না।
--
-- ফেরত: হালনাগাদ হওয়া সারি (অপারেটর UI সঙ্গে সঙ্গে সত্য দেখে)। ব্যবহারকারী
-- না মিললে null — ব্যতিক্রম নয়, কারণ "কেউ নেই" কোনো নিরাপত্তা ঘটনা নয়।
create or replace function public.set_user_verified(p_user_id uuid, p_verified boolean)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  আহ্বানকারী_ভূমিকা text;
  হালনাগাদ_সারি public.users;
begin
  select u.role into আহ্বানকারী_ভূমিকা
    from public.users u
   where u.id = auth.uid();

  -- অ্যাডমিন না হলে (বা সেশনই না থাকলে) কিছুই হয় না — বাংলায়, P0001।
  if আহ্বানকারী_ভূমিকা is distinct from 'admin' then
    raise exception 'অনুমতি নেই' using errcode = 'P0001';
  end if;

  update public.users u
     set verified = p_verified
   where u.id = p_user_id
   returning * into হালনাগাদ_সারি;

  return হালনাগাদ_সারি;
end;
$$;

-- পোস্টগ্রেস নতুন ফাংশনে PUBLIC-কে EXECUTE দেয় — তাই স্পষ্ট revoke, নাহলে
-- anon /rpc/ দিয়েই ডাকতে পারত (০০০৪-এর নমুনা)।
revoke all on function public.set_user_verified(uuid, boolean) from public, anon;
grant execute on function public.set_user_verified(uuid, boolean) to authenticated;
