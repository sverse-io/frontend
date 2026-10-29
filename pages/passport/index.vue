<template>
  <main class="sfwrap sfbody">
    <section v-if="user" class="pbanner">
      <div class="pbanner__bg pbanner__bg--grad" aria-hidden="true"></div>
      <div class="pbanner__in">
        <span class="pbanner__av pbanner__av--glyph" aria-hidden="true">{{ user.handle.charAt(0).toUpperCase() }}</span>
        <div>
          <p class="t-micro" style="color:var(--pink);margin-bottom:5px">S-PASSPORT</p>
          <h1>@{{ user.handle }}</h1>
          <p class="pbanner__id" :title="user.custodialAddress ?? ''">{{ shortHash(user.custodialAddress, 8, 4) || 'address pending' }} · smart account, gasless, no seed phrase</p>
          <div class="pbanner__k">
            <span class="chip chip--live">★ {{ user.reputation }} reputation</span>
            <span v-if="user.skill?.tier" class="chip chip--t1">{{ humanize(user.skill.tier) }}</span>
            <span v-if="user.creator" class="chip chip--yours">STUDIO @{{ user.creator.handle }}</span>
          </div>
        </div>
        <div class="pbanner__stats">
          <div class="pstat"><p class="pstat__v num">{{ user.inventory.count }}</p><p class="pstat__k">Items</p></div>
          <div class="pstat"><p class="pstat__v num">{{ user.inventory.gameCount }}</p><p class="pstat__k">Games</p></div>
          <div class="pstat"><p class="pstat__v num">{{ user.wardrobe.renderTargets }}</p><p class="pstat__k">Renders in</p></div>
          <div class="pstat"><p class="pstat__v num grad-text" :title="`${user.balanceUnits} units`">{{ groupSrv(user.balanceSrv) }}</p><p class="pstat__k">SRV</p></div>
        </div>
      </div>
    </section>
    <div v-else class="sk" style="height:172px;border-radius:var(--r-xl);margin:24px 0 8px"></div>

    <div class="fbar">
      <button
        v-for="filter in KIND_FILTERS"
        :key="filter.value"
        class="sfcat"
        :class="{ on: kind === filter.value }"
        type="button"
        :aria-pressed="kind === filter.value"
        @click="setQuery({ kind: filter.value || undefined })"
      >
        {{ filter.label }}
      </button>
      <span style="flex:1"></span>
      <select :value="gameId" aria-label="Filter by game" @change="setQuery({ gameId: ($event.target as HTMLSelectElement).value || undefined })">
        <option value="">All games</option>
        <option v-for="game in gameOptions" :key="game.id" :value="game.id">{{ game.title }}</option>
      </select>
      <FaucetButton />
    </div>

    <section class="shelf">
      <div class="shelf__h">
        <h3>{{ heading }}</h3>
        <NuxtLink to="/passport/deeds">Open the deed ledger →</NuxtLink>
      </div>
      <p class="shelf__s">Living Items get <b>History</b> and <b>Import</b>; T1 cosmetics get <b>Equip</b>; anything transferable can be listed on the market.</p>

      <div v-if="status === 'pending' && !items.length" class="items" aria-busy="true">
        <div v-for="n in 6" :key="n" class="item"><div class="sk" style="aspect-ratio:1"></div><div class="item__body"><div class="sk" style="height:14px;width:70%"></div></div></div>
      </div>
      <ErrorState v-else-if="error" title="Could not load your inventory" :error="error" :retry="refresh" />
      <EmptyState v-else-if="!items.length && (kind || gameId)" icon="◌" title="Nothing matches that filter" body="Try another kind or game.">
        <button class="btn btn--ghost btn--sm" type="button" @click="setQuery({ kind: undefined, gameId: undefined })">Clear filters</button>
      </EmptyState>
      <EmptyState v-else-if="!items.length" icon="🎒" title="Nothing yet" body="Buy something in the Store and it appears here, minted to your passport — not to a game's server.">
        <NuxtLink class="btn btn--grad btn--sm" to="/">Browse the Store</NuxtLink>
      </EmptyState>
      <template v-else>
        <div class="items">
          <InventoryCard
            v-for="item in items"
            :key="item.id"
            :item="item"
            :listing="listingFor(item.id)"
            :busy="busy[item.id]"
            :error="itemErrors[item.id]"
            @history="historyItem = $event"
            @import="importItem = $event"
            @equip="toggleEquip"
            @list="listItem = $event"
            @cancel="cancelListing"
          />
        </div>
        <div v-if="nextCursor" style="text-align:center;margin-top:20px">
          <button class="btn btn--ghost btn--sm" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
        </div>
      </template>
    </section>

    <div class="note" style="margin-top:8px">
      <span class="note__i">🔐</span>
      <div>Your passport is a <b>custodial smart account</b>: gas is sponsored, there is no seed phrase, and items minted at L3+ are owned by your address on-chain.</div>
    </div>

    <DeedLedgerModal v-if="historyItem" :inventory-item-id="historyItem.id" :name="historyItem.name" :schema-id="historyItem.schemaId" @close="historyItem = null" />
    <InteropImportModal v-if="importItem" :item="importItem" @close="importItem = null" />
    <ListForSaleModal v-if="listItem" :item="listItem" @close="listItem = null" @listed="onListed" />
  </main>
