import type { ChainInfo } from '~/types/sverse'

export function tierClass(tier?: string | null) {
  return ['chip', tier === 'T2' || tier === 'T3' ? 'chip--t2' : tier === 'T1' ? 'chip--t1' : 'chip--t0'].join(' ')
}

export function humanize(value?: string | null) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

export const genreLabel = humanize

export function formatCount(value?: number | null) {
  const n = Number(value ?? 0)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function formatNumber(value?: number | null, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number(value ?? 0))
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} UTC`
}

export function timeAgo(value?: string | null, now = Date.now()) {
  if (!value) return ''
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export function shortHash(value?: string | null, head = 10, tail = 6) {
  if (!value) return ''
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value
}

export function chainNetworkLabel(info?: Pick<ChainInfo, 'adapter' | 'chainId'> | null) {
  if (!info) return 'Chain status unknown'
  if (info.adapter === 'mock') return 'Mock chain'
  const byId: Record<number, string> = { 43113: 'Avalanche Fuji', 43114: 'Avalanche C-Chain', 31337: 'Local EVM' }
  return byId[Number(info.chainId)] ?? `Chain ${info.chainId}`
}

/** Renders a deed `detail` (now an object) or any small record as label/value pairs. */
export function recordEntries(value: unknown): Array<{ key: string; value: string }> {
  if (value === null || value === undefined) return []
  if (typeof value !== 'object') return [{ key: 'detail', value: String(value) }]
  return Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
    key,
    value: typeof entry === 'object' && entry !== null ? JSON.stringify(entry) : String(entry),
  }))
}

export function newIdempotencyKey() {
  const cryptoApi = globalThis.crypto as Crypto | undefined
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  const bytes = new Uint8Array(16)
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return `idem-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}
