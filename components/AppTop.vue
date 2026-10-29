<template>
  <header class="sftop">
    <div class="sfwrap">
      <div class="sftop__r1">
        <NuxtLink class="sftop__logo" to="/" aria-label="Sverse Store">
          <img :src="sverseLogo" alt="Sverse">
        </NuxtLink>

        <form class="sfsearch" role="search" @submit.prevent="submitSearch">
          <span class="sfsearch__i" aria-hidden="true">⌕</span>
          <input v-model="search" type="search" :placeholder="placeholder" aria-label="Search">
        </form>

        <div class="sftop__right">
          <template v-if="loggedIn && user">
            <NuxtLink class="balance" to="/passport/orders" :title="`${user.balanceUnits} units`" aria-label="SRV balance">
              <i>S</i><span class="num">{{ groupSrv(user.balanceSrv) }}</span> SRV
            </NuxtLink>
            <div ref="menuRoot" class="umenu">
              <button
                class="avatar umenu__btn"
                type="button"
                :aria-expanded="menuOpen"
                aria-haspopup="menu"
                :aria-label="`Account menu for @${user.handle}`"
                @click="menuOpen = !menuOpen"
              >
                <span class="umenu__initial">{{ initial }}</span>
              </button>
              <div v-if="menuOpen" class="umenu__pop" role="menu" @keydown.esc="menuOpen = false">
                <div class="umenu__who">
                  <p class="umenu__h">@{{ user.handle }}</p>
                  <p class="t-small dim">★ {{ user.reputation }} reputation</p>
                </div>
                <NuxtLink role="menuitem" to="/passport" @click="menuOpen = false">My Passport</NuxtLink>
                <NuxtLink role="menuitem" to="/passport/orders" @click="menuOpen = false">Orders</NuxtLink>
                <a role="menuitem" :href="studioUrl" @click="menuOpen = false">Studio console ↗</a>
                <button role="menuitem" type="button" :disabled="loggingOut" @click="logout">
                  {{ loggingOut ? 'Logging out…' : 'Log out' }}
                </button>
              </div>
            </div>
          </template>
          <template v-else-if="status === 'anonymous'">
            <NuxtLink class="btn btn--ghost btn--sm" :to="loginLink">Log in</NuxtLink>
            <NuxtLink class="btn btn--grad btn--sm" to="/signup">Sign up</NuxtLink>
          </template>
          <template v-else>
            <span class="sk" style="width:120px;height:32px;border-radius:var(--r-pill)" aria-hidden="true"></span>
            <span class="sk" style="width:34px;height:34px;border-radius:50%" aria-hidden="true"></span>
          </template>
        </div>
      </div>
    </div>

    <div class="sfwrap">
      <nav class="sfnav" aria-label="Primary">
        <NuxtLink class="sfnav-link" :class="{ on: isStore }" to="/">Games</NuxtLink>
        <NuxtLink class="sfnav-link" to="/market">Items &amp; Market</NuxtLink>
        <span class="sfnav__sep"></span>
        <NuxtLink class="sfnav-link" to="/passport" exact-active-class="on" active-class="">My library</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/wardrobe">Wardrobe</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/deeds">Deeds</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/rewards">Rewards</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/orders">Orders</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import sverseLogo from '~/assets/images/sverse-logo.png'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const session = useSession()
const toast = useToast()

const { user, loggedIn, status } = session
const studioUrl = computed(() => String(config.public.studioUrl || 'http://127.0.0.1:5173/studio'))
const initial = computed(() => (user.value?.handle ?? '?').charAt(0).toUpperCase())
const loginLink = computed(() => loginPath(route.fullPath))
const isStore = computed(() => route.path === '/' || route.path.startsWith('/store'))

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const loggingOut = ref(false)

const search = ref(String(route.query.q ?? ''))
const placeholder = computed(() => {
  if (route.path.startsWith('/market')) return 'Search listings...'
  if (route.path.startsWith('/passport')) return 'Search games...'
  return 'Search games, items, studios...'
})

watch(
  () => route.query.q,
  (value) => {
    search.value = String(value ?? '')
  },
)
watch(() => route.fullPath, () => {
  menuOpen.value = false
})

function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(event.target as Node)) menuOpen.value = false
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKey)
})

async function logout() {
  loggingOut.value = true
  try {
    await session.logout()
    menuOpen.value = false
    toast.push('Logged out', 'Your S-Passport stays safe — log in any time.', '👋')
    if (requiresAuth(route.path)) await navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}

function submitSearch() {
  const q = search.value.trim()
  const path = route.path.startsWith('/market') ? '/market' : '/'
  router.push({ path, query: q ? { ...(path === '/market' ? route.query : {}), q } : {} })
}
</script>
