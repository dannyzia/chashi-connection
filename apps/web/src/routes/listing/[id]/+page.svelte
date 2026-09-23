<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app, চ্যাটখুলুন } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';
  import { দূরত্ব } from '$lib/logic/feed';
  import { রিপোর্টশ্রেণী } from '$lib/logic/safety';
  import { বাংলাসংখ্যা } from '$lib/bn';

  const id = $derived(page.params.id as string);
  const পোস্ট = $derived(app.পোস্টসমূহ.find(p => p.id === id));
  const আমারস্থান = $derived(app.ব্যবহারকারী ? { lat: app.ব্যবহারকারী.lat, lng: app.ব্যবহারকারী.lng } : { lat: 24.63, lng: 89.42 });
  const দূরত্বকিমি = $derived(পোস্ট ? Math.max(1, Math.round(দূরত্ব(আমারস্থান, পোস্ট.স্থান))) : 0);

  let রিপোর্টমোড = $state(false);
  let রিপোর্টকারণ = $state('');

  function রিপোর্টপাঠান() {
    if (রিপোর্টকারণ) {
      alert(bn.রিপোর্টধন্যবাদ);
      রিপোর্টমোড = false;
      রিপোর্টকারণ = '';
    }
  }
</script>

{#if !পোস্ট}
  <div class="card" style="margin: 24px 16px; text-align: center;">
    <p>পোস্ট পাওয়া যায়নি</p>
  </div>
{:else}
  <div style="max-width: 480px; margin: 0 auto; padding: 16px; padding-bottom: 140px;">
    <h2>{পোস্ট.শিরোনাম}</h2>
    {#if পোস্ট.পোস্টপ্রকার === 'প্রয়োজন'}
      <span style="font-size: 13px; background: #2196F3; color: #fff; padding: 2px 8px; border-radius: 4px;">{bn.জিনিসখুঁজছি}</span>
    {/if}

    {#if পোস্ট.ছবি}
      <img src={পোস্ট.ছবি} alt="" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin: 16px 0;" />
    {:else if পোস্ট.ছবিআছে}
      <div style="width: 100%; height: 200px; background: linear-gradient(135deg, #8BC34A, #4CAF50); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 48px; margin: 16px 0;">🌾</div>
    {:else}
      <div style="width: 100%; height: 200px; background: #EEE; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 48px; margin: 16px 0;">🚫</div>
      <p style="color: #C62828; font-weight: bold; text-align: center;">{bn.নোফটো}</p>
    {/if}

    <div style="font-size: 28px; color: #4CAF50; font-weight: bold; margin: 8px 0;">
      {#if পোস্ট.পোস্টপ্রকার === 'বিক্রয়'}৳{বাংলাসংখ্যা(পোস্ট.দাম)}/{পোস্ট.একক}{/if}
    </div>
    <div style="font-size: 14px; color: #666;">
      {পোস্ট.পরিমাণ} {পোস্ট.একক} — {পোস্ট.বিভাগ}
    </div>

    <div style="margin-top: 12px; padding: 12px; background: #F5F5F5; border-radius: 8px;">
      <b>{পোস্ট.বিক্রেতানাম}</b>
      {#if পোস্ট.যাচাইকৃত}<span style="color: #4CAF50; margin-left: 4px;">✓ {bn.যাচাইকৃত}</span>{/if}
      <div style="font-size: 13px; color: #666;">{পোস্ট.বিক্রেতালেবেল}</div>
      <div style="font-size: 12px; color: #999;">{bn.প্রায়(দূরত্বকিমি)}</div>
    </div>

    {#if পোস্ট.বর্ণনা}
      <div style="margin-top: 12px; padding: 12px; background: #fff; border: 1px solid #eee; border-radius: 8px;">
        <p>{পোস্ট.বর্ণনা}</p>
      </div>
    {/if}

    <!-- অ্যাকশন বার -->
    <div style="position: fixed; bottom: 70px; left: 0; right: 0; max-width: 480px; margin: 0 auto; display: flex; gap: 8px; padding: 8px 16px; background: #fff; border-top: 1px solid #eee;">
      <button class="bn-btn" style="flex: 2;" onclick={() => { চ্যাটখুলুন(পোস্ট.id, পোস্ট.বিক্রেতানাম, null); goto('/chat/' + পোস্ট.id); }}>{bn.বিক্রেতাকেমেসেজ}</button>
      <button class="bn-btn-হালকা" onclick={() => alert('ফোন নম্বর: ০১৭XXXXXXXXX')} style="flex: 1;">{bn.ফোনকরুন}</button>
      <button class="bn-btn-হালকা" onclick={() => alert('শেয়ার করা হয়েছে')} style="flex: 1;">{bn.শেয়ারকরুন}</button>
      <button class="bn-btn-হালকা" onclick={() => রিপোর্টমোড = true} style="flex: 1;">{bn.রিপোর্টকরুন}</button>
    </div>
  </div>

  {#if রিপোর্টমোড}
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100;">
      <div style="background: #fff; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
        <h3>{bn.রিপোর্টকেন}</h3>
        {#each রিপোর্টশ্রেণী as শ্রেণী}
          <label style="display: block; margin: 8px 0;">
            <input type="radio" bind:group={রিপোর্টকারণ} value={শ্রেণী} /> {শ্রেণী}
          </label>
        {/each}
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="bn-btn" onclick={রিপোর্টপাঠান}>{bn.রিপোর্টপাঠান}</button>
          <button class="bn-btn-হালকা" onclick={() => { রিপোর্টমোড = false; রিপোর্টকারণ = ''; }}>বাতিল</button>
        </div>
      </div>
    </div>
  {/if}
{/if}
