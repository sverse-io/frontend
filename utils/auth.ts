const PROTECTED_PREFIXES = ['/passport']

export function requiresAuth(path: string) {
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function loginPath(next?: string | null) {
  const target = safeNext(next)
  return target && target !== '/' ? `/login?next=${encodeURIComponent(target)}` : '/login'
}

/** Only same-app relative paths are honoured as `?next=` targets (no open redirects). */
export function safeNext(value: unknown, fallback = '/'): string {
  const text = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
  if (!text.startsWith('/') || text.startsWith('//') || text.startsWith('/\\')) return fallback
  if (text.startsWith('/login') || text.startsWith('/signup')) return fallback
  return text
}
