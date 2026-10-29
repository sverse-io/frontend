// RequireAuth (spec 04 §2): `/passport/**` redirects to `/login?next=<encoded path>` when logged out.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!requiresAuth(to.path)) return
  const session = useSession()
  const nuxtApp = useNuxtApp()

  if (import.meta.server) {
    if (session.status.value === 'anonymous') return navigateTo(loginPath(to.fullPath))
    return
  }
  // During hydration an unresolved session is finished by the session plugin once the app is ready.
  if (nuxtApp.isHydrating && !session.resolved.value) return
  await session.ensure()
  if (!session.loggedIn.value) return navigateTo(loginPath(to.fullPath))
})
