<script lang="ts">
  import { onMount } from 'svelte';
  import { app, সারিফ্লাশ } from '$lib/app-state.svelte';
  import { সার্ভারচ্যাটযোগ } from '$lib/server-chats';
  import { bn } from '$lib/bn';

  // CHC-T-024 — সার্ভারের থ্রেড পরে যোগ হয়; তালিকা আগেই লোকাল ডেটা দিয়ে দেখা যায়
  // (পিআরডি §১৬.১)। ব্যর্থ/সেশনহীন হলে কিছুই বদলায় না, কোনো স্পিনার নেই।
  // CHC-T-026 — সারি আগে ফ্লাশ (অফলাইনে লেখা বার্তা সার্ভারে যাক), তারপর মিলন।
  onMount(() => {
    void সারিফ্লাশ().then(() => সার্ভারচ্যাটযোগ());
  });
</script>

<div style="max-width: 480px; margin: 0 auto; padding: 16px;">
  <h2>{bn.চ্যাট}</h2>
  {#if Object.keys(app.চ্যাটসমূহ).length === 0}
    <div class="card" style="text-align: center; padding: 32px;">
      <p>কোনো চ্যাট নেই</p>
      <p style="font-size: 13px; color: #666;">কোনো পোস্টে মেসেজ করুন</p>
    </div>
  {:else}
    {#each Object.values(app.চ্যাটসমূহ) as থ্রেড}
      <a href="/chat/{থ্রেড.প্রতিপক্ষআইডি}" style="text-decoration: none; color: inherit;">
        <div class="card" style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #4CAF50; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">{থ্রেড.প্রতিপক্ষনাম[0]}</div>
          <div style="flex: 1; min-width: 0;">
            <b>{থ্রেড.প্রতিপক্ষনাম}</b>
            <div style="font-size: 13px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              {#if থ্রেড.বার্তাসমূহ.length > 0}
                {থ্রেড.বার্তাসমূহ[থ্রেড.বার্তাসমূহ.length - 1].বিষয়বস্তু}
              {:else}
                কোনো বার্তা নেই
              {/if}
            </div>
          </div>
          <div style="font-size: 12px; color: #999; flex-shrink: 0;">
            {new Date(থ্রেড.শেষসময়).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </a>
    {/each}
  {/if}
</div>
