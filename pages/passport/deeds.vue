<template>
  <main class="sfwrap sfbody" style="max-width:1180px">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Deed Ledger</p>
      <h1 class="t-h2" style="font-size:2.1rem">What happened to your items</h1>
      <p>Append-only and attested: signed by the studio's key, cross-checked by Sverse against playtime telemetry. An item cannot gain 400 hours of history in a 20-minute session.</p>
    </div>

    <div class="note" style="margin-bottom:22px">
      <span class="note__i">📜</span>
      <div>Deeds read <b>oldest → newest</b>, so history reads as a story. There is no edit or delete affordance anywhere on this page — and none exists in the API either.</div>
    </div>

    <div class="card card--pad" style="margin-bottom:26px">
      <p class="t-micro dim" style="margin-bottom:12px">Verification states — a buyer must spot the difference before paying</p>
      <div class="grid g3" style="gap:14px">
        <div class="row" style="padding:12px 14px"><div class="row__info"><p class="vchip vchip--verified">✓ attested</p><p class="t-small dim">Studio signature verified and corroborated by telemetry.</p></div></div>
        <div class="row" style="padding:12px 14px"><div class="row__info"><p class="vchip vchip--pending">◐ verifying</p><p class="t-small dim">Written; the cross-check worker has not run yet.</p></div></div>
        <div class="row" style="padding:12px 14px"><div class="row__info"><p class="vchip vchip--unverified">⚠ unverified</p><p class="t-small dim">Failed the telemetry cross-check. May be legitimate — price accordingly.</p></div></div>
      </div>
    </div>

    <div v-if="status === 'pending' && !deeds.length" class="grid" style="gap:16px" aria-busy="true">
      <div v-for="n in 3" :key="n" class="sk" style="height:140px;border-radius:14px"></div>
    </div>
    <ErrorState v-else-if="error" title="Could not load your deed ledger" :error="error" :retry="refresh" />
    <EmptyState v-else-if="!groups.length" icon="📜" title="No Living Items in your passport" body="Items at tokenization level L3 and above accrue deeds as you play. Look for the L3 badge in the Store.">
      <NuxtLink class="btn btn--ghost btn--sm" to="/">Browse the Store</NuxtLink>
    </EmptyState>
    <template v-else>
      <div v-for="group in groups" :key="group.key" class="igroup">
        <div class="ihead">
          <img v-if="group.item?.imageUrl" :src="group.item.imageUrl" alt="">
          <div style="flex:1;min-width:0">
            <p class="ihead__n">{{ group.itemName }}</p>
            <p class="ihead__s">{{ group.schemaId ?? 'no schema' }}<template v-if="group.item?.tokenId"> · token {{ group.item.tokenId }}</template><template v-if="group.item?.traits?.level !== undefined"> · lvl {{ group.item.traits.level }}</template></p>
          </div>
          <span v-if="group.item" :class="tierClass(group.item.interopTier)">{{ group.item.interopTier }}</span>
          <ChainBadge v-if="group.item" :status="group.item.chain?.status" :tx-hash="group.item.chain?.txHash" :explorer-url="group.item.chain?.explorerUrl" :show-hash="false" />
          <span class="chip" :class="group.badgeClass">{{ group.badge }}</span>
        </div>
        <div class="ledger-wrap">
          <DeedList :deeds="group.deeds" />
        </div>
        <div class="ifoot">
          <span class="t-small dim">
            <template v-if="group.comparable">
              Market for {{ group.schemaId }}: <b style="color:var(--text)">{{ groupSrv(group.comparable.low.priceSrv) }} SRV</b> ({{ group.comparable.low.deedCount }} deeds)
              <template v-if="group.comparable.high.id !== group.comparable.low.id"> · up to <b style="color:var(--pink)">{{ groupSrv(group.comparable.high.priceSrv) }} SRV</b> ({{ group.comparable.high.deedCount }} deeds)</template>
            </template>
            <template v-else-if="group.unverified">One or more deeds failed the cross-check — buyers will see it before they pay.</template>
            <template v-else>No comparable listings on the market right now.</template>
          </span>
          <div v-if="group.item" style="display:flex;gap:8px;flex-wrap:wrap">
            <button v-if="['T2', 'T3'].includes(group.item.interopTier) && group.item.kind === 'living'" class="btn btn--ghost btn--sm" type="button" :disabled="group.item.listed" @click="importItem = group.item">Import to another game</button>
            <button v-if="group.item.transferable && group.item.status === 'owned' && !listedNow.has(group.item.id)" class="btn btn--ghost btn--sm" type="button" @click="listItem = group.item">List for sale</button>
            <NuxtLink v-else-if="group.item.listed || listedNow.has(group.item.id)" class="btn btn--ghost btn--sm" to="/passport">Listed · manage</NuxtLink>
          </div>
        </div>
      </div>
    </template>

    <InteropImportModal v-if="importItem" :item="importItem" @close="importItem = null" />
    <ListForSaleModal v-if="listItem" :item="listItem" @close="listItem = null" @listed="onListed" />
  </main>
