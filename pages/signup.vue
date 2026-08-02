<template>
  <main class="page">
    <p class="eyebrow">Auth</p>
    <h1>Create your S-Passport.</h1>
    <form class="form" style="margin-top:24px" @submit.prevent="signup">
      <input v-model="handle" class="input" placeholder="Handle">
      <input v-model="email" class="input" type="email" placeholder="Email">
      <input v-model="password" class="input" type="password" placeholder="Password">
      <button class="btn btn--grad">Sign up</button>
    </form>
  </main>
</template>

<script setup lang="ts">
const api = useApi()
const handle = ref('newplayer')
const email = ref('newplayer@example.com')
const password = ref('correct-horse-9')
async function signup() {
  await api.one('/api/v1/auth/register', { method: 'POST', body: { handle: handle.value, email: email.value, password: password.value } })
  await navigateTo('/passport')
}
</script>
