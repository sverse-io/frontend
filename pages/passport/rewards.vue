<template>
  <main class="sfwrap sfbody" style="max-width:1180px">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Play-and-Earn</p>
      <h1 class="t-h2" style="font-size:2.1rem">Earn ownership, <span class="grad-text">not income</span></h1>
      <p>Rewards are a share of protocol fees the network actually collected — never printed.</p>
    </div>

    <section class="pane on">
      <div class="pool" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:flex-start">
          <div>
            <p class="t-micro dim">Epoch {{ epochNumber }} · {{ rewardEpoch.status }} · Mon 00:05 UTC</p>
            <p style="font-size:2rem;font-weight:800;margin:6px 0 2px" class="num grad-text">{{ poolSrv }} SRV</p>
            <p class="t-small dim">player pool this epoch</p>
          </div>
          <div style="min-width:280px;flex:1;max-width:400px">
            <div class="rows">
              <div><span>Realized fee revenue</span><strong>{{ realizedRevenueSrv }} SRV</strong></div>
              <div><span>Player share (20%)</span><strong>{{ poolSrv }} SRV</strong></div>
              <div><span>Bootstrap emission</span><strong>0 SRV · sunset</strong></div>
              <div><span>Participants</span><strong>12,480 passports</strong></div>
            </div>
          </div>
        </div>
        <div class="note" style="margin-top:20px">
          <span class="note__i">⚖</span>
          <div>
            <b>This pool is 20% of protocol fees actually collected</b> — a line item in the fee split, not an emission schedule.
          </div>
        </div>
      </div>

      <p class="sect">Your claim · {{ rewardRows.length }} channels</p>
      <div class="grid" style="gap:14px">
        <article v-for="row in rewardRows" :key="row.channel" class="rrow">
          <div class="rrow__t">
            <span class="rrow__n">{{ channelTitle(row.channel) }} <span class="chip">{{ row.sharePct }}% of pool</span></span>
            <span class="rrow__v">+ {{ amountSrv(row.amountUnits) }} SRV</span>
          </div>
          <div class="mbar"><div :style="{ width: `${Math.round(Number(row.progress ?? 0) * 100)}%` }"></div></div>
          <p class="rrow__s">
            <img :src="channelImage(row.channel)" alt="">
            {{ channelCopy(row.channel) }}
          </p>
        </article>
      </div>

      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:24px">
        <button class="btn btn--grad" type="button" :disabled="claimDisabled" @click="claim">
          {{ claimLabel }}
        </button>
        <span class="t-small dim">Merkle claim · gas paid by the protocol paymaster — you never pay to claim</span>
      </div>

      <p class="sect">Why you can't farm this</p>
      <div class="grid g3">
        <div class="card card--pad">
          <p class="t-micro dim">Reputation gate</p>
          <p style="font-size:1.4rem;font-weight:800;margin:6px 0" class="grad-text">★ 94</p>
          <p class="t-small dim">Claims require reputation above threshold. Yours qualifies for every channel.</p>
        </div>
        <div class="card card--pad">
          <p class="t-micro dim">Attested playtime</p>
          <p style="font-size:1.4rem;font-weight:800;margin:6px 0" class="num">41,200<span style="font-size:.9rem;font-weight:500" class="dim"> min</span></p>
          <p class="t-small dim">Derived from heartbeats, never from a client-declared duration.</p>
        </div>
        <div class="card card--pad">
          <p class="t-micro dim">Reward curve</p>
          <p style="font-size:1.4rem;font-weight:800;margin:6px 0">sublinear</p>
          <p class="t-small dim">100 farmed accounts earn far less than they cost to run. Per-passport caps apply.</p>
        </div>
      </div>

      <p class="sect">State: epoch open (totals not settled)</p>
      <div class="card card--pad" style="display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap">
        <div>
          <p style="font-weight:600">Epoch 813 in progress</p>
          <p class="t-small dim">Totals settle Monday 00:05 UTC. Your provisional score is tracking, but pool size is not final.</p>
        </div>
        <button class="btn btn--ghost is-off" disabled>Claim unavailable</button>
      </div>

      <p class="sect">State: zero-revenue epoch</p>
      <div class="card card--pad">
        <p style="font-weight:600">Epoch 806 · published · pool 0 SRV</p>
        <p class="t-small dim" style="margin-top:6px">No fee revenue was collected and bootstrap emission had sunset, so the pool was zero. This is correct behaviour.</p>
      </div>

      <p class="sect">State: no claim earned</p>
      <div class="empty">
        <div class="empty__i">⚖</div>
        <h4>You didn't earn in this epoch</h4>
        <p>Rewards come from ranked ladders, tournaments, first-clears and community contribution — not from time logged in.</p>
        <NuxtLink class="btn btn--ghost btn--sm" to="/" style="margin-top:16px">Find a game with a ladder</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
