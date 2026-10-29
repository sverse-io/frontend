<template>
  <div>
    <div class="note" style="margin-bottom:20px">
      <span class="note__i">📣</span>
      <div>
        Posting is <b>ownership-gated</b> and ranking is <b>reputation-weighted</b>. Low-reputation posts stay visible but carry almost no weight.
      </div>
    </div>

    <div v-if="status === 'pending' && !posts.length" class="thread" aria-busy="true">
      <div v-for="n in 3" :key="n" class="sk" style="height:96px;border-radius:14px"></div>
    </div>
    <ErrorState v-else-if="error && !posts.length" title="Could not load the club" :error="error" :retry="refresh" />
    <template v-else>
      <div class="card card--pad" style="margin-bottom:20px">
        <form v-if="loggedIn && club?.canPost" @submit.prevent="submit">
          <label class="t-micro dim" for="club-composer" style="display:block;margin-bottom:8px">Post to {{ club?.name ?? 'the club' }}</label>
          <textarea id="club-composer" v-model="draft" class="composer" maxlength="4000" placeholder="Share a route, a build, a question…" :disabled="posting"></textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap">
            <span class="t-small dim">Gate met — you can post here · {{ draft.length }}/4000</span>
            <button class="btn btn--grad btn--sm" type="submit" :disabled="!draft.trim() || posting">{{ posting ? 'Posting…' : 'Post' }}</button>
          </div>
          <p v-if="composerError" class="field__err" role="alert">{{ composerError }}</p>
        </form>
        <div v-else-if="loggedIn" class="t-small dim">
          🔒 {{ club?.postRequiresOwnership ? 'Own this game or one of its items to post. You can still read and react.' : 'Posting is closed for your account in this club.' }}
        </div>
        <div v-else class="t-small dim" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span>Log in to post, react and reply.</span>
          <NuxtLink class="btn btn--ghost btn--sm" :to="loginLink">Log in</NuxtLink>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px;flex-wrap:wrap">
        <p class="t-small dim">{{ club?.memberCount ?? 0 }} members · {{ club?.postCount ?? posts.length }} posts</p>
        <div class="tabs" role="tablist" aria-label="Sort posts">
          <button type="button" role="tab" :aria-selected="sort === 'ranked'" :class="{ on: sort === 'ranked' }" @click="sort = 'ranked'">Top</button>
          <button type="button" role="tab" :aria-selected="sort === 'new'" :class="{ on: sort === 'new' }" @click="sort = 'new'">New</button>
        </div>
      </div>

      <EmptyState v-if="!posts.length && !optimistic.length" icon="💬" title="This club is empty" body="It opens when the game ships — owners can start the first thread." />
      <div v-else class="thread">
        <ClubPostItem v-for="post in optimistic" :key="post.id" :post="post" pending />
        <ClubPostItem v-for="post in posts" :key="post.id" :post="post" :can-interact="loggedIn" :can-post="loggedIn && Boolean(club?.canPost)" />
      </div>
      <div v-if="nextCursor" style="text-align:center;margin-top:16px">
        <button class="btn btn--ghost btn--sm" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ClubInfo, ClubPost, Collection } from '~/types/sverse'

const props = defineProps<{ slug: string }>()

const api = useApi()
const session = useSession()
const route = useRoute()
const toast = useToast()

const loggedIn = session.loggedIn
const loginLink = computed(() => loginPath(route.fullPath))
const sort = ref<'ranked' | 'new'>('ranked')

const { data, status, error, refresh } = useAsyncData(
  () => `club:${props.slug}:${sort.value}`,
  () => api.many<ClubPost>(`/api/v1/games/${props.slug}/club/posts`, { query: { sort: sort.value } }),
  { watch: [sort] },
)

// canPost / viewerReactions depend on who is looking.
watch(() => session.user.value?.id, (next, prev) => {
  if (next !== prev) refresh()
})

const extra = ref<ClubPost[]>([])
const created = ref<ClubPost[]>([])
const optimistic = ref<ClubPost[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)

watch(
  data,
  (value) => {
    extra.value = []
    created.value = []
    nextCursor.value = value?.meta?.nextCursor ?? null
  },
  { immediate: true },
)

const club = computed(() => ((data.value as Collection<ClubPost> | null)?.meta?.club ?? null) as ClubInfo | null)
const posts = computed(() => {
  const seen = new Set<string>()
  return [...created.value, ...(data.value?.data ?? []), ...extra.value].filter((post) => (seen.has(post.id) ? false : (seen.add(post.id), true)))
})

const draft = ref('')
const posting = ref(false)
const composerError = ref('')

async function submit() {
  const body = draft.value.trim()
  if (!body || posting.value) return
  posting.value = true
  composerError.value = ''
  const me = session.user.value
  const temp: ClubPost = {
    id: `tmp-${Date.now()}`,
    kind: 'post',
    channel: 'general',
    parentId: null,
    body,
    badges: [],
    repAtPost: me?.reputation ?? 0,
    weight: 1,
    lowSignal: false,
    score: 0,
    reactions: { up: 0, insightful: 0 },
    replyCount: 0,
    status: 'visible',
    author: { id: me?.id ?? null, handle: me?.handle ?? 'you', reputation: me?.reputation ?? 0 },
    viewerReactions: [],
    createdAt: new Date().toISOString(),
  }
  optimistic.value = [temp]
  draft.value = ''
  try {
    const post = await api.one<ClubPost>(`/api/v1/games/${props.slug}/club/posts`, { method: 'POST', body: { body } })
    created.value = [post, ...created.value]
    toast.push('Posted', 'Your post is live in the club.', '💬')
  } catch (err) {
    draft.value = body // rollback: restore the text, drop the optimistic row
    composerError.value = clubErrorMessage(err)
  } finally {
    optimistic.value = []
    posting.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await api.many<ClubPost>(`/api/v1/games/${props.slug}/club/posts`, { query: { sort: sort.value, cursor: nextCursor.value } })
    extra.value = [...extra.value, ...page.data]
    nextCursor.value = page.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}
</script>
