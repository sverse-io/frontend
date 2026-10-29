<template>
  <article class="post" :class="{ low: post.lowSignal, auto: isAuto, 'post--pending': pending }" :aria-label="`Post by ${authorLabel}`">
    <span class="post__av post__av--glyph" aria-hidden="true">{{ isAuto ? '📜' : authorInitial }}</span>
    <div style="flex:1;min-width:0">
      <div class="post__h">
        <span class="post__a">{{ authorLabel }}</span>
        <span v-if="isAuto" class="badge badge--auto">auto</span>
        <span v-for="badge in otherBadges" :key="badge" class="badge" :class="badgeClass(badge)">{{ badge }}</span>
        <span v-if="!isAuto" class="post__rep" :title="`Reputation when posted: ${post.repAtPost}`">★ {{ post.repAtPost }}</span>
        <span v-if="post.lowSignal" class="post__rep" title="Low-reputation post — visible, but carries almost no ranking weight">low signal</span>
        <span class="post__t">{{ pending ? 'posting…' : timeAgo(post.createdAt) }}</span>
      </div>
      <p class="post__b">{{ post.body }}</p>
      <div v-if="!pending" class="post__acts">
        <button
          type="button"
          :class="{ on: reacted('up') }"
          :disabled="!canInteract || reacted('up') || reacting"
          :aria-pressed="reacted('up')"
          :title="reacted('up') ? 'You upvoted this' : 'Upvote'"
          @click="react('up')"
        >
          ▲ {{ post.reactions?.up ?? 0 }}
        </button>
        <button
          type="button"
          :class="{ on: reacted('insightful') }"
          :disabled="!canInteract || reacted('insightful') || reacting"
          :aria-pressed="reacted('insightful')"
          @click="react('insightful')"
        >
          ✦ Insightful {{ post.reactions?.insightful ?? 0 }}
        </button>
        <button v-if="!isReply" type="button" @click="toggleReplies">
          {{ showReplies ? 'Hide replies' : `Replies · ${post.replyCount ?? 0}` }}
        </button>
        <button v-if="canInteract && !reported && !isMine" type="button" @click="reporting = !reporting">Report</button>
        <span v-if="reported" class="dim">Reported — thanks</span>
      </div>
      <p v-if="actionError" class="field__err" role="alert">{{ actionError }}</p>

      <form v-if="reporting" class="post__form" @submit.prevent="report">
        <label class="t-small dim" :for="`report-${post.id}`">Why are you reporting this post?</label>
        <textarea :id="`report-${post.id}`" v-model="reportReason" rows="2" maxlength="500" placeholder="Spam, harassment, scam link…"></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn--ghost btn--sm" type="button" @click="reporting = false">Cancel</button>
          <button class="btn btn--danger btn--sm" type="submit" :disabled="reportReason.trim().length < 3 || reportBusy">Send report</button>
        </div>
      </form>

      <div v-if="showReplies" class="post__replies">
        <div v-if="repliesState === 'loading'" class="sk" style="height:48px;border-radius:12px"></div>
        <p v-else-if="repliesState === 'error'" class="field__err">{{ repliesError }} <button class="btn btn--ghost btn--sm" type="button" @click="loadReplies">Retry</button></p>
        <template v-else>
          <p v-if="!replies.length" class="t-small dim">No replies yet.</p>
          <ClubPostItem v-for="reply in replies" :key="reply.id" :post="reply" is-reply :can-interact="canInteract" :can-post="canPost" />
        </template>
        <form v-if="canPost" class="post__form" @submit.prevent="sendReply">
          <label class="sr-only" :for="`reply-${post.id}`">Reply</label>
          <textarea :id="`reply-${post.id}`" v-model="replyBody" rows="2" maxlength="4000" placeholder="Reply to the thread…"></textarea>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn--grad btn--sm" type="submit" :disabled="!replyBody.trim() || replyBusy">{{ replyBusy ? 'Replying…' : 'Reply' }}</button>
          </div>
        </form>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ClubPost } from '~/types/sverse'

const props = defineProps<{ post: ClubPost; isReply?: boolean; canInteract?: boolean; canPost?: boolean; pending?: boolean }>()

