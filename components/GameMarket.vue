<template>
  <div>
    <div class="note" style="margin-bottom:20px">
      <span class="note__i">🗡</span>
      <div>
        <b>Same schema, same stats, different price.</b> On the secondary market the difference between two identical items is the deed ledger —
        open <b>History</b> on any listing before you buy.
      </div>
    </div>

    <div v-if="status === 'pending' && !listings.length" class="grid g4 market-grid" aria-busy="true">
      <div v-for="n in 4" :key="n" class="sk" style="aspect-ratio:3/4;border-radius:var(--r-lg)"></div>
    </div>
    <ErrorState v-else-if="error" title="Could not load listings" :error="error" :retry="refresh" />
    <EmptyState v-else-if="!listings.length" icon="⇄" title="No secondary listings yet" body="When owners list items from this game they appear here with their full deed history.">
      <NuxtLink class="btn btn--ghost btn--sm" to="/market">Browse the whole market</NuxtLink>
    </EmptyState>
    <div v-else class="grid market-grid">
      <ListingCard v-for="listing in listings" :key="listing.id" :listing="listing" @buy="buying = $event" @history="history = $event" />
    </div>

    <DeedLedgerModal
      v-if="history?.inventoryItemId"
      :inventory-item-id="history.inventoryItemId"
      :name="history.name"
      :schema-id="history.schemaId"
      @close="history = null"
    />
    <ListingBuyModal v-if="buying" :listing="buying" @close="buying = null" @bought="removeListing(buying!.id)" @gone="removeListing" />
  </div>
</template>

<script setup lang="ts">
import type { Listing } from '~/types/sverse'

const props = defineProps<{ slug: string }>()
const emit = defineEmits<{ changed: [count: number] }>()

const api = useApi()
const { data, status, error, refresh } = useAsyncData(`listings:${props.slug}`, () => api.many<Listing>(`/api/v1/games/${props.slug}/listings`).then((res) => res.data), {
  default: () => [] as Listing[],
})
const listings = computed(() => data.value ?? [])
const buying = ref<Listing | null>(null)
const history = ref<Listing | null>(null)

function removeListing(id: string) {
  data.value = (data.value ?? []).filter((listing) => listing.id !== id)
  emit('changed', data.value.length)
}
</script>
