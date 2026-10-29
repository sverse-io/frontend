<template>
  <div class="feesplit">
    <div class="sbar" role="img" :aria-label="ariaLabel">
      <div
        v-for="part in visibleParts"
        :key="part.key"
        :style="{ width: `${part.pct}%`, background: part.color }"
        :title="`${part.label}: ${formatUnits(part.units)} SRV`"
      >
        <template v-if="part.pct >= 14">{{ part.short }} {{ part.pctLabel }}</template>
      </div>
    </div>
    <div class="legend">
      <span v-for="part in parts" :key="`l-${part.key}`">
        <i :style="{ background: part.color }"></i>{{ part.label }} · {{ formatUnits(part.units) }} SRV<template v-if="part.pctLabel"> ({{ part.pctLabel }})</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeeBreakdown } from '~/types/sverse'

const props = defineProps<{ breakdown: Partial<FeeBreakdown>; totalUnits: string; studioLabel?: string }>()

const parts = computed(() => {
  const b = props.breakdown
  const total = props.totalUnits
  const rows = [
    { key: 'studio', short: 'STUDIO', label: props.studioLabel ?? 'Studio', units: b.studioUnits ?? '0', color: 'var(--violet)' },
    { key: 'burn', short: 'BURN', label: 'Protocol · burn', units: b.burnUnits ?? '0', color: 'var(--red)' },
    { key: 'creator', short: 'CREATORS', label: 'Protocol · creator rewards', units: b.creatorRewardsUnits ?? '0', color: 'var(--magenta)' },
    { key: 'player', short: 'PLAYERS', label: 'Protocol · player rewards', units: b.playerRewardsUnits ?? '0', color: 'var(--pink)' },
    { key: 'treasury', short: 'TREASURY', label: 'Protocol · treasury', units: b.treasuryUnits ?? '0', color: 'var(--cyan)' },
    { key: 'curator', short: 'CURATORS', label: 'Protocol · curators', units: b.curatorUnits ?? '0', color: 'var(--amber)' },
  ]
  return rows.map((row) => {
    const pct = unitsPct(row.units, total)
    return { ...row, pct, pctLabel: pct > 0 ? `${pct.toFixed(pct < 1 ? 2 : 1).replace(/\.0+$/, '')}%` : '' }
  })
})
const visibleParts = computed(() => parts.value.filter((part) => part.pct > 0))
const ariaLabel = computed(() => parts.value.map((part) => `${part.label} ${part.pctLabel || '0%'}`).join(', '))
</script>