</template>

<script setup lang="ts">
import type { InventoryItem, Listing, Wardrobe } from '~/types/sverse'

useHead({ title: 'My library · Sverse', meta: [{ name: 'robots', content: 'noindex' }] })

const KIND_FILTERS = [
  { label: 'All items', value: '' },
  { label: 'Living Items', value: 'living' },
  { label: 'Cosmetics', value: 'cosmetic' },
  { label: 'Bundles', value: 'bundle' },
  { label: 'Passes', value: 'pass' },
  { label: 'Consumables', value: 'consumable' },
]

const route = useRoute()
const router = useRouter()
const api = useApi()
const session = useSession()
const toast = useToast()
const user = session.user
const { data: gameOptions } = useGameOptions()

const kind = computed(() => {
  const value = String(route.query.kind ?? '')
  return KIND_FILTERS.some((filter) => filter.value === value) ? value : ''
})
const gameId = computed(() => String(route.query.gameId ?? ''))
const heading = computed(() => KIND_FILTERS.find((filter) => filter.value === kind.value)?.label ?? 'All items')

function setQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

const apiQuery = computed(() => ({ kind: kind.value || undefined, gameId: gameId.value || undefined, limit: 48 }))
const { data, status, error, refresh } = usePassportData(
  'passport:inventory',
  () => api.many<InventoryItem>('/api/v1/passport/me/inventory', { query: apiQuery.value }),
  { watch: [apiQuery] },
)
const { data: myListings, refresh: refreshListings } = usePassportData('passport:my-listings', () => api.many<Listing>('/api/v1/market/listings/mine').then((res) => res.data))

// Local overrides keep writes instant (no refetch): item patches + appended pages.
const patches = reactive<Record<string, Partial<InventoryItem>>>({})
const extra = ref<InventoryItem[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
watch(
  data,
  (value) => {
    extra.value = []
    nextCursor.value = value?.meta?.nextCursor ?? null
    for (const key of Object.keys(patches)) delete patches[key]
  },
  { immediate: true },
)

const items = computed(() => [...(data.value?.data ?? []), ...extra.value].map((item) => ({ ...item, ...(patches[item.id] ?? {}) })))
const listingsByItem = ref<Record<string, Listing>>({})
watch(
  myListings,
  (rows) => {
    listingsByItem.value = Object.fromEntries((rows ?? []).filter((listing) => listing.status === 'open' && listing.inventoryItemId).map((listing) => [listing.inventoryItemId!, listing]))
  },
  { immediate: true },
)
function listingFor(itemId: string) {
  return listingsByItem.value[itemId] ?? null
}

const busy = reactive<Record<string, string>>({})
const itemErrors = reactive<Record<string, string>>({})
const historyItem = ref<InventoryItem | null>(null)
const importItem = ref<InventoryItem | null>(null)
const listItem = ref<InventoryItem | null>(null)

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await api.many<InventoryItem>('/api/v1/passport/me/inventory', { query: { ...apiQuery.value, cursor: nextCursor.value } })
    extra.value = [...extra.value, ...page.data]
    nextCursor.value = page.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}

