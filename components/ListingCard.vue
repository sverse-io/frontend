<template>
  <article class="lcard">
    <div class="lcard__art">
      <img :src="listing.imageUrl" :alt="listing.name" loading="lazy">
      <span v-if="listing.interopTier" :class="['lcard__tier', tierClass(listing.interopTier)]">{{ listing.interopTier }}</span>
      <span class="lcard__deeds"><DeedMix :count="listing.deedCount" :verified="listing.verifiedDeedCount" /></span>
    </div>
    <div class="lcard__b">
      <p class="lcard__n">{{ listing.name }}</p>
      <p class="lcard__g">
        <NuxtLink v-if="listing.gameSlug" :to="`/store/g/${listing.gameSlug}?tab=market`">{{ listing.game?.title ?? listing.gameSlug }}</NuxtLink>
        · {{ listing.schemaId ?? 'no schema' }}
      </p>
      <p class="t-small dim" style="margin-top:4px">seller @{{ listing.seller?.handle ?? 'unknown' }} · ★ {{ listing.seller?.reputation ?? 0 }}</p>
      <div class="lcard__f">
        <div>
          <p style="font-weight:700;font-size:.95rem">{{ groupSrv(listing.priceSrv) }} SRV</p>
          <p class="t-small dim">${{ listing.priceUsdSnapshot }}</p>
        </div>
        <div style="display:flex;gap:6px">
          <button v-if="listing.inventoryItemId" class="btn btn--ghost btn--sm" type="button" :aria-label="`Deed history for ${listing.name}`" @click="$emit('history', listing)">History</button>
          <button class="btn btn--sm" :class="own ? 'btn--ghost is-off' : 'btn--grad'" type="button" :disabled="own" @click="$emit('buy', listing)">
            {{ own ? 'Yours' : 'Buy' }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Listing } from '~/types/sverse'

const props = defineProps<{ listing: Listing }>()
defineEmits<{ buy: [listing: Listing]; history: [listing: Listing] }>()

const session = useSession()
const own = computed(() => Boolean(session.user.value && props.listing.seller?.id === session.user.value.id))
</script>
