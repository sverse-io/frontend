<template>
  <main class="sfwrap sfbody">
    <section class="pbanner">
      <div class="pbanner__bg"><img :src="bannerImage" alt=""></div>
      <div class="pbanner__in">
        <img class="pbanner__av" :src="avatarImage" alt="Your avatar">
        <div>
          <p class="t-micro" style="color:var(--pink);margin-bottom:5px">S-PASSPORT</p>
          <h1>@{{ passport.handle }}</h1>
          <p class="pbanner__id">{{ shortAddress }} · smart account, gasless, no seed phrase</p>
          <div class="pbanner__k">
            <span class="chip chip--live">★ {{ passport.reputation }} reputation</span>
            <span class="chip chip--t1">{{ skillLabel }}</span>
            <span class="chip">{{ livingItems.length }} living items</span>
            <span v-if="passport.creator" class="chip chip--yours">ONE-HUMAN STUDIO ✓</span>
          </div>
        </div>
        <div class="pbanner__stats">
          <div class="pstat"><p class="pstat__v num">{{ passport.inventory.count }}</p><p class="pstat__k">Items</p></div>
          <div class="pstat"><p class="pstat__v num">{{ passport.inventory.gameCount }}</p><p class="pstat__k">Games</p></div>
          <div class="pstat"><p class="pstat__v num">{{ passport.wardrobe.renderTargets }}</p><p class="pstat__k">Renders in</p></div>
          <div class="pstat"><p class="pstat__v num grad-text">{{ passport.balanceSrv }}</p><p class="pstat__k">SRV</p></div>
        </div>
      </div>
    </section>

    <div class="fbar">
      <button
        v-for="filter in filters"
        :key="filter.value"
        class="sfcat"
        :class="{ on: activeFilter === filter.value }"
        type="button"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
      <span style="flex:1"></span>
      <select v-model="gameId" aria-label="All games">
        <option value="">All games</option>
        <option v-for="game in libraryGames" :key="game.id" :value="game.id">{{ game.title }}</option>
      </select>
      <select v-model="sortMode" aria-label="Sort">
        <option value="newest">Newest first</option>
        <option value="deeds">Most deeds</option>
        <option value="value">Highest value</option>
      </select>
    </div>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Living Items</h3>
        <NuxtLink to="/passport/deeds">Open the deed ledger →</NuxtLink>
      </div>
      <p class="shelf__s">Items whose traits change with what you do. Their history is attested and travels with them — including when you sell.</p>
      <div v-if="pendingInventory" class="shelf__track">
        <div v-for="n in 3" :key="n" class="tcard">
          <div class="sk" style="aspect-ratio:1;border-radius:var(--r-lg)"></div>
          <div class="tcard__b"><div class="sk" style="height:14px;width:80%"></div><div class="sk" style="height:11px;width:55%;margin-top:7px"></div></div>
        </div>
      </div>
      <div v-else class="shelf__track">
        <article v-for="item in livingItems.slice(0, 3)" :key="item.id" class="tcard">
          <div class="tcard__art">
            <div class="tcard__tags"><span :class="tierClass(item.interopTier)">{{ item.interopTier }}</span></div>
            <img :src="item.imageUrl" :alt="item.name" loading="lazy">
          </div>
          <div class="tcard__b">
            <p class="tcard__t">{{ item.name }}</p>
            <p class="tcard__s">{{ item.game.title }} · lvl {{ item.traits?.level ?? '—' }}</p>
            <p class="tcard__m">
              <span style="color:var(--pink);font-weight:700">{{ item.deedCount }} deeds</span>
              <span>·</span>
              <span :class="livingStatusClass(item)">{{ livingStatusText(item) }}</span>
            </p>
            <div class="item__acts" style="margin-top:9px">
              <button class="btn btn--ghost btn--sm" type="button" @click="openDeeds(item)">History</button>
              <button class="btn btn--ghost btn--sm" type="button" @click="interopItem = item">Import</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Cosmetics · cross-game</h3>
        <NuxtLink to="/passport/wardrobe">Open the wardrobe →</NuxtLink>
      </div>
      <p class="shelf__s">T1 items render in other titles. The number under each one is how many games accept its schema today.</p>
      <div class="shelf__track">
        <div v-for="item in cosmeticItems.slice(0, 6)" :key="item.id" class="tcard">
          <div class="tcard__art" :style="item.equipped ? 'border-color:var(--pink)' : ''">
            <div class="tcard__tags">
              <span :class="tierClass(item.interopTier)">{{ item.interopTier }}</span>
              <span v-if="item.equipped" class="chip chip--live">EQUIPPED</span>
            </div>
            <img :src="item.imageUrl" :alt="item.name" loading="lazy">
          </div>
          <div class="tcard__b">
            <p class="tcard__t">{{ item.name }}</p>
            <p class="tcard__s">{{ item.game.title }}</p>
            <p class="tcard__m"><span>renders in {{ item.renderTargets.length }} titles</span></p>
            <div class="item__acts" style="margin-top:9px">
              <button
                class="btn btn--sm"
                :class="item.equipped ? 'btn--grad on' : 'btn--ghost'"
                type="button"
                :disabled="wardrobeSaving === item.id"
                @click="toggleEquip(item)"
              >
                {{ item.equipped ? 'Equipped ✓' : 'Equip' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h"><h3>Passes, bundles &amp; consumables</h3></div>
      <p class="shelf__s">Non-transferable or already consumed. These carry no interop and no history, so they show no actions.</p>
      <div class="shelf__track">
        <div v-for="item in passiveShelf" :key="item.id" class="tcard">
          <div class="tcard__art">
            <div class="tcard__tags"><span :class="tierClass(item.interopTier)">{{ item.interopTier }}</span></div>
            <img :src="item.imageUrl" :alt="item.name" loading="lazy">
          </div>
          <div class="tcard__b">
            <p class="tcard__t">{{ item.name }}</p>
            <p class="tcard__s">{{ item.game.title }} · {{ passiveLabel(item) }}</p>
            <p class="tcard__m"><span class="dim">{{ passiveState(item) }}</span></p>
          </div>
        </div>
      </div>

      <div class="note note--warn" style="margin-top:22px">
        <span class="note__i">🎯</span>
        <div><b>Design rule (spec 05 P-03).</b> Action buttons are conditional: Living Items get <b>History + Import</b>; T1 cosmetics get <b>Equip</b>; everything else gets <b>none</b>. The Starter Pack above is T2 but not living, so it deliberately offers no Import.</div>
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Games in your library</h3>
        <NuxtLink to="/">Find more →</NuxtLink>
      </div>
      <p class="shelf__s">Anything you own an item in. Your passport is the account for all of them.</p>
      <div class="shelf__track">
        <NuxtLink v-for="game in libraryGames.slice(0, 5)" :key="game.id" class="tcard tcard--wide" :to="`/store/g/${game.slug}`">
          <div class="tcard__art">
            <img :src="game.coverArt?.url || seedAsset(`games/${game.slug}-cover.png`)" :alt="game.title" loading="lazy">
          </div>
          <div class="tcard__b">
            <p class="tcard__t">{{ game.title }}</p>
            <p class="tcard__s">@{{ game.studio?.handle ?? 'studio' }}</p>
            <p class="tcard__m"><span>{{ ownedCount(game.id) }} item{{ ownedCount(game.id) === 1 ? '' : 's' }} owned</span></p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="sfsection">
      <p class="sect">State: empty library</p>
      <div class="empty">
        <div class="empty__i">🎒</div>
        <h4>Nothing yet</h4>
        <p>Buy something in the Store and it appears here, minted to your passport — not to a game's server.</p>
        <NuxtLink class="btn btn--grad btn--sm" to="/" style="margin-top:16px">Browse the Store</NuxtLink>
      </div>

      <p class="sect">State: loading</p>
      <div class="shelf__track">
        <div v-for="n in 4" :key="`loading-${n}`" class="tcard">
          <div class="sk" style="aspect-ratio:1;border-radius:var(--r-lg)"></div>
          <div class="tcard__b"><div class="sk" style="height:14px;width:80%"></div><div class="sk" style="height:11px;width:55%;margin-top:7px"></div></div>
        </div>
      </div>
    </section>
  </main>

  <div v-if="deedModalItem" class="backdrop" @click.self="deedModalItem = null">
    <div class="modal modal--wide">
      <div class="modal__h">
        <div><h3>Deed Ledger · {{ deedModalItem.name }}</h3><p>{{ deedModalItem.schemaId }} · append-only provenance</p></div>
        <button class="modal__x" type="button" @click="deedModalItem = null">✕</button>
      </div>
      <div class="modal__b">
        <div class="ledger">
          <div v-for="deed in modalDeeds" :key="deed.id" class="deed">
            <span class="deed__i"><img :src="deedImage(deed.deedType)" alt=""></span>
            <div><div class="deed__n">{{ deed.deedType }}</div><div class="deed__d">{{ deed.detail }}</div></div>
            <div class="deed__m">{{ deed.epochLabel }}<br><span :class="verificationClass(deed.verified)">{{ verificationLabel(deed.verified) }}</span></div>
          </div>
        </div>
        <div class="note" style="margin-top:18px">
          <span class="note__i">🔐</span>
          <div>Signed by the studio's key, co-signed by Sverse against Proof-of-Play telemetry. Fabricating deeds is provable on-chain and <b>slashes the studio's bond</b> — which is the only reason a buyer should pay more for history.</div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="interopItem" class="backdrop" @click.self="interopItem = null">
    <div class="modal modal--wide">
      <div class="modal__h">
        <div><h3>Import to another game</h3><p>{{ interopItem.name }} → Grimloop · tier {{ interopItem.interopTier }} (normalized stats)</p></div>
        <button class="modal__x" type="button" @click="interopItem = null">✕</button>
      </div>
      <div class="modal__b">
        <div class="env">
          <div class="env__b">
            <h5>Source · {{ interopItem.game.title }}</h5>
            <div><span>power_tier</span><strong>{{ interopItem.traits?.power_tier ?? 4 }}</strong></div>
            <div><span>rarity</span><strong>{{ interopItem.traits?.rarity ?? 'epic' }}</strong></div>
            <div><span>element</span><strong>{{ interopItem.traits?.element ?? 'fire' }}</strong></div>
            <div><span>raw damage</span><strong>{{ interopItem.traits?.level ? interopItem.traits.level * 10 - 2 : 418 }}</strong></div>
          </div>
          <div class="env__a">→</div>
          <div class="env__b out">
            <h5>Grimloop's envelope</h5>
            <div><span>accepts</span><strong>tier 1–5</strong></div>
            <div><span>mapped rarity</span><strong>{{ interopItem.traits?.rarity ?? 'epic' }}</strong></div>
            <div><span>element</span><strong>{{ interopItem.traits?.element ?? 'fire' }} ✓</strong></div>
            <div><span>host damage</span><strong>62</strong></div>
          </div>
        </div>
        <div class="rows" style="margin-top:18px">
          <div><span>Schema match</span><strong class="vf">✓ {{ interopItem.schemaId }}</strong></div>
          <div><span>Tier check</span><strong class="vf">✓ {{ interopItem.interopTier }} ≤ host T2</strong></div>
          <div><span>License check</span><strong class="vf">✓ derivative-allowed</strong></div>
          <div><span>Deeds carried over</span><strong>{{ interopItem.deedCount }} · shown as provenance</strong></div>
          <div class="tot"><span>Import fee</span><strong>12 SRV</strong></div>
        </div>
        <div class="note" style="margin-top:16px">
          <span class="note__i">⚖️</span>
          <div>Grimloop <b>never imports raw stats</b>. It publishes a conversion envelope and maps your tier onto its own curve — 418 damage becomes 62. Your item keeps its identity and history; the host keeps control of its balance. If a mapping would land outside the declared band the import <b>fails</b> rather than clamping silently.</div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" @click="interopItem = null">Cancel</button>
        <button class="btn btn--grad" type="button" @click="interopItem = null">Import for 12 SRV</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'My library · Sverse' })

