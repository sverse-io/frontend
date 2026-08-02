<template>
  <main class="sfwrap sfbody" style="max-width:1180px">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Deed Ledger</p>
      <h1 class="t-h2" style="font-size:2.1rem">What happened to your items</h1>
      <p>Append-only and attested: signed by the studio's key, co-signed by Sverse against playtime telemetry. An item cannot gain 400 hours of history in a 20-minute session.</p>
    </div>

    <div data-tabscope>
      <section class="pane on" data-pane="deeds">
        <div class="note" style="margin-bottom:22px">
          <span class="note__i">📜</span>
          <div>Deeds read <b>oldest → newest</b>, so history reads as a story. There is no edit or delete affordance anywhere on this page — and none exists in the API either.</div>
        </div>

        <div class="card card--pad" style="margin-bottom:26px">
          <p class="t-micro dim" style="margin-bottom:12px">Verification states — a buyer must spot the difference before paying</p>
          <div class="grid g3" style="gap:14px">
            <div class="row" style="padding:12px 14px">
              <div class="row__info">
                <p class="vf" style="font-size:.86rem">✓ attested</p>
                <p class="t-small dim">Studio signature verified and corroborated by telemetry.</p>
              </div>
            </div>
            <div class="row" style="padding:12px 14px">
              <div class="row__info">
                <p class="vp" style="font-size:.86rem">◐ verifying</p>
                <p class="t-small dim">Written; the cross-check worker has not run yet.</p>
              </div>
            </div>
            <div class="row" style="padding:12px 14px">
              <div class="row__info">
                <p class="vu" style="font-size:.86rem">⚠ unverified</p>
                <p class="t-small dim">Failed the telemetry cross-check. May be legitimate — price accordingly.</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="pending" class="grid" style="gap:16px">
          <div v-for="n in 3" :key="n" class="sk" style="height:108px;border-radius:14px"></div>
        </div>

        <template v-else>
          <div v-for="group in groups" :key="group.key" class="igroup">
            <div class="ihead">
              <img :src="group.image" alt="">
              <div style="flex:1">
                <p class="ihead__n">{{ group.itemName }}</p>
                <p class="ihead__s">{{ group.schemaId }} · {{ group.meta }}</p>
              </div>
              <span :class="group.tierClass">{{ group.tier }}</span>
              <span :class="group.badgeClass">{{ group.badge }}</span>
            </div>
            <div class="ledger">
              <div
                v-for="deed in group.deeds"
                :key="deed.id"
                class="deed"
                :style="deed.verified === false ? 'border-color:rgba(255,190,61,.35);background:rgba(255,190,61,.05)' : ''"
              >
                <span class="deed__i"><img :src="deedImage(group.key, deed.deedType)" alt=""></span>
                <div><div class="deed__n">{{ deed.deedType }}</div><div class="deed__d">{{ deed.detail }}</div></div>
                <div class="deed__m">epoch {{ deed.epoch }}<br><span :class="verificationClass(deed.verified)">{{ verificationLabel(deed.verified) }}</span></div>
              </div>
            </div>

            <div v-if="group.variant === 'verified'" class="ifoot">
              <span class="t-small dim">Comparable without deeds: <b style="color:var(--text)">210 SRV</b> · this one: <b style="color:var(--pink)">1,840 SRV</b></span>
              <div style="display:flex;gap:8px">
                <button class="btn btn--ghost btn--sm" type="button" @click="interopItem = group.item">Import to another game</button>
                <button class="btn btn--ghost btn--sm" type="button">List for sale</button>
              </div>
            </div>

            <div v-else-if="group.variant === 'mixed'" class="ifoot">
              <span class="t-small dim">One deed failed its cross-check. A review case is open on @onehuman's attestation key.</span>
              <button class="btn btn--ghost btn--sm" type="button">View review case</button>
            </div>
          </div>

          <p class="sect">State: no living items</p>
          <div class="empty">
            <div class="empty__i">📜</div>
            <h4>No Living Items in your passport</h4>
            <p>Items at tokenization level L3 and above accrue deeds. Look for the <span class="chip chip--lvl">L3</span> badge in the Store.</p>
          </div>
        </template>
      </section>
    </div>
  </main>

  <div v-if="interopItem" class="backdrop" @click.self="interopItem = null">
    <div class="modal modal--wide">
      <div class="modal__h">
        <div><h3>Import to another game</h3><p>{{ interopItem.name }} → Grimloop · tier {{ interopItem.interopTier }}</p></div>
        <button class="modal__x" type="button" @click="interopItem = null">✕</button>
      </div>
      <div class="modal__b">
        <div class="env">
          <div class="env__b">
            <h5>Source · {{ interopItem.game.title }}</h5>
            <div><span>power_tier</span><strong>{{ interopItem.traits?.power_tier ?? 4 }}</strong></div>
            <div><span>rarity</span><strong>{{ interopItem.traits?.rarity ?? 'epic' }}</strong></div>
            <div><span>raw damage</span><strong>{{ interopItem.traits?.level ? interopItem.traits.level * 10 - 2 : 418 }}</strong></div>
          </div>
          <div class="env__a">→</div>
          <div class="env__b out">
            <h5>Grimloop's envelope</h5>
            <div><span>accepts</span><strong>tier 1–5</strong></div>
            <div><span>mapped rarity</span><strong>{{ interopItem.traits?.rarity ?? 'epic' }}</strong></div>
            <div><span>host damage</span><strong>62</strong></div>
          </div>
        </div>
        <div class="rows" style="margin-top:18px">
          <div><span>Schema match</span><strong class="vf">✓</strong></div>
          <div><span>License check</span><strong class="vf">✓ derivative-allowed</strong></div>
          <div><span>Deeds carried</span><strong>{{ interopItem.deedCount }}</strong></div>
          <div class="tot"><span>Import fee</span><strong>12 SRV</strong></div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" @click="interopItem = null">Cancel</button>
        <button class="btn btn--grad" type="button" @click="interopItem = null">Import for 12 SRV</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Deed Ledger · Sverse' })

