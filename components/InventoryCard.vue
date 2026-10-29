<template>
  <article class="item" :class="{ on: item.equipped }">
    <div class="item__art">
      <span class="item__tier" :class="tierClass(item.interopTier)">{{ item.interopTier }}</span>
      <img :src="item.imageUrl" :alt="item.name" loading="lazy">
    </div>
    <div class="item__body">
      <p class="item__n">{{ item.name }}</p>
      <p class="item__g">
        <NuxtLink :to="`/store/g/${item.game.slug}`">{{ item.game.title }}</NuxtLink> · {{ item.kind }}<template v-if="item.quantity > 1"> × {{ item.quantity }}</template>
      </p>
      <div class="item__meta">
        <span v-if="item.kind === 'living'" class="chip" style="color:var(--pink)">{{ item.deedCount }} deed{{ item.deedCount === 1 ? '' : 's' }}</span>
        <span v-if="item.equipped" class="chip chip--live">EQUIPPED</span>
        <span v-if="item.listed || item.status === 'listed'" class="chip chip--warn">LISTED{{ listing ? ` · ${groupSrv(listing.priceSrv)} SRV` : '' }}</span>
        <span v-if="!item.transferable" class="chip">soulbound</span>
      </div>
      <div class="item__chain">
        <ChainBadge :status="item.chain?.status" :tx-hash="item.chain?.txHash" :explorer-url="item.chain?.explorerUrl" :show-hash="false" />
        <span v-if="item.tokenId" class="t-mono dim" :title="`token ${item.tokenId}`">#{{ item.tokenId }}</span>
      </div>
      <p v-if="item.renderTargets?.length" class="t-small dim" style="margin-top:4px">renders in {{ item.renderTargets.length }} titles</p>

      <div v-if="hasActions" class="item__acts">
        <button v-if="isLiving" class="btn btn--ghost btn--sm" type="button" @click="$emit('history', item)">History</button>
        <button v-if="canImport" class="btn btn--ghost btn--sm" type="button" :disabled="isListed" :title="isListed ? 'Cancel the listing to import' : ''" @click="$emit('import', item)">Import</button>
        <button
          v-if="canEquip"
          class="btn btn--sm"
          :class="item.equipped ? 'btn--grad on' : 'btn--ghost'"
          type="button"
          :disabled="busy === 'equip' || isListed"
          :title="isListed ? 'Listed items cannot be equipped' : ''"
          @click="$emit('equip', item)"
        >
          {{ item.equipped ? 'Equipped ✓' : 'Equip' }}
        </button>
        <button v-if="canList" class="btn btn--ghost btn--sm" type="button" @click="$emit('list', item)">List for sale</button>
        <button v-if="isListed" class="btn btn--ghost btn--sm" type="button" :disabled="busy === 'cancel' || !listing" @click="$emit('cancel', item)">
          {{ busy === 'cancel' ? 'Cancelling…' : 'Cancel listing' }}
        </button>
      </div>
      <p v-if="error" class="field__err" role="alert">{{ error }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { InventoryItem, Listing } from '~/types/sverse'

const props = defineProps<{ item: InventoryItem; listing?: Listing | null; busy?: string; error?: string }>()
defineEmits<{
  history: [item: InventoryItem]
  import: [item: InventoryItem]
  equip: [item: InventoryItem]
  list: [item: InventoryItem]
  cancel: [item: InventoryItem]
}>()

// Action rules (spec 05 P-03): Living → History + Import (T2+); T1 cosmetics → Equip;
// market actions only for transferable items you hold.
const isLiving = computed(() => props.item.kind === 'living')
const isListed = computed(() => props.item.listed || props.item.status === 'listed')
const canImport = computed(() => isLiving.value && ['T2', 'T3'].includes(props.item.interopTier))
const canEquip = computed(() => !isLiving.value && props.item.interopTier === 'T1')
const canList = computed(() => props.item.transferable && props.item.status === 'owned' && !isListed.value)
const hasActions = computed(() => isLiving.value || canEquip.value || canList.value || isListed.value)
</script>
