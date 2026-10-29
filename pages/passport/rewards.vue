<template>
  <main class="sfwrap sfbody" style="max-width:1180px">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Play-and-Earn</p>
      <h1 class="t-h2" style="font-size:2.1rem">Earn ownership, <span class="grad-text">not income</span></h1>
      <p>Rewards are a share of what the network actually collected in an epoch, split across ranked play, tournaments, achievements, curation and referrals.</p>
    </div>

    <div v-if="status === 'pending' && !rewards" class="grid" style="gap:14px" aria-busy="true">
      <div class="sk" style="height:180px;border-radius:var(--r-xl)"></div>
      <div v-for="n in 3" :key="n" class="sk" style="height:76px;border-radius:13px"></div>
    </div>
    <ErrorState v-else-if="error && !rewards" title="Could not load your rewards" :error="error" :retry="refresh" />
    <template v-else-if="rewards">
      <EmptyState v-if="!epoch" icon="⚖" title="No epoch has been published yet" body="Epochs close weekly. Your first claim appears here once an epoch settles." />
      <template v-else>
        <div class="pool" style="margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:flex-start">
            <div>
              <p class="t-micro dim">Epoch {{ epoch.number }} · {{ epoch.status }} · {{ formatDate(epoch.startAt) }} – {{ formatDate(epoch.endAt) }}</p>
              <p style="font-size:2rem;font-weight:800;margin:6px 0 2px" class="num grad-text" :title="`${epoch.playerPoolUnits} units`">{{ formatUnits(epoch.playerPoolUnits) }} SRV</p>
              <p class="t-small dim">player pool this epoch</p>
            </div>
            <div style="min-width:280px;flex:1;max-width:420px">
              <div class="rows">
                <div><span>Realized fee revenue</span><strong>{{ formatUnits(epoch.feeRevenueUnits) }} SRV</strong></div>
                <div><span>Bootstrap emission</span><strong>{{ formatUnits(epoch.bootstrapEmissionUnits) }} SRV</strong></div>
                <div><span>Player pool</span><strong>{{ formatUnits(epoch.playerPoolUnits) }} SRV</strong></div>
                <div><span>Participants</span><strong>{{ formatNumber(epoch.participants?.players ?? 0, 0) }} passports</strong></div>
                <div v-if="epoch.claimDeadline"><span>Claim by</span><strong>{{ formatDate(epoch.claimDeadline) }}</strong></div>
              </div>
            </div>
          </div>
          <div class="note" style="margin-top:20px">
            <span class="note__i">⚖</span>
            <div>
              <b>Funded by {{ epoch.fundedBy }}.</b>
              This epoch's pool is {{ formatUnits(epoch.playerPoolUnits) }} SRV: {{ formatUnits(epoch.feeRevenueUnits) }} SRV of realized fee revenue
              and {{ formatUnits(epoch.bootstrapEmissionUnits) }} SRV of bootstrap emission{{ isZeroBootstrap ? ' (sunset)' : '' }} — a line item in the fee split, not a printing schedule.
            </div>
          </div>
          <p v-if="epoch.merkleRoot" class="t-small dim" style="margin-top:12px">
            Merkle root <span class="t-mono" :title="epoch.merkleRoot">{{ shortHash(epoch.merkleRoot) }}</span>
            <template v-if="epoch.publishMerkleTxHash"> · published in
              <a v-if="epoch.explorerUrl" :href="epoch.explorerUrl" target="_blank" rel="noopener">{{ shortHash(epoch.publishMerkleTxHash) }} ↗</a>
              <span v-else class="t-mono">{{ shortHash(epoch.publishMerkleTxHash) }}</span>
            </template>
          </p>
        </div>

        <template v-if="claim">
          <p class="sect">Your claim · epoch {{ claim.epochNumber }} · {{ claim.channels.length }} channel{{ claim.channels.length === 1 ? '' : 's' }}</p>
          <div class="grid" style="gap:14px">
            <article v-for="row in claim.channels" :key="row.channel" class="rrow">
              <div class="rrow__t">
                <span class="rrow__n">{{ humanize(row.channel) }} <span class="chip">{{ row.sharePct }}% of pool</span></span>
                <span class="rrow__v">+ {{ groupSrv(row.amountSrv) }} SRV</span>
              </div>
              <div class="mbar"><div :style="{ width: `${unitsPct(row.amountUnits, claim.amountUnits)}%` }"></div></div>
              <p class="rrow__s">{{ row.note || 'Protocol-weighted contribution' }}</p>
            </article>
          </div>

          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:24px">
            <button class="btn btn--grad" type="button" :disabled="claimDisabled" :aria-busy="claiming" @click="claimNow">{{ claimLabel }}</button>
            <span class="t-small dim">Merkle claim · gas paid by the protocol paymaster — you never pay to claim</span>
          </div>
          <p v-if="claimError" class="field__err" role="alert" style="margin-top:10px">{{ claimError }}</p>
        </template>
        <EmptyState v-else icon="⚖" :title="`You didn't earn in epoch ${epoch.number}`" body="Rewards come from ranked ladders, tournaments, first-clears, curation and referrals — not from time logged in.">
          <NuxtLink class="btn btn--ghost btn--sm" to="/">Find a game with a ladder</NuxtLink>
        </EmptyState>
      </template>

      <template v-if="current">
        <p class="sect">Epoch {{ current.number }} · {{ current.status }}</p>
        <div class="card card--pad" style="display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap">
          <div>
            <p style="font-weight:600">Epoch {{ current.number }} in progress — settles {{ formatDateTime(current.endAt) }}</p>
            <p class="t-small dim">
              Projected so far: {{ formatUnits(current.projected?.feeRevenueUnits ?? current.feeRevenueUnits) }} SRV fee revenue →
              {{ formatUnits(current.projected?.playerPoolUnits ?? current.playerPoolUnits) }} SRV player pool. Totals are not final until the epoch closes.
            </p>
          </div>
          <button class="btn btn--ghost is-off" type="button" disabled>Claim opens at settlement</button>
        </div>
      </template>

      <template v-if="history.length">
        <p class="sect">Claim history</p>
        <div class="tw">
          <table>
            <thead><tr><th>Epoch</th><th class="num">Amount</th><th>Status</th><th>Claimed</th><th></th></tr></thead>
            <tbody>
              <tr v-for="row in history" :key="row.id">
                <td>#{{ row.epochNumber }}</td>
                <td class="num">{{ groupSrv(row.amountSrv) }} SRV</td>
                <td><span class="chip" :class="row.status === 'claimed' ? 'chip--live' : 'chip--warn'">{{ row.status }}</span></td>
                <td>{{ row.claimedAt ? formatDate(row.claimedAt) : '—' }}</td>
                <td style="text-align:right">
                  <button v-if="row.status !== 'claimed' && row.epochNumber !== claim?.epochNumber" class="btn btn--ghost btn--sm" type="button" :disabled="claimingOld === row.id" @click="claimHistoric(row)">
                    {{ claimingOld === row.id ? 'Claiming…' : 'Claim' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p class="sect">Why you can't farm this</p>
      <div class="grid g3">
        <div class="card card--pad">
          <p class="t-micro dim">Reputation gate</p>
          <p style="font-size:1.4rem;font-weight:800;margin:6px 0" class="grad-text">★ {{ user?.reputation ?? 0 }}</p>
          <p class="t-small dim">Claims are weighted by passport reputation; low-reputation passports earn almost nothing.</p>
        </div>
        <div class="card card--pad">
          <p class="t-micro dim">Attested playtime</p>
          <p style="font-size:1.4rem;font-weight:800;margin:6px 0">heartbeats</p>
          <p class="t-small dim">Derived from server heartbeats, never from a client-declared duration.</p>
        </div>
        <div class="card card--pad">
          <p class="t-micro dim">Reward curve</p>
          <p style="font-size:1.4rem;font-weight:800;margin:6px 0">sublinear</p>
          <p class="t-small dim">100 farmed accounts earn far less than they cost to run. Per-passport caps apply.</p>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { ClaimResult, PassportRewards, RewardClaim, RewardEpoch } from '~/types/sverse'

useHead({ title: 'Play-and-Earn · Sverse', meta: [{ name: 'robots', content: 'noindex' }] })

const api = useApi()
const session = useSession()
const toast = useToast()
const user = session.user

const { data: rewards, status, error, refresh } = usePassportData('passport:rewards', () => api.one<PassportRewards>('/api/v1/passport/me/rewards'))

const claimedLocally = reactive(new Set<string>())
const epoch = computed(() => rewards.value?.epoch ?? null)
const current = computed(() => (rewards.value?.current && rewards.value.current.id !== epoch.value?.id ? rewards.value.current : null))
const claim = computed<RewardClaim | null>(() => {
  const mine = rewards.value?.myClaim
  if (!mine) return null
  return claimedLocally.has(mine.id) ? { ...mine, status: 'claimed' } : mine
})
const history = computed(() => (rewards.value?.claims ?? []).map((row) => (claimedLocally.has(row.id) ? { ...row, status: 'claimed' } : row)))
const isZeroBootstrap = computed(() => BigInt(epoch.value?.bootstrapEmissionUnits ?? '0') === 0n)
const deadlinePassed = computed(() => Boolean(epoch.value?.claimDeadline && new Date(epoch.value.claimDeadline).getTime() < Date.now()))

const claiming = ref(false)
const claimError = ref('')
const claimDisabled = computed(() => claiming.value || !claim.value || claim.value.status === 'claimed' || epoch.value?.status !== 'published' || deadlinePassed.value)
const claimLabel = computed(() => {
  if (claiming.value) return 'Claiming…'
  if (claim.value?.status === 'claimed') return 'Claimed ✓'
  if (epoch.value?.status !== 'published') return 'Epoch in progress — claim unavailable'
  if (deadlinePassed.value) return 'Claim window closed'
  return `Claim ${groupSrv(claim.value?.amountSrv)} SRV`
})

async function postClaim(target: RewardEpoch | { id: string }, row: RewardClaim) {
  try {
    const result = await api.one<ClaimResult>(`/api/v1/passport/me/rewards/${target.id}/claim`, { method: 'POST' })
    claimedLocally.add(row.id)
    session.setBalance(result)
    toast.push(`Claimed ${groupSrv(result.amountSrv)} SRV`, `Funded by ${epoch.value?.fundedBy ?? 'realized protocol fees'} — not printed.`, '⚖')
    return ''
  } catch (err) {
    if (isApiError(err, 'already_claimed')) {
      claimedLocally.add(row.id)
      return ''
    }
    if (isApiError(err, 'claim_window_closed')) return 'The claim window for this epoch has closed.'
    if (isApiError(err, 'claim_not_found')) return 'There is no claim for you in this epoch.'
    return errorMessage(err)
  }
}

async function claimNow() {
  // Disabled on the first click; the server also answers 409 already_claimed to a replay.
  if (claimDisabled.value || !epoch.value || !claim.value) return
  claiming.value = true
  claimError.value = ''
  try {
    claimError.value = await postClaim(epoch.value, claim.value)
  } finally {
    claiming.value = false
  }
}

const claimingOld = ref('')
async function claimHistoric(row: RewardClaim) {
  if (claimingOld.value) return
  claimingOld.value = row.id
  claimError.value = ''
  try {
    // Claim history rows carry the epoch number only; resolve its id first.
    const target = await api.one<RewardEpoch>(`/api/v1/rewards/epochs/${row.epochNumber}`)
    claimError.value = await postClaim(target, row)
  } catch (err) {
    claimError.value = errorMessage(err)
  } finally {
    claimingOld.value = ''
  }
}
</script>
