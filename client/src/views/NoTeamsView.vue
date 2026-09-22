<template>
  <div class="max-w-md mx-auto px-4 py-20 text-center">
    <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
      <Users class="w-8 h-8" />
    </div>
    <h1 class="text-xl font-bold text-slate-900 mb-2">No Teams Assigned</h1>
    <p class="text-sm text-slate-500 mb-6">
      You are not currently assigned to any standup team. Please contact your team administrator to be assigned to a team.
    </p>
    <div v-if="isAdmin">
      <router-link
        to="/admin"
        class="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
      >
        <span>Open Admin Controls to Assign Teams</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { Users } from '@lucide/vue';
import { useAuth } from '@/composables/useAuth.js';

const { isAdmin } = useAuth();
</script>
