<template>
  <div class="sf">
    <AppTop :balance="balance" />
    <slot />
  </div>
</template>

<script setup lang="ts">
const balance = ref('2,450')
</script>
