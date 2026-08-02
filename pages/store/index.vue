<template>
  <main class="sfwrap sfbody">
    <div class="sfcats store-home__cats">
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

    <section class="sfhero store-home__hero">
      <div class="sfhero__track">
        <article v-for="slide in featuredSlides" :key="slide.title" class="sfslide">
          <img :src="slide.image" :alt="`${slide.title} key art`">
          <div class="sfslide__in">
            <div class="sfslide__k">
              <span class="chip chip--yours">{{ slide.badge }}</span>
              <span class="chip chip--live"><i class="dot"></i>{{ slide.playing }} playing</span>
              <span :class="tierClass(slide.tier)">INTEROP {{ slide.tier }}</span>
            </div>
            <h2>{{ slide.title }}</h2>
            <p>{{ slide.copy }}</p>
            <div class="sfslide__cta">
              <NuxtLink class="btn btn--light" :to="slide.href">▶ Play free</NuxtLink>
              <NuxtLink class="btn btn--ghost" :to="`${slide.href}?tab=market`">Learn more</NuxtLink>
              <span class="t-small dim">Items from {{ slide.from }} SRV</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div class="fbar">
      <input v-model="q" placeholder="Search games" aria-label="Search games">
      <select v-model="genre" aria-label="Genre">
        <option value="">All genres</option>
        <option value="action_rpg">Action RPG</option>
        <option value="platformer">Platformer</option>
      </select>
      <select v-model="interopTier" aria-label="Interop tier">
        <option value="">Any interop</option>
        <option value="T1">Interop T1</option>
        <option value="T2">Interop T2</option>
      </select>
      <select v-model="sort" aria-label="Sort">
        <option value="proof_of_play">Proof-of-Play</option>
        <option value="newest">Newest</option>
      </select>
    </div>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Recommended for you</h3>
        <button class="btn btn--ghost btn--sm" type="button" @click="clearFilters">Reset filters</button>
      </div>
      <p class="shelf__s">
        Ranked by <b>Proof-of-Play</b> — verified playtime from reputable passports, never download counts.
      </p>
      <div v-if="pending" class="store-grid store-grid--games">
        <div v-for="n in 6" :key="n" class="tcard">
          <div class="sk" style="aspect-ratio:1;border-radius:var(--r-lg)"></div>
          <div class="tcard__b">
            <div class="sk" style="height:14px;width:80%"></div>
            <div class="sk" style="height:11px;width:55%;margin-top:7px"></div>
          </div>
        </div>
      </div>
      <EmptyState v-else-if="error" title="Store unavailable" body="Retry after the backend is running." />
      <EmptyState v-else-if="!games.length" title="No games match that filter" body="Try widening the genre, or clear the interop tier.">
        <button class="btn btn--ghost btn--sm" type="button" @click="clearFilters">Clear filters</button>
      </EmptyState>
      <div v-else class="store-grid store-grid--games">
        <GameCard v-for="game in recommendedGames" :key="game.id" :game="game" wide />
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Because your jacket renders here</h3>
        <NuxtLink to="/passport/wardrobe">Your wardrobe →</NuxtLink>
      </div>
      <p class="shelf__s">
        The <b>interop graph</b> as a discovery engine — these games accept
        <span class="t-mono">sts/cosmetic/wearable/v1</span> at T1 or better.
      </p>
      <div class="store-grid store-grid--games store-grid--compact">
        <GameCard v-for="game in interopGames" :key="`interop-${game.id}`" :game="game" />
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Curated by Sverse</h3>
        <a href="#">All collections →</a>
      </div>
      <p class="shelf__s">Editorial shelves and cross-game bundles that only a shared-currency network can put together.</p>
      <div class="store-grid store-grid--banners">
        <a v-for="banner in banners" :key="banner.title" class="fbanner" :href="banner.href">
          <img :src="banner.image" alt="" loading="lazy">
          <div class="fbanner__in">
            <span :class="banner.chip" style="margin-bottom:9px">{{ banner.badge }}</span>
            <h4 class="t-h3">{{ banner.title }}</h4>
            <p class="t-small dim">{{ banner.copy }}</p>
          </div>
        </a>
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Top charts · this week</h3>
        <a href="#">Full chart →</a>
      </div>
      <p class="shelf__s">
        By weighted playtime. A low-reputation passport's hours count for almost nothing here, which keeps the chart honest.
      </p>
      <div class="grid g2" style="gap:10px 34px">
        <div v-for="(column, c) in chartColumns" :key="c" class="grid" style="gap:10px">
          <NuxtLink v-for="game in column" :key="`chart-${c}-${game.id}`" class="row" :to="`/store/g/${game.slug}`">
            <div class="row__art"><img :src="game.coverArt?.url" alt="" loading="lazy"></div>
            <div class="row__info">
              <div class="row__n">{{ game.title }} <span :class="tierClass(game.interopTier)">{{ game.interopTier }}</span></div>
              <p class="row__d">{{ game.studio?.handle }} · {{ formatNumber(game.stats?.proofOfPlayScore ?? 0) }} PoP score</p>
            </div>
            <div class="row__buy">
              <p class="row__srv">{{ formatPlaying(game.stats?.playersLive ?? 0) }}</p>
              <p class="row__usd">playing</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>New from one-human studios</h3>
        <a href="#">See more →</a>
      </div>
      <p class="shelf__s">Your own drafts and submissions appear here first, tagged.</p>
      <div class="store-grid store-grid--games store-grid--compact">
        <GameCard v-for="game in newGames" :key="`new-${game.id}`" :game="game" />
      </div>
    </section>

    <section class="shelf">
      <div class="shelf__h">
        <h3>Item packs &amp; drops</h3>
        <NuxtLink to="/market">Open the market →</NuxtLink>
      </div>
      <p class="shelf__s">
        Every price settles in SRV. Card payments route through the fiat on-ramp and buy the same SRV on-market.
      </p>
      <div class="store-grid store-grid--drops">
        <article v-for="drop in drops" :key="drop.name" class="tcard">
          <div class="tcard__art">
            <div class="tcard__tags"><span :class="tierClass(drop.tier)">{{ drop.tier }}</span></div>
            <img :src="drop.image" :alt="drop.name" loading="lazy">
          </div>
          <div class="tcard__b">
            <p class="tcard__t">{{ drop.name }}</p>
            <p class="tcard__s">{{ drop.game }} · {{ drop.kind }}</p>
            <p class="tcard__m"><span>{{ drop.price }} SRV</span><span>·</span><span>${{ drop.usd }}</span></p>
            <button class="btn btn--grad btn--sm" style="margin-top:9px" type="button" @click="checkout = drop">Buy</button>
          </div>
        </article>
      </div>
    </section>

    <section class="sfsection">
      <p class="sect">State: empty (filtered)</p>
      <div class="empty">
        <div class="empty__i">◌</div>
        <h4>No games match that filter</h4>
        <p>Try widening the genre, or clear the interop tier.</p>
        <button class="btn btn--ghost btn--sm" style="margin-top:16px" type="button" @click="clearFilters">Clear filters</button>
      </div>
    </section>

    <div v-if="checkout" class="backdrop" @click.self="checkout = null">
      <div class="modal">
        <div class="modal__h">
          <div><h3>Confirm purchase</h3><p>{{ checkout.name }} · {{ checkout.game }}</p></div>
          <button class="modal__x" type="button" @click="checkout = null">✕</button>
        </div>
        <div class="modal__b">
          <div class="rows">
            <div><span>Item</span><strong>{{ checkout.name }}</strong></div>
            <div><span>Quoted in USD, settled in SRV</span><strong>${{ checkout.usd }}</strong></div>
            <div class="tot"><span>You pay</span><strong>{{ checkout.price }} SRV</strong></div>
          </div>
          <div style="margin-top:16px">
            <div class="sbar">
              <div style="width:90%;background:var(--violet)">STUDIOS 90%</div>
              <div style="width:10%;background:var(--magenta)">10%</div>
            </div>
            <p class="t-small dim" style="margin-top:8px">
              Revenue splits instantly to participating studios. The protocol fee feeds buyback, creator rewards, Play-and-Earn, treasury and curators.
            </p>
          </div>
          <div class="note" style="margin-top:16px">
            <span class="note__i">⚡</span>
            <div>Settles on <b>Avalanche</b> in under 2 seconds.</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" @click="checkout = null">Cancel</button>
          <button class="btn btn--grad" type="button" @click="checkout = null">Pay {{ checkout.price }} SRV</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
