<script lang="ts">
  import { goto } from '$app/navigation';
  import { app, লগইনকরুন } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';
  import { স্থানগাছ } from '$lib/data/locations';
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
      if (!বিভাগ || !জেলা || !উপজেলা || !ইউনিয়ন || !গ্রাম) { ত্রুটি = bn.ত্রুটি_ঠিকানা; return; }
      const গ্রামতথ্য = ইউনিয়নসমূহ(ইউনিয়ন)?.গ্রামসমূহ?.find(g => g.নাম === গ্রাম);
      const ব্যবহারকারী = {
        নাম,
        মোবাইল,
        লেবেল,
        গ্রাম,
        ইউনিয়ন,
        উপজেলা,
        জেলা,
        বিভাগনাম: বিভাগ,
        ঠিকানাবিস্তারিত,
        lat: গ্রামতথ্য?.lat ?? 24.63,
        lng: গ্রামতথ্য?.lng ?? 89.42,
        যাচাইকৃত: false,
        হোয়াটসঅ্যাপ: null,
        ব্লকতালিকা: []
      };
      লগইনকরুন(ব্যবহারকারী);
      goto('/');
    }
  }

  function ইউনিয়নসমূহ(ইউনিয়নেরনাম: string) {
    for (const বিভাগ of স্থানগাছ) {
      if (বিভাগ.নাম === বিভাগ) {
        for (const জেলা of বিভাগ.জেলাসমূহ) {
          if (জেলা.নাম === জেলা) {
            for (const উপজেলা of জেলা.উপজেলাসমূহ) {
              if (উপজেলা.নাম === উপজেলা) {
                return উপজেলা.ইউনিয়নসমূহ.find(u => u.নাম === ইউনিয়নেরনাম);
              }
            }
          }
        }
      }
    }
    return null;
  }

  const জেলাতালিকা = $derived(
    বিভাগ ? স্থানগাছ.find(d => d.নাম === বিভাগ)?.জেলাসমূহ.map(j => j.নাম) ?? [] : []
  );
  const উপজেলাতালিকা = $derived(
    (বিভাগ && জেলা) ? স্থানগাছ.find(d => d.নাম === বিভাগ)?.জেলাসমূহ.find(j => j.নাম === জেলা)?.উপজেলাসমূহ.map(u => u.নাম) ?? [] : []
  );
  const ইউনিয়নতালিকা = $derived(
    (বিভাগ && জেলা && উপজেলা) ? স্থানগাছ.find(d => d.নাম === বিভাগ)?.জেলাসমূহ.find(j => j.নাম === জেলা)?.উপজেলাসমূহ.find(u => u.নাম === উপজেলা)?.ইউনিয়নসমূহ.map(u => u.নাম) ?? [] : []
  );
  const গ্রামতালিকা = $derived(
    (বিভাগ && জেলা && উপজেলা && ইউনিয়ন) ? স্থানগাছ.find(d => d.নাম === বিভাগ)?.জেলাসমূহ.find(j => j.নাম === জেলা)?.উপজেলাসমূহ.find(u => u.নাম === উপজেলা)?.ইউনিয়নসমূহ.find(u => u.নাম === ইউনিয়ন)?.গ্রামসমূহ.map(g => g.নাম) ?? [] : []
  );
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
    <select bind:value={বিভাগ} onchange={() => { জেলা = ''; উপজেলা = ''; ইউনিয়ন = ''; গ্রাম = ''; }}>
      <option value="">{bn.বিভাগ}</option>
      {#each স্থানগাছ as d}
        <option value={d.নাম}>{d.নাম}</option>
      {/each}
    </select>
    <select bind:value={জেলা} disabled={!বিভাগ} onchange={() => { উপজেলা = ''; ইউনিয়ন = ''; গ্রাম = ''; }}>
      <option value="">{bn.জেলা}</option>
      {#each জেলাতালিকা as j}
        <option value={j}>{j}</option>
      {/each}
    </select>
    <select bind:value={উপজেলা} disabled={!জেলা} onchange={() => { ইউনিয়ন = ''; গ্রাম = ''; }}>
      <option value="">{bn.উপজেলা}</option>
      {#each উপজেলাতালিকা as u}
        <option value={u}>{u}</option>
      {/each}
    </select>
    <select bind:value={ইউনিয়ন} disabled={!উপজেলা} onchange={() => { গ্রাম = ''; }}>
      <option value="">{bn.ইউনিয়ন}</option>
      {#each ইউনিয়নতালিকা as u}
        <option value={u}>{u}</option>
      {/each}
    </select>
    <select bind:value={গ্রাম} disabled={!ইউনিয়ন}>
      <option value="">{bn.গ্রাম}</option>
      {#each গ্রামতালিকা as g}
        <option value={g}>{g}</option>
      {/each}
    </select>
    <input type="text" placeholder={bn.ঠিকানাপ্লেসহোল্ডার} bind:value={ঠিকানাবিস্তারিত} />
    {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
    <button class="bn-btn" onclick={পরবর্তী}>{bn.স্বাগতম}</button>
  {/if}
</div>
