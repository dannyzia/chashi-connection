-- চাষী কানেকশন — মাইগ্রেশন ০০০০২: কেবল সংযোজন
-- সূত্র: CHC-D-021 — ০০০০১ পর্যালোচনায় চিহ্নিত চারটি ঘাটতির সিদ্ধান্ত।
--
-- ০০০০১ ইতিমধ্যে লাইভ। এই ফাইলে কোনো টেবিল/নীতি/ভিউ মোছা হয় না, কোনো
-- বিদ্যমান অবজেক্ট ধ্বংসাত্মকভাবে বদলানো হয় না — শুধু নতুন জিনিস যোগ হয়।
-- তাই এটি প্রয়োগের পর ০০০০১ অপরিবর্তিত থাকে (মাইগ্রেশন কখনো সম্পাদিত হয় না)।

-- ১) chats — অংশগ্রহণকারীরা নিজেরা আপডেট করতে পারে।
--    এতেই "চ্যাট শেষ" (পিআরডি §১০.২) থেকে ended_at লেখা সম্ভব হয়, যা
--    দুই ঘণ্টা নিষ্ক্রিয়তার পর রেটিং প্রম্পটের একমাত্র দ্বার।
create policy chats_সম্পাদনা_অংশীদার on public.chats
  for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- ২) products — উইশলিস্টের "কবে দরকার" তারিখ (পিআরডি §১১.২)।
--    ঐচ্ছিক: বিক্রয় বিজ্ঞাপনে এটি খালি থাকে।
alter table public.products add column if not exists needed_by date;

-- ৩) public_sellers — কেবল id, name, label, verified।
--    phone বা whatsapp এই ভিউয়ে কখনো আসে না; কলাম-তালিকা এখানেই স্থির।
--    security_invoker = true রাখা হয়েছে যাতে ভিউয়ের ওপর users-এর RLS প্রযোজ্য থাকে:
--    আজ কেবল authenticated সারি দেখে, আর auth পর্যায়ে users-এর SELECT নীতি
--    প্রশস্ত হলে anon-ও ঠিক এই চার কলাম দেখবে। অর্থাৎ ভিউটি সারি-দৃশ্যমানতার
--    নিয়ন্ত্রক নয় — সে RLS-এর কাজ; ভিউটির কাজ কোন কলাম বেরোবে তা গ্যারান্টি দেওয়া।
create or replace view public.public_sellers
  with (security_invoker = true)
  as select id, name, label, verified from public.users;

grant select on public.public_sellers to anon, authenticated;