</template>

<script setup lang="ts">
import type { Deed, InventoryItem, Listing } from '~/types/sverse'

useHead({ title: 'Deed Ledger · Sverse', meta: [{ name: 'robots', content: 'noindex' }] })

const api = useApi()

const { data: deedsData, status, error, refresh } = usePassportData('passport:deeds', () => api.many<Deed>('/api/v1/passport/me/deeds').then((res) => res.data))
const { data: inventoryData } = usePassportData('passport:deed-items', () => api.many<InventoryItem>('/api/v1/passport/me/inventory', { query: { limit: 100 } }).then((res) => res.data))
const { data: marketData } = useAsyncData('passport:deed-market', () => api.many<Listing>('/api/v1/market/listings', { query: { sort: 'price_asc', limit: 100 } }).then((res) => res.data), {
  server: false,
  lazy: true,
})

const deeds = computed(() => deedsData.value ?? [])
const inventory = computed(() => new Map((inventoryData.value ?? []).map((item) => [item.id, item])))
const listedNow = reactive(new Set<string>())
const importItem = ref<InventoryItem | null>(null)
const listItem = ref<InventoryItem | null>(null)

const marketBySchema = computed(() => {
  const map = new Map<string, Listing[]>()
  for (const listing of marketData.value ?? []) {
    if (!listing.schemaId) continue
    map.set(listing.schemaId, [...(map.get(listing.schemaId) ?? []), listing])
  }
  return map
})

const groups = computed(() => {
  const byItem = new Map<string, Deed[]>()
  for (const deed of deeds.value) byItem.set(deed.inventoryItemId, [...(byItem.get(deed.inventoryItemId) ?? []), deed])
  return [...byItem.entries()].map(([key, rows]) => {
    const ordered = [...rows].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    const verified = ordered.filter((row) => row.verified === true).length
    const unverified = ordered.filter((row) => row.verified === false).length
    const pending = ordered.filter((row) => row.verified === null || row.verified === undefined).length
    const schemaId = ordered[0]?.schemaId ?? null
    const comparables = schemaId ? (marketBySchema.value.get(schemaId) ?? []).filter((listing) => listing.inventoryItemId !== key) : []
    const sorted = [...comparables].sort((a, b) => compareUnits(a.priceUnits, b.priceUnits))
    return {
      key,
      item: inventory.value.get(key) ?? null,
      itemName: ordered[0]?.itemName ?? 'Item',
      schemaId,
      deeds: ordered,
      unverified,
      comparable: sorted.length ? { low: sorted[0]!, high: sorted[sorted.length - 1]! } : null,
      badge: unverified ? `${ordered.length} deeds · ${unverified} unverified` : pending ? `${ordered.length} deeds · ${pending} verifying` : `✓ ${verified} attested`,
      badgeClass: unverified ? 'chip--warn' : pending ? '' : 'chip--live',
    }
  })
})

function onListed() {
  if (listItem.value) listedNow.add(listItem.value.id)
  listItem.value = null
}
</script>
