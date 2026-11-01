<script lang="ts">
  import { onMount } from 'svelte';
  import { app, লগআউট, ব্যবহারকারীআনব্লক } from '$lib/app-state.svelte';
  import { bn } from '$lib/bn';
  import { লেবেলতালিকা } from '$lib/data/labels';
  import { getSupabase } from '$lib/supabase';
  import { getSessionUserId } from '$lib/auth';

  let নামসম্পাদনা = $state('');
  let লেবেলসম্পাদনা = $state('');
  let এনআইডিআপলোড = $state(false);
  let হোয়াটসঅ্যাপ = $state('');
  let দেখানো = $state(false);

  // CHC-T-040 — বিপণন সম্মতি এখন /settings-এর মতো একই কলাম থেকেই পড়া/লেখা হয়
  // (users.marketing_optin)। আগে এটি কেবল যন্ত্রের লোকাল স্টেট ছিল, তাই
  // প্রোফাইল আর সেটিংস পরস্পরবিরোধী দেখাতে পারত। সার্ভার/সেশন না থাকলে
  // ডিফল্ট বন্ধ, আর ব্যর্থতায় টগল আগের অবস্থায় ফিরে যায়।
  type হালকাসার্ভার = {
    from: (টেবিল: string) => {
      select: (কলাম: string) => {
        eq: (কলাম: string, মান: string) => {
          maybeSingle: () => Promise<{ data: { marketing_optin?: boolean } | null }>;
        };
      };
      update: (মান: Record<string, unknown>) => {
        eq: (কলাম: string, মান: string) => Promise<{ error: { code?: string } | null }>;
      };
    };
  };

  let বিপণন = $state(false);
  let uid = $state<string | null>(null);
  let সেশনআছে = $state(false);
  let ব্যস্ত = $state(false);
  let বার্তা = $state('');

  onMount(async () => {
    uid = await getSessionUserId();
    সেশনআছে = !!uid;
    if (!uid) return;
    const সার্ভার = getSupabase() as unknown as হালকাসার্ভার | null;
    if (!সার্ভার) return;
    try {
      const { data } = await সার্ভার
        .from('users')
        .select('marketing_optin')
        .eq('id', uid)
        .maybeSingle();
      বিপণন = data?.marketing_optin === true;
    } catch {
      বিপণন = false;
    }
  });

  async function বিপণনবদল(নতুনমান: boolean) {
    const আগের = বিপণন;
    বিপণন = নতুনমান;
    বার্তা = '';
    const সার্ভার = getSupabase() as unknown as হালকাসার্ভার | null;
    if (!uid || !সার্ভার) {
      বিপণন = আগের;
      return;
    }
    ব্যস্ত = true;
    try {
      const { error } = await সার্ভার
        .from('users')
        .update({ marketing_optin: নতুনমান })
        .eq('id', uid);
      if (error) {
        বিপণন = আগের;
        বার্তা = bn.সংরক্ষণব্যর্থ;
      } else {
        বার্তা = bn.সংরক্ষিতহয়েছে;
      }
    } catch {
      বিপণন = আগের;
      বার্তা = bn.সংরক্ষণব্যর্থ;
    } finally {
      ব্যস্ত = false;
    }
  }

  function নামপরিবর্তন() {
    if (!app.ব্যবহারকারী) return;
    app.ব্যবহারকারী.নাম = নামসম্পাদনা || app.ব্যবহারকারী.নাম;
    দেখানো = true;
    setTimeout(() => দেখানো = false, 3000);
  }
</script>

