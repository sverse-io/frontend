type ApiEnvelope<T> = { data: T }
type ApiCollection<T> = { data: T[]; meta: { count: number; hasMore: boolean; nextCursor: string | null } }

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  async function apiFetch<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
    return await $fetch<T>(path, {
      baseURL,
      credentials: 'include',
      ...options,
      headers: {
        ...requestHeaders,
        ...(options.headers as Record<string, string> | undefined),
      },
    })
  }

  return {
    one: <T>(path: string, options?: Parameters<typeof $fetch>[1]) =>
      apiFetch<ApiEnvelope<T>>(path, options).then((res) => res.data),
    many: <T>(path: string, options?: Parameters<typeof $fetch>[1]) =>
      apiFetch<ApiCollection<T>>(path, options),
  }
}
