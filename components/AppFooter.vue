<template>
  <footer class="sffoot">
    <div class="sfwrap sffoot__in">
      <p class="t-small dim">Sverse · a game store and player passport. Prices quoted in USD, settled in SRV.</p>
      <p class="sffoot__chain" :title="title">
        <span class="sffoot__dot" :class="dotClass" aria-hidden="true"></span>
        <span>{{ label }}</span>
        <span v-if="chain && chain.adapter !== 'mock'" class="t-mono dim">chainId {{ chain.chainId }}</span>
        <a v-if="chain?.explorer" :href="chain.explorer" target="_blank" rel="noopener" class="t-small">explorer ↗</a>
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { chain, label, error } = useChainStatus()

const dotClass = computed(() => {
  if (error.value) return 'is-bad'
  if (!chain.value) return ''
  return chain.value.adapter === 'mock' ? 'is-mock' : 'is-live'
})
const title = computed(() => {
  if (!chain.value) return 'Chain status unavailable'
  const block = chain.value.indexedBlock ? ` · indexed block ${chain.value.indexedBlock}` : ''
  return `${chain.value.adapter} adapter · network ${chain.value.network}${block}`
})
</script>
