<template>
  <div class="empty">
    <h3>{{ title }}</h3>
    <p>{{ body }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; body: string }>()
</script>
