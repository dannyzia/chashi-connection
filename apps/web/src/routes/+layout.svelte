<script module lang="ts">
  import '../app.css';
</script>

<script lang="ts">
  import { page } from '$app/state';
  import { bn } from '$lib/bn';
  import { app } from '$lib/app-state.svelte';
  import { পুশনিবন্ধন } from '$lib/push';
  let { children } = $props();
  // সেশন শুরু হলেই পুশ টোকেন নিবন্ধনের একক ডাক (CHC-T-039, §১৫.৩)।
  // push.ts নিজেই নেটিভ-গার্ড ও সেশন-যাচাই করে — ওয়েবে কিছুই ঘটে না, আর
  // plugin না থাকলে নীরবে ফিরে যায় (Phase-A বিল্ড অটুট)।
  $effect(() => {
    if (app.লগইন) void পুশনিবন্ধন();
  });
  const নেভ = [
    { href: '/', নাম: bn.হোম, আইকন: '🏠' },
    { href: '/chat', নাম: bn.চ্যাট, আইকন: '💬' },
    { href: '/post', নাম: bn.পোস্ট, আইকন: '➕' },
    { href: '/profile', নাম: bn.প্রোফাইল, আইকন: '👤' }
  ];
  const এখনকারপথ = $derived(page.url.pathname);
  const নেভদেখাও = $derived(!এখনকারপথ.startsWith('/signup'));
</script>

{@render children()}

{#if নেভদেখাও}
  <nav class="bn-বটম-নেভ">
    {#each নেভ as ট্যাব (ট্যাব.href)}
      <a href={ট্যাব.href} class={এখনকারপথ === ট্যাব.href ? 'সক্রিয়' : ''}>
        <div>{ট্যাব.আইকন}</div>
        {ট্যাব.নাম}
      </a>
    {/each}
  </nav>
{/if}

<style>
  main { padding-bottom: 70px; }
</style>
