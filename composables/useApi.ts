type ApiEnvelope<T> = { data: T }
type ApiCollection<T> = { data: T[]; meta: { count: number; hasMore: boolean; nextCursor: string | null } }

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = String(config.public.apiBase).replace(/\/$/, '')
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  async function apiFetch<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
    const response = await $fetch<T>(path, {
      baseURL,
      credentials: 'include',
      ...options,
      headers: {
        ...requestHeaders,
        ...(options.headers as Record<string, string> | undefined),
      },
    })

    return normalizeAssetUrls(response, baseURL)
  }

  return {
    one: <T>(path: string, options?: Parameters<typeof $fetch>[1]) =>
      apiFetch<ApiEnvelope<T>>(path, options).then((res) => res.data),
    many: <T>(path: string, options?: Parameters<typeof $fetch>[1]) =>
      apiFetch<ApiCollection<T>>(path, options),
  }
}

function normalizeAssetUrls<T>(value: T, assetBase: string): T {
  if (typeof value === 'string') return normalizeAssetUrl(value, assetBase) as T
  if (Array.isArray(value)) return value.map((entry) => normalizeAssetUrls(entry, assetBase)) as T
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, normalizeAssetUrls(entry, assetBase)]),
  ) as T
}

function normalizeAssetUrl(value: string, assetBase: string) {
  try {
    const url = new URL(value)
    const isLocalAsset = ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.startsWith('/assets/')
    if (isLocalAsset) return `${assetBase}${url.pathname}${url.search}${url.hash}`
  } catch {
    // Non-URL strings are regular API data and should remain untouched.
  }

  return value
}
