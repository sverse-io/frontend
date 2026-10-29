<template>
  <AppModal title="Import to another game" :subtitle="`${item.name} · ${item.schemaId ?? 'no schema'} · tier ${item.interopTier}`" wide :locked="phase === 'committing'" @close="$emit('close')">
    <div class="field">
      <label for="interop-host">Host game</label>
      <select id="interop-host" v-model="hostId" class="select" style="width:100%" :disabled="phase === 'previewing' || phase === 'committing' || phase === 'done'">
        <option value="" disabled>Pick a game that accepts T2 imports…</option>
        <option v-for="game in hosts" :key="game.id" :value="game.id">{{ game.title }} · interop {{ game.interopTier }}</option>
      </select>
      <p v-if="!hosts.length && gamesStatus !== 'pending'" class="field__hint">No other live game accepts T2 items yet.</p>
    </div>

    <div v-if="phase === 'previewing'" class="grid" style="gap:10px" aria-busy="true">
      <div class="sk" style="height:120px;border-radius:12px"></div>
      <div class="sk" style="height:80px;border-radius:12px"></div>
    </div>

    <template v-else-if="preview">
      <div class="env">
        <div class="env__b">
          <h5>Source · {{ item.game.title }}</h5>
          <div v-for="row in recordEntries(preview.source)" :key="`s-${row.key}`"><span>{{ row.key }}</span><strong>{{ row.value }}</strong></div>
          <p v-if="!recordEntries(preview.source).length" class="t-small dim">no traits</p>
        </div>
        <div class="env__a" aria-hidden="true">→</div>
        <div class="env__b out">
          <h5>{{ preview.host.title }}'s envelope</h5>
          <div v-for="row in recordEntries(preview.mapped)" :key="`m-${row.key}`">
            <span>{{ row.key }}</span>
            <strong>{{ row.value }}<span v-if="preview.envelope.bands[row.key]" class="dim t-small"> [{{ preview.envelope.bands[row.key]!.join('–') }}]</span></strong>
          </div>
          <p v-if="!recordEntries(preview.mapped).length" class="t-small dim">nothing mapped</p>
          <div><span>accepts tier</span><strong>≤ {{ preview.envelope.tierMax ?? preview.envelope.acceptsTierMax }}</strong></div>
          <div><span>out-of-band policy</span><strong>{{ preview.envelope.clampPolicy }}</strong></div>
        </div>
      </div>
      <div class="rows" style="margin-top:18px">
        <div v-for="check in preview.checks" :key="check.name">
          <span>{{ checkLabel(check.name) }}</span>
          <strong :class="check.passed ? 'vf' : 'vu'">{{ check.passed ? '✓' : '✕' }} {{ check.detail }}</strong>
        </div>
        <div><span>Deeds carried over</span><strong>{{ preview.deedsCarried }} · shown as provenance</strong></div>
        <div class="tot"><span>Import fee</span><strong>{{ groupSrv(preview.feeSrv) }} SRV</strong></div>
      </div>
      <div v-if="phase === 'done'" class="note" style="margin-top:16px">
        <span class="note__i">✓</span>
        <div><b>Imported.</b> {{ preview.host.title }} now reads the mapped traits above — never your raw source stats. Record <span class="t-mono">{{ preview.id }}</span>.</div>
      </div>
    </template>

    <div v-if="failure" class="note note--bad" style="margin-top:16px" role="alert">
      <span class="note__i">✕</span>
      <div>
        <b>{{ failure.title }}</b> {{ failure.body }}
        <ul v-if="failure.checks.length" style="margin:8px 0 0 18px">
          <li v-for="check in failure.checks" :key="check.field">
            <b class="t-mono">{{ checkLabel(check.field) }}</b> failed — {{ check.issue }}
          </li>
        </ul>
        <div v-if="failure.code === 'insufficient_funds'" style="margin-top:10px"><FaucetButton /></div>
      </div>
    </div>

    <div class="note" style="margin-top:16px">
      <span class="note__i">⚖️</span>
      <div>Hosts <b>never import raw stats</b>. Each publishes a conversion envelope and maps your item onto its own curve. Four checks run in order — schema, tier, license, normalization — and an out-of-band mapping <b>fails</b> rather than clamping silently.</div>
    </div>

    <template #footer>
      <button class="btn btn--ghost" type="button" :disabled="phase === 'committing'" @click="$emit('close')">{{ phase === 'done' ? 'Close' : 'Cancel' }}</button>
      <button v-if="phase !== 'done'" class="btn btn--grad" type="button" :disabled="!canCommit" @click="commit">
        {{ phase === 'committing' ? 'Importing…' : preview ? `Import for ${groupSrv(preview.feeSrv)} SRV` : 'Import' }}
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { InteropPreview, InventoryItem } from '~/types/sverse'

