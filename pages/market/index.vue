<template>
  <main class="sfwrap sfbody">
    <div class="phead market-head" style="padding-top:30px">
      <p class="eyebrow">Secondary market</p>
      <h1 class="t-h2" style="font-size:2.1rem">Buy history, not just stats</h1>
      <p>
        Every listing shows its deed count and verification mix <b>before</b> you open it.
        Two items with identical stats can differ 8× in price — that difference is provenance.
      </p>
    </div>

    <div class="sfcats market-filters" style="padding-top:0;margin-bottom:8px">
      <button
        v-for="category in categories"
        :key="category.id"
        class="sfcat"
        :class="{ on: activeCategory === category.id }"
        type="button"
        @click="activeCategory = category.id"
      >
        {{ category.label }}
      </button>
      <span style="flex:1"></span>
      <select
        v-model="activeSort"
        aria-label="Sort listings"
        style="padding:8px 14px;border-radius:var(--r-pill);background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:.85rem"
      >
        <option value="deeds">Sort · Most deeds</option>
        <option value="newest">Newest</option>
        <option value="priceAsc">Price: low → high</option>
        <option value="priceDesc">Price: high → low</option>
      </select>
    </div>

    <div class="note" style="margin-bottom:26px">
      <span class="note__i">⚠️</span>
      <div>
        Listings with <b>unverified deeds</b> are marked in amber. An unverified deed failed
        the telemetry cross-check — it may be legitimate, but the studio's attestation could not
        be corroborated. Price accordingly.
      </div>
    </div>

    <div class="grid g4 market-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">
      <article v-for="entry in visibleEntries" :key="entry.id" class="lcard">
        <div class="lcard__art">
          <img :src="entry.imageUrl" :alt="entry.name" loading="lazy">
          <span :class="['lcard__tier', 'chip', tierChipClass(entry.tier)]">{{ entry.tier }}</span>
          <span class="lcard__deeds">
            <span
              v-if="entry.deedCount === 0"
              class="chip"
            >
              no deeds
            </span>
            <span
              v-else-if="entry.deedCount > entry.verifiedDeedCount"
              class="chip chip--warn"
            >
              {{ entry.deedCount }} deeds · {{ entry.deedCount - entry.verifiedDeedCount }} unverified
            </span>
            <span v-else class="chip chip--live">✓ {{ entry.deedCount }} deed{{ entry.deedCount > 1 ? 's' : '' }}</span>
          </span>
        </div>
        <div class="lcard__b">
          <p class="lcard__n">{{ entry.name }}</p>
          <p class="lcard__g">{{ entry.gameLabel }}</p>
          <div class="lcard__f">
            <div><p style="font-weight:700;font-size:.95rem">{{ formatSrv(entry.priceSrv) }} SRV</p></div>
            <NuxtLink class="btn btn--ghost btn--sm" :to="entry.href">Buy</NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <p class="sect">Price vs. provenance <span class="sect__act">the thesis, in one row</span></p>
    <div class="card card--pad">
      <div class="grid g2" style="gap:24px">
        <div>
          <p class="t-micro dim" style="margin-bottom:10px">Same schema · same stats · same mint</p>
          <div class="grid" style="gap:11px">
            <div v-for="entry in provenancePair" :key="`pair-${entry.id}`" class="row" style="padding:12px 14px">
              <div class="row__art" style="width:48px;height:48px"><img :src="entry.imageUrl" alt=""></div>
              <div class="row__info">
                <div class="row__n" style="font-size:.88rem">{{ entry.name }}</div>
                <p class="row__d" style="font-size:.78rem">
                  <template v-if="entry.deedCount > 0 && entry.deedCount === entry.verifiedDeedCount">
                    <strong style="color:var(--pink)">{{ entry.deedCount }} deeds</strong> · <span class="vf">✓ all verified</span>
                  </template>
                  <template v-else-if="entry.deedCount > 0">
                    <strong style="color:var(--pink)">{{ entry.deedCount }} deeds</strong> ·
                    <span class="dim">{{ entry.deedCount - entry.verifiedDeedCount }} unverified</span>
                  </template>
                  <template v-else>
                    <span class="dim">0 deeds</span>
                  </template>
                </p>
              </div>
              <div class="row__buy"><p class="row__srv">{{ formatSrv(entry.priceSrv) }}</p><p class="row__usd">SRV</p></div>
            </div>
          </div>
        </div>

        <div>
          <p class="t-micro dim" style="margin-bottom:10px">Fee split on a secondary sale</p>
          <div class="sbar">
            <div style="width:92.5%;background:#7b2ff7">SELLER 92.5%</div>
            <div style="width:5%;background:#e935c1">5%</div>
            <div style="width:2.5%;background:#3ee6e0"></div>
          </div>
          <div class="legend">
            <span><i style="background:#7b2ff7"></i>Seller</span>
            <span><i style="background:#e935c1"></i>Studio royalty 5%</span>
            <span><i style="background:#3ee6e0"></i>Protocol 2.5%</span>
          </div>
          <p class="t-small dim" style="margin-top:14px">
            The original studio earns a royalty on every resale forever — and the deed ledger transfers with the item,
            so the buyer gets the history they paid for.
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
useHead({ title: 'Items & Market · Sverse' })

