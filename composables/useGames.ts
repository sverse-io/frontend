import type { GameSummary } from '~/types/sverse'

/** Live games list, used by pickers (interop host, market filter). */
export function useGameOptions() {
  const api = useApi()
  return useAsyncData('games:options', () => api.many<GameSummary>('/api/v1/games', { query: { limit: 100 } }).then((res) => res.data), {
    default: () => [] as GameSummary[],
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  })
}
