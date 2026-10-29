<template>
  <AppModal :title="`Deed Ledger · ${name}`" :subtitle="subtitle" wide @close="$emit('close')">
    <div v-if="status === 'pending' || status === 'idle'" class="grid" style="gap:10px">
      <div v-for="n in 3" :key="n" class="sk" style="height:76px;border-radius:12px"></div>
    </div>
    <ErrorState v-else-if="error" title="Could not load the deed ledger" :error="error" :retry="refresh" />
    <EmptyState v-else-if="!deeds.length" icon="📜" title="No deeds yet" body="This item has no recorded history. Its price reflects the base item only." />
    <template v-else>
      <p class="t-small dim" style="margin-bottom:12px">
        {{ deeds.length }} deed{{ deeds.length === 1 ? '' : 's' }} ·
        <span class="vf">{{ counts.verified }} attested</span> ·
        <span class="vu">{{ counts.unverified }} unverified</span> ·
        <span class="vp">{{ counts.pending }} verifying</span>
      </p>
      <DeedList :deeds="deeds" />
    </template>
    <div class="note" style="margin-top:18px">
      <span class="note__i">🔐</span>
      <div>Deeds are append-only, signed by the studio and cross-checked against Proof-of-Play telemetry. The full history transfers with the item when it sells.</div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { Deed } from '~/types/sverse'

const props = defineProps<{ inventoryItemId: string; name: string; schemaId?: string | null }>()
defineEmits<{ close: [] }>()

const api = useApi()
const { data, status, error, refresh } = useAsyncData(
  `item-deeds:${props.inventoryItemId}`,
  () => api.many<Deed>(`/api/v1/items/${props.inventoryItemId}/deeds`).then((res) => res.data),
  { server: false, default: () => [] as Deed[] },
)
const deeds = computed(() => data.value ?? [])
const counts = computed(() => ({
  verified: deeds.value.filter((deed) => deed.verified === true).length,
  unverified: deeds.value.filter((deed) => deed.verified === false).length,
  pending: deeds.value.filter((deed) => deed.verified === null || deed.verified === undefined).length,
}))
const subtitle = computed(() => [props.schemaId, 'append-only provenance'].filter(Boolean).join(' · '))
</script>
