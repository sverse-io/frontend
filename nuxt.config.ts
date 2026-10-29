import { env } from 'node:process'

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/sverse.css'],
  runtimeConfig: {
    public: {
      // The browser must reach the API on the same site as the app (e.g. both on `localhost`),
      // because the session cookies are SameSite=Lax.
      apiBase: env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:4000',
      studioUrl: env.NUXT_PUBLIC_STUDIO_URL ?? 'http://127.0.0.1:5173/studio',
    },
  },
  app: {
    head: {
      title: 'Sverse',
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap',
        },
        { rel: 'stylesheet', href: '/shared/css/tokens.css' },
        { rel: 'stylesheet', href: '/shared/css/ui.css' },
      ],
      // `/shared/js/ui.js` is the static design-file behaviour script (tabs, modals, demo toasts);
      // the app implements those in Vue, so it is intentionally not loaded here.
    },
  },
})
