<template>
  <main class="sfwrap sfbody">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Wardrobe</p>
      <h1 class="t-h2" style="font-size:2.1rem">Digital fashion that <span class="grad-text">travels</span></h1>
      <p>Cosmetics carry zero balance risk, so studios accept them — which is why T1 ships first and stat-bearing T2 waits for a partner cohort.</p>
    </div>

    <div v-if="status === 'pending' && !wardrobe" class="split-340 wardrobe-split" aria-busy="true">
      <div class="sk" style="height:420px;border-radius:var(--r-xl)"></div>
      <div class="items"><div v-for="n in 6" :key="n" class="item"><div class="sk" style="aspect-ratio:1"></div></div></div>
    </div>
    <ErrorState v-else-if="error && !wardrobe" title="Could not load your wardrobe" :error="error" :retry="refresh" />
    <div v-else-if="wardrobe" class="split-340 wardrobe-split">
      <div>
        <div class="loadout" aria-label="Current loadout">
          <div class="loadout__grid">
            <img v-for="item in wardrobe.equipped" :key="item.id" :src="item.imageUrl" :alt="item.name">
            <span v-if="!wardrobe.equipped.length" class="loadout__empty">Nothing equipped</span>
          </div>
          <div class="avatar-preview__tag">
            <div>
              <p style="font-size:.86rem;font-weight:600">Current loadout</p>
              <p class="t-small dim">renders in {{ loadoutTargets.length }} title{{ loadoutTargets.length === 1 ? '' : 's' }}</p>
            </div>
            <span class="chip chip--t1">T1</span>
          </div>
        </div>

        <div class="slots">
          <div v-for="slot in slots" :key="slot.key" class="slot" :class="{ free: !slot.item }">
            <span class="slot__k">{{ humanize(slot.key) }}</span>
            <img v-if="slot.item" :src="slot.item.imageUrl" alt="">
            <span style="flex:1">{{ slot.item?.name ?? '— empty slot —' }}</span>
            <button v-if="slot.item" class="btn btn--ghost btn--sm" type="button" :disabled="Boolean(saving)" @click="toggle(slot.item)">Unequip</button>
          </div>
        </div>

        <div v-if="displacedNote" class="note" style="margin-top:18px" role="status">
          <span class="note__i">↺</span>
          <div>{{ displacedNote }}</div>
        </div>
        <div class="note note--warn" style="margin-top:18px">
          <span class="note__i">⚠️</span>
          <div><b>One item per slot.</b> Equipping a second item for a slot displaces the first in the same update. A listed item cannot be equipped.</div>
        </div>
      </div>

      <div>
        <div class="note" style="margin-bottom:20px">
          <span class="note__i">🌐</span>
          <div><b>Shop by how many worlds it renders in.</b> The host icons under each item are the games whose interop envelope accepts that schema — straight from the API, never computed here.</div>
        </div>

        <EmptyState v-if="!candidates.length" icon="🧥" title="No cross-game items yet" body="T1+ cosmetics render in other games. Look for the T1 badge in the Store.">
          <NuxtLink class="btn btn--grad btn--sm" :to="{ path: '/', query: { interopTier: 'T1' } }">Find T1 items</NuxtLink>
        </EmptyState>
        <div v-else class="items">
          <article v-for="item in candidates" :key="item.id" class="item" :class="{ on: item.equipped }" :data-slot="item.slot ?? ''">
            <div class="item__art">
              <span class="item__tier" :class="tierClass(item.interopTier)">{{ item.interopTier }}</span>
              <img :src="item.imageUrl" :alt="item.name" loading="lazy">
            </div>
            <div class="item__body">
              <p class="item__n">{{ item.name }}</p>
              <p class="item__g">{{ item.game.title }} · {{ item.slot ?? 'no slot' }}</p>
              <p class="t-small dim" style="margin-top:4px">renders in {{ item.renderTargets.length }} title{{ item.renderTargets.length === 1 ? '' : 's' }}</p>
              <div class="renders">
                <NuxtLink v-for="target in item.renderTargets.slice(0, 6)" :key="target.gameId" :to="`/store/g/${target.slug}`" :title="target.title" :aria-label="target.title">
                  <img v-if="coverFor(target.slug)" :src="coverFor(target.slug)" :alt="target.title" loading="lazy">
                  <span v-else class="renders__glyph">{{ target.title.charAt(0) }}</span>
                </NuxtLink>
                <span v-if="item.renderTargets.length > 6" class="t-small dim" style="align-self:center">+{{ item.renderTargets.length - 6 }}</span>
              </div>
              <div class="item__acts">
                <button
                  class="btn btn--sm"
                  :class="item.equipped ? 'btn--grad on' : 'btn--ghost'"
                  type="button"
                  :disabled="saving === item.id || item.listed"
                  :aria-pressed="item.equipped"
                  @click="toggle(item)"
                >
                  {{ saving === item.id ? 'Saving…' : item.equipped ? 'Equipped ✓' : item.listed ? 'Listed' : 'Equip' }}
                </button>
              </div>
              <p v-if="inlineErrors[item.id]" class="field__err" role="alert">{{ inlineErrors[item.id] }}</p>
            </div>
          </article>
        </div>
        <p class="t-small dim" style="margin-top:14px">T0 items are identity-only — a badge or title can be displayed elsewhere, but nothing renders, so they never appear in this grid.</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { InventoryItem, Wardrobe } from '~/types/sverse'

