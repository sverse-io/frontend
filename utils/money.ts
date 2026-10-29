// Money helpers. `*Units` integer strings are authoritative (1 SRV = 1,000,000 units).
// Everything here is integer/string arithmetic — no floating point touches an amount.

export const SRV_DECIMALS = 6
const ONE_SRV = 1_000_000n

/**
 * Parse a user-typed SRV amount ("120", "120.5", "1,200.25") into an integer units string.
 * Returns null for anything that is not a positive amount with at most 6 decimals.
 */
export function srvToUnits(input: string): string | null {
  const text = String(input ?? '').trim().replace(/[,\s_]/g, '')
  if (!/^\d+(\.\d{1,6})?$/.test(text)) return null
  const [whole = '0', frac = ''] = text.split('.')
  const units = BigInt(whole) * ONE_SRV + BigInt(frac.padEnd(SRV_DECIMALS, '0') || '0')
  if (units <= 0n) return null
  return units.toString()
}

/** Integer units → grouped display string, e.g. "2450000000" → "2,450.00". Display only. */
export function formatUnits(units: string | number | bigint | null | undefined, decimals = 2): string {
  let value: bigint
  try {
    value = BigInt(units ?? 0)
  } catch {
    return '—'
  }
  const negative = value < 0n
  const abs = negative ? -value : value
  const whole = abs / ONE_SRV
  const frac = (abs % ONE_SRV).toString().padStart(SRV_DECIMALS, '0').slice(0, decimals)
  return `${negative ? '-' : ''}${groupDigits(whole.toString())}${decimals ? `.${frac}` : ''}`
}

/** Adds thousands separators to an API display string such as `priceSrv` ("1840.00" → "1,840.00"). */
export function groupSrv(srv: string | null | undefined): string {
  if (srv === null || srv === undefined || srv === '') return '—'
  const text = String(srv)
  const negative = text.startsWith('-')
  const [whole = '0', frac] = (negative ? text.slice(1) : text).split('.')
  return `${negative ? '-' : ''}${groupDigits(whole)}${frac !== undefined ? `.${frac}` : ''}`
}

/** Percentage of `part` in `total` for bar widths (display geometry, not money). */
export function unitsPct(part: string | bigint, total: string | bigint): number {
  try {
    const p = BigInt(part)
    const t = BigInt(total)
    if (t <= 0n) return 0
    return Number((p * 10_000n) / t) / 100
  } catch {
    return 0
  }
}

export function sumUnits(values: Array<string | null | undefined>): string {
  return values.reduce<bigint>((sum, value) => sum + BigInt(value || 0), 0n).toString()
}

export function compareUnits(a: string, b: string): number {
  const left = BigInt(a || 0)
  const right = BigInt(b || 0)
  return left === right ? 0 : left < right ? -1 : 1
}

function groupDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
