<script lang="ts">
  // সেটিংস — নোটিফিকেশন অংশ (পিআরডি §১৫.৪, টাস্ক CHC-T-039)।
  //
  // §১৫.৪-এর তিনটি নিয়ম এখানেই রূপ নেয়:
  //   • নতুন পোস্ট ও চ্যাট বার্তা — সবসময় চালু, ইনপুট disabled, লেবেল
  //     "সবসময় চালু — বন্ধ করা যাবে না"। ব্যবহারকারী বন্ধ করতে পারেন না।
  //   • বিপণন — ডিফল্ট বন্ধ (users.marketing_optin default false), ব্যবহারকারী
  //     নিজে চালু করতে পারেন; লেখা যায় কেবল নিজের সারিতে (RLS + ০০০৯-এর
  //     কলাম-অনুমতি)। অফলাইনে/ব্যর্থতায় টগল আগের অবস্থায় ফিরে যায়।
  //   • অ্যাপ কখনো আটকায় না: সেশন না থাকলে বা env না থাকলে পড়া/লেখা হয় না।
  import { onMount } from 'svelte';
  import { bn } from '$lib/bn';
  import { getSupabase } from '$lib/supabase';
  import { getSessionUserId } from '$lib/auth';

  // supabase.ts-এর টাইপ-প্রতিচ্ছবি এই টাস্কের সুযোগের বাইরে; শুধু প্রয়োজনীয় আকৃতি।
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
      বিপণন = data?.marketing_optin === true; // সারি না থাকলে/খালি হলে = বন্ধ
    } catch {
      বিপণন = false; // ডিফল্টই বন্ধ
    }
  });

  async function বিপণনবদল(নতুনমান: boolean) {
    const আগের = বিপণন;
    বিপণন = নতুনমান; // তাৎক্ষণিক প্রতিক্রিয়া
    বার্তা = '';
    if (!uid) {
      বিপণন = আগের;
      return;
    }
    const সার্ভার = getSupabase() as unknown as হালকাসার্ভার | null;
    if (!সার্ভার) {
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
</script>

<h2 class="bn-শিরোনাম">{bn.সেটিংস}</h2>

<div class="card">
  <h4>{bn.নোটিফিকেশন}</h4>
  <p style="font-size: 12px; color: #777;">{bn.নোটিফিকেশনবর্ণনা}</p>

  <!-- সবসময় চালু — disabled ইনপুট, সরানো যায় না (§১৫.৪) -->
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
    <span>{bn.নতুনপোস্ট}</span>
    <label style="display: flex; align-items: center; gap: 8px;">
      <input type="checkbox" checked disabled />
      <span style="font-size: 12px; color: #4CAF50; font-weight: bold;">{bn.সবসময়চালু}</span>
    </label>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
    <span>{bn.চ্যাটবার্তা}</span>
    <label style="display: flex; align-items: center; gap: 8px;">
      <input type="checkbox" checked disabled />
      <span style="font-size: 12px; color: #4CAF50; font-weight: bold;">{bn.সবসময়চালু}</span>
    </label>
  </div>

  <!-- বিপণন — ডিফল্ট বন্ধ, ব্যবহারকারীর নিজের সম্মতি (§১৫.৪) -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-top: 1px solid #eee; margin-top: 8px;">
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
