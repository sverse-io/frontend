<template>
  <main class="sfwrap sfbody">
    <div class="phead market-head" style="padding-top:30px">
      <p class="eyebrow">Secondary market</p>
      <h1 class="t-h2" style="font-size:2.1rem">Buy history, not just stats</h1>
      <p>
        Every listing shows its deed count and verification mix <b>before</b> you open it.
        Two items with identical stats can differ several times in price — that difference is provenance.
      </p>
    </div>

    <form class="fbar" role="search" style="margin-bottom:18px" @submit.prevent="applySearch">
      <input v-model="searchDraft" type="search" placeholder="Search listings" aria-label="Search listings" @change="applySearch">
      <select :value="filters.game" aria-label="Game" @change="setFilter('game', ($event.target as HTMLSelectElement).value)">
        <option value="">All games</option>
        <option v-for="game in gameOptions" :key="game.id" :value="game.slug">{{ game.title }}</option>
      </select>
      <select :value="filters.sort" aria-label="Sort listings" @change="setFilter('sort', ($event.target as HTMLSelectElement).value)">
        <option value="price_asc">Price: low → high</option>
        <option value="price_desc">Price: high → low</option>
        <option value="newest">Newest</option>
        <option value="most_deeds">Most deeds</option>
      </select>
      <button v-if="filtered" class="btn btn--ghost btn--sm" type="button" @click="clearFilters">Clear filters</button>
    </form>

    <div class="note" style="margin-bottom:26px">
      <span class="note__i">⚠️</span>
      <div>
        Listings whose deeds are not all <b>attested</b> are marked in amber. An unverified deed failed the telemetry cross-check — it may be legitimate,
        but the studio's attestation could not be corroborated. Open <b>History</b> and price accordingly.
      </div>
    </div>

    <div v-if="status === 'pending' && !listings.length" class="grid market-grid" aria-busy="true">
      <div v-for="n in 8" :key="n" class="sk" style="aspect-ratio:3/4;border-radius:var(--r-lg)"></div>
    </div>
    <ErrorState v-else-if="error" title="Market unavailable" :error="error" :retry="refresh" />
    <EmptyState v-else-if="!listings.length && filtered" icon="◌" title="No listings match" body="Try another game or clear the search.">
      <button class="btn btn--ghost btn--sm" type="button" @click="clearFilters">Clear filters</button>
    </EmptyState>
    <EmptyState v-else-if="!listings.length" icon="⇄" title="The market is empty" body="When players list items they appear here with their deed history. List one of yours from your passport.">
      <NuxtLink class="btn btn--ghost btn--sm" to="/passport">Open your passport</NuxtLink>
    </EmptyState>
    <template v-else>
      <div class="grid market-grid">
        <ListingCard v-for="listing in listings" :key="listing.id" :listing="listing" @buy="buying = $event" @history="history = $event" />
      </div>
      <div v-if="nextCursor" style="text-align:center;margin-top:20px">
        <button class="btn btn--ghost btn--sm" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
      </div>

      <template v-if="pair">
        <p class="sect">Price vs. provenance <span class="sect__act">same schema, different history</span></p>
        <div class="card card--pad">
          <div class="grid g2" style="gap:24px">
            <div>
              <p class="t-micro dim" style="margin-bottom:10px">{{ pair[0].schemaId }}</p>
              <div class="grid" style="gap:11px">
                <div v-for="entry in pair" :key="`pair-${entry.id}`" class="row" style="padding:12px 14px">
                  <div class="row__art" style="width:48px;height:48px"><img :src="entry.imageUrl" alt=""></div>
                  <div class="row__info">
                    <div class="row__n" style="font-size:.88rem">{{ entry.name }}</div>
                    <p class="row__d" style="font-size:.78rem"><DeedMix :count="entry.deedCount" :verified="entry.verifiedDeedCount" /></p>
                  </div>
                  <div class="row__buy"><p class="row__srv">{{ groupSrv(entry.priceSrv) }}</p><p class="row__usd">SRV</p></div>
                </div>
              </div>
            </div>
            <div>
              <p class="t-micro dim" style="margin-bottom:10px">Fee split on a secondary sale</p>
              <div class="sbar">
                <div :style="{ width: `${sellerPct}%`, background: 'var(--violet)' }">SELLER {{ sellerPct }}%</div>
                <div :style="{ width: `${royaltyPct}%`, background: 'var(--magenta)' }"></div>
                <div :style="{ width: `${protocolPct}%`, background: 'var(--cyan)' }"></div>
              </div>
              <div class="legend">
                <span><i style="background:var(--violet)"></i>Seller</span>
                <span><i style="background:var(--magenta)"></i>Studio royalty {{ royaltyPct }}%</span>
                <span><i style="background:var(--cyan)"></i>Protocol {{ protocolPct }}%</span>
              </div>
              <p class="t-small dim" style="margin-top:14px">
                The original studio earns a royalty on every resale, and the deed ledger transfers with the item — the buyer gets the history they paid for.
              </p>
            </div>
          </div>
        </div>
      </template>
    </template>

    <DeedLedgerModal v-if="history?.inventoryItemId" :inventory-item-id="history.inventoryItemId" :name="history.name" :schema-id="history.schemaId" @close="history = null" />
    <ListingBuyModal v-if="buying" :listing="buying" @close="buying = null" @bought="removeListing(buying!.id)" @gone="removeListing" />
  </main>
