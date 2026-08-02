<template>
  <main class="sfwrap sfbody">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Wardrobe</p>
      <h1 class="t-h2" style="font-size:2.1rem">Digital fashion that <span class="grad-text">travels</span></h1>
      <p>Cosmetics carry zero balance risk, so studios accept them — which is why T1 ships first and stat-bearing T2 waits for a partner cohort.</p>
    </div>

    <div class="split-340" style="grid-template-columns:400px 1fr;gap:40px">
      <div>
        <div class="avatar-preview">
          <img :src="avatarPreview" alt="Your avatar wearing the current loadout">
          <div class="avatar-preview__tag">
            <div>
              <p style="font-size:.86rem;font-weight:600">Current loadout</p>
              <p class="t-small dim">renders in {{ renderTargetCount }} titles</p>
            </div>
            <span class="chip chip--t1">T1</span>
          </div>
        </div>

        <div class="slots">
          <div v-for="slot in slots" :key="slot.key" class="slot" :class="{ free: !slot.item }">
            <span class="slot__k">{{ slot.label }}</span>
            <img v-if="slot.item" :src="slot.item.imageUrl" alt="">
            <span style="flex:1">{{ slot.item?.name ?? '— empty slot —' }}</span>
            <button v-if="slot.item" class="btn btn--ghost btn--sm" type="button" @click="focusSlot(slot.key)">Swap</button>
          </div>
        </div>

        <div class="note note--warn" style="margin-top:18px">
          <span class="note__i">⚠️</span>
          <div><b>One item per slot.</b> Equipping a second torso item displaces the first, visibly, in the same update. A listed item cannot be equipped — that surfaces as an inline error, not a toast.</div>
        </div>
      </div>

      <div data-tabscope>
        <section class="pane on" data-pane="ward">
          <div v-if="inlineError" class="note note--warn" style="margin-bottom:20px">
            <span class="note__i">⚠️</span>
            <div>{{ inlineError }}</div>
          </div>

          <div class="note" style="margin-bottom:20px">
            <span class="note__i">🌐</span>
            <div><b>Shop by how many worlds it renders in.</b> The host icons under each item are the games whose interop envelope accepts that schema at T1 — this is what turns interop from a technical footnote into a purchase driver.</div>
          </div>

          <div v-if="pending" class="items">
            <div v-for="n in 6" :key="n" class="item"><div class="sk" style="aspect-ratio:1"></div></div>
          </div>
          <div v-else class="items">
            <article
              v-for="item in visibleCandidates"
              :key="item.id"
              :data-slot="item.traits?.slot ?? ''"
              class="item"
              :class="{ on: item.equipped }"
            >
              <div class="item__art">
                <span class="item__tier chip chip--t1">{{ item.interopTier }}</span>
                <img :src="item.imageUrl" :alt="item.name" loading="lazy">
              </div>
              <div class="item__body">
                <p class="item__n">{{ item.name }}</p>
                <p class="item__g">{{ item.game.title }} · {{ item.traits?.slot ?? 'cosmetic' }}</p>
                <p class="t-small dim" style="margin-top:4px">renders in {{ item.renderTargets.length }} titles</p>
                <div class="renders">
                  <NuxtLink
                    v-for="target in item.renderTargets.slice(0, 6)"
                    :key="target.gameId"
                    :to="`/store/g/${target.slug}`"
                    :title="target.title"
                  >
                    <img :src="renderTargetImage(target.slug)" :alt="target.title" loading="lazy">
                  </NuxtLink>
                </div>
                <div class="item__acts">
                  <button
                    class="btn btn--sm"
                    :class="item.equipped ? 'btn--grad on' : 'btn--ghost'"
                    type="button"
                    :disabled="saving === item.id"
                    @click="toggle(item)"
                  >
                    {{ item.equipped ? 'Equipped ✓' : 'Equip' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <p class="sect">Not interop-enabled</p>
          <div class="items">
            <div class="item" style="opacity:.55">
              <div class="item__art">
                <span class="item__tier chip chip--t0">T0</span>
                <img :src="nonInteropItem.imageUrl" alt="" loading="lazy">
              </div>
              <div class="item__body">
                <p class="item__n">{{ nonInteropItem.name }}</p>
                <p class="item__g">{{ nonInteropItem.game.title }}</p>
                <p class="t-small dim" style="margin-top:4px">T0 · stays in its own game</p>
              </div>
            </div>
          </div>
          <p class="t-small dim" style="margin-top:12px">T0 items are identity-only — a badge or title can be displayed elsewhere, but nothing renders. They never appear in the wardrobe grid above.</p>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
useHead({ title: 'Wardrobe · Sverse' })

const api = useApi()
const config = useRuntimeConfig()
const inlineError = ref('')
const saving = ref('')
const slotFocus = ref('')

const { data, pending, refresh } = await useAsyncData('wardrobe-page', () => api.one<any>('/api/v1/passport/me/wardrobe').catch(() => null))
const candidates = computed(() => (data.value?.candidates?.length ? data.value.candidates : demoCandidates))
const equipped = computed(() => (data.value?.equipped?.length ? data.value.equipped : candidates.value.filter((item: any) => item.equipped)))
const renderTargetCount = computed(() => new Set(equipped.value.flatMap((item: any) => item.renderTargets.map((target: any) => target.gameId))).size)
const slots = computed<Array<{ key: string; label: string; item: any | null }>>(() => {
  const bySlot = new Map(equipped.value.map((item: any) => [item.traits?.slot, item]))
  return [
    { key: 'torso', label: 'Torso', item: bySlot.get('torso') },
    { key: 'trail', label: 'Trail', item: bySlot.get('trail') },
    { key: 'emblem', label: 'Emblem', item: bySlot.get('emblem') },
    { key: 'nameplate', label: 'Nameplate', item: bySlot.get('nameplate') },
  ]
})

const visibleCandidates = computed(() => {
  const rows = [...candidates.value].sort((a: any, b: any) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1
    return (b.renderTargets?.length ?? 0) - (a.renderTargets?.length ?? 0)
  })
  if (!slotFocus.value) return rows
  return rows.sort((a: any, b: any) => {
    const am = a.traits?.slot === slotFocus.value ? 0 : 1
    const bm = b.traits?.slot === slotFocus.value ? 0 : 1
    return am - bm
  })
})

const nonInteropItem = computed(() => demoNonInteropItem)
const avatarPreview = computed(() => seedAsset('games/petalpost-cover.png'))

function seedAsset(path: string) {
  const base = String(config.public.apiBase ?? 'http://127.0.0.1:4000').replace(/\/$/, '')
  return `${base}/assets/seed/${path}`
}

function renderTargetImage(slug: string) {
  return seedAsset(`games/${slug}-cover.png`)
}

function focusSlot(slot: string) {
  slotFocus.value = slot
}

async function toggle(item: any) {
  inlineError.value = ''
  saving.value = item.id
  try {
    await api.one('/api/v1/passport/me/wardrobe', {
      method: 'PATCH',
      body: item.equipped ? { unequip: [item.id] } : { equip: [item.id] },
    })
    await refresh()
  } catch (error: any) {
    inlineError.value = error?.data?.error?.code ?? 'Unable to update wardrobe.'
  } finally {
    saving.value = ''
  }
}

const demoGames = [
  { gameId: 'gam_voidrunner', slug: 'voidrunner', title: 'Voidrunner' },
  { gameId: 'gam_grimloop', slug: 'grimloop', title: 'Grimloop' },
  { gameId: 'gam_hexfleet', slug: 'hexfleet', title: 'Hexfleet' },
  { gameId: 'gam_petalpost', slug: 'petalpost', title: 'Petalpost' },
  { gameId: 'gam_lumen_leap', slug: 'lumen-leap', title: 'Lumen Leap' },
]

const demoCandidates = [
  {
    id: 'inv_jacket',
    name: 'Ashmaw Jacket',
    game: { title: 'Voidrunner', slug: 'voidrunner' },
    kind: 'cosmetic',
    interopTier: 'T1',
    imageUrl: seedAsset('items/itd_vr_jacket.png'),
    equipped: true,
    traits: { slot: 'torso' },
    renderTargets: [...demoGames, { gameId: 'gam_shardport', slug: 'shardport', title: 'Shardport' }, { gameId: 'gam_starloom', slug: 'starloom', title: 'Starloom' }, { gameId: 'gam_afterglow_party', slug: 'afterglow-party', title: 'Afterglow Party' }],
  },
  {
    id: 'inv_trail',
    name: 'Aurora Trail',
    game: { title: 'Lumen Leap', slug: 'lumen-leap' },
    kind: 'cosmetic',
    interopTier: 'T1',
    imageUrl: seedAsset('items/itd_ll_trail.png'),
    equipped: true,
    traits: { slot: 'trail' },
    renderTargets: demoGames.slice(0, 4),
  },
  {
    id: 'inv_tileset',
    name: 'Neon Tileset',
    game: { title: 'Glass Circuit', slug: 'glass-circuit' },
    kind: 'cosmetic',
    interopTier: 'T1',
    imageUrl: seedAsset('items/puzzle_sigil_wrap.png'),
    equipped: false,
    traits: { slot: 'theme' },
    renderTargets: demoGames.slice(0, 4),
  },
  {
    id: 'inv_cloak',
    name: 'Ashen Cloak',
    game: { title: 'Grimloop', slug: 'grimloop' },
    kind: 'cosmetic',
    interopTier: 'T1',
    imageUrl: seedAsset('items/itd_gl_cloak.png'),
    equipped: false,
    traits: { slot: 'torso' },
    renderTargets: [...demoGames, { gameId: 'gam_driftshock', slug: 'driftshock', title: 'Driftshock' }, { gameId: 'gam_null_saint', slug: 'null-saint', title: 'Null Saint' }, { gameId: 'gam_signal_cartel', slug: 'signal-cartel', title: 'Signal Cartel' }],
  },
  {
    id: 'inv_flag',
    name: 'Commander Flag',
    game: { title: 'Hexfleet', slug: 'hexfleet' },
    kind: 'cosmetic',
    interopTier: 'T1',
    imageUrl: seedAsset('items/itd_hf_flag.png'),
    equipped: false,
    traits: { slot: 'emblem' },
    renderTargets: [...demoGames, { gameId: 'gam_shardport', slug: 'shardport', title: 'Shardport' }],
  },
  {
    id: 'inv_bike',
    name: 'Brass Bicycle',
    game: { title: 'Petalpost', slug: 'petalpost' },
    kind: 'cosmetic',
    interopTier: 'T1',
    imageUrl: seedAsset('items/itd_pp_bike.png'),
    equipped: false,
    traits: { slot: 'vehicle' },
    renderTargets: demoGames.slice(0, 3),
  },
]

const demoNonInteropItem = {
  name: 'Season Pass · Ashfall',
  imageUrl: seedAsset('items/itd_vr_starter.png'),
  game: { title: 'Voidrunner' },
}
</script>
