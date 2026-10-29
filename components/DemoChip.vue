<template>
  <span v-if="show" class="chip chip--warn demo-chip" title="Seeded demo numbers for the prototype — not live traction">Demo data</span>
</template>

<script setup lang="ts">
const props = defineProps<{ source?: string | null }>()
const show = computed(() => props.source === 'seed')
</script>