useHead({ title: 'Store · Sverse' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const config = useRuntimeConfig()

if (route.path === '/store') {
  await navigateTo('/', { redirectCode: 301, replace: true })
}

const q = ref(String(route.query.q ?? ''))
const genre = ref(String(route.query.genre ?? ''))
const interopTier = ref(String(route.query.interopTier ?? ''))
const sort = ref(String(route.query.sort ?? 'proof_of_play'))
const activeCategory = ref('For you')
const checkout = ref<any | null>(null)

const categories = [
  { label: 'For you' },
  { label: 'Top charts', sort: 'proof_of_play' },
  { label: 'New releases', sort: 'newest' },
  { label: 'Action RPG', genre: 'action_rpg' },
  { label: 'Strategy' },
  { label: 'Puzzle' },
  { label: 'Cozy' },
  { label: 'Arcade' },
  { label: 'Platformer', genre: 'platformer' },
  { label: 'Interop T1+', interopTier: 'T1' },
  { label: 'Living Items' },
  { label: 'Free to play' },
]

const query = computed(() => ({
  q: q.value || undefined,
  genre: genre.value || undefined,
  interopTier: interopTier.value || undefined,
  sort: sort.value || 'proof_of_play',
}))

const { data, pending, error, refresh } = await useAsyncData('games', () =>
  api.many<any>('/api/v1/games', { query: query.value }),
)

const games = computed(() => data.value?.data ?? [])
const recommendedGames = computed(() => games.value.slice(0, 6))
const interopGames = computed(() => games.value.filter((game: any) => game.interopTier !== 'T0').slice(0, 4))
const newGames = computed(() => [...games.value].sort((a: any, b: any) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? ''))).slice(0, 4))
const assetBase = computed(() => String(config.public.apiBase ?? 'http://127.0.0.1:4000').replace(/\/$/, ''))
const chartColumns = computed(() => {
  const chart = [...games.value]
    .sort((a: any, b: any) => Number(b.stats?.proofOfPlayScore ?? 0) - Number(a.stats?.proofOfPlayScore ?? 0))
    .slice(0, 8)
  const middle = Math.ceil(chart.length / 2)
  return [chart.slice(0, middle), chart.slice(middle)]
})

