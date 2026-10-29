<template>
  <AppModal :title="done ? 'Purchase complete' : 'Confirm purchase'" :subtitle="`${item.name} · ${gameTitle}`" :locked="phase === 'confirming'" @close="$emit('close')">
    <!-- logged out -->
    <div v-if="!loggedIn" class="note">
      <span class="note__i">🪪</span>
      <div>Log in to your S-Passport to buy. Items are minted to your passport, not to the game's server.</div>
    </div>

    <!-- quoting -->
    <div v-else-if="phase === 'quoting'" class="grid" style="gap:10px" aria-busy="true">
      <div class="sk" style="height:18px;width:70%"></div>
      <div class="sk" style="height:18px;width:55%"></div>
      <div class="sk" style="height:28px;margin-top:8px"></div>
      <p class="t-small dim">Getting a quote…</p>
    </div>

    <!-- success -->
    <template v-else-if="done && result">
      <div class="note" style="margin-bottom:16px">
        <span class="note__i">✓</span>
        <div><b>{{ item.name }}</b> is in your passport. Paid {{ intent ? groupSrv(intent.quote.priceSrv) : groupSrv(item.priceSrv) }} SRV — new balance <b>{{ groupSrv(result.balanceSrv) }} SRV</b>.</div>
      </div>
      <div class="rows">
        <div><span>Order</span><strong class="t-mono">{{ result.id }}</strong></div>
        <div v-if="result.inventoryItem?.tokenId"><span>Token</span><strong class="t-mono">{{ result.inventoryItem.tokenId }}</strong></div>
        <div>
          <span>Chain</span>
          <strong><ChainBadge :status="result.chain.status" :tx-hash="result.chain.txHash ?? result.txHash" :explorer-url="result.chain.explorerUrl" /></strong>
        </div>
      </div>
    </template>

    <!-- quote / errors -->
    <template v-else>
      <div v-if="intent" class="rows">
        <div><span>Item</span><strong>{{ intent.item.name }}</strong></div>
        <div><span>Quoted in USD, settled in SRV</span><strong>${{ intent.quote.usdAmount }}</strong></div>
        <div><span>Quote valid until</span><strong>{{ expiresLabel }}</strong></div>
        <div class="tot"><span>You pay</span><strong>{{ groupSrv(intent.quote.priceSrv) }} SRV</strong></div>
      </div>
      <div v-if="intent" style="margin-top:16px">
        <p class="t-micro dim" style="margin-bottom:8px">Where your SRV goes · studio {{ studioPct }} · protocol {{ protocolPct }}</p>
        <FeeSplitBar :breakdown="intent.feeBreakdown" :total-units="intent.quote.priceUnits" :studio-label="`Studio @${intent.game.studioHandle}`" />
        <p class="t-small dim" style="margin-top:8px">Revenue settles to the studio; the protocol fee is split between burn, creator rewards, player rewards, treasury and curators.</p>
      </div>

      <div v-if="problem" class="note" :class="problem.tone === 'bad' ? 'note--bad' : 'note--warn'" style="margin-top:16px" role="alert">
        <span class="note__i">{{ problem.icon }}</span>
        <div>
          <b>{{ problem.title }}</b> {{ problem.body }}
          <div v-if="problem.code === 'insufficient_funds'" style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <FaucetButton @funded="quote" />
            <span v-if="!faucetEnabled" class="t-small dim">Top up your SRV balance to continue.</span>
          </div>
        </div>
      </div>
    </template>

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
        <button class="btn btn--ghost" type="button" :disabled="phase === 'confirming'" @click="$emit('close')">Cancel</button>
        <button v-if="canRequote" class="btn btn--ghost" type="button" @click="quote">Get a new quote</button>
        <button v-else class="btn btn--grad" type="button" :disabled="!intent || phase !== 'quoted'" @click="confirm">
          {{ phase === 'confirming' ? 'Settling…' : intent ? `Pay ${groupSrv(intent.quote.priceSrv)} SRV` : 'Pay' }}
        </button>
      </template>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { CheckoutCompleted, CheckoutIntent, ItemDefinition } from '~/types/sverse'

const props = defineProps<{ item: Pick<ItemDefinition, 'id' | 'name' | 'priceSrv' | 'priceUnits'>; gameTitle: string }>()
const emit = defineEmits<{ close: []; purchased: [result: CheckoutCompleted]; owned: [] }>()

