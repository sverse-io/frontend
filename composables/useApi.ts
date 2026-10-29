import type { Collection } from '~/types/sverse'

type FetchOptions = NonNullable<Parameters<typeof $fetch>[1]>

export interface ApiOptions extends FetchOptions {
  /** Sent as the `Idempotency-Key` header (8–128 chars). */
  idempotencyKey?: string
  /** Do not attempt the refresh-once retry on a 401. */
  skipRefresh?: boolean
}

export interface ApiErrorDetail {
  field?: string
  issue?: string
  [key: string]: unknown
}

/** Normalised API failure. Branch on `code`, never on `message`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly requestId: string | null
  readonly retryAfter: number | null

  constructor(init: { status: number; code: string; message?: string; details?: ApiErrorDetail[]; requestId?: string | null; retryAfter?: number | null }) {
    super(init.message || init.code)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.details = init.details ?? []
    this.requestId = init.requestId ?? null
    this.retryAfter = init.retryAfter ?? null
  }

  /** Survives useAsyncData's createError() wrapping and SSR payload serialisation. */
  get statusCode() {
    return this.status
  }

  get data() {
    return { error: { code: this.code, message: this.message, details: this.details, requestId: this.requestId } }
  }

  /** Detail issue for one field, if the API reported one. */
  field(name: string): string | undefined {
    return this.details.find((detail) => detail.field === name)?.issue
  }
}

export function isApiError(value: unknown, code?: string): value is ApiError {
  return value instanceof ApiError && (code === undefined || value.code === code)
}

/**
 * The ApiError behind an error from `useAsyncData` (which wraps it in a NuxtError, and on the
 * client revives it from the SSR payload without the original instance).
 */
export function apiErrorOf(value: unknown): ApiError | null {
  if (!value) return null
  if (value instanceof ApiError) return value
  const cause = (value as { cause?: unknown }).cause
  if (cause instanceof ApiError) return cause
  const data = (value as { data?: { error?: { code?: unknown } } }).data
  if (data?.error && typeof data.error.code === 'string') return toApiError(value)
  return null
}

const AUTH_NO_RETRY = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh', '/api/v1/auth/logout']

// One refresh in flight at a time (client only): the API rotates refresh tokens, and two
// concurrent refreshes with the same token would trip its reuse detection.
let refreshInFlight: Promise<boolean> | null = null

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = String(config.public.apiBase).replace(/\/$/, '')
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  // Captured in setup context so a failed refresh can mark the session logged out later.
  const sessionState = useSessionState()

  async function send<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const { idempotencyKey, skipRefresh: _skip, ...rest } = options
    const headers: Record<string, string> = {
      ...(requestHeaders ?? {}),
      ...((rest.headers as Record<string, string> | undefined) ?? {}),
    }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    try {
      const response = await $fetch<T>(path, {
        ...rest,
        baseURL,
        credentials: 'include',
        headers,
        retry: 0,
      } as FetchOptions)
      return normalizeAssetUrls(response as T, baseURL)
    } catch (error) {
      throw toApiError(error)
    }
  }

  async function refreshSession(): Promise<boolean> {
    if (import.meta.server) return false
    if (!refreshInFlight) {
      refreshInFlight = send('/api/v1/auth/refresh', { method: 'POST' })
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          refreshInFlight = null
        })
    }
    return refreshInFlight
  }

  async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
    try {
      return await send<T>(path, options)
    } catch (error) {
      const retryable =
        import.meta.client &&
        isApiError(error) &&
        error.status === 401 &&
        !options.skipRefresh &&
        !AUTH_NO_RETRY.some((prefix) => path.startsWith(prefix))
      if (!retryable) throw error
      const refreshed = await refreshSession()
      if (!refreshed) {
        sessionState.value = { status: 'anonymous', user: null }
        throw error
      }
      try {
        return await send<T>(path, options)
      } catch (retryError) {
        if (isApiError(retryError) && retryError.status === 401) sessionState.value = { status: 'anonymous', user: null }
        throw retryError
      }
    }
  }

  return {
    baseURL,
    request,
    refreshSession,
    /** Single-resource envelope `{ data }` → `data`. */
    one: <T>(path: string, options?: ApiOptions) => request<{ data: T }>(path, options).then((res) => res.data),
    /** Collection envelope `{ data: [], meta }`. */
    many: <T>(path: string, options?: ApiOptions) => request<Collection<T>>(path, options),
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const cause = (error as { cause?: unknown } | null)?.cause
  if (cause instanceof ApiError) return cause
  const fetchError = error as { status?: number; statusCode?: number; data?: any; message?: string; response?: { headers?: Headers } }
  const status = Number(fetchError?.status ?? fetchError?.statusCode ?? 0)
  const body = fetchError?.data?.error
  if (body && typeof body.code === 'string') {
    const retryHeader = fetchError.response?.headers?.get?.('retry-after')
    return new ApiError({
      status,
      code: body.code,
      message: body.message,
      details: Array.isArray(body.details) ? body.details : [],
      requestId: body.requestId ?? null,
      retryAfter: retryHeader ? Number(retryHeader) : null,
    })
  }
  if (!status) return new ApiError({ status: 0, code: 'network_error', message: 'The Sverse API could not be reached.' })
  return new ApiError({ status, code: status >= 500 ? 'internal_error' : 'unknown_error', message: fetchError?.message })
}

/** Human message for an error state; never just the raw code. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const apiError = error instanceof ApiError ? error : error ? toApiError(error) : null
  if (!apiError) return fallback
  const known: Record<string, string> = {
    network_error: 'The Sverse API could not be reached. Check that the backend is running.',
    missing_session: 'Your session has ended. Log in again to continue.',
    internal_error: 'The server hit an error. Please try again.',
    rate_limited: 'Too many requests. Wait a moment and try again.',
    not_found: 'That could not be found.',
  }
  return known[apiError.code] ?? (apiError.message && apiError.message !== apiError.code ? capitalise(apiError.message) : fallback)
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
  if (!value.startsWith('http')) return value
  try {
    const url = new URL(value)
    const isLocalAsset = ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.startsWith('/assets/')
    if (isLocalAsset) return `${assetBase}${url.pathname}${url.search}${url.hash}`
  } catch {
    // Non-URL strings are regular API data and should remain untouched.
  }

  return value
}
