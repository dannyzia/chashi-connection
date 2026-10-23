<script lang="ts">
  import { goto } from '$app/navigation';
  import { app, লগইনকরুন } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';
  import { বিভাগসমূহ, জেলাতালিকা as জেলাসমূহ, উপজেলাতালিকা as উপজেলাতালিকাসমূহ, ইউনিয়নতালিকা as ইউনিয়নতালিকাসমূহ, জেলাস্থানাঙ্ক } from '$lib/data/locations';
  import { লেবেলতালিকা } from '$lib/data/labels';

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

  const মোবাইলভ্যালিড = () => /^01[3-9]\d{8}$/.test(মোবাইল);

  function পরবর্তী() {
    ত্রুটি = '';
    if (ধাপ === 1) {
      if (!মোবাইলভ্যালিড()) { ত্রুটি = bn.ত্রুটি_খালিনম্বর; return; }
      ধাপ = 2;
    } else if (ধাপ === 2) {
      if (ওটিপি.length !== 4) { ত্রুটি = bn.ত্রুটি_ওটিপি; return; }
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
      const ব্যবহারকারী = {
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
      লগইনকরুন(ব্যবহারকারী);
      goto('/');
    }
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
    <button class="bn-btn" onclick={পরবর্তী}>{bn.ওটিপিপাঠান}</button>
  {:else if ধাপ === 2}
    <label class="bn-লেবেল">{bn.ওটিপিশিরোনাম}</label>
    <input type="text" inputmode="numeric" maxlength="4" placeholder={bn.ওটিপিপ্লেসহোল্ডার} bind:value={ওটিপি} style="letter-spacing: 8px; text-align: center; font-size: 20px;" />
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী}>{bn.আগেযান}</button>
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
