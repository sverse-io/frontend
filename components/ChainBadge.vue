<template>
  <span class="chainbadge">
    <span class="chip" :class="chipClass" :title="title">{{ label }}</span>
    <a v-if="explorerUrl" class="t-small chainbadge__tx" :href="explorerUrl" target="_blank" rel="noopener">{{ txLabel }} ↗</a>
    <span v-else-if="txHash && showHash" class="t-mono dim chainbadge__tx" :title="txHash">{{ shortHash(txHash) }}</span>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ status?: string | null; txHash?: string | null; explorerUrl?: string | null; showHash?: boolean }>(), {
  status: 'none',
  txHash: null,
  explorerUrl: null,
  showHash: true,
})

const label = computed(() => {
  switch (props.status) {
    case 'confirmed':
      return '⛓ on-chain'
    case 'pending':
    case 'submitted':
    case 'queued':
      return '◐ chain pending'
    case 'failed':
      return '✕ chain failed'
    default:
      return 'off-chain'
  }
})
const chipClass = computed(() => {
  if (props.status === 'confirmed') return 'chip--live'
  if (props.status === 'failed') return 'chip--bad'
  if (props.status === 'pending' || props.status === 'submitted' || props.status === 'queued') return 'chip--warn'
  return ''
})
const title = computed(() => {
  if (props.status === 'none' || !props.status) return 'Not anchored on-chain (tokenization level below the mint threshold, or not yet queued)'
  return props.txHash ? `tx ${props.txHash}` : `chain status: ${props.status}`
})
const txLabel = computed(() => (props.txHash ? shortHash(props.txHash) : 'explorer'))
</script>
