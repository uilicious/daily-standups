<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800">
    <Navbar v-if="!isLoginPage" />
    <main class="flex-1">
      <router-view />
    </main>
    <footer class="py-6 border-t border-slate-200/60 text-center text-xs text-slate-400">
      Daily Standup Form & Feed &copy; 2026. Fastify &amp; Vue.js.
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '@/components/Navbar.vue';

const route = useRoute();
const isLoginPage = computed(() => route.path === '/login');
</script>
