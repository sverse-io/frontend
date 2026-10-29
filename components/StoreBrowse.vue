<template>
  <main class="sfwrap sfbody">
    <div class="sfcats store-home__cats" role="toolbar" aria-label="Categories">
      <button
        v-for="cat in categories"
        :key="cat.label"
        class="sfcat"
        :class="{ on: activeCategory === cat.label }"
        type="button"
        @click="pickCategory(cat)"
      >
        {{ cat.label }}
      </button>
    </div>

    <section v-if="featured" class="sfhero store-home__hero">
      <div class="sfhero__track">
        <article class="sfslide">
          <img v-if="featured.coverArt?.url" :src="featured.coverArt.url" :alt="`${featured.title} key art`">
          <div class="sfslide__in">
            <div class="sfslide__k">
              <span class="chip chip--yours">TOP BY PROOF-OF-PLAY</span>
              <span class="chip chip--live"><i class="dot"></i>{{ formatCount(featured.stats?.playersLive) }} playing</span>
              <span :class="tierClass(featured.interopTier)">INTEROP {{ featured.interopTier }}</span>
            </div>
            <h2>{{ featured.title }}</h2>
            <p>{{ featured.blurb }}</p>
            <div class="sfslide__cta">
              <NuxtLink class="btn btn--light" :to="`/store/g/${featured.slug}`">▶ View game</NuxtLink>
              <NuxtLink class="btn btn--ghost" :to="`/store/g/${featured.slug}?tab=market`">Secondary market</NuxtLink>
              <span v-if="featured.priceFromSrv" class="t-small dim">Items from {{ groupSrv(featured.priceFromSrv) }} SRV</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <form class="fbar" role="search" @submit.prevent="applySearch">
      <input v-model="searchDraft" type="search" placeholder="Search games" aria-label="Search games" @change="applySearch">
      <select :value="filters.genre" aria-label="Genre" @change="setFilter('genre', ($event.target as HTMLSelectElement).value)">
        <option value="">All genres</option>
        <option v-for="genre in GENRES" :key="genre" :value="genre">{{ genreLabel(genre) }}</option>
      </select>
      <select :value="filters.interopTier" aria-label="Interop tier" @change="setFilter('interopTier', ($event.target as HTMLSelectElement).value)">
        <option value="">Any interop</option>
        <option value="T1">Interop T1</option>
        <option value="T2">Interop T2</option>
      </select>
      <select :value="filters.sort" aria-label="Sort" @change="setFilter('sort', ($event.target as HTMLSelectElement).value)">
        <option value="proof_of_play">Proof-of-Play</option>
        <option value="newest">Newest</option>
      </select>
    </form>

    <section class="shelf">
      <div class="shelf__h">
        <h3>{{ filtered ? 'Results' : 'Ranked for you' }}</h3>
        <button v-if="filtered" class="btn btn--ghost btn--sm" type="button" @click="clearFilters">Reset filters</button>
      </div>
      <p class="shelf__s">
        Ranked by <b>Proof-of-Play</b> — verified playtime from reputable passports, never download counts.
      </p>
      <div v-if="status === 'pending' && !games.length" class="store-grid store-grid--games" aria-busy="true">
        <div v-for="n in 6" :key="n" class="tcard">
          <div class="sk" style="aspect-ratio:1;border-radius:var(--r-lg)"></div>
          <div class="tcard__b">
            <div class="sk" style="height:14px;width:80%"></div>
            <div class="sk" style="height:11px;width:55%;margin-top:7px"></div>
          </div>
        </div>
      </div>
      <ErrorState v-else-if="error" title="Store unavailable" :error="error" :retry="refresh" />
      <EmptyState v-else-if="!games.length && filtered" icon="◌" title="No games match that filter" body="Try widening the genre, or clear the interop tier.">
        <button class="btn btn--ghost btn--sm" type="button" @click="clearFilters">Clear filters</button>
      </EmptyState>
      <EmptyState v-else-if="!games.length" icon="🚀" title="No games are live yet" body="Be the first — publish a game from the Studio console.">
        <a class="btn btn--grad btn--sm" :href="studioUrl">Open the Studio</a>
      </EmptyState>
      <template v-else>
        <div class="store-grid store-grid--games">
          <GameCard v-for="game in games" :key="game.id" :game="game" wide />
        </div>
        <div v-if="nextCursor" style="text-align:center;margin-top:20px">
          <button class="btn btn--ghost btn--sm" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load more games' }}</button>
        </div>
      </template>
    </section>

    <template v-if="!filtered && games.length">
      <section v-if="interopGames.length" class="shelf">
        <div class="shelf__h">
          <h3>Your cosmetics render here</h3>
          <NuxtLink to="/passport/wardrobe">Your wardrobe →</NuxtLink>
        </div>
        <p class="shelf__s">
          The <b>interop graph</b> as a discovery engine — these games publish an interop envelope at T1 or better.
        </p>
        <div class="store-grid store-grid--games store-grid--compact">
          <GameCard v-for="game in interopGames" :key="`interop-${game.id}`" :game="game" />
        </div>
      </section>

      <section class="shelf">
        <div class="shelf__h">
          <h3>Top charts</h3>
        </div>
        <p class="shelf__s">By weighted playtime. A low-reputation passport's hours count for almost nothing here, which keeps the chart honest.</p>
        <div class="grid g2" style="gap:10px 34px">
          <div v-for="(column, c) in chartColumns" :key="c" class="grid" style="gap:10px">
            <NuxtLink v-for="(game, i) in column" :key="`chart-${game.id}`" class="row" :to="`/store/g/${game.slug}`">
              <span class="t-mono dim" style="width:22px">{{ c * chartColumns[0]!.length + i + 1 }}</span>
              <div class="row__art"><img v-if="game.coverArt?.url" :src="game.coverArt.url" alt="" loading="lazy"></div>
              <div class="row__info">
                <div class="row__n">{{ game.title }} <span :class="tierClass(game.interopTier)">{{ game.interopTier }}</span></div>
                <p class="row__d">@{{ game.studio?.handle }} · {{ formatNumber(game.stats?.proofOfPlayScore ?? 0) }} PoP score</p>
              </div>
              <div class="row__buy">
                <p class="row__srv">{{ formatCount(game.stats?.playersLive ?? 0) }}</p>
                <p class="row__usd">playing</p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section class="shelf">
        <div class="shelf__h">
          <h3>Item packs from the top games</h3>
          <NuxtLink to="/market">Open the market →</NuxtLink>
        </div>
        <p class="shelf__s">Every price settles in SRV from your passport balance.</p>
        <div v-if="dropsStatus === 'pending' && !drops.length" class="store-grid store-grid--drops" aria-busy="true">
          <div v-for="n in 4" :key="n" class="sk" style="aspect-ratio:3/4;border-radius:var(--r-lg)"></div>
        </div>
        <ErrorState v-else-if="dropsError" title="Could not load item packs" :error="dropsError" :retry="refreshDrops" />
        <EmptyState v-else-if="!drops.length" icon="🛍" title="No item packs on sale" body="Studios have not listed any packs yet." />
        <div v-else class="store-grid store-grid--drops">
          <article v-for="drop in drops" :key="drop.item.id" class="tcard">
            <div class="tcard__art">
              <div class="tcard__tags"><span :class="tierClass(drop.item.interopTier)">{{ drop.item.interopTier }}</span></div>
              <img v-if="drop.item.art?.url" :src="drop.item.art.url" :alt="drop.item.name" loading="lazy">
            </div>
            <div class="tcard__b">
              <p class="tcard__t">{{ drop.item.name }}</p>
              <p class="tcard__s"><NuxtLink :to="`/store/g/${drop.game.slug}`">{{ drop.game.title }}</NuxtLink> · {{ drop.item.kind }}</p>
              <p class="tcard__m"><span>{{ groupSrv(drop.item.priceSrv) }} SRV</span><span>·</span><span>${{ drop.item.priceUsdSnapshot }}</span></p>
              <button
                class="btn btn--sm"
                :class="isOwned(drop.item) ? 'btn--ghost is-off' : 'btn--grad'"
                style="margin-top:9px"
                type="button"
                :disabled="isOwned(drop.item)"
                @click="checkout = drop"
              >
                {{ isOwned(drop.item) ? 'Owned' : 'Buy' }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <CheckoutModal
      v-if="checkout"
      :item="checkout.item"
      :game-title="checkout.game.title"
      @close="checkout = null"
      @purchased="ownedNow.add(checkout!.item.id)"
      @owned="ownedNow.add(checkout!.item.id)"
    />
  </main>
</template>

<script setup lang="ts">
import type { Collection, GameSummary, ItemDefinition } from '~/types/sverse'

const GENRES = ['action_rpg', 'puzzle', 'strategy', 'cozy', 'arcade', 'platformer']

interface Category {
  label: string
  sort?: string
  genre?: string
  interopTier?: string
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const config = useRuntimeConfig()
const studioUrl = computed(() => String(config.public.studioUrl))

const categories: Category[] = [
  { label: 'For you' },
  { label: 'Top charts', sort: 'proof_of_play' },
  { label: 'New releases', sort: 'newest' },
  ...GENRES.map((genre) => ({ label: genreLabel(genre), genre })),
  { label: 'Interop T1', interopTier: 'T1' },
  { label: 'Interop T2', interopTier: 'T2' },
]

function queryValue(key: string) {
  const value = route.query[key]
  return String(Array.isArray(value) ? value[0] ?? '' : value ?? '')
}

// The URL is the source of truth for filters (spec 04 §5).
const filters = computed(() => ({
  q: queryValue('q'),
  genre: GENRES.includes(queryValue('genre')) ? queryValue('genre') : '',
  interopTier: ['T1', 'T2', 'T3'].includes(queryValue('interopTier')) ? queryValue('interopTier') : '',
  sort: queryValue('sort') === 'newest' ? 'newest' : 'proof_of_play',
}))
const filtered = computed(() => Boolean(filters.value.q || filters.value.genre || filters.value.interopTier || filters.value.sort !== 'proof_of_play'))
const activeCategory = computed(() => {
  const f = filters.value
  if (f.q) return ''
  if (f.genre && !f.interopTier) return genreLabel(f.genre)
  if (f.interopTier && !f.genre) return `Interop ${f.interopTier}`
  if (!f.genre && !f.interopTier) return f.sort === 'newest' ? 'New releases' : 'For you'
  return ''
})

const searchDraft = ref(filters.value.q)
watch(() => filters.value.q, (value) => (searchDraft.value = value))

const apiQuery = computed(() => ({
  q: filters.value.q || undefined,
  genre: filters.value.genre || undefined,
  interopTier: filters.value.interopTier || undefined,
  sort: filters.value.sort,
  limit: 24,
}))

const { data, status, error, refresh } = await useAsyncData('games:browse', () => api.many<GameSummary>('/api/v1/games', { query: apiQuery.value }), {
  watch: [apiQuery],
})

const extra = ref<GameSummary[]>([])
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

const games = computed(() => [...(data.value?.data ?? []), ...extra.value])
const featured = computed(() => (filtered.value ? null : games.value[0] ?? null))
const interopGames = computed(() => games.value.filter((game) => game.interopTier !== 'T0').slice(0, 4))
const chartColumns = computed(() => {
  const chart = [...games.value].sort((a, b) => Number(b.stats?.proofOfPlayScore ?? 0) - Number(a.stats?.proofOfPlayScore ?? 0)).slice(0, 8)
  const middle = Math.ceil(chart.length / 2)
  return [chart.slice(0, middle), chart.slice(middle)]
})

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page: Collection<GameSummary> = await api.many<GameSummary>('/api/v1/games', { query: { ...apiQuery.value, cursor: nextCursor.value } })
    extra.value = [...extra.value, ...page.data]
    nextCursor.value = page.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}

function setFilter(key: 'q' | 'genre' | 'interopTier' | 'sort', value: string) {
  const next: Record<string, string | undefined> = { ...filters.value, [key]: value }
  router.replace({
    query: {
      q: next.q || undefined,
      genre: next.genre || undefined,
      interopTier: next.interopTier || undefined,
      sort: next.sort && next.sort !== 'proof_of_play' ? next.sort : undefined,
    },
  })
}

function applySearch() {
  if (searchDraft.value.trim() !== filters.value.q) setFilter('q', searchDraft.value.trim())
}

function pickCategory(cat: Category) {
  router.replace({ query: { genre: cat.genre, interopTier: cat.interopTier, sort: cat.sort && cat.sort !== 'proof_of_play' ? cat.sort : undefined } })
}

function clearFilters() {
  router.replace({ query: {} })
}

// ── Item packs from the top two games (lazy, client-side) ──────────────────
const dropGames = computed(() => games.value.slice(0, 2).map((game) => ({ slug: game.slug, title: game.title })))
const {
  data: dropsData,
  status: dropsStatus,
  error: dropsError,
  refresh: refreshDrops,
} = useAsyncData(
  'games:drops',
  async () => {
    const results = await Promise.all(
      dropGames.value.map(async (game) => (await api.many<ItemDefinition>(`/api/v1/games/${game.slug}/items`)).data.slice(0, 2).map((item) => ({ item, game }))),
    )
    return results.flat()
  },
  { server: false, lazy: true, watch: [dropGames], default: () => [] as Array<{ item: ItemDefinition; game: { slug: string; title: string } }> },
)
const drops = computed(() => dropsData.value ?? [])
const ownedNow = reactive(new Set<string>())
const checkout = ref<{ item: ItemDefinition; game: { slug: string; title: string } } | null>(null)

function isOwned(item: ItemDefinition) {
  return !item.stackable && (item.owned || ownedNow.has(item.id))
}
</script>
