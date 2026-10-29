<template>
  <NuxtLink class="tcard" :class="{ 'tcard--wide': wide }" :to="`/store/g/${game.slug}`">
    <div class="tcard__art" :style="artStyle">
      <div class="tcard__tags">
        <span v-if="game.mine" class="chip chip--yours">YOUR GAME</span>
        <span :class="tierClass(game.interopTier)">{{ game.interopTier }}</span>
        <span class="chip chip--lvl">{{ game.tokenizationLevel }}</span>
      </div>
      <img v-if="game.coverArt?.url" :src="game.coverArt.url" :alt="game.title" loading="lazy">
    </div>
    <div class="tcard__b">
      <p class="tcard__t">{{ game.title }}</p>
      <p class="tcard__s">@{{ game.studio?.handle }} · {{ genreLabel(game.genre) }}</p>
      <p class="tcard__m">
        <span>{{ formatCount(game.stats?.playersLive ?? 0) }} playing</span>
        <DemoChip :source="game.statsSource" />
        <template v-if="game.priceFromSrv">
          <span>·</span>
          <span>from {{ groupSrv(game.priceFromSrv) }} SRV</span>
        </template>
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { GameSummary } from '~/types/sverse'

const props = defineProps<{ game: GameSummary; wide?: boolean }>()
const artStyle = computed(() => (!props.game.coverArt?.url && props.game.coverArt?.gradient ? { background: `linear-gradient(120deg, ${props.game.coverArt.gradient})` } : undefined))
</script>
