<template>
  <main class="sfwrap sfbody" style="max-width:1400px;padding-top:26px">
    <template v-if="gameStatus === 'pending' && !game">
      <div class="sk" style="height:360px;border-radius:var(--r-xl);margin-bottom:24px"></div>
      <div class="grid" style="gap:13px">
        <div v-for="n in 3" :key="n" class="sk" style="height:86px;border-radius:14px"></div>
      </div>
    </template>
    <EmptyState
      v-else-if="notFound"
      icon="🕳"
      title="Game not found"
      body="This game is unpublished, delisted, or the link is wrong."
    >
      <NuxtLink class="btn btn--ghost btn--sm" to="/">Back to the Store</NuxtLink>
    </EmptyState>
    <ErrorState v-else-if="gameError || !game" title="Could not load this game" :error="gameError" :retry="refreshGame" />
    <template v-else>
      <section class="ghero">
        <div class="ghero__art" :style="heroStyle">
          <img v-if="game.coverArt?.url" :src="game.coverArt.url" :alt="`${game.title} key art`">
        </div>
        <div class="ghero__b">
          <div>
            <h1 class="ghero__t">{{ game.title }}</h1>
            <p class="ghero__m">@{{ game.studio.handle }} · {{ genreLabel(game.genre) }}</p>
            <div class="ghero__tags">
              <span class="chip chip--live"><i class="dot"></i>{{ formatCount(game.stats?.playersLive) }} playing</span>
              <span class="chip" title="Proof-of-Play score">PoP {{ formatNumber(game.stats?.proofOfPlayScore) }}</span>
              <span :class="tierClass(game.interopTier)">INTEROP {{ game.interopTier }}</span>
              <span class="chip chip--lvl">TOKENIZATION {{ game.tokenizationLevel }}</span>
              <span v-if="game.studio.oneHumanStudio" class="chip">ONE-HUMAN STUDIO ✓</span>
              <span v-if="game.mine" class="chip chip--yours">YOUR GAME</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn--light" type="button" @click="play">▶ Play now</button>
            <button class="btn btn--ghost" type="button" @click="joinClub">Join club</button>
          </div>
        </div>
      </section>

      <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:24px">
        <p class="dim" style="max-width:640px;font-size:.95rem">{{ game.description || game.blurb }}</p>
        <div class="studioline">
          <img v-if="game.studio.avatarUrl" :src="game.studio.avatarUrl" alt="">
          <span v-else class="post__av post__av--glyph" aria-hidden="true">{{ game.studio.handle.charAt(0).toUpperCase() }}</span>
          <div>
            <p style="font-size:.87rem;font-weight:600">{{ game.studio.displayName || game.studio.handle }}</p>
            <p class="t-small dim">{{ game.studio.oneHumanStudio ? 'one-human studio' : 'studio' }} · {{ secondaryCount }} market listing{{ secondaryCount === 1 ? '' : 's' }}</p>
          </div>
        </div>
      </div>

      <div class="tabs" role="tablist" aria-label="Game sections">
        <button v-for="entry in tabs" :key="entry.key" type="button" role="tab" :aria-selected="tab === entry.key" :class="{ on: tab === entry.key }" @click="setTab(entry.key)">
          {{ entry.label }}
        </button>
      </div>

      <section v-if="visited.packs" v-show="tab === 'packs'" class="pane on" role="tabpanel">
        <GamePacks :slug="slug" :game-title="game.title" :tokenization-level="game.tokenizationLevel" />
      </section>
      <section v-if="visited.club" v-show="tab === 'club'" class="pane on" role="tabpanel">
        <ClubFeed :slug="slug" />
      </section>
      <section v-if="visited.market" v-show="tab === 'market'" class="pane on" role="tabpanel">
        <GameMarket :slug="slug" @changed="secondaryOverride = $event" />
      </section>
      <section v-if="visited.media" v-show="tab === 'media'" class="pane on" role="tabpanel">
        <EmptyState v-if="!media.length" icon="🖼" title="No media yet" body="The studio has not uploaded screenshots for this game." />
        <div v-else class="shots">
          <img v-for="shot in media" :key="shot.url" :src="shot.url" :alt="`${game.title} screenshot`" loading="lazy">
        </div>
      </section>

      <section v-if="moreGames.length" class="shelf">
        <div class="shelf__h">
          <h3>More on Sverse</h3>
          <NuxtLink to="/">See more →</NuxtLink>
        </div>
        <p class="shelf__s">Other live games in the same store and the same SRV economy.</p>
        <div class="shelf__track">
          <GameCard v-for="other in moreGames" :key="other.id" :game="other" />
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { GameDetail, GameSummary } from '~/types/sverse'

type TabKey = 'packs' | 'club' | 'market' | 'media'
const TAB_KEYS: TabKey[] = ['packs', 'club', 'market', 'media']

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const slug = computed(() => String(route.params.slug))

const {
  data: game,
  status: gameStatus,
  error: gameError,
  refresh: refreshGame,
} = await useAsyncData(`game:${slug.value}`, () => api.one<GameDetail>(`/api/v1/games/${slug.value}`))
const { data: moreRes } = useAsyncData('games:more', () => api.many<GameSummary>('/api/v1/games', { query: { limit: 12 } }), { lazy: true })

const notFound = computed(() => {
  const apiError = apiErrorOf(gameError.value)
  return Boolean(apiError && (apiError.status === 404 || apiError.code.endsWith('not_found')))
})

function parseTab(value: unknown): TabKey {
  const text = String(Array.isArray(value) ? value[0] : value ?? '')
  return (TAB_KEYS as string[]).includes(text) ? (text as TabKey) : 'packs'
}

// Tab state lives in the URL (?tab=) — switching never refetches the game.
const tab = computed<TabKey>(() => parseTab(route.query.tab))
const visited = reactive<Record<TabKey, boolean>>({ packs: false, club: false, market: false, media: false })
watch(tab, (value) => (visited[value] = true), { immediate: true })

function setTab(value: TabKey) {
  if (value === tab.value) return
  router.replace({ query: { ...route.query, tab: value === 'packs' ? undefined : value } })
}

const secondaryOverride = ref<number | null>(null)
const secondaryCount = computed(() => secondaryOverride.value ?? game.value?.secondaryCount ?? 0)
const tabs = computed(() => [
  { key: 'packs' as const, label: 'Item packs' },
  { key: 'club' as const, label: `Club · ${formatCount(game.value?.club?.memberCount ?? 0)}` },
  { key: 'market' as const, label: `Secondary market · ${secondaryCount.value}` },
  { key: 'media' as const, label: 'Media' },
])

const media = computed(() => game.value?.media ?? [])
const moreGames = computed(() => (moreRes.value?.data ?? []).filter((other) => other.slug !== slug.value).slice(0, 8))
const heroStyle = computed(() => {
  const gradient = game.value?.coverArt?.gradient
  if (!gradient || game.value?.coverArt?.url) return undefined
  return { background: `linear-gradient(120deg, ${gradient})` }
})

function play() {
  toast.push('Prototype build', 'The Store prototype does not launch game builds yet.', '▶')
}

function joinClub() {
  setTab('club')
}

useHead(() => ({ title: game.value ? `${game.value.title} · Sverse` : 'Game · Sverse' }))
</script>
