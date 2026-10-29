<template>
  <div class="ledger">
    <div v-for="deed in deeds" :key="deed.id" class="deed" :class="`deed--${stateOf(deed.verified)}`">
      <span class="deed__i deed__glyph" aria-hidden="true">{{ glyph(deed.deedType) }}</span>
      <div style="min-width:0">
        <div class="deed__n">{{ deed.deedType }}</div>
        <dl v-if="detailRows(deed).length" class="kv">
          <template v-for="row in detailRows(deed)" :key="row.key">
            <dt>{{ humanize(row.key) }}</dt>
            <dd>{{ row.value }}</dd>
          </template>
        </dl>
        <p v-if="traitChanges(deed).length" class="deed__d deed__traits">
          <span v-for="change in traitChanges(deed)" :key="change.key" class="t-mono">
            {{ change.key }} {{ change.before }} → <b>{{ change.after }}</b>
          </span>
        </p>
        <p v-else-if="deed.traitsAfter" class="deed__d">traits unchanged by this deed</p>
        <p v-if="deed.verificationNote" class="deed__d t-small">{{ deed.verificationNote }}</p>
      </div>
      <div class="deed__m">
        <span v-if="deed.epoch !== null && deed.epoch !== undefined">epoch {{ deed.epoch }}<br></span>
        <span class="vchip" :class="`vchip--${stateOf(deed.verified)}`" :title="verificationTitle(deed.verified)">{{ verificationLabel(deed.verified) }}</span>
        <br>
        <span class="t-small">{{ formatDate(deed.createdAt) }}</span>
        <div style="margin-top:6px">
          <ChainBadge :status="deed.chain?.status" :tx-hash="deed.chain?.txHash" :explorer-url="deed.chain?.explorerUrl" :show-hash="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Deed } from '~/types/sverse'

defineProps<{ deeds: Deed[] }>()

function stateOf(value: boolean | null | undefined) {
  if (value === true) return 'verified'
  if (value === false) return 'unverified'
  return 'pending'
}

function verificationLabel(value: boolean | null | undefined) {
  if (value === true) return '✓ attested'
  if (value === false) return '⚠ unverified'
  return '◐ verifying'
}

function verificationTitle(value: boolean | null | undefined) {
  if (value === true) return 'Studio signature verified and corroborated by telemetry'
  if (value === false) return 'Failed telemetry cross-check'
  return 'Written; the cross-check worker has not run yet'
}

function detailRows(deed: Deed) {
  return recordEntries(deed.detail)
}

function traitChanges(deed: Deed) {
  const before = (deed.traitsBefore ?? {}) as Record<string, unknown>
  const after = (deed.traitsAfter ?? {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, before: before[key] === undefined ? '∅' : String(before[key]), after: after[key] === undefined ? '∅' : String(after[key]) }))
}

function glyph(deedType: string) {
  if (/kill|boss|wipe/.test(deedType)) return '⚔'
  if (/tournament|ladder|rank/.test(deedType)) return '🏆'
  if (/flawless|first|clear/.test(deedType)) return '✦'
  if (/marathon|run|time/.test(deedType)) return '⏱'
  if (/scar|death/.test(deedType)) return '☠'
  return '📜'
}
</script>
