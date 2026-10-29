<template>
  <AppModal title="List for sale" :subtitle="`${item.name} · ${item.game.title}`" :locked="busy" @close="$emit('close')">
    <form id="list-form" novalidate @submit.prevent="submit">
      <div class="field" :class="{ bad: priceError }">
        <label for="list-price">Price (SRV)</label>
        <input id="list-price" v-model.trim="price" inputmode="decimal" autocomplete="off" placeholder="e.g. 250 or 199.5" :aria-invalid="Boolean(priceError)">
        <p v-if="priceError" class="field__err">{{ priceError }}</p>
        <p v-else-if="units" class="field__hint">= <span class="t-mono">{{ units }}</span> units · buyers see {{ formatUnits(units) }} SRV</p>
        <p v-else class="field__hint">Up to 6 decimals. The studio royalty and protocol fee are taken from the sale price.</p>
      </div>
    </form>
    <div v-if="units" class="rows">
      <div><span>Sale price</span><strong>{{ formatUnits(units) }} SRV</strong></div>
      <div><span>Studio royalty ({{ royaltyPct }}%)</span><strong>− {{ formatUnits(royaltyUnits) }} SRV</strong></div>
      <div><span>Protocol fee ({{ protocolPct }}%)</span><strong>− {{ formatUnits(protocolUnits) }} SRV</strong></div>
      <div class="tot"><span>You receive (estimate)</span><strong>{{ formatUnits(sellerUnits) }} SRV</strong></div>
    </div>
    <div class="note" style="margin-top:16px">
      <span class="note__i">📜</span>
      <div>Listing unequips the item and blocks imports until you cancel. {{ item.deedCount ? `Its ${item.deedCount} deed${item.deedCount === 1 ? '' : 's'} transfer to the buyer.` : '' }}</div>
    </div>
    <p v-if="formError" class="field__err" role="alert" style="margin-top:12px">{{ formError }}</p>
    <template #footer>
      <button class="btn btn--ghost" type="button" :disabled="busy" @click="$emit('close')">Cancel</button>
      <button class="btn btn--grad" type="submit" form="list-form" :disabled="busy || !units">{{ busy ? 'Listing…' : 'List item' }}</button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { InventoryItem, Listing } from '~/types/sverse'

const props = defineProps<{ item: InventoryItem; royaltyBps?: number; protocolBps?: number }>()
const emit = defineEmits<{ close: []; listed: [listing: Listing] }>()

const api = useApi()
const toast = useToast()
const price = ref('')
const busy = ref(false)
const formError = ref('')
const serverPriceError = ref('')

const royaltyBps = computed(() => props.royaltyBps ?? 500)
const protocolBps = computed(() => props.protocolBps ?? 250)
const royaltyPct = computed(() => royaltyBps.value / 100)
const protocolPct = computed(() => protocolBps.value / 100)

const units = computed(() => srvToUnits(price.value))
const priceError = computed(() => {
  if (serverPriceError.value) return serverPriceError.value
  if (!price.value) return ''
  return units.value ? '' : 'Enter a positive SRV amount with at most 6 decimals.'
})
watch(price, () => (serverPriceError.value = ''))

const royaltyUnits = computed(() => (units.value ? ((BigInt(units.value) * BigInt(royaltyBps.value)) / 10_000n).toString() : '0'))
const protocolUnits = computed(() => (units.value ? ((BigInt(units.value) * BigInt(protocolBps.value)) / 10_000n).toString() : '0'))
const sellerUnits = computed(() => (units.value ? (BigInt(units.value) - BigInt(royaltyUnits.value) - BigInt(protocolUnits.value)).toString() : '0'))

async function submit() {
  if (busy.value || !units.value) return
  busy.value = true
  formError.value = ''
  try {
    const listing = await api.one<Listing>('/api/v1/market/listings', { method: 'POST', body: { inventoryItemId: props.item.id, priceUnits: units.value } })
    toast.push('Listed', `${props.item.name} is on the market for ${groupSrv(listing.priceSrv)} SRV.`, '⇄')
    emit('listed', listing)
  } catch (error) {
    if (isApiError(error, 'invalid_price') || (isApiError(error, 'validation_failed') && error.field('priceUnits'))) serverPriceError.value = 'The API rejected this price — enter a positive amount.'
    else if (isApiError(error, 'already_listed')) formError.value = 'This item is already listed.'
    else if (isApiError(error, 'not_transferable')) formError.value = 'This item is soulbound and cannot be sold.'
    else if (isApiError(error, 'split_stack_first')) formError.value = 'Stacked items must be split before listing.'
    else if (isApiError(error, 'item_not_owned') || isApiError(error, 'item_not_found')) formError.value = 'This item is no longer in your passport.'
    else formError.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}
</script>