type Phase = 'quoting' | 'quoted' | 'confirming' | 'done' | 'failed'
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
const faucetEnabled = computed(() => Boolean(session.user.value?.faucet?.enabled))

const phase = ref<Phase>('quoting')
const intent = ref<CheckoutIntent | null>(null)
const result = ref<CheckoutCompleted | null>(null)
const problem = ref<Problem | null>(null)
const done = computed(() => phase.value === 'done')
const canRequote = computed(() => phase.value === 'failed' && problem.value?.code === 'quote_expired')
let confirmKey = ''

const studioPct = computed(() => (intent.value ? `${100 - intent.value.feeBreakdown.feeBps / 100}%` : ''))
const protocolPct = computed(() => (intent.value ? `${intent.value.feeBreakdown.feeBps / 100}%` : ''))
const expiresLabel = computed(() => {
  if (!intent.value) return ''
  return new Date(intent.value.quote.expiresAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
})

function describe(error: unknown): Problem {
  const code = isApiError(error) ? error.code : 'unknown_error'
  switch (code) {
    case 'insufficient_funds':
      return { code, icon: '💸', tone: 'warn', title: 'Not enough SRV.', body: `This costs ${groupSrv(intent.value?.quote.priceSrv ?? props.item.priceSrv)} SRV and your balance is ${groupSrv(session.user.value?.balanceSrv)} SRV.` }
    case 'already_owned':
      return { code, icon: '✓', tone: 'warn', title: 'Already in your passport.', body: 'You own this item, so it cannot be bought again.' }
    case 'sold_out':
      return { code, icon: '⌛', tone: 'bad', title: 'Sold out.', body: 'The limited supply for this item has been fully minted.' }
    case 'quote_expired':
      return { code, icon: '⏱', tone: 'warn', title: 'The quote expired.', body: 'Prices are held for a short window. Get a new quote to continue.' }
    case 'game_not_live':
      return { code, icon: '⛔', tone: 'bad', title: 'Not on sale.', body: 'This game is not live right now.' }
    case 'missing_session':
      return { code, icon: '🪪', tone: 'warn', title: 'Session ended.', body: 'Log in again to buy.' }
    default:
      return { code, icon: '⚠', tone: 'bad', title: 'Purchase failed.', body: errorMessage(error) }
  }
}

// Read through a function so TS does not keep a narrowed `phase` across awaits.
function isQuoted() {
  return phase.value === 'quoted'
}

async function quote() {
  if (!loggedIn.value) return
  phase.value = 'quoting'
  problem.value = null
  intent.value = null
  try {
    intent.value = await api.one<CheckoutIntent>('/api/v1/checkout/intents', {
      method: 'POST',
      body: { itemDefinitionId: props.item.id, quantity: 1, paymentMethod: 'srv_balance' },
      idempotencyKey: newIdempotencyKey(),
    })
    confirmKey = newIdempotencyKey()
    phase.value = 'quoted'
  } catch (error) {
    problem.value = describe(error)
    phase.value = 'failed'
    if (problem.value.code === 'already_owned') emit('owned')
  }
}

async function confirm() {
  if (!intent.value || phase.value !== 'quoted') return
  if (new Date(intent.value.quote.expiresAt).getTime() <= Date.now()) {
    await quote()
    if (isQuoted()) problem.value = { code: 'requoted', icon: '⏱', tone: 'warn', title: 'Quote refreshed.', body: 'The previous quote expired; review the new price and pay again.' }
    return
  }
  phase.value = 'confirming'
  problem.value = null
  try {
    const completed = await api.one<CheckoutCompleted>(`/api/v1/checkout/intents/${intent.value.id}/confirm`, {
      method: 'POST',
      idempotencyKey: confirmKey,
    })
    result.value = completed
    session.setBalance(completed)
    phase.value = 'done'
    emit('purchased', completed)
    toast.push('Purchased', `${props.item.name} is in your passport.`, '🛍')
  } catch (error) {
    problem.value = describe(error)
    if (problem.value.code === 'already_owned') emit('owned')
    if (problem.value.code === 'quote_expired') {
      // Re-quote automatically; the player confirms the fresh price.
      await quote()
      if (isQuoted()) problem.value = { code: 'requoted', icon: '⏱', tone: 'warn', title: 'Quote expired.', body: 'Here is a fresh quote — review it and pay again.' }
      return
    }
    phase.value = 'failed'
  }
}

onMounted(() => {
  if (loggedIn.value) quote()
})
</script>
