import type { SessionUser } from '~/types/sverse'

/**
 * idle          nothing resolved yet
 * unknown       SSR could not confirm a session but one may exist (the refresh cookie is scoped to
 *               /api/v1/auth, so only the browser can refresh); the client resolves it after hydration
 * authenticated user is set
 * anonymous     confirmed logged out
 */
export type SessionStatus = 'idle' | 'unknown' | 'authenticated' | 'anonymous'

export interface SessionState {
  status: SessionStatus
  user: SessionUser | null
}

const HINT_COOKIE = 'sv_hint'
const HINT_MAX_AGE = 30 * 24 * 3600

export function useSessionState() {
  return useState<SessionState>('sv:session', () => ({ status: 'idle', user: null }))
}

export function useSession() {
  const state = useSessionState()
  const nuxtApp = useNuxtApp()
  const api = useApi()
  // A non-secret, frontend-scoped hint that a refresh cookie probably exists. It only decides
  // whether SSR may treat a missing access token as "logged out" — it never grants access.
  const hint = useCookie<string | null>(HINT_COOKIE, { maxAge: HINT_MAX_AGE, sameSite: 'lax', path: '/' })

  const user = computed(() => state.value.user)
  const status = computed(() => state.value.status)
  const loggedIn = computed(() => state.value.status === 'authenticated' && Boolean(state.value.user))
  const resolved = computed(() => state.value.status === 'authenticated' || state.value.status === 'anonymous')

  function setUser(next: SessionUser | null) {
    state.value = next ? { status: 'authenticated', user: next } : { status: 'anonymous', user: null }
    hint.value = next ? '1' : null
  }

  async function fetchMe() {
    try {
      const me = await api.one<SessionUser>('/api/v1/auth/me')
      setUser(me)
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 403)) {
        if (import.meta.server && hint.value) state.value = { status: 'unknown', user: null }
        else setUser(null)
        return
      }
      // Backend unreachable or erroring. SSR leaves it unresolved for the browser to retry; the
      // browser shows the logged-out chrome (keeping the hint so a later load can try again).
      state.value = { status: import.meta.server ? 'unknown' : 'anonymous', user: null }
    }
  }

  /** Resolve the session once per app instance (deduplicated). */
  async function ensure(options: { force?: boolean } = {}) {
    if (!options.force) {
      if (import.meta.server && state.value.status !== 'idle') return
      if (import.meta.client && resolved.value) return
    }
    const holder = nuxtApp as unknown as { _svSessionLoad?: Promise<void> | null }
    if (!holder._svSessionLoad) {
      holder._svSessionLoad = fetchMe().finally(() => {
        holder._svSessionLoad = null
      })
    }
    await holder._svSessionLoad
  }

  async function reload() {
    await ensure({ force: true })
  }

  async function login(email: string, password: string) {
    const me = await api.one<SessionUser>('/api/v1/auth/login', { method: 'POST', body: { email, password } })
    setUser(me)
    return me
  }

  async function register(input: { handle: string; email: string; password: string; referralCode?: string }) {
    const me = await api.one<SessionUser>('/api/v1/auth/register', { method: 'POST', body: input })
    setUser(me)
    return me
  }

  async function logout() {
    try {
      await api.one('/api/v1/auth/logout', { method: 'POST' })
    } catch {
      // Cookies are cleared server-side when reachable; locally we are logged out either way.
    }
    setUser(null)
    clearNuxtData()
  }

  /** Apply a balance returned by a write (checkout, buy, claim, faucet) without refetching. */
  function setBalance(balance: { balanceUnits?: string; balanceSrv?: string } | null | undefined) {
    if (!balance?.balanceUnits || !state.value.user) return
    state.value = {
      ...state.value,
      user: { ...state.value.user, balanceUnits: balance.balanceUnits, balanceSrv: balance.balanceSrv ?? state.value.user.balanceSrv },
    }
  }

  return { state, user, status, loggedIn, resolved, ensure, reload, login, register, logout, setBalance, setUser }
}
