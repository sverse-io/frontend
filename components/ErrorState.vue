<template>
  <div class="empty" role="alert">
    <div class="empty__i" aria-hidden="true">⚠</div>
    <h4>{{ title }}</h4>
    <p>{{ message }}</p>
    <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button v-if="retry" class="btn btn--ghost btn--sm" type="button" @click="retry()">Retry</button>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ title?: string; error?: unknown; retry?: () => unknown }>()
const title = computed(() => props.title ?? 'Could not load this')
const message = computed(() => errorMessage(props.error))
</script>
