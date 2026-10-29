import type { ChainInfo } from '~/types/sverse'

/** `GET /chain/status`, shared app-wide (footer + top bar). */
export function useChainStatus() {
  const api = useApi()
  const { data, status, error, refresh } = useAsyncData('chain-status', () => api.one<ChainInfo>('/api/v1/chain/status'), {
    dedupe: 'defer',
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  })
  const label = computed(() => (data.value ? chainNetworkLabel(data.value) : status.value === 'pending' ? 'Checking chain…' : 'Chain unavailable'))
  return { chain: data, status, error, refresh, label }
}
