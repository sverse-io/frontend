<template>
  <main class="sfwrap sfbody" style="max-width:1180px">
    <div class="phead" style="padding-top:30px">
      <p class="eyebrow">Orders</p>
      <h1 class="t-h2" style="font-size:2.1rem">Purchase history</h1>
      <p>Every Store purchase, settled from your SRV balance. Refunds reverse the ledger and revoke the item.</p>
    </div>

    <div v-if="user" class="toolbar" style="margin-top:0">
      <span class="balance"><i>S</i><span class="num">{{ groupSrv(user.balanceSrv) }}</span> SRV available</span>
      <FaucetButton />
    </div>

    <div v-if="status === 'pending' && !orders.length" class="grid" style="gap:10px" aria-busy="true">
      <div v-for="n in 4" :key="n" class="sk" style="height:72px;border-radius:14px"></div>
    </div>
    <ErrorState v-else-if="error" title="Could not load your orders" :error="error" :retry="refresh" />
    <EmptyState v-else-if="!orders.length" icon="🧾" title="No orders yet" body="Buy an item pack in the Store and its receipt appears here.">
      <NuxtLink class="btn btn--grad btn--sm" to="/">Browse the Store</NuxtLink>
    </EmptyState>
    <div v-else class="grid" style="gap:10px">
      <article v-for="order in orders" :key="order.id" class="row">
        <div class="row__art"><img v-if="order.item?.art?.url" :src="order.item.art.url" alt="" loading="lazy"></div>
        <div class="row__info">
          <div class="row__n">
            {{ order.item?.name ?? order.sku }}
            <span class="chip" :class="statusClass(order.status)">{{ order.status }}</span>
          </div>
          <p class="row__d">
            <NuxtLink v-if="order.game" :to="`/store/g/${order.game.slug}`">{{ order.game.title }}</NuxtLink>
            · {{ formatDateTime(order.settledAt ?? order.createdAt) }} · <span class="t-mono">{{ order.id }}</span>
            <template v-if="order.failureCode"> · <span class="vu">{{ humanize(order.failureCode) }}</span></template>
          </p>
          <p v-if="order.txHash" class="row__d">
            tx <a v-if="order.explorerUrl" :href="order.explorerUrl" target="_blank" rel="noopener" class="t-mono">{{ shortHash(order.txHash) }} ↗</a>
            <span v-else class="t-mono" :title="order.txHash">{{ shortHash(order.txHash) }}</span>
          </p>
        </div>
        <div class="row__buy">
          <p class="row__srv">{{ groupSrv(order.quote.priceSrv) }} SRV</p>
          <p class="row__usd">${{ order.quote.usdAmount }}</p>
        </div>
      </article>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { Order } from '~/types/sverse'

useHead({ title: 'Orders · Sverse', meta: [{ name: 'robots', content: 'noindex' }] })

const api = useApi()
const session = useSession()
const user = session.user
const { data, status, error, refresh } = usePassportData('passport:orders', () => api.many<Order>('/api/v1/passport/me/orders').then((res) => res.data))
const orders = computed(() => data.value ?? [])

function statusClass(value: string) {
  if (value === 'completed') return 'chip--live'
  if (value === 'failed') return 'chip--bad'
  if (value === 'refunded' || value === 'cancelled') return 'chip--warn'
  return ''
}
</script>
