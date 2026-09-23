<script lang="ts">
  import { page } from '$app/state';
  import { app, বার্তাপাঠান } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';

  const id = $derived(page.params.id as string);
  const থ্রেড = $derived(app.চ্যাটসমূহ[id]);

  let বার্তাবিষয় = $state('');
  let রেটিং = $state(0);

  function পাঠান() {
    if (!বার্তাবিষয়.trim() || !থ্রেড) return;
    বার্তাপাঠান(থ্রেড, 'লেখা', বার্তাবিষয়);
    বার্তাবিষয় = '';
  }

  function কুইকরিপ্লাই(টেক্সট: string) {
    if (!থ্রেড) return;
    বার্তাপাঠান(থ্রেড, 'লেখা', টেক্সট);
  }

  function চ্যাটশেষ() {
    if (!থ্রেড) return;
    থ্রেড.শেষহয়েছে = true;
  }

  function রেটিংদেওয়া() {
    if (!থ্রেড) return;
    থ্রেড.রেটিংদেওয়া = true;
  }
</script>

{#if !থ্রেড}
  <div class="card" style="margin: 24px 16px; text-align: center;">
    <p>চ্যাট পাওয়া যায়নি</p>
  </div>
{:else}
  <div style="max-width: 480px; margin: 0 auto; padding: 16px; padding-bottom: 140px;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #eee;">
      <a href="/chat" style="text-decoration: none; color: inherit; font-size: 20px;">←</a>
      <b>{থ্রেড.প্রতিপক্ষনাম}</b>
      <div style="margin-left: auto;">
        <button class="bn-btn-হালকা" style="padding: 6px 12px; font-size: 13px;" onclick={চ্যাটশেষ}>{bn.চ্যাটশেষ}</button>
      </div>
    </div>

    <div style="margin-top: 12px;">
      {#each থ্রেড.বার্তাসমূহ as বার্তা}
        <div style="display: flex; justify-content: {বার্তা.প্রেরক === 'আমি' ? 'flex-end' : 'flex-start'}; margin: 8px 0;">
          <div style="max-width: 75%; padding: 10px 14px; border-radius: 16px; background: {বার্তা.প্রেরক === 'আমি' ? '#DCEDC8' : '#F5F5F5'}; font-size: 15px;">
            {বার্তা.বিষয়বস্তু}
          </div>
        </div>
      {/each}
    </div>

    {#if থ্রেড.শেষহয়েছে && !থ্রেড.রেটিংদেওয়া}
      <div class="card" style="margin-top: 16px; text-align: center;">
        <p>{bn.রেটিংপ্রশ্ন}</p>
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 8px;">
          {#each [1, 2, 3, 4, 5] as s}
            <button onclick={() => { রেটিং = s; রেটিংদেওয়া(); }} style="font-size: 24px; background: none; border: none; color: {রেটিং >= s ? '#FFC107' : '#CCC'};">★</button>
          {/each}
        </div>
      </div>
    {/if}

    {#if থ্রেড.হোয়াটসঅ্যাপ}
      <a href="https://wa.me/{থ্রেড.হোয়াটসঅ্যাপ}" target="_blank" style="display: block; text-align: center; margin-top: 8px;">
        <button class="bn-btn-হালকা">{bn.হোয়াটসঅ্যাপচালান}</button>
      </a>
    {/if}
  </div>

  <!-- কুইক রিপ্লাই -->
  <div style="position: fixed; bottom: 70px; left: 0; right: 0; max-width: 480px; margin: 0 auto; padding: 8px 16px; background: #fff; border-top: 1px solid #eee;">
    <div style="display: flex; gap: 6px; margin-bottom: 8px; overflow-x: auto;">
      <button onclick={() => কুইকরিপ্লাই(bn.কত)} style="padding: 6px 12px; border-radius: 16px; background: #F5F5F5; white-space: nowrap; font-size: 13px;">{bn.কত}</button>
      <button onclick={() => কুইকরিপ্লাই(bn.কোথায়)} style="padding: 6px 12px; border-radius: 16px; background: #F5F5F5; white-space: nowrap; font-size: 13px;">{bn.কোথায়}</button>
      <button onclick={() => কুইকরিপ্লাই(bn.কবে)} style="padding: 6px 12px; border-radius: 16px; background: #F5F5F5; white-space: nowrap; font-size: 13px;">{bn.কবে}</button>
      <button onclick={() => কুইকরিপ্লাই(bn.ঠিকআছে)} style="padding: 6px 12px; border-radius: 16px; background: #F5F5F5; white-space: nowrap; font-size: 13px;">{bn.ঠিকআছে}</button>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick={() => alert('ছবি পাঠানো (ডেমো)')} style="padding: 10px; background: #F5F5F5; border-radius: 50%; font-size: 18px;">📷</button>
      <input type="text" placeholder={bn.বার্তালিখুন} bind:value={বার্তাবিষয়} style="flex: 1; border-radius: 20px; padding: 10px 16px; border: 1px solid #CCC;" />
      <button onclick={পাঠান} style="padding: 10px 16px; background: #4CAF50; color: #fff; border-radius: 20px; font-weight: bold;">{bn.পাঠান}</button>
    </div>
  </div>
{/if}