type InventoryItem = any
type DeedRow = any

const api = useApi()
const config = useRuntimeConfig()

const activeFilter = ref('')
const gameId = ref('')
const sortMode = ref('newest')
const wardrobeSaving = ref('')
const deedModalItem = ref<InventoryItem | null>(null)
const interopItem = ref<InventoryItem | null>(null)

const filters = [
  { label: 'All items', value: '' },
  { label: 'Living Items', value: 'living' },
  { label: 'Cosmetics', value: 'cosmetic' },
  { label: 'Passes', value: 'bundle' },
  { label: 'Consumables', value: 'consumable' },
]

const { data: passportRes } = await useAsyncData('passport-summary', () => api.one<any>('/api/v1/passport/me').catch(() => null))
const { data: inventoryRes, pending: pendingInventory, refresh: refreshInventory } = await useAsyncData('passport-inventory', () =>
  api.many<any>('/api/v1/passport/me/inventory', {
    query: {
      kind: activeFilter.value || undefined,
      gameId: gameId.value || undefined,
    },
  }).catch(() => ({ data: [] })),
)
const { data: deedsRes } = await useAsyncData('passport-deeds-modal', () => api.many<any>('/api/v1/passport/me/deeds').catch(() => ({ data: [] })))
const { data: gamesRes } = await useAsyncData('passport-games', () => api.many<any>('/api/v1/games').catch(() => ({ data: [] })))

