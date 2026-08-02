<template>
  <main class="sfwrap sfbody" data-tabscope style="max-width:1400px;padding-top:26px">
    <div v-if="pending" class="sk" style="height:420px;border-radius:var(--r-xl)"></div>
    <EmptyState v-else-if="error || !game" title="Game not found" body="This game is unpublished or unavailable." />
    <template v-else>
      <section class="ghero">
        <div class="ghero__art">
          <img :src="heroImage" :alt="`${game.title} key art`">
        </div>
        <div class="ghero__b">
          <div>
            <h1 class="ghero__t">{{ game.title }}</h1>
            <p class="ghero__m">{{ game.studio.handle }} · {{ genreLabel(game.genre) }}</p>
            <div class="ghero__tags">
              <span class="chip chip--live"><i class="dot"></i>{{ formatPlaying(game.stats.playersLive) }} playing</span>
              <span :class="tierClass(game.interopTier)">INTEROP {{ game.interopTier }}</span>
              <span class="chip chip--lvl">TOKENIZATION {{ game.tokenizationLevel }}</span>
              <span v-if="game.studio.oneHumanStudio" class="chip">ONE-HUMAN STUDIO ✓</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn--light" type="button">▶ Play now</button>
            <button class="btn btn--ghost" type="button" @click="tab = 'club'">Join club</button>
          </div>
        </div>
      </section>

      <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:24px">
        <p class="dim" style="max-width:640px;font-size:.95rem">{{ game.description }}</p>
        <div class="studioline">
          <img :src="game.studio.avatarUrl || 'https://picsum.photos/seed/studio-kai/68/68'" alt="">
          <div>
            <p style="font-size:.87rem;font-weight:600">{{ game.studio.handle }}</p>
            <p class="t-small dim">{{ game.studio.oneHumanStudio ? 'one-human studio' : 'studio' }} · {{ game.secondaryCount }} market listings</p>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button :class="{ on: tab === 'packs' }" type="button" @click="tab = 'packs'">Item packs</button>
        <button :class="{ on: tab === 'club' }" type="button" @click="tab = 'club'">Club · {{ game.club.memberCount }}</button>
        <button :class="{ on: tab === 'market' }" type="button" @click="tab = 'market'">Secondary market · {{ game.secondaryCount }}</button>
        <button :class="{ on: tab === 'shots' }" type="button" @click="tab = 'shots'">Media</button>
      </div>

      <section v-if="tab === 'packs'" class="pane on">
        <div class="grid" style="gap:13px">
          <div v-for="item in itemRows" :key="item.id" class="row">
            <div class="row__art"><img :src="item.art?.url" alt="" loading="lazy"></div>
            <div class="row__info">
              <div class="row__n">
                {{ item.name }}
                <span :class="tierClass(item.interopTier)">{{ item.interopTier }}</span>
                <span class="chip">{{ item.kind.toUpperCase() }}</span>
              </div>
              <p class="row__d">{{ item.description }}</p>
            </div>
            <div class="row__buy">
              <p class="row__srv">{{ item.priceSrv }} SRV</p>
              <p class="row__usd">${{ item.priceUsdSnapshot }}</p>
              <button
                class="btn btn--sm"
                :class="owned[item.id] || item.owned ? 'btn--ghost is-off' : 'btn--grad'"
                :disabled="owned[item.id] || item.owned || purchasing"
                type="button"
                @click="openCheckout(item)"
              >
                {{ owned[item.id] || item.owned ? 'Owned' : 'Buy' }}
              </button>
            </div>
          </div>
        </div>

        <div class="note" style="margin-top:22px">
          <span class="note__i">🎚</span>
          <div>
            This studio publishes at <b>{{ game.tokenizationLevel }}</b> on the Tokenization Ladder. Moving up a level is a config change and cannot be undone.
          </div>
        </div>
      </section>

      <section v-if="tab === 'club'" class="pane on">
        <div class="note" style="margin-bottom:20px">
          <span class="note__i">📣</span>
          <div>
            Posting is <b>ownership-gated</b> and ranking is <b>reputation-weighted</b>. Low-reputation posts stay visible but carry almost no weight.
          </div>
        </div>

        <div class="card card--pad" style="margin-bottom:20px">
          <div style="display:flex;gap:12px">
            <span class="post__av"><img src="https://picsum.photos/seed/passport-you/76/76" alt=""></span>
            <div style="flex:1">
              <textarea placeholder="Post to the club..." style="width:100%;padding:11px 14px;border-radius:11px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:.89rem;min-height:70px;resize:vertical"></textarea>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
                <span class="t-small dim">Gate met — you own this game</span>
                <button class="btn btn--grad btn--sm" type="button">Post</button>
              </div>
            </div>
          </div>
        </div>

        <div class="thread">
          <article class="post auto">
            <span class="post__av"><img src="https://picsum.photos/seed/deed-boss/76/76" alt=""></span>
            <div>
              <div class="post__h">
                <span class="post__a">SYSTEM · DEED</span>
                <span class="badge badge--auto">auto</span>
                <span class="post__t">12m</span>
              </div>
              <p class="post__b">A living item gained a deed. Attested by the studio, co-signed by Sverse.</p>
              <div class="post__acts"><button>▲ 41</button><button>View item</button></div>
            </div>
          </article>

          <article v-for="post in posts" :key="post.id" class="post" :class="{ low: post.weight < 0.2 }">
            <span class="post__av"><img :src="`https://picsum.photos/seed/${post.author.handle}/76/76`" alt=""></span>
            <div>
              <div class="post__h">
                <span class="post__a">{{ post.author.handle }}</span>
                <span v-if="post.author.userPid" class="badge badge--studio">owner</span>
                <span class="post__rep">★ {{ post.author.reputation ?? 0 }}</span>
                <span class="post__t">club</span>
              </div>
              <p class="post__b">{{ post.body }}</p>
              <div class="post__acts"><button>▲ {{ post.score }}</button><button>Reply</button></div>
            </div>
          </article>
        </div>
      </section>

      <section v-if="tab === 'market'" class="pane on">
        <div class="note" style="margin-bottom:20px">
          <span class="note__i">🗡</span>
          <div>
            <b>Two identical swords. An 8x price gap.</b> Same schema, same stats, same mint. The difference is the deed ledger.
          </div>
        </div>

        <div class="grid g2">
          <div v-for="listing in listings" :key="listing.id" class="row">
            <div class="row__art"><img :src="listing.imageUrl" alt="" loading="lazy"></div>
            <div class="row__info">
              <div class="row__n">{{ listing.name }} <span class="chip chip--t2">T2</span></div>
              <p class="row__d">
                {{ listing.deedCount }} deeds ·
                <strong style="color:var(--pink)">{{ listing.verifiedDeedCount }} attested</strong> · seller {{ listing.seller?.handle }}
              </p>
            </div>
            <div class="row__buy">
              <p class="row__srv">{{ listing.priceSrv }} SRV</p>
              <p class="row__usd">${{ listing.priceUsdSnapshot }}</p>
              <button class="btn btn--ghost btn--sm" type="button" @click="deedListing = listing">View history</button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="tab === 'shots'" class="pane on">
        <div class="shots">
          <img v-for="shot in shots" :key="shot.url" :src="shot.url" alt="Screenshot" loading="lazy">
        </div>
      </section>

      <section class="shelf">
        <div class="shelf__h">
          <h3>Players who own this also play</h3>
          <NuxtLink to="/">See more →</NuxtLink>
        </div>
        <p class="shelf__s">Driven by the <b>interop graph</b> — these titles accept compatible item schemas.</p>
        <div class="shelf__track">
          <GameCard v-for="other in moreGames" :key="other.id" :game="other" />
        </div>
      </section>
    </template>

    <div v-if="checkoutItem" class="backdrop" @click.self="checkoutItem = null">
      <div class="modal">
        <div class="modal__h">
          <div><h3>Confirm purchase</h3><p>{{ checkoutItem.name }} · {{ game?.title }}</p></div>
          <button class="modal__x" type="button" @click="checkoutItem = null">✕</button>
        </div>
        <div class="modal__b">
          <div class="rows">
            <div><span>Item</span><strong>{{ checkoutItem.name }}</strong></div>
            <div><span>Quoted in USD, settled in SRV</span><strong>${{ checkoutItem.priceUsdSnapshot }}</strong></div>
            <div class="tot"><span>You pay</span><strong>{{ checkoutItem.priceSrv }} SRV</strong></div>
          </div>
          <div style="margin-top:16px">
            <div class="sbar">
              <div style="width:90%;background:var(--violet)">STUDIO 90%</div>
              <div style="width:10%;background:var(--magenta)">10%</div>
            </div>
            <p class="t-small dim" style="margin-top:8px">Revenue settles to the studio instantly; protocol fees fund the shared network pools.</p>
          </div>
          <div class="note" style="margin-top:16px">
            <span class="note__i">⚡</span>
            <div>Settles on <b>Avalanche</b> in under 2 seconds.</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" @click="checkoutItem = null">Cancel</button>
          <button class="btn btn--grad" type="button" :disabled="purchasing" @click="confirmPurchase">Pay {{ checkoutItem.priceSrv }} SRV</button>
        </div>
      </div>
    </div>

    <div v-if="deedListing" class="backdrop" @click.self="deedListing = null">
      <div class="modal modal--wide">
        <div class="modal__h">
          <div><h3>Deed Ledger · {{ deedListing.name }}</h3><p>append-only provenance</p></div>
          <button class="modal__x" type="button" @click="deedListing = null">✕</button>
        </div>
        <div class="modal__b">
          <div class="ledger">
            <div v-for="n in deedListing.deedCount" :key="n" class="deed">
              <span class="deed__i"><img :src="`https://picsum.photos/seed/deed-${n}/80/80`" alt=""></span>
              <div><div class="deed__n">{{ n === 1 ? 'boss_defeated' : n === 2 ? 'tournament_win' : 'kills' }}</div><div class="deed__d">Attested play history entry #{{ n }}</div></div>
              <div class="deed__m">epoch {{ 811 + n }}<br><span :class="n <= deedListing.verifiedDeedCount ? 'vf' : 'vp'">{{ n <= deedListing.verifiedDeedCount ? '✓ attested' : '◐ verifying' }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const api = useApi()
const slug = computed(() => String(route.params.slug))
const tab = ref(String(route.query.tab ?? 'packs'))
const checkoutItem = ref<any | null>(null)
const deedListing = ref<any | null>(null)
const purchasing = ref(false)
const owned = reactive<Record<string, boolean>>({})

const { data: game, pending, error } = await useAsyncData(`game:${slug.value}`, () => api.one<any>(`/api/v1/games/${slug.value}`))
const { data: itemRes } = await useAsyncData(`items:${slug.value}`, () => api.many<any>(`/api/v1/games/${slug.value}/items`))
const { data: postRes } = await useAsyncData(`club:${slug.value}`, () => api.many<any>(`/api/v1/games/${slug.value}/club/posts`))
const { data: listingRes } = await useAsyncData(`listings:${slug.value}`, () => api.many<any>(`/api/v1/games/${slug.value}/listings`))
const { data: moreRes } = await useAsyncData('games:more', () => api.many<any>('/api/v1/games'))

const items = computed(() => itemRes.value?.data ?? [])
const itemRows = computed(() => {
  const rows = [...items.value]
  if (!rows.some((item: any) => item.kind === 'pass')) {
    rows.splice(1, 0, {
      id: 'season-pass-static',
      name: 'Season Pass · Ashfall',
      description: '12 weeks of drops, ranked access',
      kind: 'pass',
      priceSrv: '340',
      priceUsdSnapshot: '14.28',
      interopTier: 'T0',
      art: { url: 'https://picsum.photos/seed/item-season/120/120' },
    })
  }
  return rows
})
const posts = computed(() => postRes.value?.data ?? [])
const listings = computed(() => listingRes.value?.data ?? [])
const moreGames = computed(() => (moreRes.value?.data ?? []).filter((item: any) => item.slug !== slug.value))
const heroImage = computed(() => game.value?.coverArt?.url ?? `https://picsum.photos/seed/game-${slug.value}/1600/600`)
const shots = computed(() => {
  const media = game.value?.media?.length ? game.value.media : [
    { url: `https://picsum.photos/seed/${slug.value}-shot-1/640/360` },
    { url: `https://picsum.photos/seed/${slug.value}-shot-2/640/360` },
    { url: `https://picsum.photos/seed/${slug.value}-shot-3/640/360` },
  ]
  return media
})

watch(tab, (value) => router.replace({ query: { tab: value } }))
watchEffect(() => {
  if (game.value?.title) useHead({ title: `${game.value.title} · Sverse` })
})

function openCheckout(item: any) {
  if (owned[item.id] || item.owned) return
  checkoutItem.value = item
}

async function confirmPurchase() {
  if (!checkoutItem.value || checkoutItem.value.id === 'season-pass-static') {
    checkoutItem.value = null
    return
  }
  purchasing.value = true
  try {
    const intent = await api.one<any>('/api/v1/checkout/intents', {
      method: 'POST',
      body: { itemDefinitionId: checkoutItem.value.id },
    })
    await api.one(`/api/v1/checkout/${intent.id}/confirm`, {
      method: 'POST',
      body: { itemDefinitionId: checkoutItem.value.id },
    })
    owned[checkoutItem.value.id] = true
    checkoutItem.value = null
  } finally {
    purchasing.value = false
  }
}

function tierClass(tier: string) {
  return ['chip', tier === 'T2' ? 'chip--t2' : tier === 'T1' ? 'chip--t1' : 'chip--t0'].join(' ')
}

function genreLabel(genre?: string) {
  return String(genre ?? '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPlaying(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}
</script>
