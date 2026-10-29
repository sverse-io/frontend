<template>
  <span v-if="count === 0" class="chip">no deeds</span>
  <span v-else-if="unverified > 0" class="chip chip--warn" :title="`${verified} of ${count} deeds attested at listing time`">
    {{ count }} deed{{ count === 1 ? '' : 's' }} · {{ unverified }} not attested
  </span>
  <span v-else class="chip chip--live">✓ {{ count }} deed{{ count === 1 ? '' : 's' }} attested</span>
</template>

<script setup lang="ts">
const props = defineProps<{ count: number; verified: number }>()
const unverified = computed(() => Math.max(0, (props.count ?? 0) - (props.verified ?? 0)))
</script>