useHead({ title: 'Wardrobe · Sverse', meta: [{ name: 'robots', content: 'noindex' }] })

const api = useApi()
const session = useSession()
const toast = useToast()
const { data: games } = useGameOptions()

const { data, status, error, refresh } = usePassportData('passport:wardrobe', () => api.one<Wardrobe>('/api/v1/passport/me/wardrobe'))

const local = ref<InventoryItem[] | null>(null)
watch(data, () => (local.value = null))

const wardrobe = computed(() => {
  if (!data.value) return null
  const candidates = local.value ?? data.value.candidates ?? []
  return { candidates, equipped: candidates.filter((item) => item.equipped) }
})
const candidates = computed(() =>
  [...(wardrobe.value?.candidates ?? [])].sort((a, b) => Number(b.equipped) - Number(a.equipped) || b.renderTargets.length - a.renderTargets.length),
)
const loadoutTargets = computed(() => {
  const ids = new Set<string>()
  for (const item of wardrobe.value?.equipped ?? []) for (const target of item.renderTargets) ids.add(target.gameId)
  return [...ids]
})
const slots = computed(() => {
  const keys = [...new Set((wardrobe.value?.candidates ?? []).map((item) => item.slot).filter(Boolean) as string[])]
  return keys.map((key) => ({ key, item: wardrobe.value?.equipped.find((item) => item.slot === key) ?? null }))
})
const coverBySlug = computed(() => new Map((games.value ?? []).map((game) => [game.slug, game.coverArt?.url ?? ''])))
function coverFor(slug: string) {
  return coverBySlug.value.get(slug) || ''
}

const saving = ref('')
const inlineErrors = reactive<Record<string, string>>({})
const displacedNote = ref('')

async function toggle(item: InventoryItem) {
  if (saving.value) return
  const before = (wardrobe.value?.candidates ?? []).map((row) => ({ ...row }))
  const equip = !item.equipped
  saving.value = item.id
  delete inlineErrors[item.id]
  displacedNote.value = ''
  // Optimistic update with slot displacement, rolled back on failure.
  const displaced = equip && item.slot ? before.filter((row) => row.id !== item.id && row.slot === item.slot && row.equipped) : []
  local.value = before.map((row) => {
    if (row.id === item.id) return { ...row, equipped: equip }
    if (displaced.some((d) => d.id === row.id)) return { ...row, equipped: false }
    return row
  })
  try {
    const result = await api.one<{ candidates: InventoryItem[] }>('/api/v1/passport/me/wardrobe', {
      method: 'PATCH',
      body: equip ? { equip: [item.id] } : { unequip: [item.id] },
    })
    if (result.candidates) local.value = result.candidates
    if (displaced.length) displacedNote.value = `${item.name} replaced ${displaced.map((row) => row.name).join(', ')} in the ${humanize(item.slot)} slot.`
    toast.push(equip ? 'Equipped' : 'Unequipped', 'Your loadout syncs to every game that renders it.', '🧥')
    session.reload()
  } catch (err) {
    local.value = before
    inlineErrors[item.id] = isApiError(err, 'item_listed')
      ? 'This item is listed on the market — cancel the listing before equipping it.'
      : isApiError(err, 'not_interoperable')
        ? 'T0 items cannot be equipped across games.'
        : errorMessage(err)
  } finally {
    saving.value = ''
  }
}
</script>
