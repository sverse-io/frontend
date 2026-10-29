<template>
  <AppModal
    :title="done ? 'Bought' : 'Buy from the market'"
    :subtitle="`${listing.name} · ${listing.game?.title ?? listing.gameSlug ?? ''}`"
    wide
    :locked="busy"
    @close="$emit('close')"
  >
    <div class="lbuy">
      <img class="lbuy__art" :src="listing.imageUrl" alt="">
      <div style="flex:1;min-width:0">
        <div class="rows">
          <div><span>Seller</span><strong>@{{ listing.seller?.handle ?? 'unknown' }} <span class="dim">★ {{ listing.seller?.reputation ?? 0 }}</span></strong></div>
          <div><span>Token</span><strong class="t-mono">{{ listing.tokenId ?? '—' }}</strong></div>
          <div><span>Deeds</span><strong><DeedMix :count="listing.deedCount" :verified="listing.verifiedDeedCount" /></strong></div>
          <div><span>Chain</span><strong><ChainBadge :status="listing.chain?.status" :tx-hash="listing.chain?.txHash" :explorer-url="listing.chain?.explorerUrl ?? null" /></strong></div>
          <div class="tot"><span>You pay</span><strong>{{ groupSrv(listing.priceSrv) }} SRV <span class="dim t-small">${{ listing.priceUsdSnapshot }}</span></strong></div>
        </div>
      </div>
    </div>

    <div style="margin-top:16px">
      <p class="t-micro dim" style="margin-bottom:8px">Split on this resale</p>
      <div class="sbar" role="img" :aria-label="`Seller ${split.sellerPct}%, studio royalty ${split.royaltyPct}%, protocol ${split.protocolPct}%`">
        <div :style="{ width: `${split.sellerPct}%`, background: 'var(--violet)' }">SELLER {{ split.sellerPct }}%</div>
        <div :style="{ width: `${split.royaltyPct}%`, background: 'var(--magenta)' }"></div>
        <div :style="{ width: `${split.protocolPct}%`, background: 'var(--cyan)' }"></div>
      </div>
      <div class="legend">
        <span><i style="background:var(--violet)"></i>Seller · {{ formatUnits(split.sellerUnits) }} SRV</span>
        <span><i style="background:var(--magenta)"></i>Studio royalty {{ split.royaltyPct }}% · {{ formatUnits(split.royaltyUnits) }} SRV</span>
        <span><i style="background:var(--cyan)"></i>Protocol {{ split.protocolPct }}% · {{ formatUnits(split.protocolUnits) }} SRV</span>
      </div>
    </div>

    <details v-if="listing.inventoryItemId" class="lbuy__ledger" :open="listing.deedCount > 0" @toggle="loadDeeds">
      <summary>Deed Ledger · {{ listing.deedCount }} deed{{ listing.deedCount === 1 ? '' : 's' }} transfer with this item</summary>
      <div style="margin-top:12px">
        <div v-if="deedsState === 'loading'" class="grid" style="gap:8px"><div v-for="n in 2" :key="n" class="sk" style="height:64px;border-radius:12px"></div></div>
        <ErrorState v-else-if="deedsState === 'error'" title="Could not load the deed ledger" :error="deedsError" :retry="() => loadDeeds(true)" />
        <p v-else-if="deedsState === 'ready' && !deeds.length" class="t-small dim">No deeds — this is the base item with no recorded history.</p>
        <DeedList v-else-if="deedsState === 'ready'" :deeds="deeds" />
      </div>
    </details>

    <div v-if="done && outcome" class="note" style="margin-top:16px">
      <span class="note__i">✓</span>
      <div><b>{{ listing.name }}</b> moved to your passport with its full deed history. New balance <b>{{ groupSrv(outcome.balanceSrv) }} SRV</b>.</div>
    </div>
    <div v-else-if="problem" class="note" :class="problem.tone === 'bad' ? 'note--bad' : 'note--warn'" style="margin-top:16px" role="alert">
      <span class="note__i">{{ problem.icon }}</span>
      <div>
        <b>{{ problem.title }}</b> {{ problem.body }}
        <div v-if="problem.code === 'insufficient_funds'" style="margin-top:10px"><FaucetButton @funded="problem = null" /></div>
      </div>
    </div>

    <template #footer>
      <template v-if="!loggedIn">
        <button class="btn btn--ghost" type="button" @click="$emit('close')">Cancel</button>
        <NuxtLink class="btn btn--grad" :to="loginLink">Log in to buy</NuxtLink>
      </template>
      <template v-else-if="done">
        <NuxtLink class="btn btn--ghost" to="/passport" @click="$emit('close')">Open passport</NuxtLink>
        <button class="btn btn--grad" type="button" @click="$emit('close')">Done</button>
      </template>
      <template v-else>
        <button class="btn btn--ghost" type="button" :disabled="busy" @click="$emit('close')">Cancel</button>
        <button class="btn btn--grad" type="button" :disabled="busy || isOwn || blocked" @click="buy">
          {{ busy ? 'Settling…' : isOwn ? 'Your listing' : `Buy for ${groupSrv(listing.priceSrv)} SRV` }}
        </button>
      </template>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { Deed, Listing, ListingBuyResult } from '~/types/sverse'

