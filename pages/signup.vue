<template>
  <div>
    <h1 class="t-h1">Create your S-Passport</h1>
    <p class="dim t-small" style="margin:6px 0 28px">One gasless smart account for every game. No seed phrase.</p>

    <div v-if="formError" class="note note--bad" role="alert" style="margin-bottom:18px">
      <span class="note__i">✕</span>
      <div>{{ formError }}</div>
    </div>

    <form novalidate @submit.prevent="submit">
      <fieldset :disabled="submitting" style="border:0;padding:0;margin:0">
        <div class="field" :class="{ bad: shownError('handle') }">
          <label for="signup-handle">Handle</label>
          <input id="signup-handle" v-model.trim="handle" autocomplete="username" maxlength="20" :aria-invalid="Boolean(shownError('handle'))" @blur="touched.handle = true">
          <p v-if="shownError('handle')" class="field__err">{{ shownError('handle') }}</p>
          <p v-else class="field__hint">3–20 letters, digits or underscores. Public on your passport and posts.</p>
        </div>
        <div class="field" :class="{ bad: shownError('email') }">
          <label for="signup-email">Email</label>
          <input id="signup-email" v-model.trim="email" type="email" autocomplete="email" :aria-invalid="Boolean(shownError('email'))" @blur="touched.email = true">
          <p v-if="shownError('email')" class="field__err">{{ shownError('email') }}</p>
        </div>
        <div class="field" :class="{ bad: shownError('password') }">
          <label for="signup-password">Password</label>
          <input id="signup-password" v-model="password" type="password" autocomplete="new-password" :aria-invalid="Boolean(shownError('password'))" @blur="touched.password = true">
          <p v-if="shownError('password')" class="field__err">{{ shownError('password') }}</p>
          <p v-else class="field__hint">At least 10 characters, with a letter and a digit or symbol.</p>
        </div>
        <div class="field">
          <label for="signup-ref">Referral code <span class="dim">(optional)</span></label>
          <input id="signup-ref" v-model.trim="referralCode" maxlength="32" autocomplete="off">
        </div>
        <button class="btn btn--grad btn--full" type="submit" :disabled="submitting">
          <span v-if="submitting" class="spin" aria-hidden="true">◐</span>
          {{ submitting ? 'Creating passport…' : 'Create passport' }}
        </button>
      </fieldset>
    </form>

    <p class="t-small dim" style="text-align:center;margin-top:26px">
      Already have one? <NuxtLink :to="loginLink" style="color:var(--pink)">Log in</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign up · Sverse' })

const route = useRoute()
const session = useSession()
const toast = useToast()

const next = computed(() => safeNext(route.query.next, '/passport'))
const loginLink = computed(() => (route.query.next ? loginPath(next.value) : '/login'))

await session.ensure()
if (session.loggedIn.value) await navigateTo(next.value, { replace: true })

const handle = ref('')
const email = ref('')
const password = ref('')
const referralCode = ref(String(route.query.ref ?? ''))
const submitting = ref(false)
const formError = ref('')
const serverErrors = reactive<Record<string, string>>({})
const touched = reactive<Record<string, boolean>>({ handle: false, email: false, password: false })

// Live validation mirrors the API's rules; the server re-checks everything.
const liveErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {}
  if (!/^[A-Za-z0-9_]{3,20}$/.test(handle.value)) errors.handle = 'Handle must be 3–20 letters, digits or underscores.'
  if (!/^\S+@\S+\.\S+$/.test(email.value)) errors.email = 'Enter a valid email address.'
  if (password.value.length < 10 || !/[A-Za-z]/.test(password.value) || !/[^A-Za-z]/.test(password.value)) {
    errors.password = 'At least 10 characters, with a letter and a digit or symbol.'
  }
  return errors
})

watch(handle, () => delete serverErrors.handle)
watch(email, () => delete serverErrors.email)
watch(password, () => delete serverErrors.password)

function shownError(field: string) {
  return serverErrors[field] || (touched[field] ? liveErrors.value[field] : '')
}

async function submit() {
  if (submitting.value) return
  formError.value = ''
  touched.handle = touched.email = touched.password = true
  if (Object.keys(liveErrors.value).length) return
  submitting.value = true
  try {
    const me = await session.register({ handle: handle.value, email: email.value, password: password.value, referralCode: referralCode.value || undefined })
    toast.push('Passport created', `Welcome to Sverse, @${me.handle}.`, '🪪')
    await navigateTo(next.value, { replace: true })
  } catch (error) {
    if (isApiError(error, 'handle_taken')) serverErrors.handle = 'That handle is taken — try another.'
    else if (isApiError(error, 'email_taken')) serverErrors.email = 'An account with this email already exists. Log in instead.'
    else if (isApiError(error, 'weak_password')) serverErrors.password = 'Password must be at least 10 characters with a letter and a digit or symbol.'
    else if (isApiError(error, 'validation_failed')) {
      for (const detail of error.details) {
        const field = String(detail.field ?? '')
        if (['handle', 'email', 'password', 'referralCode'].includes(field)) serverErrors[field] = String(detail.issue ?? 'Invalid value')
      }
      if (!Object.keys(serverErrors).length) formError.value = 'Check the highlighted fields.'
    } else if (isApiError(error, 'too_many_attempts') || isApiError(error, 'rate_limited')) {
      formError.value = 'Too many sign-ups from this network. Try again later.'
    } else {
      formError.value = errorMessage(error)
    }
  } finally {
    submitting.value = false
  }
}
</script>
