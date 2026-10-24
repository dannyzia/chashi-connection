<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app, সংরক্ষণ, সারিফ্লাশ, সারিতেযোগ } from '$lib/app-state.svelte';
  import { বীজপোস্ট } from '$lib/data/seed';
  import { সার্ভারফিডআনুন, সার্ভারআইটেমকি, type সার্ভারআইটেম } from '$lib/server-feed';
  import { ফিডব্যান্ডেভাগ, দূরত্ব } from '$lib/logic/feed';
  import { বিভাগতালিকা } from '$lib/data/labels';
  import { bn, বাংলাসংখ্যা } from '$lib/bn';
  // Virtualized feed: max 6 DOM nodes per band (PRD §16.3)

  let নির্বাচিতবিভাগ = $state('');
  let খোঁজশব্দ = $state('');

  onMount(() => {
    // প্রথমবার নমুনা পোস্ট লোড (অফলাইন ক্যাশ)
    if (app.পোস্টসমূহ.length === 0) {
      for (const প of বীজপোস্ট) app.পোস্টসমূহ.push(প);
    }
    সারিফ্লাশ();
    // সার্ভারের পোস্ট পরে যোগ হয় — ফিড আগেই লোকাল ডেটা দিয়ে দেখা যায় (পিআরডি §১৬.১)।
    void সার্ভারযোগ();
  });

  // CHC-T-022 — সার্ভারের পণ্য একই অ্যারেতে হাইড্রেট হয়: সার্ভার আগে, লোকাল পরে।
  // ক্রম এখানে নির্ধারিত হয় না — ফিডব্যান্ডেভাগ পুরো মিলিত সেটের উপর চলে,
  // তাই দূরত্বের ব্যান্ড ও ছবি-ছাড়া-অবনমন (পিআরডি §৯.২, §৮.২) অপরিবর্তিত থাকে।
  // ব্যর্থতা (env নেই / নেট নেই / ত্রুটি) → কিছুই বদলায় না: ফিড ঠিক আজকের মতোই।
  // সফল ফেচে পুরোনো সার্ভার আইটেম সরিয়ে ফেলা হয়, যাতে ডুপ্লিকেট না জমে এবং
  // সার্ভারে মোছা পোস্ট পরেরবার আর না দেখা যায়।
  async function সার্ভারযোগ() {
    const ফল = await সার্ভারফিডআনুন();
    if (!ফল.ok) return;
    const সার্ভারআইডি = new Set(ফল.items.map((আ) => আ.id));
    const লোকাল = app.পোস্টসমূহ.filter((প) => !সার্ভারআইটেমকি(প) && !সার্ভারআইডি.has(প.id));
    if (ফল.items.length === 0 && লোকাল.length === app.পোস্টসমূহ.length) return;
    app.পোস্টসমূহ.splice(0, app.পোস্টসমূহ.length, ...ফল.items, ...লোকাল);
    সংরক্ষণ();
  }

  const আমারস্থান = $derived(
    app.ব্যবহারকারী ? { lat: app.ব্যবহারকারী.lat, lng: app.ব্যবহারকারী.lng } : { lat: 24.630, lng: 89.420 }
  );

  const ব্লকআইডি = $derived(app.ব্যবহারকারী?.ব্লকতালিকা ?? []);

  // CHC-T-034 — ব্লক ব্যক্তিকে ধরে, কেবল একটি বিজ্ঞাপনকে নয়: সার্ভার-পণ্যে
  // বিক্রেতার uuid (বিক্রেতাআইডি) থাকলে সেই এন্ট্রিও মেলে, তাই একজনের ব্লকে তাঁর
  // সব বিজ্ঞাপন ফিড থেকে যায়। লোকাল পোস্টে ক্ষেত্রটি নেই → নাম/আইডি-মিলনই
  // আগের মতো, কোনো আচরণ বদলায় না (ব্যান্ড অ্যালগরিদম এখানে ছোঁয়া হয় না)।
  const দৃশ্যমান = $derived(
    app.পোস্টসমূহ.filter((প) => {
      const বিক্রেতা = (প as সার্ভারআইটেম).বিক্রেতাআইডি;
      return (
        !ব্লকআইডি.includes(প.বিক্রেতানাম) &&
        !ব্লকআইডি.includes(প.id) &&
        !(typeof বিক্রেতা === 'string' && বিক্রেতা.length > 0 && ব্লকআইডি.includes(বিক্রেতা)) &&
        (!নির্বাচিতবিভাগ || প.বিভাগ === নির্বাচিতবিভাগ) &&
        (!খোঁজশব্দ || প.শিরোনাম.includes(খোঁজশব্দ))
      );
    })
  );

  const ব্যান্ডসমূহ = $derived(ফিডব্যান্ডেভাগ(দৃশ্যমান, আমারস্থান));

  // ব্যান্ড শিরোনাম: ব্যান্ড ১ = ০-৫ কিমি ইত্যাদি
  const ব্যান্ডশিরোনাম = (ব: number) => {
    const সীমা = [5, 10, 25, 50, 100];
    if (ব <= সীমা.length) {
      const আগে = ব === 1 ? 0 : সীমা[ব - 2];
      return bn.দূরত্বব্যান্ড(বাংলাসংখ্যা(আগে) + '-' + বাংলাসংখ্যা(সীমা[ব - 1]));
    }
    return bn.দূরত্বব্যান্ড(বাংলাসংখ্যা(100) + '+');
  };
