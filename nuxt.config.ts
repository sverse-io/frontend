export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/sverse.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:4000',
    },
  },
  app: {
    head: {
      title: 'Sverse',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap',
        },
        { rel: 'stylesheet', href: '/shared/css/tokens.css' },
        { rel: 'stylesheet', href: '/shared/css/ui.css' },
      ],
      script: [{ src: '/shared/js/ui.js', defer: true }],
    },
  },
})