watch([activeFilter, gameId], () => refreshInventory())

const passport = computed(() => passportRes.value ?? demoPassport)
const gameMap = computed(() => new Map((gamesRes.value?.data ?? []).map((game: any) => [game.id, game])))
const inventoryBase = computed<InventoryItem[]>(() => {
  const rows = inventoryRes.value?.data?.length ? inventoryRes.value.data : demoInventory
  return rows.map((item: any) => ({
    ...item,
    game: {
      ...(item.game ?? {}),
      ...(gameMap.value.get(item.game?.id) ?? {}),
    },
  }))
})

const inventory = computed(() => {
  const rows = [...inventoryBase.value]
  if (sortMode.value === 'deeds') return rows.sort((a, b) => Number(b.deedCount ?? 0) - Number(a.deedCount ?? 0))
  if (sortMode.value === 'value') return rows.sort((a, b) => scoreItem(b) - scoreItem(a))
  return rows
})

const deeds = computed<DeedRow[]>(() => (deedsRes.value?.data?.length ? deedsRes.value.data : demoDeeds))
const deedsByItem = computed(() => {
  const map = new Map<string, DeedRow[]>()
  for (const deed of deeds.value) {
    map.set(deed.inventoryItemId, [...(map.get(deed.inventoryItemId) ?? []), deed])
  }
  return map
})

