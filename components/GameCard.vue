<template>
  <NuxtLink class="tcard" :class="{ 'tcard--wide': wide }" :to="`/store/g/${game.slug}`">
    <div class="tcard__art">
      <div class="tcard__tags">
        <span v-if="game.mine" class="chip chip--yours">YOUR GAME</span>
        <span :class="tierClass(game.interopTier)">{{ game.interopTier }}</span>
        <span class="chip chip--lvl">{{ game.tokenizationLevel }}</span>
      </div>
      <img :src="game.coverArt?.url" :alt="game.title" loading="lazy">
    </div>
    <div class="tcard__b">
      <p class="tcard__t">{{ game.title }}</p>
      <p class="tcard__s">{{ game.studio?.handle }} · {{ genreLabel(game.genre) }}</p>
      <p class="tcard__m">
        <span>{{ formatPlaying(game.stats?.playersLive ?? game.stats?.dau ?? 0) }} playing</span>
        <span>·</span>
        <span>from {{ game.priceFromSrv }} SRV</span>
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{ game: any; wide?: boolean }>()

function tierClass(tier: string) {
  return ['chip', tier === 'T2' ? 'chip--t2' : tier === 'T1' ? 'chip--t1' : 'chip--t0'].join(' ')
}

function genreLabel(genre?: string) {
  return String(genre ?? '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatPlaying(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}
</script>
