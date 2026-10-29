<template>
  <div class="empty">
    <div v-if="icon" class="empty__i" aria-hidden="true">{{ icon }}</div>
    <h4>{{ title }}</h4>
    <p>{{ body }}</p>
    <div v-if="$slots.default" style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; body: string; icon?: string }>()
</script>