const props = defineProps<{ item: InventoryItem }>()
const emit = defineEmits<{ close: []; imported: [preview: InteropPreview] }>()

type Phase = 'idle' | 'previewing' | 'ready' | 'failed' | 'committing' | 'done'
interface Failure {
  code: string
  title: string
  body: string
  checks: Array<{ field: string; issue: string }>
}

const api = useApi()
const session = useSession()
const toast = useToast()
const { data: games, status: gamesStatus } = useGameOptions()

const hosts = computed(() => (games.value ?? []).filter((game) => game.id !== props.item.game.id && ['T2', 'T3'].includes(game.interopTier)))
const hostId = ref('')
const phase = ref<Phase>('idle')
const preview = ref<InteropPreview | null>(null)
const failure = ref<Failure | null>(null)
const canCommit = computed(() => phase.value === 'ready' && Boolean(preview.value) && preview.value!.checks.every((check) => check.passed))

const CHECK_LABELS: Record<string, string> = {
  schema_match: 'Schema match',
  tier: 'Tier check',
  license: 'License check',
  normalization: 'Normalization',
}
function checkLabel(name: string) {
  return CHECK_LABELS[name] ?? humanize(name)
}

function describe(error: unknown): Failure {
  if (!isApiError(error)) return { code: 'unknown_error', title: 'Import failed.', body: errorMessage(error), checks: [] }
  const checks = error.details.filter((detail) => detail.field).map((detail) => ({ field: String(detail.field), issue: String(detail.issue ?? '') }))
  const titles: Record<string, [string, string]> = {
    schema_not_accepted: ['Schema not accepted.', 'The host does not accept this item schema.'],
    tier_too_low: ['Tier check failed.', 'Stat-bearing imports need T2 on both sides.'],
    license_denied: ['License check failed.', 'The item license does not allow this host.'],
    normalization_out_of_band: ['Normalization failed.', 'A mapped trait would land outside the host band, so the import is rejected.'],
    same_game_import: ['Same game.', 'Pick a different host game.'],
    item_listed: ['Item is listed.', 'Cancel the market listing before importing.'],
    already_imported: ['Already imported.', 'This item is already active in that game.'],
    insufficient_funds: ['Not enough SRV.', 'Top up to pay the import fee.'],
    game_not_found: ['Host unavailable.', 'That game is not live.'],
  }
  const [title, body] = titles[error.code] ?? ['Import failed.', errorMessage(error)]
  return { code: error.code, title, body, checks }
}

async function runPreview() {
  if (!hostId.value) return
  phase.value = 'previewing'
  preview.value = null
  failure.value = null
  try {
    preview.value = await api.one<InteropPreview>('/api/v1/interop/imports', {
      method: 'POST',
      body: { inventoryItemId: props.item.id, hostGameId: hostId.value, dryRun: true },
    })
    phase.value = 'ready'
  } catch (error) {
    failure.value = describe(error)
    phase.value = 'failed'
  }
}

async function commit() {
  if (!canCommit.value) return
  phase.value = 'committing'
  failure.value = null
  try {
    const committed = await api.one<InteropPreview>('/api/v1/interop/imports', {
      method: 'POST',
      body: { inventoryItemId: props.item.id, hostGameId: hostId.value, dryRun: false },
    })
    preview.value = committed
    phase.value = 'done'
    emit('imported', committed)
    toast.push('Imported', `${props.item.name} now works in ${committed.host.title}.`, '🔀')
    // The import response carries no balance; refresh the session so the pill reflects the fee.
    if (BigInt(committed.feeUnits || '0') > 0n) session.reload()
  } catch (error) {
    failure.value = describe(error)
    phase.value = 'ready'
  }
}

watch(hostId, () => runPreview())
</script>
