<script lang="ts">
  import { goto } from '$app/navigation';
  import { app, লগইনকরুন, সারিতেযোগ } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';
  import { বিভাগসমূহ, জেলাতালিকা as জেলাসমূহ, উপজেলাতালিকা as উপজেলাতালিকাসমূহ, ইউনিয়নতালিকা as ইউনিয়নতালিকাসমূহ, জেলাস্থানাঙ্ক } from '$lib/data/locations';
  import { লেবেলতালিকা } from '$lib/data/labels';
  import { hasAuthClient, sendOtp, verifyOtp, প্রোফাইলসংরক্ষণ, getSessionUserId, type ওটিপিফলাফল } from '$lib/auth';
  import type { ব্যবহারকারীঢোকানো } from '$lib/supabase';

  let ধাপ = $state(1); // 1: মোবাইল, 2: ওটিপি, 3: নাম, 4: লেবেল, 5: ঠিকানা
  let মোবাইল = $state('');
  let ওটিপি = $state('');
  let নাম = $state('');
  let লেবেল = $state('');
  let বিভাগ = $state('');
  let জেলা = $state('');
  let উপজেলা = $state('');
  let ইউনিয়ন = $state('');
  let ইউনিয়নঅন্যান্য = $state('');
  let গ্রাম = $state('');
  let ঠিকানাবিস্তারিত = $state('');
  let ত্রুটি = $state('');
  let চলছে = $state(false); // নেটওয়ার্ক-অপেক্ষা: ডাবল ট্যাপ ঠেকায়
  let সেশনআইডি = $state<string | null>(null); // যাচাই সফল হলে auth uid
  // আবার ওটিপি পাঠানোর কুলডাউন (dP Relay expiresAt) — ms টাইমস্ট্যাম্প।
  let কুলডাউনশেষ = $state(0);
  let ঘড়ি = $state(Date.now());

  $effect(() => {
    if (!কুলডাউনশেষ) return;
    const টাইমার = setInterval(() => { ঘড়ি = Date.now(); }, 1000);
    return () => clearInterval(টাইমার);
  });

  const বাকিসেকেন্ড = $derived(কুলডাউনশেষ ? Math.max(0, Math.ceil((কুলডাউনশেষ - ঘড়ি) / 1000)) : 0);

  const মোবাইলভ্যালিড = () => /^01[3-9]\d{8}$/.test(মোবাইল);

  // dP Relay-এর কোডগুলো → বাংলা বার্তা (স্ক্রিনে ইংরেজি কোড কখনো যায় না)
  function ত্রুটিবার্তা(ফল: ওটিপিফলাফল): string {
    if (ফল.error === 'locked') return bn.ত্রুটি_ওটিপিলক(Math.max(1, Math.ceil((ফল.retryAfterSec ?? 60) / 60)));
    if (ফল.error === 'expired') return bn.ত্রুটি_ওটিপিমেয়াদ;
    if (ফল.error === 'cooldown') return bn.ত্রুটি_অনেকঅনুরোধ;
    if (ফল.error === 'invalid-phone') return bn.ত্রুটি_খালিনম্বর;
    return ধাপ === 2 ? bn.ত্রুটি_ওটিপি : bn.ত্রুটি_ওটিপিপাঠানো;
  }

  function কুলডাউনশুরু(ফল: ওটিপিফলাফল) {
    // সার্ভারের মেয়াদ থাকলে সেটাই; নাহলে নিরাপদ ৬০ সেকেন্ড।
    const মেয়াদ = (ফল.expiresAt ?? 0) * 1000;
    কুলডাউনশেষ = মেয়াদ > Date.now() ? মেয়াদ : Date.now() + 60_000;
    ঘড়ি = Date.now();
  }

  async function পরবর্তী() {
    if (চলছে) return;
    ত্রুটি = '';
    if (ধাপ === 1) {
      if (!মোবাইলভ্যালিড()) { ত্রুটি = bn.ত্রুটি_খালিনম্বর; return; }
      // ক্লায়েন্ট নেই (env ছাড়া বিল্ড / CI / অফলাইন) → আগের মতোই ডেমো পথ।
      if (!hasAuthClient()) { ধাপ = 2; return; }
      চলছে = true;
      const ফল = await sendOtp(মোবাইল);
      চলছে = false;
      if (!ফল.ok) { ত্রুটি = ত্রুটিবার্তা(ফল); return; }
      কুলডাউনশুরু(ফল);
      ধাপ = 2;
    } else if (ধাপ === 2) {
      if (!hasAuthClient()) {
        // ডেমো যাচাই — ৪–৬ সংখ্যা, যেকোনোটি (আগে কেবল ৪ ছিল)
        if (!/^\d{4,6}$/.test(ওটিপি)) { ত্রুটি = bn.ত্রুটি_ওটিপি; return; }
        ধাপ = 3;
        return;
      }
      চলছে = true;
      const ফল = await verifyOtp(মোবাইল, ওটিপি);
      চলছে = false;
      if (!ফল.ok) { ত্রুটি = ত্রুটিবার্তা(ফল); return; }
      সেশনআইডি = ফল.user?.id ?? null;
      ধাপ = 3;
    } else if (ধাপ === 3) {
      if (!নাম.trim()) { ত্রুটি = bn.ত্রুটি_খালিনাম; return; }
      ধাপ = 4;
    } else if (ধাপ === 4) {
      if (!লেবেল) { ত্রুটি = 'একটি লেবেল বেছে নিন'; return; }
      ধাপ = 5;
    } else if (ধাপ === 5) {
      const কার্যকরইউনিয়ন = ইউনিয়ন === 'অন্যান্য' ? ইউনিয়নঅন্যান্য.trim() : ইউনিয়ন;
      if (!বিভাগ || !জেলা || !উপজেলা || !কার্যকরইউনিয়ন || !গ্রাম) { ত্রুটি = bn.ত্রুটি_ঠিকানা; return; }
      const স্থানাঙ্ক = জেলাস্থানাঙ্ক(বিভাগ, জেলা);
      // সেশন থাকলে তার uid-ই সারির id — RLS users_যোগ (id = auth.uid()) এটাই চায়।
      const আইডি = সেশনআইডি ?? (hasAuthClient() ? await getSessionUserId() : null);
      const ব্যবহারকারী = {
        id: আইডি ?? undefined,
        নাম,
        মোবাইল,
        লেবেল,
        গ্রাম, // গ্রাম/পাড়া ব্যবহারকারী নিজে লিখবে (PRD §৬)
        ইউনিয়ন: কার্যকরইউনিয়ন,
        উপজেলা,
        জেলা,
        বিভাগনাম: বিভাগ,
        ঠিকানাবিস্তারিত,
        lat: স্থানাঙ্ক.lat,
        lng: স্থানাঙ্ক.lng,
        যাচাইকৃত: false,
        হোয়াটসঅ্যাপ: null,
        ব্লকতালিকা: []
      };
      if (আইডি) {
        // সার্ভারের সারি: স্থানীয় নামগুলো কলামের নামে (ইউনিয়ন → union_name)।
        const সারি: ব্যবহারকারীঢোকানো & { id: string } = {
          id: আইডি,
          phone: মোবাইল,
          name: নাম,
          label: লেবেল,
          division: বিভাগ,
          district: জেলা,
          upazila: উপজেলা,
          union_name: কার্যকরইউনিয়ন,
          village: গ্রাম,
          lat: স্থানাঙ্ক.lat,
          lng: স্থানাঙ্ক.lng,
          detail: ঠিকানাবিস্তারিত.trim() || null,
          whatsapp: null,
          women_safety: false,
          verified: false
        };
        // সাইনআপ নেটওয়ার্কের জন্য দাঁড়ায় না (PRD §১৬.১): অনুরোধ পটভূমিতে যায়;
        // সার্ভারে না পৌঁছালে অফলাইন সারি পরে পাঠাবে।
        void প্রোফাইলসংরক্ষণ(সারি).then((ফল) => {
          if (!ফল.ok && ফল.পথ === 'সারি') সারিতেযোগ('প্রোফাইল', সারি);
        });
      }
      লগইনকরুন(ব্যবহারকারী);
      goto('/');
    }
  }

  // কুলডাউন শেষ হলে আবার পাঠানোর অনুরোধ
  async function আবারপাঠান() {
    if (চলছে || বাকিসেকেন্ড > 0) return;
    ত্রুটি = '';
    চলছে = true;
    const ফল = await sendOtp(মোবাইল);
    চলছে = false;
    if (!ফল.ok) { ত্রুটি = ত্রুটিবার্তা(ফল); return; }
    ওটিপি = '';
    কুলডাউনশুরু(ফল);
  }
