<template>
  <header class="sftop">
    <div class="sfwrap">
      <div class="sftop__r1">
        <NuxtLink class="sftop__logo" to="/" aria-label="Sverse Store">
          <img :src="sverseLogo" alt="Sverse">
        </NuxtLink>

        <form class="sfsearch" @submit.prevent="submitSearch">
          <span class="sfsearch__i">⌕</span>
          <input v-model="search" type="search" :placeholder="placeholder">
        </form>

        <div class="sftop__right">
          <span class="balance"><i>S</i><span class="num">{{ balance }}</span> SRV</span>
          <a class="btn btn--ghost btn--sm" href="http://127.0.0.1:5173/studio">Studio ↗</a>
          <NuxtLink class="avatar" to="/passport" aria-label="S-Passport">
            <img src="https://picsum.photos/seed/passport-you/68/68" alt="Your avatar">
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="sfwrap">
      <nav class="sfnav">
        <NuxtLink class="sfnav-link" to="/">Games</NuxtLink>
        <NuxtLink class="sfnav-link" to="/market">Items &amp; Market</NuxtLink>
        <span class="sfnav__sep"></span>
        <NuxtLink class="sfnav-link" to="/passport">My library</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/wardrobe">Wardrobe</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/deeds">Deeds</NuxtLink>
        <NuxtLink class="sfnav-link" to="/passport/rewards">Rewards</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import sverseLogo from '~/assets/images/sverse-logo.png'

const props = defineProps<{ balance?: string }>()
const route = useRoute()
const router = useRouter()

const search = ref(String(route.query.q ?? ''))
const placeholder = computed(() => {
  if (route.path.includes('/passport/wardrobe')) return 'Search cosmetics...'
  if (route.path.includes('/passport/deeds')) return 'Search deeds...'
  if (route.path.includes('/passport/rewards')) return 'Search epochs...'
  if (route.path.includes('/passport')) return 'Search items, games...'
  return 'Search games, items, studios...'
})

const balance = computed(() => props.balance ?? '2,450')

watch(
  () => route.query.q,
  (value) => {
    search.value = String(value ?? '')
  },
)

function submitSearch() {
  const q = search.value.trim()
  router.push({ path: '/', query: q ? { q } : {} })
}
</script>