const livingItems = computed(() => inventory.value.filter((item: any) => item.kind === 'living'))
const cosmeticItems = computed(() => inventory.value.filter((item: any) => item.kind === 'cosmetic'))
const passiveItems = computed(() => inventory.value.filter((item: any) => !['living', 'cosmetic'].includes(item.kind)))
const passiveShelf = computed(() => (passiveItems.value.length ? passiveItems.value : demoPassiveItems).slice(0, 2))

const libraryGames = computed(() => {
  const seen = new Map<string, any>()
  for (const item of inventoryBase.value) {
    if (item.game?.id && !seen.has(item.game.id)) seen.set(item.game.id, item.game)
  }
  return [...seen.values()].length ? [...seen.values()] : demoGames
})

const shortAddress = computed(() => {
  const value = String(passport.value.custodialAddress ?? 'sp_9f31a4c2')
  return value.length > 16 ? `${value.slice(0, 7)}...${value.slice(-4)}` : value
})

const skillLabel = computed(() => {
  const skill = passport.value.skill
  if (typeof skill === 'string') return skill
  if (skill?.tier) return String(skill.tier).replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
  return 'Diamond II'
})

const bannerImage = computed(() => seedAsset('games/voidrunner-cover.png'))
const avatarImage = computed(() => seedAsset('studios/voidrunner.png'))

const modalDeeds = computed(() => {
  if (!deedModalItem.value) return []
  return (deedsByItem.value.get(deedModalItem.value.id) ?? []).map((deed) => ({
    ...deed,
    epochLabel: `epoch ${deed.epoch}`,
  }))
})

function seedAsset(path: string) {
  const base = String(config.public.apiBase ?? 'http://127.0.0.1:4000').replace(/\/$/, '')
  return `${base}/assets/seed/${path}`
}

function tierClass(tier: string) {
  return ['chip', tier === 'T2' ? 'chip--t2' : tier === 'T1' ? 'chip--t1' : 'chip--t0'].join(' ')
}

function verificationLabel(value: boolean | null) {
  if (value === true) return '✓ attested'
  if (value === false) return '⚠ unverified'
  return '◐ verifying'
}

function verificationClass(value: boolean | null) {
  if (value === true) return 'vf'
  if (value === false) return 'vu'
  return 'vp'
}

function deedImage(deedType: string) {
  const map: Record<string, string> = {
    kills: 'games/voidrunner-cover.png',
    tournament_top8: 'studios/voidrunner.png',
    flawless_run: 'games/grimloop-cover.png',
    boss_defeated: 'items/itd_vr_blade.png',
    marathon_run: 'items/itd_gl_relic.png',
    fleet_wiped: 'items/itd_hf_hull.png',
    scar_earned: 'studios/grimloop.png',
    deaths_remembered: 'items/itd_gl_relic.png',
  }
  return seedAsset(map[deedType] ?? 'games/lumen-leap-cover.png')
}