type GameSummary = {
  id: string
  slug: string
  title: string
}

type ApiListing = {
  id: string
  gameSlug: string
  inventoryItemId: string
  name: string
  imageUrl: string
  priceSrv: string
  deedCount: number
  verifiedDeedCount: number
}

type ApiItem = {
  id: string
  name: string
  kind: string
  priceSrv: string
  interopTier: string
  schemaId: string
  art?: { url?: string }
}

type MarketEntry = {
  id: string
  name: string
  gameSlug: string
  gameLabel: string
  imageUrl: string
  priceSrv: string
  priceValue: number
  deedCount: number
  verifiedDeedCount: number
  tier: string
  kind: string
  schemaId: string
  href: string
  index: number
}

const api = useApi()
const config = useRuntimeConfig()

const activeCategory = ref('all')
const activeSort = ref('deeds')

const categories = [
  { id: 'all', label: 'All items' },
  { id: 'living', label: 'Living only' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'cosmetics', label: 'Cosmetics' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'verified', label: 'Verified deeds only' },
  { id: 'under500', label: 'Under 500 SRV' },
]

const { data } = await useAsyncData('market-global', async () => {
  const gamesResponse = await api.many<GameSummary>('/api/v1/games')
  const games = gamesResponse.data ?? []

  const [listingResponses, itemResponses] = await Promise.all([
    Promise.all(games.map((game) => api.many<ApiListing>(`/api/v1/games/${game.slug}/listings`).catch(() => ({ data: [] as ApiListing[] })))),
    Promise.all(games.map((game) => api.many<ApiItem>(`/api/v1/games/${game.slug}/items`).catch(() => ({ data: [] as ApiItem[] })))),
  ])

  return { games, listingResponses, itemResponses }
})

const allEntries = computed<MarketEntry[]>(() => {
  const games = data.value?.games ?? []
  if (!games.length) return fallbackEntries.value

  const itemCatalog = games.flatMap((game, gameIndex) =>
    (data.value?.itemResponses?.[gameIndex]?.data ?? []).map((item, itemIndex) => ({
      id: item.id,
      gameSlug: game.slug,
      gameLabel: `${game.slug} · ${item.schemaId}`,
      name: item.name,
      imageUrl: item.art?.url || seedAsset(`items/${item.id}.png`),
      priceSrv: item.priceSrv,
      priceValue: parseSrv(item.priceSrv),
      deedCount: 0,
      verifiedDeedCount: 0,
      tier: item.interopTier,
      kind: item.kind,
      schemaId: item.schemaId,
      href: `/store/g/${game.slug}?tab=market`,
      index: 1000 + gameIndex * 100 + itemIndex,
    })),
  )

  const itemByImage = new Map(itemCatalog.map((item) => [item.imageUrl, item]))

  const actualListings = games.flatMap((game, gameIndex) =>
    (data.value?.listingResponses?.[gameIndex]?.data ?? []).map((listing, listingIndex) => {
      const itemMeta = itemByImage.get(listing.imageUrl)
      const kind = itemMeta?.kind ?? inferKind(listing.name)
      const schemaId = itemMeta?.schemaId ?? inferSchema(kind, listing.name)
      const tier = itemMeta?.tier ?? inferTier(schemaId)

      return {
        id: listing.id,
        gameSlug: listing.gameSlug,
        gameLabel: `${listing.gameSlug} · ${schemaId}`,
        name: listing.name,
        imageUrl: listing.imageUrl,
        priceSrv: listing.priceSrv,
        priceValue: parseSrv(listing.priceSrv),
        deedCount: listing.deedCount,
        verifiedDeedCount: listing.verifiedDeedCount,
        tier,
        kind,
        schemaId,
        href: `/store/g/${listing.gameSlug}?tab=market`,
        index: listingIndex + gameIndex * 10,
      } satisfies MarketEntry
    }),
  )

  const usedCatalogIds = new Set(
    actualListings
      .map((listing) => itemByImage.get(listing.imageUrl)?.id)
      .filter(Boolean),
  )

  const supplemental = itemCatalog
    .filter((item) => !usedCatalogIds.has(item.id))
    .slice(0, Math.max(8 - actualListings.length, 0))

  return [...actualListings, ...supplemental]
})

