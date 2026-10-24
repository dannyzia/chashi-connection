<script lang="ts">
  import { onMount } from 'svelte';
  import { bn } from '$lib/bn';
  import {
    hasAdminRole,
    fetchAllReports,
    fetchProductsAdmin,
    setHidden,
    type প্রশাসকরিপোর্ট,
    type প্রশাসকপণ্য
  } from '$lib/admin';

  // পিআরডি §১২.৪ — অপারেটরের সর্বনিম্ন প্যানেল (CHC-T-028): রিপোর্ট তালিকা
  // ও বিজ্ঞাপন লুকানো/প্রকাশ করা। নেভিতে কোনো লিংক নেই (কেবল URL জেনে ঢোকা
  // যায়) — অপারেটর-সরঞ্জামের নিয়ম।
  //
  // নিরাপত্তা: ভূমিকা আসে সার্ভার থেকে (hasAdminRole)। অনুমতি না থাকলে কোনো
  // অপারেটর-ডেটাই টানা হয় না — কেবল "অ্যাক্সেস নেই" দেখানো হয়। তাই পাতাটি
  // URL ফাঁস হলেও কিছু প্রকাশ করে না।
  //
  // গোপনীয়তা: phone / whatsapp এখানে কখনো দেখানো হয় না (ব্রিফ R3)।

  let অবস্থা = $state<'যাচাই' | 'নেই' | 'প্রস্তুত'>('যাচাই');
  let রিপোর্টতালিকা = $state<প্রশাসকরিপোর্ট[]>([]);
  let পণ্যতালিকা = $state<প্রশাসকপণ্য[]>([]);
  let চলছে = $state<string | null>(null);

  const লক্ষ্যনাম: Record<string, string> = {
    product: 'পণ্য',
    user: 'ব্যবহারকারী',
    message: 'বার্তা'
  };

  const পোস্টধরন: Record<string, string> = {
    sale: 'বিক্রয়',
    wanted: 'প্রয়োজন'
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
   * লুকানো/প্রকাশ টগল। UI সঙ্গে সঙ্গে বদলায় (আশাবাদী), তারপর সার্ভার।
   * ব্যর্থ হলে আগের অবস্থায় ফিরিয়ে তালিকা আবার পড়া হয় — ব্যবহারকারী যেন
   * মিথ্যা সাফল্য না দেখে। কখনো throw করে না।
   */
  async function লুকানোবদল(পণ্য: প্রশাসকপণ্য) {
    const নতুন = !পণ্য.hidden;
    পণ্য.hidden = নতুন;
    চলছে = পণ্য.id;
    const ঠিক = await setHidden(পণ্য.id, নতুন);
    চলছে = null;
    if (!ঠিক) {
      পণ্য.hidden = !নতুন;
      পণ্যতালিকা = await fetchProductsAdmin();
    }
  }

  onMount(async () => {
    // ভূমিকা যাচাই আগে — ব্যর্থ/সেশনহীন হলে এখানেই থামা।
    const অনুমতি = await hasAdminRole();
    if (!অনুমতি) {
      অবস্থা = 'নেই';
      return;
    }
    const [র, প] = await Promise.all([fetchAllReports(), fetchProductsAdmin()]);
    রিপোর্টতালিকা = র;
    পণ্যতালিকা = প;
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
            {#if র.details}
              <p style="font-size: 13px; margin: 4px 0 0;">{র.details}</p>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <div class="card">
      <h4>{bn.সাম্প্রতিকপণ্য}</h4>
      {#if পণ্যতালিকা.length === 0}
        <p class="bn-হিন্ট">{bn.পণ্যনেই}</p>
      {:else}
        {#each পণ্যতালিকা as পণ্য (পণ্য.id)}
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; border-bottom: 1px solid #eee; padding: 8px 0;">
            <div style="min-width: 0;">
              <p style="font-size: 14px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{পণ্য.title}</p>
              <p style="font-size: 12px; color: #999; margin: 2px 0 0;">
                {পোস্টধরন[পণ্য.type] ?? পণ্য.type} · {তারিখ(পণ্য.created_at)}
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
              {পণ্য.hidden ? bn.প্রকাশকরুন : bn.লুকান}
            </button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