const heroSlides = computed(() => {
  const source = games.value.length ? games.value : fallbackHeroGames
  return source.slice(0, 3).map((game: any, index: number) => ({
    title: game.title,
    image: game.coverArt?.url ?? `https://picsum.photos/seed/hero-${index}/1920/900`,
    badge: index === 0 ? "EDITOR'S CHOICE" : game.tokenizationLevel === 'L4' ? 'FULLY ON-CHAIN' : 'CROSS-GAME',
    playing: formatPlaying(game.stats?.playersLive ?? game.stats?.dau ?? 0),
    tier: game.interopTier ?? 'T1',
    copy: game.blurb ?? game.description ?? 'A Sverse game with portable ownership and shared item provenance.',
    href: `/store/g/${game.slug}`,
    from: game.priceFromSrv ?? 85,
  }))
})

const featuredSlides = computed(() => heroSlides.value.slice(0, 1))

const fallbackHeroGames = [
  {
    title: 'Voidrunner',
    slug: 'voidrunner',
    blurb: 'A one-button roguelike about falling upward. Your blade remembers every run.',
    interopTier: 'T2',
    tokenizationLevel: 'L3',
    priceFromSrv: '85',
    coverArt: { url: seedAsset('games/voidrunner-cover.png') },
    stats: { playersLive: 12480 },
  },
]