</script>

<div style="max-width: 480px; margin: 0 auto; padding: 16px;">
  <h2 style="text-align: center; margin-bottom: 8px;">{bn.অ্যাপনাম}</h2>
  <p style="text-align: center; color: #666; font-size: 14px; margin-bottom: 24px;">{bn.ট্যাগলাইন}</p>

  <!-- প্রগতি বিন্দু -->
  <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 24px;">
    {#each [1, 2, 3, 4, 5] as i}
      <span style="width: 10px; height: 10px; border-radius: 50%; background: {i <= ধাপ ? '#4CAF50' : '#CCC'};"></span>
    {/each}
  </div>

  {#if ধাপ === 1}
    <label class="bn-লেবেল">{bn.মোবাইলশিরোনাম}</label>
    <input type="tel" placeholder={bn.মোবাইলপ্লেসহোল্ডার} bind:value={মোবাইল} />
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী} disabled={চলছে}>{bn.ওটিপিপাঠান}</button>
  {:else if ধাপ === 2}
    <label class="bn-লেবেল">{bn.ওটিপিশিরোনাম}</label>
    <input type="text" inputmode="numeric" maxlength="8" placeholder={bn.ওটিপিপ্লেসহোল্ডার} bind:value={ওটিপি} style="letter-spacing: 8px; text-align: center; font-size: 20px;" />
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী} disabled={চলছে}>{bn.আগেযান}</button>
    {#if hasAuthClient()}
      <!-- পাঠানোর পরে কুলডাউন শেষ না হলে আবার পাঠানো নিষ্ক্রিয় (dP resend_cooldown) -->
      <button class="bn-btn" onclick={আবারপাঠান} disabled={চলছে || বাকিসেকেন্ড > 0} style="margin-top: 8px;">
        {বাকিসেকেন্ড > 0 ? bn.ওটিপিকুলডাউন(বাকিসেকেন্ড) : bn.ওটিপিআবার}
      </button>
    {/if}
  {:else if ধাপ === 3}
    <label class="bn-লেবেল">{bn.নামশিরোনাম}</label>
    <input type="text" placeholder={bn.নামপ্লেসহোল্ডার} bind:value={নাম} />
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী}>{bn.আগেযান}</button>
  {:else if ধাপ === 4}
    <label class="bn-লেবেল">{bn.লেবেলশিরোনাম}</label>
    <p class="bn-হিন্ট">{bn.লেবেলহিন্ট}</p>
    <select bind:value={লেবেল}>
      <option value="">-- বেছে নিন --</option>
      {#each লেবেলতালিকা as ল}
        <option value={ল}>{ল}</option>
      {/each}
    </select>
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী}>{bn.আগেযান}</button>
  {:else if ধাপ === 5}
    <label class="bn-লেবেল">{bn.ঠিকানাশিরোনাম}</label>
    <select bind:value={বিভাগ} onchange={() => { জেলা = ''; উপজেলা = ''; ইউনিয়ন = ''; ইউনিয়নঅন্যান্য = ''; গ্রাম = ''; }}>
      <option value="">{bn.বিভাগ}</option>
      {#each বিভাগসমূহ as বি}
        <option value={বি.নাম}>{বি.নাম}</option>
      {/each}
    </select>
    <select bind:value={জেলা} disabled={!বিভাগ} onchange={() => { উপজেলা = ''; ইউনিয়ন = ''; ইউনিয়নঅন্যান্য = ''; গ্রাম = ''; }}>
      <option value="">{bn.জেলা}</option>
      {#each জেলাসমূহ(বিভাগ) as জে}
        <option value={জে}>{জে}</option>
      {/each}
    </select>
    <select bind:value={উপজেলা} disabled={!জেলা} onchange={() => { ইউনিয়ন = ''; ইউনিয়নঅন্যান্য = ''; গ্রাম = ''; }}>
      <option value="">{bn.উপজেলা}</option>
      {#each উপজেলাতালিকাসমূহ(বিভাগ, জেলা) as উ}
        <option value={উ}>{উ}</option>
      {/each}
    </select>
    <!-- PRD §৬.৭: ইউনিয়ন ড্রপডাউন (locations-unions.ts বান্ডিল) + 'অন্যান্য' হলে ফ্রি টেক্সট; গ্রাম ব্যবহারকারী লিখবে -->
    <select bind:value={ইউনিয়ন} disabled={!উপজেলা}>
      <option value="">{bn.ইউনিয়ন}</option>
      {#each ইউনিয়নতালিকাসমূহ(বিভাগ, জেলা, উপজেলা) as ইউ}
        <option value={ইউ}>{ইউ}</option>
      {/each}
      <option value="অন্যান্য">অন্যান্য (লিখুন)</option>
    </select>
    {#if ইউনিয়ন === 'অন্যান্য'}
      <input type="text" placeholder={bn.ইউনিয়ন + ' (লিখুন)'} bind:value={ইউনিয়নঅন্যান্য} />
    {/if}
    <input type="text" placeholder={bn.গ্রাম + ' / পাড়া (লিখুন)'} bind:value={গ্রাম} />
    <input type="text" placeholder={bn.ঠিকানাপ্লেসহোল্ডার} bind:value={ঠিকানাবিস্তারিত} />
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী}>{bn.স্বাগতম}</button>
  {/if}
</div>
