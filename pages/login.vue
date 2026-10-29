<template>
  <div>
    <h1 class="t-h1">Welcome back</h1>
    <p class="dim t-small" style="margin:6px 0 28px">Log in to your S-Passport.</p>

    <div v-if="lockedFor > 0" class="note note--warn" role="alert" style="margin-bottom:18px">
      <span class="note__i">⏳</span>
      <div>Too many attempts. Try again in <b class="num">{{ countdown }}</b>.<br><span class="t-small">Repeated failures for one email lock logins for a while.</span></div>
    </div>
    <div v-else-if="formError" class="note note--bad" role="alert" style="margin-bottom:18px">
      <span class="note__i">✕</span>
      <div>{{ formError }}</div>
    </div>

    <form novalidate @submit.prevent="submit">
      <fieldset :disabled="submitting" style="border:0;padding:0;margin:0">
        <div class="field" :class="{ bad: fieldErrors.email }">
          <label for="login-email">Email</label>
          <input id="login-email" v-model.trim="email" type="email" autocomplete="email" required :aria-invalid="Boolean(fieldErrors.email)" aria-describedby="login-email-err">
          <p v-if="fieldErrors.email" id="login-email-err" class="field__err">{{ fieldErrors.email }}</p>
        </div>
        <div class="field" :class="{ bad: fieldErrors.password }">
          <label for="login-password">Password</label>
          <input id="login-password" v-model="password" type="password" autocomplete="current-password" required :aria-invalid="Boolean(fieldErrors.password)" aria-describedby="login-password-err">
          <p v-if="fieldErrors.password" id="login-password-err" class="field__err">{{ fieldErrors.password }}</p>
        </div>
        <button class="btn btn--grad btn--full" type="submit" :disabled="submitting || lockedFor > 0">
          <span v-if="submitting" class="spin" aria-hidden="true">◐</span>
          {{ submitting ? 'Logging in…' : 'Log in' }}
        </button>
      </fieldset>
    </form>

    <p class="t-small dim" style="text-align:center;margin-top:26px">
      No passport yet? <NuxtLink :to="signupLink" style="color:var(--pink)">Create one free</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Log in · Sverse' })

const route = useRoute()
const session = useSession()
const toast = useToast()

const next = computed(() => safeNext(route.query.next, '/passport'))
const signupLink = computed(() => (route.query.next ? `/signup?next=${encodeURIComponent(next.value)}` : '/signup'))

// Already logged in → straight to where they were going.
await session.ensure()
if (session.loggedIn.value) await navigateTo(next.value, { replace: true })

const email = ref('')
const password = ref('')
const submitting = ref(false)
const formError = ref('')
const fieldErrors = reactive<Record<string, string>>({})
const lockedFor = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const countdown = computed(() => {
  const minutes = Math.floor(lockedFor.value / 60)
  const seconds = lockedFor.value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

function startLockout(seconds: number) {
  lockedFor.value = Math.max(1, Math.round(seconds))
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    lockedFor.value -= 1
    if (lockedFor.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}
onBeforeUnmount(() => timer && clearInterval(timer))

function clearErrors() {
  formError.value = ''
  for (const key of Object.keys(fieldErrors)) delete fieldErrors[key]
}

function validate() {
  if (!/^\S+@\S+\.\S+$/.test(email.value)) fieldErrors.email = 'Enter a valid email address.'
  if (!password.value) fieldErrors.password = 'Enter your password.'
  return !fieldErrors.email && !fieldErrors.password
}

async function submit() {
  if (submitting.value || lockedFor.value > 0) return
  clearErrors()
  if (!validate()) return
  submitting.value = true
  try {
    const me = await session.login(email.value, password.value)
    toast.push('Logged in', `Welcome back, @${me.handle}.`, '✓')
    await navigateTo(next.value, { replace: true })
  } catch (error) {
    if (isApiError(error, 'invalid_credentials')) {
      // Identical message whether or not the email exists.
      formError.value = 'Email or password is incorrect.'
    } else if (isApiError(error, 'too_many_attempts')) {
      startLockout(error.retryAfter ?? 15 * 60)
    } else if (isApiError(error, 'validation_failed')) {
      for (const detail of error.details) {
        const field = String(detail.field ?? '')
        if (field === 'email' || field === 'password') fieldErrors[field] = humanIssue(field, String(detail.issue ?? ''))
      }
      if (!fieldErrors.email && !fieldErrors.password) formError.value = 'Check the highlighted fields.'
    } else if (isApiError(error, 'account_suspended')) {
      formError.value = 'This account is suspended. Contact support if you think this is a mistake.'
    } else {
      formError.value = errorMessage(error)
    }
  } finally {
    submitting.value = false
  }
}

function humanIssue(field: string, issue: string) {
  if (field === 'email') return 'Enter a valid email address.'
  if (field === 'password') return 'Enter your password.'
  return issue
}
</script>
