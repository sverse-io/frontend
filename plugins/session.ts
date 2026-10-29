// Resolves the S-Passport session. SSR asks `/auth/me` with the forwarded cookie; when SSR could
// not decide (expired access token, refresh cookie not visible to the frontend host) the browser
// finishes the job after hydration, refreshing once if needed.
export default defineNuxtPlugin({
  name: 'sverse-session',
  async setup(nuxtApp) {
    const session = useSession()
    if (import.meta.server) {
      await session.ensure()
      return
    }
    if (session.resolved.value) return
    nuxtApp.hook('app:suspense:resolve', async () => {
      await session.ensure()
      const route = useRoute()
      if (!session.loggedIn.value && requiresAuth(route.path)) {
        await navigateTo(loginPath(route.fullPath), { replace: true })
      }
    })
  },
})
