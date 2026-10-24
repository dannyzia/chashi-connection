<script lang="ts">
  import { goto } from '$app/navigation';
  import { app, পোস্টযোগ, পোস্টসংরক্ষণ } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';
  import { বিভাগতালিকা } from '$lib/data/labels';
  import { এককতালিকা, ডিফল্টএকক } from '$lib/data/units';
  import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

  let প্রকার = $state<'বিক্রয়' | 'প্রয়োজন'>('বিক্রয়');
  let ছবিআছে = $state(false);
  let ছবিরডেটা = $state('');
  let শিরোনাম = $state('');
  let দাম = $state('');
  let পরিমাণ = $state('');
  let একক = $state('কেজি');
  let বিভাগ = $state('');
  let বর্ণনা = $state('');
  let দরকষাকষি = $state(false);
  let পিকআপ = $state('');
  let বাজেট = $state('');
  let কবেপ্রয়োজন = $state('');
  let কোথাথেকে = $state('');
  let কোথাযাবে = $state('');
  let আরোতথ্য = $state(false);
  let ত্রুটি = $state('');

  async function স্ক্যানকরুন() {
    try {
      const ছবি = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024
      });
      if (ছবি?.dataUrl) {
        ছবিরডেটা = await থাম্বনেইলবানাও(ছবি.dataUrl);
        ছবিআছে = true;
        console.log('[Camera] ছবি তোলা সফল');
      }
    } catch (e) {
      console.warn('[Camera] ছবি তুলতে ব্যর্থ:', e);
    }
  }

  // থাম্বনেইল: ২৫৬px JPEG — localStorage কোটা রক্ষা করে (PRD §16.1 অফলাইন ক্যাশ)
  function থাম্বনেইলবানাও(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const সর্বোচ্চ = 256;
        const মাপ = Math.min(1, সর্বোচ্চ / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * মাপ);
        canvas.height = Math.round(img.height * মাপ);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function পোস্টকরুন() {
    ত্রুটি = '';
    if (!শিরোনাম.trim()) { ত্রুটি = 'শিরোনাম দিন'; return; }
    if (প্রকার === 'বিক্রয়') {
      if (!দাম || isNaN(Number(দাম))) { ত্রুটি = bn.ত্রুটি_দাম; return; }
      if (!পরিমাণ || isNaN(Number(পরিমাণ))) { ত্রুটি = bn.ত্রুটি_পরিমাণ; return; }
    }
    const আইটেম = {
      id: 'p-' + Date.now(),
      শিরোনাম: (প্রকার === 'প্রয়োজন' ? 'জিনিস খুঁজছি: ' : '') + শিরোনাম,
      দাম: প্রকার === 'বিক্রয়' ? Number(দাম) : 0,
      একক: প্রকার === 'বিক্রয়' ? একক : '',
      পরিমাণ: প্রকার === 'বিক্রয়' ? Number(পরিমাণ) : 0,
      বিভাগ: বিভাগ || 'অন্যান্য',
      ছবিআছে,
      ছবি: ছবিরডেটা || undefined,
      সৃষ্টিসময়: Date.now(),
      বিক্রেতানাম: app.ব্যবহারকারী?.নাম ?? 'অজানা',
      বিক্রেতালেবেল: app.ব্যবহারকারী?.লেবেল ?? 'অন্যান্য',
      যাচাইকৃত: app.ব্যবহারকারী?.যাচাইকৃত ?? false,
      স্থান: app.ব্যবহারকারী ? { lat: app.ব্যবহারকারী.lat, lng: app.ব্যবহারকারী.lng } : { lat: 24.63, lng: 89.42 },
      পোস্টপ্রকার: প্রকার
    };
    পোস্টযোগ(আইটেম);
    // CHC-T-023 — সেশন থাকলে সার্ভারে যায়, নাহলে (বা ব্যর্থতায়) সারিতে;
    // UI অপেক্ষা করে না — অফলাইন-প্রথম অপরিবর্তিত।
    void পোস্টসংরক্ষণ(আইটেম, {
      বর্ণনা: বর্ণনা.trim() || undefined,
      দরকষাকষি: প্রকার === 'বিক্রয়' ? দরকষাকষি : false
    });
    goto('/');
  }
</script>

<div style="max-width: 480px; margin: 0 auto; padding: 16px;">
  <h2 style="text-align: center;">{প্রকার === 'বিক্রয়' ? bn.কিছুবিক্রি : bn.জিনিসখুঁজছি}</h2>

  <div style="display: flex; gap: 8px; margin-bottom: 16px;">
    <button style="flex: 1; padding: 10px; border-radius: 8px; background: {প্রকার === 'বিক্রয়' ? '#4CAF50' : '#F5F5F5'}; color: {প্রকার === 'বিক্রয়' ? '#fff' : '#212121'};" onclick={() => প্রকার = 'বিক্রয়'}>{bn.কিছুবিক্রি}</button>
    <button style="flex: 1; padding: 10px; border-radius: 8px; background: {প্রকার === 'প্রয়োজন' ? '#2196F3' : '#F5F5F5'}; color: {প্রকার === 'প্রয়োজন' ? '#fff' : '#212121'};" onclick={() => প্রকার = 'প্রয়োজন'}>{bn.জিনিসখুঁজছি}</button>
  </div>

  <!-- ছবি -->
  <div style="margin-bottom: 16px;">
    <label class="bn-লেবেল">{bn.ছবিতুলুন}</label>
    <button class="bn-btn-হালকা" onclick={স্ক্যানকরুন} style="margin-top: 8px;">
      📷 {bn.ছবিতুলুন}
    </button>
    <button class="bn-btn-হালকা" onclick={() => ছবিআছে = !ছবিআছে} style="margin-top: 8px; margin-left: 8px;">
      {bn.ছবিছাড়া}
    </button>
    {#if !ছবিআছে}
      <p style="font-size: 12px; color: #C62828; margin-top: 4px;">{bn.নোফটো} — {bn.ফাঁকাফিড}</p>
    {/if}
  </div>

  <label class="bn-লেবেল">{প্রকার === 'বিক্রয়' ? bn.পণ্যেরনাম : 'পণ্যের নাম'}</label>
  <input type="text" placeholder={প্রকার === 'বিক্রয়' ? 'যেমন: মোটা ধান' : 'যেমন: মাছের খাদ্য'} bind:value={শিরোনাম} />

  {#if প্রকার === 'বিক্রয়'}
    <label class="bn-লেবেল">{bn.দাম}</label>
    <input type="number" placeholder="যেমন: ৩৫" bind:value={দাম} />

    <label class="bn-লেবেল">{bn.পরিমাণ}</label>
    <div style="display: flex; gap: 8px;">
      <input type="number" placeholder="যেমন: ২০০" bind:value={পরিমাণ} style="flex: 2;" />
      <select bind:value={একক} style="flex: 1;">
        {#each এককতালিকা as e}
          <option value={e}>{e}</option>
        {/each}
      </select>
    </div>

    <label class="bn-লেবেল">বিভাগ</label>
    <select bind:value={বিভাগ}>
      <option value="">-- বিভাগ --</option>
      {#each বিভাগতালিকা as d}
        <option value={d}>{d}</option>
      {/each}
    </select>
  {:else}
    <label class="bn-লেবেল">{bn.কবেপ্রয়োজন}</label>
    <input type="date" bind:value={কবেপ্রয়োজন} />

    <label class="bn-লেবেল">{bn.বাজেট}</label>
    <input type="number" placeholder="ঐচ্ছিক" bind:value={বাজেট} />
  {/if}

  <!-- ভাঁজযোগ্য -->
  <button class="bn-btn-হালকা" onclick={() => আরোতথ্য = !আরোতথ্য} style="margin-top: 16px;">
    {আরোতথ্য ? '[-]' : '[+]'} {bn.আরোতথ্য}
  </button>

  {#if আরোতথ্য}
    <label class="bn-লেবেল">{bn.বর্ণনা}</label>
    <textarea rows="3" placeholder={bn.বর্ণনা} bind:value={বর্ণনা}></textarea>

    {#if প্রকার === 'বিক্রয়'}
      <label class="bn-লেবেল">{bn.দরকষাকষি}</label>
      <label style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
        <input type="checkbox" bind:checked={দরকষাকষি} />
        <span>{bn.হ্যাঁনা.হ্যাঁ}</span>
      </label>

      <label class="bn-লেবেল">{bn.পিকআপ}</label>
      <input type="text" placeholder={app.ব্যবহারকারী?.গ্রাম ?? 'আপনার গ্রাম'} bind:value={পিকআপ} />
    {:else}
      <label class="bn-লেবেল">{bn['কোথা থেকে']}</label>
      <input type="text" placeholder="যেমন: আলাহদীপুর" bind:value={কোথাথেকে} />
      <label class="bn-লেবেল">{bn['কোথায়যাবে']}</label>
      <input type="text" placeholder="যেমন: বগুড়া" bind:value={কোথাযাবে} />
    {/if}
  {/if}

  {#if ত্রুটি}<p class="bn-ত্রুটি">{ত্রুটি}</p>{/if}
  <button class="bn-btn" onclick={পোস্টকরুন}>{bn.পোস্টকরুন}</button>
</div>