const banners = computed(() => {
  const source = games.value.length ? games.value : fallbackCuratedGames
  const bySlug = new Map(source.map((game: any) => [game.slug, game]))
  const fallback = source[0]
  const featured = bySlug.get('voidrunner') ?? fallback
  const living = bySlug.get('grimloop') ?? bySlug.get('hexfleet') ?? fallback
  const wardrobe = bySlug.get('petalpost') ?? bySlug.get('lumen-leap') ?? fallback
  const soloCount = source.filter((game: any) => game.studio?.oneHumanStudio).length || 5
  const interopCount = source.filter((game: any) => ['T1', 'T2'].includes(game.interopTier)).length

  return [
    {
      title: 'One-human breakouts',
      badge: 'CURATED',
      copy: `${soloCount} solo studios are live in this seed, led by ${featured.title} and ${wardrobe.title}.`,
      image: featured.coverArt?.url ?? seedAsset('games/voidrunner-cover.png'),
      chip: 'chip chip--yours',
      href: featured.slug ? `/store/g/${featured.slug}` : '/store',
    },
    {
      title: 'Buy the run history',
      badge: 'LIVING ITEMS',
      copy: `${living.title} anchors the provenance shelf with verified clears and premium T2 ownership.`,
      image: living.coverArt?.url ?? seedAsset('games/grimloop-cover.png'),
      chip: 'chip chip--t2',
      href: '/market',
    },
    {
      title: 'Wear it across the graph',
      badge: 'DIGITAL FASHION',
      copy: `${interopCount} live games already accept T1 cosmetics, with ${wardrobe.title} driving the highest wardrobe crossover.`,
      image: wardrobe.coverArt?.url ?? seedAsset('games/petalpost-cover.png'),
      chip: 'chip chip--t1',
      href: '/passport/wardrobe',
    },
  ]
})

const drops = computed(() => [
  {
    name: 'Starter Pack',
    game: 'Voidrunner',
    kind: 'bundle',
    tier: 'T2',
    price: '120',
    usd: formatUsdFromSrv(120),
    image: seedAsset('items/itd_vr_starter.png'),
  },
  {
    name: 'Ashmaw Jacket',
    game: 'Voidrunner',
    kind: 'cosmetic',
    tier: 'T1',
    price: '85',
    usd: formatUsdFromSrv(85),
    image: seedAsset('items/itd_vr_jacket.png'),
  },
  {
    name: 'Aurora Trail',
    game: 'Lumen Leap',
    kind: 'cosmetic',
    tier: 'T1',
    price: '61',
    usd: formatUsdFromSrv(61),
    image: seedAsset('items/itd_ll_trail.png'),
  },
])

const fallbackCuratedGames = [
  {
    title: 'Voidrunner',
    slug: 'voidrunner',
    interopTier: 'T2',
    studio: { oneHumanStudio: true },
    coverArt: { url: seedAsset('games/voidrunner-cover.png') },
  },
  {
    title: 'Grimloop',
    slug: 'grimloop',
    interopTier: 'T2',
    studio: { oneHumanStudio: true },
    coverArt: { url: seedAsset('games/grimloop-cover.png') },
  },
  {
    title: 'Petalpost',
    slug: 'petalpost',
    interopTier: 'T1',
    studio: { oneHumanStudio: true },
    coverArt: { url: seedAsset('games/petalpost-cover.png') },
  },
  {
    title: 'Lumen Leap',
    slug: 'lumen-leap',
    interopTier: 'T1',
    studio: { oneHumanStudio: true },
    coverArt: { url: seedAsset('games/lumen-leap-cover.png') },
  },
]

watch(query, async (value) => {
  await router.replace({ query: value })
  await refresh()
})

watch(
  () => route.query.q,
  (value) => {
    q.value = String(value ?? '')
  },
)

function pickCategory(cat: any) {
  activeCategory.value = cat.label
  genre.value = cat.genre ?? ''
  interopTier.value = cat.interopTier ?? ''
  sort.value = cat.sort ?? 'proof_of_play'
}

function clearFilters() {
  activeCategory.value = 'For you'
  q.value = ''
  genre.value = ''
  interopTier.value = ''
  sort.value = 'proof_of_play'
}

function tierClass(tier: string) {
  return ['chip', tier === 'T2' ? 'chip--t2' : tier === 'T1' ? 'chip--t1' : 'chip--t0'].join(' ')
}

function seedAsset(path: string) {
  return `${assetBase.value}/assets/seed/${path}`
}

function formatPlaying(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}

function formatUsdFromSrv(value: number) {
  return (value * 0.042).toFixed(2)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}
</script>