const props = defineProps<{ listing: Listing }>()
const emit = defineEmits<{ close: []; bought: [result: ListingBuyResult]; gone: [listingId: string] }>()

interface Problem {
  code: string
  title: string
  body: string
  icon: string
  tone: 'warn' | 'bad'
}

const api = useApi()
const session = useSession()
const route = useRoute()
const toast = useToast()

const loggedIn = session.loggedIn
const loginLink = computed(() => loginPath(route.fullPath))
const isOwn = computed(() => Boolean(session.user.value && props.listing.seller?.id === session.user.value.id))

const busy = ref(false)
const done = ref(false)
const outcome = ref<ListingBuyResult | null>(null)
const problem = ref<Problem | null>(null)
const blocked = computed(() => problem.value?.code === 'listing_not_open' || problem.value?.code === 'listing_stale')
const idempotencyKey = newIdempotencyKey()

const deeds = ref<Deed[]>([])
const deedsState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const deedsError = ref<unknown>(null)

// Mirrors the API's integer bps split for display; the server computes the real postings.
const split = computed(() => {
  const price = BigInt(props.listing.priceUnits || '0')
  const protocolUnits = (price * BigInt(props.listing.protocolBps ?? 0)) / 10_000n
  const royaltyUnits = (price * BigInt(props.listing.royaltyBps ?? 0)) / 10_000n
  const sellerUnits = price - protocolUnits - royaltyUnits
  return {
    sellerUnits: sellerUnits.toString(),
    royaltyUnits: royaltyUnits.toString(),
    protocolUnits: protocolUnits.toString(),
    sellerPct: (10_000 - (props.listing.protocolBps ?? 0) - (props.listing.royaltyBps ?? 0)) / 100,
    royaltyPct: (props.listing.royaltyBps ?? 0) / 100,
    protocolPct: (props.listing.protocolBps ?? 0) / 100,
  }
})

async function loadDeeds(force: boolean | Event = false) {
  if (!props.listing.inventoryItemId) return
  if (deedsState.value === 'loading' || (deedsState.value === 'ready' && force !== true)) return
  deedsState.value = 'loading'
  try {
    deeds.value = (await api.many<Deed>(`/api/v1/items/${props.listing.inventoryItemId}/deeds`)).data
    deedsState.value = 'ready'
  } catch (error) {
    deedsError.value = error
    deedsState.value = 'error'
  }
}

function describe(error: unknown): Problem {
  const code = isApiError(error) ? error.code : 'unknown_error'
  switch (code) {
    case 'insufficient_funds':
      return { code, icon: '💸', tone: 'warn', title: 'Not enough SRV.', body: `This listing costs ${groupSrv(props.listing.priceSrv)} SRV; your balance is ${groupSrv(session.user.value?.balanceSrv)} SRV.` }
    case 'self_purchase':
      return { code, icon: '↺', tone: 'warn', title: 'That is your own listing.', body: 'Cancel it from your passport instead.' }
    case 'listing_not_open':
    case 'listing_stale':
      return { code, icon: '⌛', tone: 'bad', title: 'No longer available.', body: 'This listing was sold or withdrawn a moment ago.' }
    case 'missing_session':
      return { code, icon: '🪪', tone: 'warn', title: 'Session ended.', body: 'Log in again to buy.' }
    default:
      return { code, icon: '⚠', tone: 'bad', title: 'Purchase failed.', body: errorMessage(error) }
  }
}

async function buy() {
  if (busy.value || done.value) return
  busy.value = true
  problem.value = null
  try {
    const result = await api.one<ListingBuyResult>(`/api/v1/market/listings/${props.listing.id}/buy`, { method: 'POST', idempotencyKey })
    outcome.value = result
    done.value = true
    session.setBalance(result)
    emit('bought', result)
    toast.push('Bought on the market', `${props.listing.name} and its deeds are now yours.`, '⇄')
  } catch (error) {
    problem.value = describe(error)
    if (problem.value.code === 'listing_not_open' || problem.value.code === 'listing_stale') emit('gone', props.listing.id)
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (props.listing.deedCount > 0) loadDeeds()
})
</script>