useHead({ title: 'Play-and-Earn · Sverse' })

const api = useApi()
const claiming = ref(false)
const srvUnit = BigInt(1000000)
const { data: rewards, refresh } = await useAsyncData('rewards', () => api.one<any>('/api/v1/passport/me/rewards'))
const rewardEpoch = computed(() => rewards.value ?? demoRewards)
const rewardRows = computed(() => rewardEpoch.value.channels ?? [])
const poolSrv = computed(() => unitsToSrv(rewardEpoch.value.poolUnits ?? '0'))
const realizedRevenueSrv = computed(() => unitsToSrv(BigInt(rewardEpoch.value.poolUnits ?? '0') * BigInt(5)))
const epochNumber = computed(() => String(rewardEpoch.value.id ?? 'epo_812').replace(/\D/g, '') || '812')
const claimDisabled = computed(() => claiming.value || rewardEpoch.value.claimed || rewardEpoch.value.status !== 'published')
const claimLabel = computed(() => {
  if (claiming.value) return 'Claiming...'
  if (rewardEpoch.value.claimed) return 'Claimed'
  if (rewardEpoch.value.status !== 'published') return 'Claim unavailable'
  return `Claim ${claimTotalSrv.value} SRV`
})
const claimTotalSrv = computed(() => {
  const total = rewardRows.value.reduce((sum: bigint, row: any) => sum + BigInt(row.amountUnits ?? 0), BigInt(0))
  return unitsToSrv(total)
})

async function claim() {
  if (!rewardEpoch.value || claimDisabled.value) return
  claiming.value = true
  try {
    await api.one(`/api/v1/passport/me/rewards/${rewardEpoch.value.id}/claim`, { method: 'POST' })
    await refresh()
  } finally {
    claiming.value = false
  }
}

function unitsToSrv(value: string | bigint) {
  const units = typeof value === 'bigint' ? value : BigInt(value)
  const whole = units / srvUnit
  const frac = units % srvUnit
  const decimal = frac === BigInt(0) ? '' : `.${frac.toString().padStart(6, '0').replace(/0+$/, '')}`
  return `${whole.toLocaleString('en-US')}${decimal}`
}

function amountSrv(value: string) {
  return unitsToSrv(value)
}

function channelTitle(channel: string) {
  return channel.replace(/_/g, ' ')
}

function channelCopy(channel: string) {
  const copy: Record<string, string> = {
    'Proof-of-Play': 'Diamond II in Voidrunner · top 8% of your division',
    'Deeds verified': 'First-clears and deed corroboration this epoch',
    'Club contribution': 'Reputation-weighted club contribution',
    'Interop usage': 'Cross-game item usage accepted by host envelopes',
  }
  return copy[channel] ?? 'Protocol-weighted reward contribution'
}

function channelImage(channel: string) {
  return `https://picsum.photos/seed/reward-${encodeURIComponent(channel)}/44/44`
}

const demoRewards = {
  id: 'epo_812',
  status: 'published',
  poolUnits: '412880000000',
  claimed: false,
  channels: [
    { channel: 'Proof-of-Play', sharePct: 35, amountUnits: '412000000', progress: 0.72 },
    { channel: 'Deeds verified', sharePct: 25, amountUnits: '180000000', progress: 0.41 },
    { channel: 'Club contribution', sharePct: 20, amountUnits: '240000000', progress: 0.88 },
    { channel: 'Interop usage', sharePct: 15, amountUnits: '96000000', progress: 0.34 },
  ],
}
</script>