const api = useApi()
const config = useRuntimeConfig()
const interopItem = ref<any | null>(null)

const { data: deedsRes, pending } = await useAsyncData('passport-deeds', () => api.many<any>('/api/v1/passport/me/deeds').catch(() => ({ data: [] })))
const { data: inventoryRes } = await useAsyncData('passport-deed-items', () => api.many<any>('/api/v1/passport/me/inventory').catch(() => ({ data: [] })))

const deedRows = computed(() => (deedsRes.value?.data?.length ? deedsRes.value.data : demoDeeds).slice().sort((a: any, b: any) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))))
const inventoryMap = computed(() => {
  const rows = inventoryRes.value?.data?.length ? inventoryRes.value.data : demoInventory
  return new Map(rows.map((item: any) => [item.id, item]))
})

const groups = computed(() => {
  const map = new Map<string, any[]>()
  for (const deed of deedRows.value) {
    map.set(deed.inventoryItemId, [...(map.get(deed.inventoryItemId) ?? []), deed])
  }

  return [...map.entries()].map(([key, rows]) => {
    const item = inventoryMap.value.get(key) ?? demoInventory.find((entry: any) => entry.id === key)
    const verified = rows.filter((row) => row.verified === true).length
    const unverified = rows.filter((row) => row.verified === false).length
    const verifying = rows.filter((row) => row.verified === null).length

    let variant = 'verified'
    if (unverified > 0) variant = 'mixed'
    else if (verifying > 0) variant = 'pending'

    return {
      key,
      item,
      itemName: rows[0].itemName,
      schemaId: rows[0].schemaId,
      deeds: rows,
      meta: buildMeta(item, rows[0].schemaId),
      image: item?.imageUrl ?? seedAsset('items/itd_vr_blade.png'),
      tier: item?.interopTier ?? 'T2',
      tierClass: tierClass(item?.interopTier ?? 'T2'),
      variant,
      badge:
        variant === 'mixed'
          ? `${rows.length} deeds · ${unverified} unverified`
          : variant === 'pending'
            ? `${verifying} verifying`
            : `✓ ${verified} verified`,
      badgeClass: ['chip', variant === 'mixed' ? 'chip--warn' : variant === 'pending' ? '' : 'chip--live'].join(' '),
    }
  })
})

function seedAsset(path: string) {
  const base = String(config.public.apiBase ?? 'http://127.0.0.1:4000').replace(/\/$/, '')
  return `${base}/assets/seed/${path}`
}

function buildMeta(item: any, schemaId: string) {
  const token = item?.id?.replace(/^inv_/, 'mock_') ?? 'mock_0000'
  const extras = []
  if (item?.traits?.level) extras.push(`lvl ${item.traits.level}`)
  if (item?.traits?.wear) extras.push(`wear ${item.traits.wear}`)
  return [schemaId, `token ${token}`, ...extras].join(' · ')
}

