import type { AsyncDataOptions } from '#app'

/**
 * Private passport data. Rendered on the server only when SSR already holds a confirmed session;
 * otherwise fetched in the browser, where the API client can refresh an expired access token.
 */
export function usePassportData<T>(key: string, handler: () => Promise<T>, options: AsyncDataOptions<T> = {}) {
  const session = useSession()
  return useAsyncData<T>(key, handler, { lazy: true, server: session.loggedIn.value, ...options })
}