const filteredEntries = computed(() => {
  const source = allEntries.value.length ? allEntries.value : fallbackEntries.value
  return source.filter((entry) => matchesCategory(entry, activeCategory.value))
})

const visibleEntries = computed(() => {
  const sorted = [...filteredEntries.value].sort((left, right) => {
    if (activeSort.value === 'priceAsc') return left.priceValue - right.priceValue
    if (activeSort.value === 'priceDesc') return right.priceValue - left.priceValue
    if (activeSort.value === 'newest') return left.index - right.index
    if (right.deedCount !== left.deedCount) return right.deedCount - left.deedCount
    return right.priceValue - left.priceValue
  })

  return sorted.slice(0, 8)
})

const provenancePair = computed(() => {
  const source = visibleEntries.value.length ? visibleEntries.value : fallbackEntries.value
  const schemaGroups = new Map<string, MarketEntry[]>()

  for (const entry of source) {
    const group = schemaGroups.get(entry.schemaId) ?? []
    group.push(entry)
    schemaGroups.set(entry.schemaId, group)
  }

  for (const group of schemaGroups.values()) {
    if (group.length < 2) continue
    const ranked = [...group].sort((left, right) => right.priceValue - left.priceValue)
    return [ranked[0], ranked[ranked.length - 1]]
  }

  return source.slice(0, 2)
})

const fallbackEntries = computed<MarketEntry[]>(() => [
  makeFallbackEntry('lst_voidblade_legend', 'Voidblade #4412', 'voidrunner', 'sts/weapon/melee/v1', 'T2', 4, 4, '1,840', 'items/itd_vr_blade.png', 'living', 0),
  makeFallbackEntry('lst_hull_221', 'Dreadnought Hull #221', 'hexfleet', 'sts/vehicle/capital/v1', 'T2', 2, 2, '960', 'items/itd_hf_hull.png', 'living', 1),
  makeFallbackEntry('lst_relic_88', 'Scarbound Relic #88', 'grimloop', 'sts/weapon/relic/v1', 'T2', 6, 5, '740', 'items/itd_gl_relic.png', 'living', 2),
  makeFallbackEntry('mkt_jacket', 'Ashmaw Jacket', 'voidrunner', 'sts/cosmetic/wearable/v1', 'T1', 0, 0, '310', 'items/itd_vr_jacket.png', 'cosmetic', 3),
  makeFallbackEntry('mkt_satchel', 'Courier Satchel', 'petalpost', 'sts/bundle/v1', 'T1', 0, 0, '195', 'items/itd_pp_satchel.png', 'bundle', 4),
  makeFallbackEntry('mkt_trail', 'Aurora Trail', 'lumen-leap', 'sts/cosmetic/trail/v1', 'T1', 0, 0, '120', 'items/itd_ll_trail.png', 'cosmetic', 5),
  makeFallbackEntry('mkt_flag', 'Commander Flag', 'hexfleet', 'sts/cosmetic/banner/v1', 'T1', 0, 0, '88', 'items/itd_hf_flag.png', 'cosmetic', 6),
  makeFallbackEntry('mkt_bike', 'Brass Bicycle', 'petalpost', 'sts/cosmetic/vehicle/v1', 'T1', 0, 0, '220', 'items/itd_pp_bike.png', 'cosmetic', 7),
])

