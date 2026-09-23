<script module lang="ts">
  import '../app.css';
</script>

<script lang="ts">
  import { page } from '$app/state';
  import { bn } from '$lib/bn';
  let { children } = $props();
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