function tierClass(tier: string) {
  return ['chip', tier === 'T2' ? 'chip--t2' : tier === 'T1' ? 'chip--t1' : 'chip--t0'].join(' ')
}

function verificationLabel(value: boolean | null) {
  if (value === true) return '✓ attested'
  if (value === false) return '⚠ unverified'
  return '◐ verifying'
}

function verificationClass(value: boolean | null) {
  if (value === true) return 'vf'
  if (value === false) return 'vu'
  return 'vp'
}

function deedImage(itemId: string, deedType: string) {
  const byItem: Record<string, string> = {
    inv_voidblade_a: 'items/itd_vr_blade.png',
    inv_scarbound_relic: 'items/itd_gl_relic.png',
    inv_dreadhull_221: 'items/itd_hf_hull.png',
  }
  const byType: Record<string, string> = {
    kills: 'games/voidrunner-cover.png',
    tournament_top8: 'studios/voidrunner.png',
    flawless_run: 'games/grimloop-cover.png',
    boss_defeated: 'items/itd_vr_blade.png',
    deaths_remembered: 'studios/grimloop.png',
    scar_earned: 'items/itd_gl_relic.png',
    marathon_run: 'items/itd_gl_relic.png',
    fleet_wiped: 'items/itd_hf_hull.png',
  }
  return seedAsset(byItem[itemId] ?? byType[deedType] ?? 'games/lumen-leap-cover.png')
}

const demoInventory = [
  { id: 'inv_voidblade_a', name: 'Voidblade #4412', game: { title: 'Voidrunner' }, interopTier: 'T2', imageUrl: seedAsset('items/itd_vr_blade.png'), deedCount: 4, traits: { level: 42, wear: 0.18, rarity: 'epic', power_tier: 4 } },
  { id: 'inv_scarbound_relic', name: 'Scarbound Relic #88', game: { title: 'Grimloop' }, interopTier: 'T2', imageUrl: seedAsset('items/itd_gl_relic.png'), deedCount: 3, traits: { level: 17, rarity: 'rare' } },
  { id: 'inv_dreadhull_221', name: 'Dreadnought Hull #221', game: { title: 'Hexfleet' }, interopTier: 'T2', imageUrl: seedAsset('items/itd_hf_hull.png'), deedCount: 1, traits: {} },
]

const demoDeeds = [
  { id: 'ded_1', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'kills', detail: '4,120 total', epoch: '790', verified: true, createdAt: '2026-05-01T00:00:00.000Z' },
  { id: 'ded_2', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'tournament_top8', detail: 'Ashfall Invitational · quarter-final', epoch: '799', verified: true, createdAt: '2026-05-08T00:00:00.000Z' },
  { id: 'ded_3', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'flawless_run', detail: 'no damage taken · 41 rooms', epoch: '806', verified: true, createdAt: '2026-05-20T00:00:00.000Z' },
  { id: 'ded_4', inventoryItemId: 'inv_voidblade_a', itemName: 'Voidblade #4412', schemaId: 'sts/weapon/melee/v1', deedType: 'boss_defeated', detail: 'Ashmaw · mythic · solo', epoch: '812', verified: true, createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'ded_5', inventoryItemId: 'inv_scarbound_relic', itemName: 'Scarbound Relic #88', schemaId: 'sts/weapon/relic/v1', deedType: 'deaths_remembered', detail: '88 runs ended', epoch: '803', verified: true, createdAt: '2026-05-10T00:00:00.000Z' },
  { id: 'ded_6', inventoryItemId: 'inv_scarbound_relic', itemName: 'Scarbound Relic #88', schemaId: 'sts/weapon/relic/v1', deedType: 'scar_earned', detail: 'permanent · phase 3 survivor', epoch: '809', verified: true, createdAt: '2026-05-28T00:00:00.000Z' },
  { id: 'ded_7', inventoryItemId: 'inv_scarbound_relic', itemName: 'Scarbound Relic #88', schemaId: 'sts/weapon/relic/v1', deedType: 'marathon_run', detail: 'claimed 14h continuous — telemetry recorded 41m', epoch: '811', verified: false, createdAt: '2026-06-03T00:00:00.000Z' },
  { id: 'ded_8', inventoryItemId: 'inv_dreadhull_221', itemName: 'Dreadnought Hull #221', schemaId: 'sts/vehicle/capital/v1', deedType: 'fleet_wiped', detail: '12-ship engagement', epoch: '813', verified: null, createdAt: '2026-06-05T00:00:00.000Z' },
]
</script>