<div style="max-width: 480px; margin: 0 auto; padding: 16px;">
  <h2>{bn.প্রোফাইল}</h2>

  {#if !app.ব্যবহারকারী}
    <div class="card" style="text-align: center; padding: 32px;">
      <p>লগইন করা নেই</p>
      <a href="/signup"><button class="bn-btn">শুরু করুন</button></a>
    </div>
  {:else}
    <div class="card" style="text-align: center; padding: 24px;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: #4CAF50; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin: 0 auto;">{app.ব্যবহারকারী.নাম[0]}</div>
      <h3 style="margin: 8px 0 4px;">{app.ব্যবহারকারী.নাম}</h3>
      <p style="font-size: 13px; color: #666;">{app.ব্যবহারকারী.লেবেল}</p>
      <p style="font-size: 12px; color: #999;">{app.ব্যবহারকারী.গ্রাম}, {app.ব্যবহারকারী.জেলা}</p>
      {#if app.ব্যবহারকারী.যাচাইকৃত}
        <span style="color: #4CAF50; font-weight: bold;">✓ {bn.যাচাইকৃত}</span>
      {/if}
    </div>

    <div class="card">
      <h4>{bn.আপনারনাম}</h4>
      <input type="text" bind:value={নামসম্পাদনা} placeholder={app.ব্যবহারকারী.নাম} />
      <button class="bn-btn-হালকা" onclick={নামপরিবর্তন}>পরিবর্তন করুন</button>
      {#if দেখানো}<p style="font-size: 12px; color: #4CAF50;">{bn.ধরনহিন্ট}</p>{/if}
    </div>

    <div class="card">
      <h4>{bn.আপনারধরন}</h4>
      <p class="bn-হিন্ট">{bn.ধরনহিন্ট}</p>
      <select bind:value={লেবেলসম্পাদনা}>
        <option value="">-- বেছে নিন --</option>
        {#each লেবেলতালিকা as ল}
          <option value={ল}>{ল}</option>
        {/each}
      </select>
    </div>

    <div class="card">
      <h4>{bn.এনআইডিযাচাই}</h4>
      <button class="bn-btn-হালকা" onclick={() => এনআইডিআপলোড = !এনআইডিআপলোড}>{bn.এনআইডিআপলোড}</button>
      {#if এনআইডিআপলোড}
        <p style="font-size: 12px; color: #4CAF50;">✓ যাচাইকৃত (ডেমো)</p>
      {/if}
    </div>

    <div class="card">
      <h4>{bn.হোয়াটসঅ্যাপ}</h4>
      <input type="text" placeholder="যেমন: 017XXXXXXXXX" bind:value={হোয়াটসঅ্যাপ} />
      <button class="bn-btn-হালকা" onclick={() => { if (app.ব্যবহারকারী) app.ব্যবহারকারী.হোয়াটসঅ্যাপ = হোয়াটসঅ্যাপ || null; }}>{bn.হোয়াটসঅ্যাপযোগ}</button>
    </div>

    <div class="card">
      <h4>{bn.নোটিফিকেশন}</h4>
      <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span>{bn.নতুনপোস্ট}</span>
        <span style="color: #4CAF50; font-weight: bold;">{bn.সর্বদাসচালু}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span>{bn.চ্যাটবার্তা}</span>
        <span style="color: #4CAF50; font-weight: bold;">{bn.সর্বদাসচালু}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; align-items: flex-start; border-top: 1px solid #eee; margin-top: 8px;">
        <span>
          {bn.বিপণন}
          <span style="display: block; font-size: 12px; color: #777;">{bn.বিপণনবর্ণনা}</span>
        </span>
        <input
          type="checkbox"
          bind:checked={বিপণন}
          disabled={!সেশনআছে || ব্যস্ত}
          onchange={() => বিপণনবদল(বিপণন)}
        />
      </div>
      {#if বার্তা}
        <p style="font-size: 12px; color: #4CAF50;">{বার্তা}</p>
      {/if}
    </div>

    <div class="card">
      <h4>{bn.ব্লকতালিকা}</h4>
      {#if app.ব্যবহারকারী?.ব্লকতালিকা.length === 0}
        <p style="font-size: 13px; color: #999;">{bn.কেউব্লকনেই}</p>
      {:else}
        {#each app.ব্যবহারকারী.ব্লকতালিকা as id}
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span>{id}</span>
            <button class="bn-btn-হালকা" style="padding: 4px 8px; font-size: 12px;" onclick={() => ব্যবহারকারীআনব্লক(id)}>{bn.আনব্লক}</button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="card">
      <h4>{bn.মহিলানিরাপত্তা}</h4>
      <label style="display: flex; gap: 8px; align-items: center;">
        <input type="checkbox" />
        <span>থানায় দেখা করুন</span>
      </label>
    </div>

    <button class="bn-btn" style="background: #C62828;" onclick={লগআউট}>{bn.লগআউট}</button>
  {/if}
</div>
