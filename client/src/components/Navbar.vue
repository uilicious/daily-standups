<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo & Branding -->
        <div class="flex items-center space-x-6">
          <router-link to="/" class="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <CalendarCheck class="w-5 h-5" />
            </div>
            <span class="font-bold text-lg text-slate-900 tracking-tight">DailyStandup</span>
          </router-link>

          <!-- Desktop Teams Tabs (Only teams user belongs to) -->
          <nav v-if="myTeams.length > 0" class="hidden md:flex items-center space-x-1">
            <router-link
              v-for="team in myTeams"
              :key="team.id"
              :to="`/team/${team.slug}`"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5"
              :class="currentSlug === team.slug ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
            >
              <span>{{ team.name }}</span>
            </router-link>
          </nav>
          <div v-else-if="user" class="hidden md:flex items-center text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            No teams assigned yet
          </div>
        </div>

        <!-- Right Side: Actions & User Info -->
        <div class="flex items-center space-x-3">
          <!-- Submit Standup Button -->
          <router-link
            to="/submit"
            class="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
          >
            <PlusCircle class="w-4 h-4" />
            <span>Submit Standup</span>
          </router-link>

          <!-- Admin / Management Dashboard Link (Admins & Managers) -->
          <router-link
            v-if="canManage"
            to="/admin"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5"
            :class="$route.path.startsWith('/admin') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
          >
            <ShieldAlert class="w-4 h-4" />
            <span class="hidden sm:inline">Admin</span>
          </router-link>

          <!-- User Profile & Logout -->
          <div v-if="user" class="flex items-center pl-2 border-l border-slate-200 space-x-2">
            <img
              :src="user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`"
              :alt="user.name"
              class="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 object-cover"
            />
            <div class="hidden lg:block text-left">
              <p class="text-xs font-semibold text-slate-800 leading-tight">{{ user.name }}</p>
              <p class="text-[10px] text-slate-500 truncate max-w-[120px]">{{ roleLabel }}</p>
            </div>
            <button
              @click="handleLogout"
              title="Sign Out"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut class="w-4 h-4" />
            </button>
          </div>
          <div v-else>
            <router-link
              to="/login"
              class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In
            </router-link>
          </div>
        </div>
      </div>

      <!-- Mobile Team Tab Bar -->
      <div v-if="myTeams.length > 0" class="md:hidden flex items-center space-x-2 overflow-x-auto py-2 border-t border-slate-100 text-sm">
        <router-link
          v-for="team in myTeams"
          :key="team.id"
          :to="`/team/${team.slug}`"
          class="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition"
          :class="currentSlug === team.slug ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
        >
          {{ team.name }}
        </router-link>
      </div>
      <div v-else-if="user" class="md:hidden py-2 text-xs text-amber-700">
        No teams assigned yet. Please contact an admin.
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import { CalendarCheck, PlusCircle, ShieldAlert, LogOut } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const { user, isAdmin, isManager, canManage, logout } = useAuth();

const roleLabel = computed(() => {
  if (user.value?.role === 'admin') return 'Admin';
  return 'Standard';
});

// Only display the teams this user actually belongs to
const myTeams = computed(() => {
  return user.value?.teams || [];
});

const currentSlug = computed(() => {
  return route.params.slug || (route.path === '/' && myTeams.value.length > 0 ? myTeams.value[0].slug : '');
});

async function handleLogout() {
  await logout();
  router.push('/login');
}
</script>
