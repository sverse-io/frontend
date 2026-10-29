<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="close">
      <div
        ref="dialog"
        class="modal"
        :class="{ 'modal--wide': wide }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="modal__h">
          <div>
            <h3 :id="titleId">{{ title }}</h3>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>
          <button class="modal__x" type="button" aria-label="Close" @click="close">✕</button>
        </div>
        <div class="modal__b">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal__f">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string; subtitle?: string; wide?: boolean; locked?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)
const titleId = `modal-${useId()}`
let previouslyFocused: HTMLElement | null = null

function close() {
  if (props.locked) return
  emit('close')
}

function focusables() {
  return Array.from(
    dialog.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
  )
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusables()
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement as HTMLElement | null
  nextTick(() => (focusables()[0] ?? dialog.value)?.focus())
})
onBeforeUnmount(() => previouslyFocused?.focus?.())
</script>
