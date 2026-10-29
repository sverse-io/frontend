<template>
  <StoreBrowse />
</template>

<script setup lang="ts">
// `/store` is an alias of the Store home at `/` (filters carry over).
const route = useRoute()
await navigateTo({ path: '/', query: route.query }, { redirectCode: 301, replace: true })
</script>