async function toggleEquip(item: InventoryItem) {
  if (busy[item.id]) return
  busy[item.id] = 'equip'
  delete itemErrors[item.id]
  const equip = !item.equipped
  // Optimistic: one item per slot — equipping displaces the current holder in the same update.
  const snapshot = items.value.map((row) => ({ id: row.id, equipped: row.equipped }))
  patches[item.id] = { ...patches[item.id], equipped: equip }
  if (equip && item.slot) {
    for (const row of items.value) if (row.id !== item.id && row.slot === item.slot && row.equipped) patches[row.id] = { ...patches[row.id], equipped: false }
  }
  try {
    const result = await api.one<{ equipped: Array<{ inventoryItemId: string }> } & Partial<Wardrobe>>('/api/v1/passport/me/wardrobe', {
      method: 'PATCH',
      body: equip ? { equip: [item.id] } : { unequip: [item.id] },
    })
    const equippedIds = new Set((result.equipped ?? []).map((row) => row.inventoryItemId))
    for (const row of items.value) patches[row.id] = { ...patches[row.id], equipped: equippedIds.has(row.id) }
    const displaced = snapshot.filter((row) => row.equipped && row.id !== item.id && !equippedIds.has(row.id))
    toast.push(equip ? 'Equipped' : 'Unequipped', displaced.length ? `Replaced ${displaced.map((row) => items.value.find((i) => i.id === row.id)?.name).join(', ')} in the ${item.slot} slot.` : 'Your loadout syncs to every T1 game.', '🧥')
    session.reload()
  } catch (err) {
    for (const row of snapshot) patches[row.id] = { ...patches[row.id], equipped: row.equipped }
    itemErrors[item.id] = isApiError(err, 'item_listed') ? 'Listed items cannot be equipped — cancel the listing first.' : isApiError(err, 'not_interoperable') ? 'T0 items cannot be equipped across games.' : errorMessage(err)
  } finally {
    delete busy[item.id]
  }
}

function onListed(listing: Listing) {
  const item = listItem.value
  listItem.value = null
  if (!item) return
  patches[item.id] = { ...patches[item.id], listed: true, status: 'listed', equipped: false }
  listingsByItem.value = { ...listingsByItem.value, [item.id]: listing }
}

async function cancelListing(item: InventoryItem) {
  const listing = listingFor(item.id)
  if (!listing || busy[item.id]) {
    if (!listing) await refreshListings()
    return
  }
  busy[item.id] = 'cancel'
  delete itemErrors[item.id]
  try {
    await api.one<Listing>(`/api/v1/market/listings/${listing.id}`, { method: 'DELETE' })
    patches[item.id] = { ...patches[item.id], listed: false, status: 'owned' }
    const next = { ...listingsByItem.value }
    delete next[item.id]
    listingsByItem.value = next
    toast.push('Listing cancelled', `${item.name} is back in your passport.`, '↩')
  } catch (err) {
    if (isApiError(err, 'listing_not_open')) {
      itemErrors[item.id] = 'This listing already closed (sold or cancelled). Refreshing…'
      await Promise.all([refresh(), refreshListings()])
    } else itemErrors[item.id] = errorMessage(err)
  } finally {
    delete busy[item.id]
  }
}

onMounted(() => {
  if (session.loggedIn.value) session.reload()
})
</script>
