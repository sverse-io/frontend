<template>
  <div>
    <div v-if="status === 'pending' && !items.length" class="grid" style="gap:13px" aria-busy="true">
      <div v-for="n in 3" :key="n" class="sk" style="height:86px;border-radius:14px"></div>
    </div>
    <ErrorState v-else-if="error" title="Could not load item packs" :error="error" :retry="refresh" />
    <EmptyState v-else-if="!items.length" icon="🛍" title="No item packs yet" body="This studio has not put anything on sale. Check the club for news." />
    <div v-else class="grid" style="gap:13px">
      <div v-for="item in items" :key="item.id" class="row">
        <div class="row__art"><img :src="item.art?.url" alt="" loading="lazy"></div>
        <div class="row__info">
          <div class="row__n">
            {{ item.name }}
            <span :class="tierClass(item.interopTier)">{{ item.interopTier }}</span>
            <span class="chip">{{ item.kind.toUpperCase() }}</span>
            <span v-if="item.supply?.type === 'limited'" class="chip chip--lvl">{{ item.supply.remaining ?? 0 }} / {{ item.supply.max }} left</span>
          </div>
          <p class="row__d">{{ item.description }}</p>
        </div>
        <div class="row__buy">
          <p class="row__srv">{{ groupSrv(item.priceSrv) }} SRV</p>
          <p class="row__usd">${{ item.priceUsdSnapshot }}</p>
          <button
            class="btn btn--sm"
            :class="isOwned(item) || soldOut(item) ? 'btn--ghost is-off' : 'btn--grad'"
            :disabled="isOwned(item) || soldOut(item)"
            type="button"
            @click="checkoutItem = item"
          >
            {{ isOwned(item) ? 'Owned' : soldOut(item) ? 'Sold out' : 'Buy' }}
          </button>
        </div>
      </div>
    </div>

    <div class="note" style="margin-top:22px">
      <span class="note__i">🎚</span>
      <div>
        This studio publishes at <b>{{ tokenizationLevel }}</b> on the Tokenization Ladder. Items at L3+ are minted to your passport on-chain;
        lower levels stay off-chain entitlements. Moving up a level is a config change and cannot be undone.
      </div>
    </div>

    <CheckoutModal
      v-if="checkoutItem"
      :item="checkoutItem"
      :game-title="gameTitle"
      @close="checkoutItem = null"
      @purchased="markOwned(checkoutItem!)"
      @owned="markOwned(checkoutItem!)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ItemDefinition } from '~/types/sverse'

const props = defineProps<{ slug: string; gameTitle: string; tokenizationLevel: string }>()

const api = useApi()
const session = useSession()
const { data, status, error, refresh } = useAsyncData(`items:${props.slug}`, () => api.many<ItemDefinition>(`/api/v1/games/${props.slug}/items`).then((res) => res.data), {
  default: () => [] as ItemDefinition[],
})

const items = computed(() => data.value ?? [])
const ownedNow = reactive(new Set<string>())
const checkoutItem = ref<ItemDefinition | null>(null)

function isOwned(item: ItemDefinition) {
  return !item.stackable && (item.owned || ownedNow.has(item.id))
}
function soldOut(item: ItemDefinition) {
  return item.supply?.type === 'limited' && (item.supply.remaining ?? 0) <= 0
}
function markOwned(item: ItemDefinition) {
  ownedNow.add(item.id)
  // Keep supply counters honest locally for limited items (no refetch).
  if (data.value) {
    data.value = data.value.map((row) =>
      row.id === item.id && row.supply?.type === 'limited'
        ? { ...row, supply: { ...row.supply, minted: row.supply.minted + 1, remaining: Math.max(0, (row.supply.remaining ?? 1) - 1) } }
        : row,
    )
  }
}

// A logged-in state change (login in another tab, logout) changes `owned` flags.
watch(() => session.user.value?.id, (next, prev) => {
  if (next !== prev) refresh()
})
</script>