</template>

<script setup lang="ts">
import type { Listing } from '~/types/sverse'

useHead({ title: 'Items & Market · Sverse' })

const SORTS = ['price_asc', 'price_desc', 'newest', 'most_deeds'] as const

const route = useRoute()
const router = useRouter()
const api = useApi()
const { data: gameOptions } = useGameOptions()

function queryValue(key: string) {
  const value = route.query[key]
  return String(Array.isArray(value) ? value[0] ?? '' : value ?? '')
}

const filters = computed(() => ({
  q: queryValue('q'),
  game: queryValue('game'),
  sort: (SORTS as readonly string[]).includes(queryValue('sort')) ? queryValue('sort') : 'price_asc',
}))
const filtered = computed(() => Boolean(filters.value.q || filters.value.game || filters.value.sort !== 'price_asc'))
const apiQuery = computed(() => ({ q: filters.value.q || undefined, game: filters.value.game || undefined, sort: filters.value.sort, limit: 24 }))

const searchDraft = ref(filters.value.q)
watch(() => filters.value.q, (value) => (searchDraft.value = value))

const { data, status, error, refresh } = await useAsyncData('market:listings', () => api.many<Listing>('/api/v1/market/listings', { query: apiQuery.value }), {
  watch: [apiQuery],
})

const extra = ref<Listing[]>([])
const removed = reactive(new Set<string>())
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
watch(
  data,
  (value) => {
    extra.value = []
    nextCursor.value = value?.meta?.nextCursor ?? null
  },
  { immediate: true },
)

const listings = computed(() => [...(data.value?.data ?? []), ...extra.value].filter((listing) => !removed.has(listing.id)))
const buying = ref<Listing | null>(null)
const history = ref<Listing | null>(null)

// Two listings of the same schema with the widest price gap illustrate provenance pricing.
const pair = computed<[Listing, Listing] | null>(() => {
  const groups = new Map<string, Listing[]>()
  for (const listing of listings.value) {
    if (!listing.schemaId) continue
    groups.set(listing.schemaId, [...(groups.get(listing.schemaId) ?? []), listing])
  }
  let best: [Listing, Listing] | null = null
  let bestGap = -1n
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => compareUnits(b.priceUnits, a.priceUnits))
    const high = sorted[0]!
    const low = sorted[sorted.length - 1]!
    const gap = BigInt(high.priceUnits) - BigInt(low.priceUnits)
    if (gap > bestGap) {
      bestGap = gap
      best = [high, low]
    }
  }
  return best
})
const royaltyPct = computed(() => (pair.value?.[0].royaltyBps ?? 500) / 100)
const protocolPct = computed(() => (pair.value?.[0].protocolBps ?? 250) / 100)
const sellerPct = computed(() => 100 - royaltyPct.value - protocolPct.value)

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await api.many<Listing>('/api/v1/market/listings', { query: { ...apiQuery.value, cursor: nextCursor.value } })
    extra.value = [...extra.value, ...page.data]
    nextCursor.value = page.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}

function setFilter(key: 'q' | 'game' | 'sort', value: string) {
  const next = { ...filters.value, [key]: value }
  router.replace({ query: { q: next.q || undefined, game: next.game || undefined, sort: next.sort !== 'price_asc' ? next.sort : undefined } })
}

function applySearch() {
  if (searchDraft.value.trim() !== filters.value.q) setFilter('q', searchDraft.value.trim())
}

function clearFilters() {
  router.replace({ query: {} })
}

function removeListing(id: string) {
  removed.add(id)
}
</script>
