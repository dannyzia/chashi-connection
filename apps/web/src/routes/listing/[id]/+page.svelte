<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app, চ্যাটখুলুন, সার্ভারেচ্যাটখুলুন, সারিতেযোগ, ব্যবহারকারীব্লক, সংরক্ষণ } from '$lib/app-state.svelte';
  import { রিপোর্টজমা, বিক্রেতাইডআনুন } from '$lib/moderation';
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
  let ব্লকমোড = $state(false);
  let ব্লকচলছে = $state(false);
  let ব্লকসম্পন্ন = $state(false);

  // CHC-T-025 — রিপোর্ট লোকাল পথেই আগে: মোডাল বন্ধ ও বাংলা নিশ্চিতকরণ আজকের
  // মতোই (নেটওয়ার্কের জন্য কোনো অপেক্ষা নেই), তারপর ব্যাকগ্রাউন্ডে সার্ভারে।
  // ব্যর্থ/সেশন-বিহীন → সারি; নিশ্চিতকরণের অর্থ “এই ডিভাইসে রেকর্ড হয়েছে”
  // (অফলাইন-প্রথম, পিআরডি §১২)।
  function রিপোর্টপাঠান() {
    const চলমান = পোস্ট;
    if (!রিপোর্টকারণ || !চলমান) return;
    const লক্ষ্য = চলমান.id;
    const শ্রেণী = রিপোর্টকারণ;
    void রিপোর্টজমা('product', লক্ষ্য, শ্রেণী).then((ফল) => {
      // invalid-target (uuid নয়, যেমন ডেমো বীজের 's1') সার্ভারে যেতে পারে না —
      // শুধু এই ডিভাইসে রেকর্ডই সত্য; অন্যথায় সারি (পরে পাঠানো হবে)।
      if (!ফল.ok && ফল.error !== 'invalid-target') সারিতেযোগ('রিপোর্ট', { ধরন: 'product', লক্ষ্য, শ্রেণী });
    });
    alert(bn.রিপোর্টধন্যবাদ);
    রিপোর্টমোড = false;
    রিপোর্টকারণ = '';
  }

  // CHC-T-031 — ব্লক (পিআরডি §১২.২: নীরব, একমুখী, ব্লককৃতকে কিছুই জানানো হয় না)।
  // রিপোর্টের মতোই লোকাল আগে: ফিডের ব্লক-ফিল্টার (routes/+page.svelte) কেবল
  // লোকাল ব্লকতালিকা পড়ে, তাই এই ডিভাইসে কাজটি সঙ্গে সঙ্গে হয় — অফলাইনে,
  // বিনা নেটওয়ার্কে, বিনা অপেক্ষায়। সার্ভার-রেকর্ড (blocks) পরে, নীরবে।
  //
  // কোন 'চাবি' বসে (ফিল্টার যেটিই মেলে):
  //   • সত্যিকারের বিক্রেতানাম থাকলে নাম — ওই বিক্রেতার সব পোস্ট ফিড থেকে যায়;
  //   • সার্ভার থেকে আসা পণ্যে নাম সবার জন্য একই প্লেসহেল্ডার (bn.বিক্রেতা),
  //     তাই সেখানে পোস্টের নিজের আইডি। ফলে সীমা: সার্ভার-পণ্যের বিক্রেতার
  //     অন্য পোস্টগুলো এখনো দৃশ্যমান থাকে, কারণ ফিডআইটেম এখনো বিক্রেতার
  //     পরিচয় বহন করে না (logic/feed.ts ও server-feed.ts — এই কাজের বাইরে)।
  //
  // পরিসর (R5): ফিল্টার কেবল ফিডে — ব্লক করা বিক্রেতার এই লিস্টিং-পাতা
  // খোলা থাকলে সেটি এখানেই আগের মতো দেখায় (বিস্তৃতির পাতা ফিল্টার করে না)।
  async function ব্লককরুন() {
    const চলমান = পোস্ট;
    const ব্যবহারকারী = app.ব্যবহারকারী;
    if (!চলমান || !ব্যবহারকারী || ব্লকচলছে) return;

    // R4 — আগেই ব্লক করা: কিছুই যোগ হয় না (তালিকা অপরিবর্তিত, দ্বিতীয় নক নয়)।
    if (ব্যবহারকারী.ব্লকতালিকা.includes(চলমান.id)) {
      ব্লকমোড = false;
      ব্লকসম্পন্ন = true;
      return;
    }
    ব্লকচলছে = true;

    // ১) লোকাল তালিকা — ফিল্টার যেসব চাবি মেলাতে পারে, কেবল সেগুলোই।
    const সাধারণ = bn.বিক্রেতা;
    if (
      চলমান.বিক্রেতানাম &&
      চলমান.বিক্রেতানাম !== সাধারণ &&
      চলমান.বিক্রেতানাম !== ব্যবহারকারী.নাম &&
      !ব্যবহারকারী.ব্লকতালিকা.includes(চলমান.বিক্রেতানাম)
    ) {
      ব্যবহারকারী.ব্লকতালিকা.push(চলমান.বিক্রেতানাম);
    }
    if (!ব্যবহারকারী.ব্লকতালিকা.includes(চলমান.id)) ব্যবহারকারী.ব্লকতালিকা.push(চলমান.id);
    সংরক্ষণ();

    // ২) সার্ভার-রেকর্ড — বিক্রেতার uuid থাকলে ব্যবহারকারীব্লক (দ্বৈত-গার্ড,
    //    সেশন-গেটেড); সেশন/নেট না থাকলে সারিতে, ব্যবহারকারী টেরও পান না।
    const বিক্রেতা = await বিক্রেতাইডআনুন(চলমান.id);
    if (বিক্রেতা) ব্যবহারকারীব্লক(বিক্রেতা);

    ব্লকচলছে = false;
    ব্লকমোড = false;
    ব্লকসম্পন্ন = true;
  }

  // CHC-T-026 — চ্যাটখুলুন: লোকাল থ্রেড আগে ও ঠিকানা বদল আগেই (আজকের আচরণ,
  // কোনো নেটওয়ার্ক অপেক্ষা নেই), তারপর ব্যাকগ্রাউন্ডে সার্ভার-চ্যাট তৈরির চেষ্টা।
  // সেশন থাকে ও পোস্টটি সার্ভারে থাকে তবেই চ্যাট সার্ভারে যায়; ব্যর্থ হলে কিছুই
  // বদলায় না। সার্ভারে তৈরি হলে থ্রেডটি প্রতিপক্ষ-চাবিতে সরে যায়, তাই ব্যবহারকারী
  // তখনও এই লিস্টিং-থ্রেডে থাকলে ঠিকানা নতুন চাবিতে বদলে দেওয়া হয়।
  function মেসেজকরুন() {
    const চলমান = পোস্ট;
    if (!চলমান) return;
    চ্যাটখুলুন(চলমান.id, চলমান.বিক্রেতানাম, null);
    void goto('/chat/' + চলমান.id);
    void সার্ভারেচ্যাটখুলুন(চলমান.id).then((নতুন) => {
      if (নতুন && নতুন !== চলমান.id && page.params.id === চলমান.id) void goto('/chat/' + নতুন);
    });
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

    {#if ব্লকসম্পন্ন}
      <div style="margin-top: 12px; padding: 12px; background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 8px; font-size: 14px; color: #2E7D32;">
        {bn.ব্লকসম্পন্নবার্তা}
      </div>
    {/if}

    {#if পোস্ট.বর্ণনা}
      <div style="margin-top: 12px; padding: 12px; background: #fff; border: 1px solid #eee; border-radius: 8px;">
        <p>{পোস্ট.বর্ণনা}</p>
      </div>
    {/if}

    <!-- অ্যাকশন বার -->
    <div style="position: fixed; bottom: 70px; left: 0; right: 0; max-width: 480px; margin: 0 auto; display: flex; gap: 8px; padding: 8px 16px; background: #fff; border-top: 1px solid #eee;">
      <button class="bn-btn" style="flex: 2;" onclick={মেসেজকরুন}>{bn.বিক্রেতাকেমেসেজ}</button>
      <button class="bn-btn-হালকা" onclick={() => alert('ফোন নম্বর: ০১৭XXXXXXXXX')} style="flex: 1;">{bn.ফোনকরুন}</button>
      <button class="bn-btn-হালকা" onclick={() => alert('শেয়ার করা হয়েছে')} style="flex: 1;">{bn.শেয়ারকরুন}</button>
      <button class="bn-btn-হালকা" onclick={() => রিপোর্টমোড = true} style="flex: 1;">{bn.রিপোর্টকরুন}</button>
      <button class="bn-btn-হালকা" onclick={() => (ব্লকমোড = true)} style="flex: 1;" disabled={ব্লকসম্পন্ন}>{bn.ব্লক}</button>
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

  {#if ব্লকমোড}
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100;">
      <div style="background: #fff; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
        <h3>{bn.ব্লকনিশ্চিত}</h3>
        <p style="font-size: 14px; color: #666;">{bn.ব্লকবর্ণনা}</p>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="bn-btn" onclick={ব্লককরুন} disabled={ব্লকচলছে}>{bn.ব্লক}</button>
          <button class="bn-btn-হালকা" onclick={() => (ব্লকমোড = false)}>বাতিল</button>
        </div>
      </div>
    </div>
  {/if}
{/if}
