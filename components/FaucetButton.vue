<template>
  <span v-if="enabled" class="faucet">
    <button class="btn btn--ghost btn--sm" type="button" :disabled="busy || coolingDown" @click="claim">
      {{ busy ? 'Requesting…' : coolingDown ? 'Faucet used today' : 'Get test SRV' }}
    </button>
    <span v-if="message" class="t-small" :class="failed ? 'vu' : 'vf'" role="status">{{ message }}</span>
  </span>
</template>

<script setup lang="ts">
import type { FaucetResult } from '~/types/sverse'

const emit = defineEmits<{ funded: [result: FaucetResult] }>()
const api = useApi()
const session = useSession()
const busy = ref(false)
const message = ref('')
const failed = ref(false)

const enabled = computed(() => Boolean(session.user.value?.faucet?.enabled))
const coolingDown = computed(() => {
  const at = session.user.value?.faucet?.availableAt
  return Boolean(at && new Date(at).getTime() > Date.now())
})

async function claim() {
  if (busy.value) return
  busy.value = true
  message.value = ''
  failed.value = false
  try {
    const result = await api.one<FaucetResult>('/api/v1/passport/me/faucet', { method: 'POST' })
    session.setBalance(result)
    const current = session.user.value
    if (current) session.setUser({ ...current, faucet: { ...current.faucet, availableAt: new Date(Date.now() + 86_400_000).toISOString() } })
    message.value = `+${groupSrv(result.creditedSrv)} test SRV credited`
    emit('funded', result)
  } catch (error) {
    failed.value = true
    if (isApiError(error, 'faucet_cooldown')) message.value = 'Faucet already used in the last 24h.'
    else if (isApiError(error, 'faucet_disabled')) message.value = 'The faucet is disabled on this network.'
    else message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}
</script>
