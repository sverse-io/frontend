<template>
  <div class="toasts" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="toast" role="status">
      <span aria-hidden="true">{{ toast.icon }}</span>
      <div>
        <strong>{{ toast.title }}</strong>
        <small v-if="toast.body">{{ toast.body }}</small>
      </div>
      <button class="modal__x" type="button" aria-label="Dismiss" @click="dismiss(toast.id)">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>