function scoreItem(item: any) {
  return Number(item.deedCount ?? 0) * 100 + Number(item.traits?.level ?? 0)
}

function ownedCount(gameId: string) {
  return inventoryBase.value.filter((item: any) => item.game?.id === gameId).length
}

function openDeeds(item: InventoryItem) {
  deedModalItem.value = item
}

function livingStatusClass(item: any) {
  const rows = deedsByItem.value.get(item.id) ?? []
  if (rows.some((row) => row.verified === false)) return 'vu'
  if (rows.some((row) => row.verified === null)) return 'vp'
  return 'vf'
}

function livingStatusText(item: any) {
  const rows = deedsByItem.value.get(item.id) ?? []
  if (rows.some((row) => row.verified === false)) {
    const count = rows.filter((row) => row.verified === false).length
    return `⚠ ${count} unverified`
  }
  if (rows.some((row) => row.verified === null)) return '◐ verifying'
  return '✓ verified'
}

function passiveLabel(item: any) {
  return item.kind === 'bundle' ? 'bundle' : item.kind === 'consumable' ? 'consumable' : 'pass'
}

function passiveState(item: any) {
  if (item.kind === 'bundle') return 'consumed'
  if (item.kind === 'consumable') return 'spent'
  return '9 weeks left'
}

async function toggleEquip(item: any) {
  wardrobeSaving.value = item.id
  try {
    await api.one('/api/v1/passport/me/wardrobe', {
      method: 'PATCH',
      body: item.equipped ? { unequip: [item.id] } : { equip: [item.id] },
    })
    await refreshInventory()
  } catch {
  } finally {
    wardrobeSaving.value = ''
  }
}

const demoPassport = {
  handle: 'you',
  custodialAddress: 'sp_9f31a4c2',
  reputation: 94,
  skill: 'Diamond II',
  creator: true,
  balanceSrv: '2,450',
  inventory: { count: 7, gameCount: 5 },
  wardrobe: { renderTargets: 8 },
}

const demoGames = [
  { id: 'gam_voidrunner', slug: 'voidrunner', title: 'Voidrunner', studio: { handle: 'kai.solo' }, coverArt: { url: seedAsset('games/voidrunner-cover.png') } },
  { id: 'gam_grimloop', slug: 'grimloop', title: 'Grimloop', studio: { handle: 'mira.forge' }, coverArt: { url: seedAsset('games/grimloop-cover.png') } },
  { id: 'gam_hexfleet', slug: 'hexfleet', title: 'Hexfleet', studio: { handle: 'nadia.vector' }, coverArt: { url: seedAsset('games/hexfleet-cover.png') } },
  { id: 'gam_lumen_leap', slug: 'lumen-leap', title: 'Lumen Leap', studio: { handle: 'sora.light' }, coverArt: { url: seedAsset('games/lumen-leap-cover.png') } },
  { id: 'gam_petalpost', slug: 'petalpost', title: 'Petalpost', studio: { handle: 'yuu.post' }, coverArt: { url: seedAsset('games/petalpost-cover.png') } },
]

