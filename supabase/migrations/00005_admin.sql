-- ─────────────────────────────────────────────────────────────────────────────
-- ০০০০৫ — অ্যাডমিন স্তর ১: role কলাম, users-এর কলাম-সীমিত অনুমতি, অপারেটর নীতি।
-- সূত্র: পিআরডি §১২.৪ (রিপোর্ট তালিকা, রিপোর্টের পর লুকানো), সিদ্ধান্ত
-- CHC-D-016 / CHC-D-022 / CHC-D-031 (স্পষ্ট-অনুমতি নমুনা), টাস্ক CHC-T-028।
--
-- কেন এই ফাইল: অপারেটরের দরকার রিপোর্টের সারি দেখা (আজ কেবল নিজের রিপোর্ট
-- পড়া যায়) আর বিজ্ঞাপন লুকানো (পিআরডি §১২.৪-এর অপারেটর দিক)। কিন্তু users-এ
-- role কলাম যোগ করাই যথেষ্ট নয় — বিপজ্জনকও বটে: বিদ্যমান users_সম্পাদনা নীতি
-- কেবল সারি বাছাই করে (id = auth.uid()), আর Supabase-এর ডিফল্ট টেবিল-ব্যাপী
-- UPDATE অনুমতি যে কোনো কলাম লিখতে দেয়। ফলে যে কেউ নিজের সারিতে
-- role='admin' বসিয়ে নিজেই অ্যাডমিন হয়ে যেত। verified ব্যাজ ও phone নম্বরও
-- ঠিক একইভাবে জাল করা যেত।
--
-- সমাধান (০০০০৩-এর প্রমাণিত নমুনা): টেবিল-ব্যাপী অনুমতি প্রত্যাহার, তারপর
-- কলাম-তালিকা ধরে স্পষ্ট grant। role, verified, phone — তিনটিই নিজে লেখার
-- অনুমতির বাইরে; id ও created_at-ও বাইরে। ফলে role কখনো anon বা
-- authenticated-এর লেখার পথে নেই — এই ফাইলের একমাত্র অলঙ্ঘনীয় শর্ত।
--
-- নীতি (policy) ঠিক করে কোন সারি, কলাম-অনুমতি ঠিক করে কোন কলাম — দুটো
-- একসঙ্গেই প্রযোজ্য। তাই অ্যাডমিন নীতিগুলো শুধু সারি খোলে, কলামের সীমা ভাঙে না।
--
-- চ্যাটের অনুমতি (০০০০৩) এই ফাইলে স্পর্শ করা হয় না। কোনো টেবিল/কলাম/নীতি
-- মোছা হয় না — একমাত্র নিচের তিনটি নীতি নিজেরাই পুনরায় তৈরি হয়।
-- মাইগ্রেশন কখনো সম্পাদিত হয় না (AGENTS.md); এই ফাইল পুনরায় চালানো নিরাপদ।
-- ─────────────────────────────────────────────────────────────────────────────

-- ১) role কলাম — কেবল 'user' বা 'admin'; ডিফল্ট 'user'।
alter table public.users
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

comment on column public.users.role is
  'অ্যাডমিন স্তর — কেবল সার্ভার/অপারেটর সেট করেন; ক্লায়েন্ট কখনো লেখে না (০০০০৫-এর কলাম-অনুমতি)';

-- ২) users-এর অনুমতি পুনর্নির্মাণ (কলাম-সীমিত)।
--    revoke all → টেবিল-ব্যাপী SELECT/INSERT/UPDATE/DELETE/TRUNCATE/
--    REFERENCES/TRIGGER সবই যায়। এরপর নিচের তিনটি grant-ই একমাত্র পথ।
revoke all on table public.users from anon, authenticated;

-- পড়া: পুরো প্রোফাইল। কোন সারি দেখা যাবে তা ঠিক করে RLS (users_পঠন_প্রমাণিত);
-- কলাম-তালিকায় role থাকায় অ্যাডমিন নিজের ভূমিকা পড়তে পারে — লেখার পথ নেই।
grant select (
  id, phone, name, label, division, district, upazila, union_name, village,
  lat, lng, detail, whatsapp, women_safety, verified, role, created_at
) on table public.users to anon, authenticated;

-- নতুন সারি: verified বাদ — নাহলে সাইনআপের সময়েই নিজেকে "যাচাইকৃত" বলা যেত।
-- role বাদ — এই ফাইলের মূল সুরক্ষা। id রাখা আছে কারণ অ্যাপ সারিটি auth uid
-- দিয়েই লেখে, আর users_যোগ নীতি (id = auth.uid()) তা ছাড়া মিলবেই না।
grant insert (
  id, phone, name, label, division, district, upazila, union_name, village,
  lat, lng, detail, whatsapp, women_safety, created_at
) on table public.users to authenticated;

-- নিজের সারি হালনাগাদ (নীতি users_সম্পাদনা): কেবল প্রোফাইল-তথ্য।
-- role/verified/phone/id/created_at বাদ — নিজেকে অ্যাডমিন বা যাচাইকৃত করা
-- অসম্ভব, আর ফোন বদলালে নতুন করে যাচাই দরকার (এই স্তরে বাইরে)।
grant update (
  name, label, division, district, upazila, union_name, village,
  lat, lng, detail, whatsapp, women_safety
) on table public.users to authenticated;

-- ৩) অপারেটর নীতি — permissive, তাই বিদ্যমান নীতির সঙ্গে OR হয়ে যোগ হয়
--    (নতুন কিছু বন্ধ করে না, শুধু অ্যাডমিনের জন্য সারি খোলে)।
--
--    • reports_অ্যাডমিন_পঠন  : reports_পঠন_নিজের নীতির পাশে — অ্যাডমিন সব
--      রিপোর্ট দেখে (সাধারণ ব্যবহারকারী এখনো কেবল নিজেরটাই দেখে)।
--    • products_অ্যাডমিন_পঠন : hidden পণ্যও অ্যাডমিন দেখে (মালিক-নীতির পাশে)।
--    • products_অ্যাডমিন_সম্পাদনা: অ্যাডমিন যেকোনো পণ্যের hidden বদলাতে পারে।
--
--    তিনটিই role কলাম পড়ে — তাই উপরের কলাম-অনুমতি অটুট থাকা অপরিহার্য:
--    যে নিজের role বদলাতে পারে না, সে এই নীতিগুলোও নিজের দিকে ঘুরাতে পারে না।
--
--    পুনরায় চালানো নিরাপদ: drop if exists কেবল এই ফাইলের নিজের নামের উপর,
--    আর মাইগ্রেশন এক লেনদেনে চলে — তাই drop আর create-এর মাঝে নীতি-শূন্য
--    অবস্থা কেউ দেখতে পায় না।

drop policy if exists reports_অ্যাডমিন_পঠন on public.reports;
create policy reports_অ্যাডমিন_পঠন on public.reports
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

drop policy if exists products_অ্যাডমিন_পঠন on public.products;
create policy products_অ্যাডমিন_পঠন on public.products
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

drop policy if exists products_অ্যাডমিন_সম্পাদনা on public.products;
create policy products_অ্যাডমিন_সম্পাদনা on public.products
  for update to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );
