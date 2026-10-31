<script lang="ts">
  import { onMount } from 'svelte';
  import { bn } from '$lib/bn';
  import { getSessionUserId } from '$lib/auth';
  import {
    hasAdminRole,
    fetchAllReports,
    fetchProductsAdmin,
    fetchAuditLog,
    fetchAllUsers,
    fetchReportCounts,
    setHidden,
    setUserVerified,
    type প্রশাসকরিপোর্ট,
    type প্রশাসকপণ্য,
    type প্রশাসককর্ম,
    type প্রশাসকব্যবহারকারী
  } from '$lib/admin';

  // পিআরডি §১২.৪ / §১২.৩ — অপারেটরের প্যানেল, স্তর ২ (CHC-T-035): চারটি বিভাগ —
  // রিপোর্ট তালিকা, পণ্য তালিকা (রিপোর্ট-সংখ্যা + স্বয়ংক্রিয়-লুকানো ব্যাজ +
  // এক-ক্লিকে প্রকাশ), অডিট লগ, ব্যবহারকারী তালিকা (যাচাই টগল)। নেভিতে কোনো
  // লিংক নেই (কেবল URL জেনে ঢোকা যায়) — অপারেটর-সরঞ্জামের নিয়ম।
  //
  // নিরাপত্তা: ভূমিকা আসে সার্ভার থেকে (hasAdminRole)। অনুমতি না থাকলে কোনো
  // অপারেটর-ডেটাই টানা হয় না — কেবল "অ্যাক্সেস নেই" দেখানো হয়। চারটি তালিকার
  // সবগুলো নিজ নিজ নীতিতে fail-closed: অ-অ্যাডমিনের ফল শূন্য, ত্রুটি নয়।
  //
  // নিজের সারি: নিজের যাচাই টগল নিষ্ক্রিয় — অপারেটর নিজেকে "যাচাইকৃত" বা
  // "অযাচাইকৃত" করতে পারে না (নিজের হিসাব নিজে বদলানো নয়)।

  let অবস্থা = $state<'যাচাই' | 'নেই' | 'প্রস্তুত'>('যাচাই');
  let রিপোর্টতালিকা = $state<প্রশাসকরিপোর্ট[]>([]);
  let পণ্যতালিকা = $state<প্রশাসকপণ্য[]>([]);
  let কর্মতালিকা = $state<প্রশাসককর্ম[]>([]);
  let ব্যবহারকারীতালিকা = $state<প্রশাসকব্যবহারকারী[]>([]);
  let রিপোর্টগণনা = $state(new Map<string, number>());
  let নিজেরআইডি = $state<string | null>(null);
  let চলছে = $state<string | null>(null);
  let যাচাইচলছে = $state<string | null>(null);

  const লক্ষ্যনাম: Record<string, string> = {
    product: 'পণ্য',
    user: 'ব্যবহারকারী',
    message: 'বার্তা'
  };

  const পোস্টধরন: Record<string, string> = {
    sale: 'বিক্রয়',
    wanted: 'প্রয়োজন'
  };

  // লগের action মান ডাটাবেসে ইংরেজি (hide/unhide) — UI-তে বাংলায় দেখানো হয়।
  // অজানা মান হলে নিরপেক্ষ ড্যাশ, কখনো কাঁচা ইংরেজি নয়।
  const কর্মঅর্থ: Record<string, string> = {
    hide: bn.লুকানো,
    unhide: bn.প্রকাশিত
  };

  function তারিখ(আইএসও: string): string {
    const সময় = Date.parse(আইএসও);
    if (!Number.isFinite(সময়)) return '';
    try {
      return new Date(সময়).toLocaleDateString('bn-BD');
    } catch {
      return '';
    }
  }

  /**
   * পিআরডি §১২.৪-এর কিউ-ক্রম: রিপোর্ট-সংখ্যা বেশি আগে, সমান হলে নতুন আগে।
   * ক্লায়েন্টে সাজানো হয় কারণ সংখ্যা ও তালিকা দুটোই আলাদা প্রশ্নে আসে —
   * কোনো ক্রমই বসে না, তাই কোনো পক্ষপাতও নেই।
   */
  const সারিবদ্ধপণ্য = $derived(
    [...পণ্যতালিকা].sort((ক, খ) => {
      const কসংখ্যা = রিপোর্টগণনা.get(ক.id) ?? 0;
      const খসংখ্যা = রিপোর্টগণনা.get(খ.id) ?? 0;
      if (কসংখ্যা !== খসংখ্যা) return খসংখ্যা - কসংখ্যা;
      return Date.parse(খ.created_at) - Date.parse(ক.created_at);
    })
  );

  /**
   * লুকানো/প্রকাশ টগল। UI সঙ্গে সঙ্গে বদলায় (আশাবাদী), তারপর সার্ভার।
   * ব্যর্থ হলে আগের অবস্থায় ফিরিয়ে তালিকা আবার পড়া হয় — ব্যবহারকারী যেন
   * মিথ্যা সাফল্য না দেখে। কখনো throw করে না।
   */
  async function লুকানোবদল(পণ্য: প্রশাসকপণ্য) {
    const আগে_লুকানো = পণ্য.hidden;
    const আগে_স্বয়ংক্রিয় = পণ্য.auto_hidden_at;
    const নতুন = !(পণ্য.hidden || পণ্য.auto_hidden_at);
    পণ্য.hidden = নতুন;
    if (!নতুন) পণ্য.auto_hidden_at = null;
    চলছে = পণ্য.id;
    const ঠিক = await setHidden(পণ্য.id, নতুন);
    চলছে = null;
    if (!ঠিক) {
      পণ্য.hidden = আগে_লুকানো;
      পণ্য.auto_hidden_at = আগে_স্বয়ংক্রিয়;
      পণ্যতালিকা = await fetchProductsAdmin();
    }
  }

  /** যাচাই টগল (০০০৭ RPC)। ব্যর্থ হলে ব্যাজ আগের অবস্থায় — নীরব মিথ্যা নয়। */
  async function যাচাইবদল(ব্যবহারকারী: প্রশাসকব্যবহারকারী) {
    const নতুন = !ব্যবহারকারী.verified;
    ব্যবহারকারী.verified = নতুন;
    যাচাইচলছে = ব্যবহারকারী.id;
    const ফল = await setUserVerified(ব্যবহারকারী.id, নতুন);
    যাচাইচলছে = null;
    if (!ফল.ok) ব্যবহারকারী.verified = !নতুন;
  }

  onMount(async () => {
    // ভূমিকা যাচাই আগে — ব্যর্থ/সেশনহীন হলে এখানেই থামা।
    const অনুমতি = await hasAdminRole();
    if (!অনুমতি) {
      অবস্থা = 'নেই';
      return;
    }
    নিজেরআইডি = await getSessionUserId();
    const [র, প, ক, ব, গণনা] = await Promise.all([
      fetchAllReports(),
      fetchProductsAdmin(),
      fetchAuditLog(),
      fetchAllUsers(),
      fetchReportCounts()
    ]);
    রিপোর্টতালিকা = র;
    পণ্যতালিকা = প;
    কর্মতালিকা = ক;
    ব্যবহারকারীতালিকা = ব;
    রিপোর্টগণনা = গণনা;
    অবস্থা = 'প্রস্তুত';
  });
</script>

<div style="max-width: 480px; margin: 0 auto; padding: 16px;">
  <h2>{bn.অপারেটরপ্যানেল}</h2>

  {#if অবস্থা === 'যাচাই'}
    <div class="card">
      <p class="bn-হিন্ট">{bn.অপেক্ষাকরুন}</p>
    </div>
  {:else if অবস্থা === 'নেই'}
    <div class="card" style="text-align: center; padding: 32px;">
      <h3 style="margin: 0 0 8px;">{bn.অ্যাক্সেসনেই}</h3>
      <p class="bn-হিন্ট">{bn.অ্যাক্সেসনেইবিবরণ}</p>
    </div>
  {:else}
    <div class="card">
      <h4>{bn.রিপোর্টতালিকা}</h4>
      {#if রিপোর্টতালিকা.length === 0}
        <p class="bn-হিন্ট">{bn.রিপোর্টনেই}</p>
      {:else}
        {#each রিপোর্টতালিকা as র (র.id)}
          <div style="border-bottom: 1px solid #eee; padding: 8px 0;">
            <div style="display: flex; justify-content: space-between; gap: 8px;">
              <strong style="font-size: 14px;">{র.category}</strong>
              <span style="font-size: 12px; color: #999;">{তারিখ(র.created_at)}</span>
            </div>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0;">
              {bn.লক্ষ্য}: {লক্ষ্যনাম[র.target_type] ?? র.target_type}
            </p>
            <p style="font-size: 11px; color: #999; margin: 2px 0 0; word-break: break-all;">{র.target_id}</p>
            {#if র.details}
              <p style="font-size: 13px; margin: 4px 0 0;">{র.details}</p>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <div class="card">
      <h4>{bn.পণ্যতালিকা}</h4>
      {#if সারিবদ্ধপণ্য.length === 0}
        <p class="bn-হিন্ট">{bn.পণ্যনেই}</p>
      {:else}
        {#each সারিবদ্ধপণ্য as পণ্য (পণ্য.id)}
          {@const সংখ্যা = রিপোর্টগণনা.get(পণ্য.id) ?? 0}
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; border-bottom: 1px solid #eee; padding: 8px 0;">
            <div style="min-width: 0;">
              <p style="font-size: 14px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{পণ্য.title}</p>
              <p style="font-size: 12px; color: #999; margin: 2px 0 0;">
                {পোস্টধরন[পণ্য.type] ?? পণ্য.type} · {তারিখ(পণ্য.created_at)}
                {#if সংখ্যা > 0}
                  · <span style="color: #37474F; font-weight: bold;">{bn.রিপোর্টসংখ্যা(সংখ্যা)}</span>
                {/if}
                {#if পণ্য.auto_hidden_at}
                  · <span style="color: #C62828; font-weight: bold;">{bn.স্বয়ংক্রিয়লুকানো}</span>
                {/if}
                {#if পণ্য.hidden}
                  · <span style="color: #C62828; font-weight: bold;">{bn.লুকানো}</span>
                {/if}
              </p>
            </div>
            <button
              class="bn-btn-হালকা"
              style="padding: 4px 8px; font-size: 12px; white-space: nowrap;"
              disabled={চলছে === পণ্য.id}
              onclick={() => লুকানোবদল(পণ্য)}
            >
              {পণ্য.hidden || পণ্য.auto_hidden_at ? bn.প্রকাশকরুন : bn.লুকান}
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="card">
      <h4>{bn.অডিটলগ}</h4>
      {#if কর্মতালিকা.length === 0}
        <p class="bn-হিন্ট">{bn.কর্মনেই}</p>
      {:else}
        {#each কর্মতালিকা as কর্ম (কর্ম.id)}
          <div style="border-bottom: 1px solid #eee; padding: 8px 0;">
            <div style="display: flex; justify-content: space-between; gap: 8px;">
              <strong style="font-size: 14px;">{কর্মঅর্থ[কর্ম.action] ?? '—'}</strong>
              <span style="font-size: 12px; color: #999;">{তারিখ(কর্ম.created_at)}</span>
            </div>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0;">
              {bn.লক্ষ্য}: {লক্ষ্যনাম[কর্ম.target_type] ?? কর্ম.target_type}
            </p>
            <p style="font-size: 11px; color: #999; margin: 2px 0 0; word-break: break-all;">{কর্ম.target_id ?? ''} · {কর্ম.actor}</p>
          </div>
        {/each}
      {/if}
    </div>

    <div class="card">
      <h4>{bn.ব্যবহারকারীতালিকা}</h4>
      {#if ব্যবহারকারীতালিকা.length === 0}
        <p class="bn-হিন্ট">{bn.ব্যবহারকারীনেই}</p>
      {:else}
        {#each ব্যবহারকারীতালিকা as ব্যবহারকারী (ব্যবহারকারী.id)}
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; border-bottom: 1px solid #eee; padding: 8px 0;">
            <div style="min-width: 0;">
              <p style="font-size: 14px; margin: 0;">{ব্যবহারকারী.name} · {ব্যবহারকারী.label}</p>
              <p style="font-size: 12px; color: #999; margin: 2px 0 0; word-break: break-all;">
                {ব্যবহারকারী.phone} · {ব্যবহারকারী.role === 'admin' ? bn.অপারেটরশব্দ : bn.সাধারণব্যবহারকারী}
                {#if ব্যবহারকারী.verified}
                  · <span style="color: #2E7D32; font-weight: bold;">{bn.যাচাইকৃত}</span>
                {/if}
              </p>
              {#if ব্যবহারকারী.id === নিজেরআইডি}
                <p class="bn-হিন্ট" style="margin: 2px 0 0;">{bn.নিজেরসারি}</p>
              {/if}
            </div>
            <button
              class="bn-btn-হালকা"
              style="padding: 4px 8px; font-size: 12px; white-space: nowrap;"
              disabled={যাচাইচলছে === ব্যবহারকারী.id || ব্যবহারকারী.id === নিজেরআইডি}
              onclick={() => যাচাইবদল(ব্যবহারকারী)}
            >
              {ব্যবহারকারী.verified ? bn.যাচাইবাতিল : bn.যাচাইকরুন}
            </button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