function makeFallbackEntry(
  id: string,
  name: string,
  gameSlug: string,
  schemaId: string,
  tier: string,
  deedCount: number,
  verifiedDeedCount: number,
  priceSrv: string,
  assetPath: string,
  kind: string,
  index: number,
): MarketEntry {
  return {
    id,
    name,
    gameSlug,
    gameLabel: `${gameSlug} · ${schemaId}`,
    imageUrl: seedAsset(assetPath),
    priceSrv,
    priceValue: parseSrv(priceSrv),
    deedCount,
    verifiedDeedCount,
    tier,
    kind,
    schemaId,
    href: `/store/g/${gameSlug}?tab=market`,
    index,
  }
}

function matchesCategory(entry: MarketEntry, category: string) {
  if (category === 'living') return entry.kind === 'living'
  if (category === 'weapons') return entry.schemaId.includes('/weapon/')
  if (category === 'cosmetics') return entry.kind === 'cosmetic'
  if (category === 'vehicles') return entry.schemaId.includes('/vehicle/')
  if (category === 'verified') return entry.deedCount > 0 && entry.deedCount === entry.verifiedDeedCount
  if (category === 'under500') return entry.priceValue < 500
  return true
}

function tierChipClass(tier: string) {
  if (tier === 'T2') return 'chip--t2'
  if (tier === 'T1') return 'chip--t1'
  return 'chip--t0'
}

function inferKind(name: string) {
  const value = name.toLowerCase()
  if (value.includes('jacket') || value.includes('cloak') || value.includes('flag') || value.includes('trail') || value.includes('bike')) return 'cosmetic'
  if (value.includes('pack') || value.includes('bundle') || value.includes('satchel')) return 'bundle'
  if (value.includes('charge') || value.includes('token')) return 'consumable'
  return 'living'
}

function inferSchema(kind: string, name: string) {
  const value = name.toLowerCase()
  if (value.includes('hull') || value.includes('bike')) return 'sts/vehicle/capital/v1'
  if (value.includes('flag')) return 'sts/cosmetic/banner/v1'
  if (value.includes('trail')) return 'sts/cosmetic/trail/v1'
  if (kind === 'bundle') return 'sts/bundle/v1'
  if (kind === 'consumable') return 'sts/consumable/charge/v1'
  if (kind === 'cosmetic') return 'sts/cosmetic/wearable/v1'
  if (value.includes('relic')) return 'sts/weapon/relic/v1'
  return 'sts/weapon/melee/v1'
}

function inferTier(schemaId: string) {
  if (schemaId.includes('/weapon/') || schemaId.includes('/vehicle/')) return 'T2'
  if (schemaId.includes('/cosmetic/') || schemaId.includes('/bundle/')) return 'T1'
  return 'T0'
}

function parseSrv(value: string) {
  return Number(String(value ?? '0').replace(/,/g, ''))
}

function formatSrv(value: string | number) {
  return new Intl.NumberFormat('en-US').format(typeof value === 'number' ? value : parseSrv(value))
}

function seedAsset(path: string) {
  const base = String(config.public.apiBase ?? 'http://127.0.0.1:4000').replace(/\/$/, '')
  return `${base}/assets/seed/${path}`
}
</script>

<style scoped>
.market-head {
  max-width: 780px;
}

.market-filters {
  flex-wrap: wrap;
  overflow: visible;
}

.lcard {
  border-radius: var(--r-lg);
  background: var(--surface);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: transform .22s, border-color .22s;
}

.lcard:hover {
  transform: translateY(-4px);
  border-color: rgba(233,53,193,.45);
}

.lcard__art {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg-2);
}

.lcard__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lcard__tier {
  position: absolute;
  top: 8px;
  right: 8px;
}

.lcard__deeds {
  position: absolute;
  bottom: 8px;
  left: 8px;
}

.lcard__b {
  padding: 13px 15px 15px;
}

.lcard__n {
  font-size: .9rem;
  font-weight: 600;
}

.lcard__g {
  font-size: .73rem;
  color: var(--text-dim);
  font-family: var(--mono);
}

.lcard__f {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
</style>
