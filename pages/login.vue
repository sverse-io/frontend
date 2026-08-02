<template>
  <main class="page">
    <p class="eyebrow">Auth</p>
    <h1>Log in to Sverse.</h1>
    <form class="form" style="margin-top:24px" @submit.prevent="login">
      <input v-model="email" class="input" type="email" placeholder="Email">
      <input v-model="password" class="input" type="password" placeholder="Password">
      <button class="btn btn--grad">Log in</button>
      <NuxtLink class="dim" to="/signup">Create an account</NuxtLink>
    </form>
  </main>
</template>

<script setup lang="ts">
const api = useApi()
const route = useRoute()
const email = ref('kai@example.com')
const password = ref('correct-horse-9')
async function login() {
  await api.one('/api/v1/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
  await navigateTo(String(route.query.next ?? '/passport'))
}
</script>