const demoInventory = [
  {
    id: 'inv_voidblade_a',
    name: 'Voidblade #4412',
    game: demoGames[0],
    kind: 'living',
    interopTier: 'T2',
    schemaId: 'sts/weapon/melee/v1',
    imageUrl: seedAsset('items/itd_vr_blade.png'),
    deedCount: 4,
    equipped: false,
    traits: { rarity: 'epic', level: 42, slot: 'main_hand', power_tier: 4, element: 'fire' },
    renderTargets: [],
  },
  {
    id: 'inv_scarbound_relic',
    name: 'Scarbound Relic #88',
    game: demoGames[1],
    kind: 'living',
    interopTier: 'T2',
    schemaId: 'sts/weapon/relic/v1',
    imageUrl: seedAsset('items/itd_gl_relic.png'),
    deedCount: 3,
    equipped: false,
    traits: { rarity: 'rare', level: 17, slot: 'off_hand' },
    renderTargets: [],
  },
  {
    id: 'inv_dreadhull_221',
    name: 'Dreadnought Hull #221',
    game: demoGames[2],
    kind: 'living',
    interopTier: 'T2',
    schemaId: 'sts/vehicle/capital/v1',
    imageUrl: seedAsset('items/itd_hf_hull.png'),
    deedCount: 1,
    equipped: false,
    traits: { rarity: 'epic', slot: 'vehicle_core' },
    renderTargets: [],
  },
  {
    id: 'inv_jacket',
    name: 'Ashmaw Jacket',
    game: demoGames[0],
    kind: 'cosmetic',
    interopTier: 'T1',
    schemaId: 'sts/cosmetic/wearable/v1',
    imageUrl: seedAsset('items/itd_vr_jacket.png'),
    deedCount: 1,
    equipped: true,
    traits: { rarity: 'rare', slot: 'torso' },
    renderTargets: demoGames.map((game) => ({ gameId: game.id, slug: game.slug, title: game.title })),
  },
  {
    id: 'inv_trail',
    name: 'Aurora Trail',
    game: demoGames[3],
    kind: 'cosmetic',
    interopTier: 'T1',
    schemaId: 'sts/cosmetic/trail/v1',
    imageUrl: seedAsset('items/itd_ll_trail.png'),
    deedCount: 0,
    equipped: true,
    traits: { slot: 'trail' },
    renderTargets: demoGames.slice(0, 4).map((game) => ({ gameId: game.id, slug: game.slug, title: game.title })),
  },
  {
    id: 'inv_cloak',
    name: 'Ashen Cloak',
    game: demoGames[1],
    kind: 'cosmetic',
    interopTier: 'T1',
    schemaId: 'sts/cosmetic/wearable/v1',
    imageUrl: seedAsset('items/itd_gl_cloak.png'),
    deedCount: 0,
    equipped: false,
    traits: { slot: 'torso' },
    renderTargets: demoGames.map((game) => ({ gameId: game.id, slug: game.slug, title: game.title })),
  },
  {
    id: 'inv_starter_bundle',
    name: 'Starter Pack',
    game: demoGames[0],
    kind: 'bundle',
    interopTier: 'T2',
    schemaId: 'sts/bundle/v1',
    imageUrl: seedAsset('items/itd_vr_starter.png'),
    deedCount: 0,
    equipped: false,
    traits: {},
    renderTargets: [],
  },
]

const demoPassiveItems = [
  demoInventory[6],
  {
    id: 'inv_prism_stepper',
    name: 'Prism Stepper',
    game: demoGames[3],
    kind: 'consumable',
    interopTier: 'T0',
    schemaId: 'sts/consumable/charge/v1',
    imageUrl: seedAsset('items/itd_ll_prism.png'),
    deedCount: 0,
    equipped: false,
    traits: {},
    renderTargets: [],
  },
]

const demoDeeds = [
  { id: 'ded_1', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'kills', detail: '4,120 total', epoch: '790', verified: true },
  { id: 'ded_2', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'tournament_top8', detail: 'Ashfall Invitational', epoch: '799', verified: true },
  { id: 'ded_3', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'flawless_run', detail: 'no damage taken · 41 rooms', epoch: '806', verified: true },
  { id: 'ded_4', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'boss_defeated', detail: 'Ashmaw · mythic · solo', epoch: '812', verified: true },
  { id: 'ded_5', inventoryItemId: 'inv_scarbound_relic', itemName: 'Scarbound Relic #88', schemaId: 'sts/weapon/relic/v1', deedType: 'deaths_remembered', detail: '88 runs ended', epoch: '803', verified: true },
  { id: 'ded_6', inventoryItemId: 'inv_scarbound_relic', itemName: 'Scarbound Relic #88', schemaId: 'sts/weapon/relic/v1', deedType: 'scar_earned', detail: 'permanent · phase 3 survivor', epoch: '809', verified: true },
  { id: 'ded_7', inventoryItemId: 'inv_scarbound_relic', itemName: 'Scarbound Relic #88', schemaId: 'sts/weapon/relic/v1', deedType: 'marathon_run', detail: 'claimed 14h continuous — telemetry recorded 41m', epoch: '811', verified: false },
  { id: 'ded_8', inventoryItemId: 'inv_dreadhull_221', itemName: 'Dreadnought Hull #221', schemaId: 'sts/vehicle/capital/v1', deedType: 'fleet_wiped', detail: '12-ship engagement', epoch: '813', verified: null },
]
</script>