const api = useApi()
const toast = useToast()
const session = useSession()

// Local, mutable copy so reactions/replies update optimistically.
const post = reactive<ClubPost>(JSON.parse(JSON.stringify(props.post)))
watch(
  () => props.post,
  (next) => Object.assign(post, JSON.parse(JSON.stringify(next))),
)

const isAuto = computed(() => post.kind === 'deed_auto')
const otherBadges = computed(() => (post.badges ?? []).filter((badge) => badge !== 'auto'))
const authorLabel = computed(() => (isAuto.value ? 'SYSTEM · DEED' : `@${post.author?.handle ?? 'unknown'}`))
const isMine = computed(() => Boolean(post.author?.id && post.author.id === session.user.value?.id))
const authorInitial = computed(() => (post.author?.handle ?? '?').charAt(0).toUpperCase())

const reacting = ref(false)
const actionError = ref('')
const reporting = ref(false)
const reportReason = ref('')
const reportBusy = ref(false)
const reported = ref(false)

const showReplies = ref(false)
const replies = ref<ClubPost[]>([])
const repliesState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const repliesError = ref('')
const replyBody = ref('')
const replyBusy = ref(false)

function reacted(kind: string) {
  return (post.viewerReactions ?? []).includes(kind)
}

function badgeClass(badge: string) {
  if (badge === 'studio') return 'badge--studio'
  if (badge === 'curator') return 'badge--curator'
  if (badge === 'founder') return 'badge--founder'
  return ''
}

async function react(kind: 'up' | 'insightful') {
  if (reacting.value || reacted(kind)) return
  reacting.value = true
  actionError.value = ''
  // Optimistic: count + mark, rolled back on failure.
  post.reactions = { ...post.reactions, [kind]: (post.reactions?.[kind] ?? 0) + 1 }
  post.viewerReactions = [...(post.viewerReactions ?? []), kind]
  try {
    const updated = await api.one<Partial<ClubPost>>(`/api/v1/club/posts/${post.id}/react`, { method: 'POST', body: { kind } })
    if (updated?.reactions) post.reactions = updated.reactions
  } catch (error) {
    if (isApiError(error, 'already_reacted')) return
    post.reactions = { ...post.reactions, [kind]: Math.max(0, (post.reactions?.[kind] ?? 1) - 1) }
    post.viewerReactions = (post.viewerReactions ?? []).filter((entry) => entry !== kind)
    actionError.value = isApiError(error, 'missing_session') ? 'Log in to react.' : errorMessage(error)
  } finally {
    reacting.value = false
  }
}

async function report() {
  if (reportBusy.value) return
  reportBusy.value = true
  actionError.value = ''
  try {
    await api.one(`/api/v1/club/posts/${post.id}/report`, { method: 'POST', body: { reason: reportReason.value.trim() } })
    reported.value = true
    reporting.value = false
    toast.push('Report sent', 'A moderator will review this post.', '🚩')
  } catch (error) {
    actionError.value = errorMessage(error)
  } finally {
    reportBusy.value = false
  }
}

async function loadReplies() {
  repliesState.value = 'loading'
  try {
    replies.value = (await api.many<ClubPost>(`/api/v1/club/posts/${post.id}/replies`)).data
    repliesState.value = 'ready'
  } catch (error) {
    repliesError.value = errorMessage(error)
    repliesState.value = 'error'
  }
}

function toggleReplies() {
  showReplies.value = !showReplies.value
  if (showReplies.value && repliesState.value === 'idle') loadReplies()
}

async function sendReply() {
  const body = replyBody.value.trim()
  if (!body || replyBusy.value) return
  replyBusy.value = true
  actionError.value = ''
  try {
    const created = await api.one<ClubPost>(`/api/v1/club/posts/${post.id}/replies`, { method: 'POST', body: { body } })
    replies.value = [...replies.value, created]
    post.replyCount = (post.replyCount ?? 0) + 1
    replyBody.value = ''
  } catch (error) {
    actionError.value = clubErrorMessage(error)
  } finally {
    replyBusy.value = false
  }
}
</script>