</script>

{#if !app.লগইন}
  {@html ''}
  <div class="card" style="margin: 80px 16px; text-align: center;">
    <h1>{bn.অ্যাপনাম}</h1>
    <p class="bn-হিন্ট">{bn.ট্যাগলাইন}</p>
    <button class="bn-btn" onclick={() => goto('/signup')}>শুরু করুন</button>
  </div>
{:else}
  <header class="bn-শিরোনাম-বার">
    <b>{bn.অ্যাপনাম}</b>
    <span style="margin-left:auto; font-size: 13px;">
      📍 {app.ব্যবহারকারী?.গ্রাম}, {app.ব্যবহারকারী?.জেলা}
    </span>
  </header>

  {#if !app.অনলাইন}
    <div class="bn-ব্যান্ড-শিরোনাম">⚠️ {bn.অফলাইন}</div>
  {/if}

  <div style="padding: 8px 12px; display: flex; gap: 8px; overflow-x: auto; background: #fff;">
    <input
      style="margin: 0; flex: 1; border-bottom: none; background: #F5F5F5; border-radius: 8px;"
      placeholder={bn.খুঁজুন}
      bind:value={খোঁজশব্দ}
    />
  </div>
  <div style="padding: 4px 12px 8px; display: flex; gap: 8px; overflow-x: auto; background: #fff; border-bottom: 1px solid #eee;">
    <button
      style="padding: 6px 14px; border-radius: 16px; font-size: 13px; white-space: nowrap;"
      class={নির্বাচিতবিভাগ === '' ? 'bn-chip-সক্রিয়' : ''}
      onclick={() => (নির্বাচিতবিভাগ = '')}
    >সব</button>
    {#each বিভাগতালিকা as বিভাগ (বিভাগ)}
      <button
        style="padding: 6px 14px; border-radius: 16px; font-size: 13px; white-space: nowrap; background: {নির্বাচিতবিভাগ === বিভাগ ? '#4CAF50' : '#F5F5F5'}; color: {নির্বাচিতবিভাগ === বিভাগ ? '#fff' : '#212121'};"
        onclick={() => (নির্বাচিতবিভাগ = বিভাগ)}
      >{বিভাগ}</button>
    {/each}
  </div>

  {#if দৃশ্যমান.length === 0}
    <div class="card" style="margin: 24px 16px; text-align: center;">
      <p>{bn.ফাঁকাফিড}</p>
    </div>
  {/if}

  {#each ব্যান্ডসমূহ as গোষ্ঠী, i (i)}
    {#if i > 0}<div class="bn-ব্যান্ড-বিভাজক"></div>{/if}
    <div class="bn-ব্যান্ড-শিরোনাম">{ব্যান্ডশিরোনাম(গোষ্ঠী.ব্যান্ড)}</div>
    {#each গোষ্ঠী.আইটেমসমূহ.slice(0, 6) as পোস্ট (পোস্ট.id)}
      <a href="/listing/{পোস্ট.id}" style="text-decoration: none; color: inherit;">
        <div class="card" style="display: flex; gap: 12px; margin: 8px 12px;">
          {#if পোস্ট.ছবি}
            <img src={পোস্ট.ছবি} alt="" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" />
          {:else if পোস্ট.ছবিআছে}
            <div style="width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #8BC34A, #4CAF50); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px;">🌾</div>
          {:else}
            <div style="width: 64px; height: 64px; border-radius: 8px; background: #EEE; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 24px;">🚫</div>
          {/if}
          <div style="flex: 1; min-width: 0;">
            <b>{পোস্ট.শিরোনাম}</b>
            {#if পোস্ট.পোস্টপ্রকার === 'প্রয়োজন'}
              <span style="font-size: 11px; background: #2196F3; color: #fff; padding: 1px 6px; border-radius: 4px; margin-left: 4px;">{bn.জিনিসখুঁজছি}</span>
            {/if}
            {#if !পোস্ট.ছবিআছে}
              <span class="bn-নো-ফটো">{bn.নোফটো}</span>
            {/if}
            <div style="font-size: 13px; color: #666;">
              {পোস্ট.বিক্রেতানাম}{#if পোস্ট.যাচাইকৃত} <span style="color: #4CAF50;">✓{bn.যাচাইকৃত}</span>{/if}
            </div>
            <div style="font-size: 12px; color: #999;">
              {bn.প্রায়(Math.max(1, Math.round(দূরত্ব(আমারস্থান, পোস্ট.স্থান))))}
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="color: #4CAF50; font-weight: bold; font-size: 18px;">
              {#if পোস্ট.পোস্টপ্রকার === 'বিক্রয়'}৳{বাংলাসংখ্যা(পোস্ট.দাম)}/{পোস্ট.একক}{/if}
            </div>
          </div>
        </div>
      </a>
    {/each}
  {/each}
{/if}

<style>
  .bn-chip-সক্রিয় { background: #4CAF50; color: #fff !important; }
</style>
