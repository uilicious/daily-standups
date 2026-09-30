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

          <!-- User Profile & Dropdown -->
          <div v-if="user" class="relative pl-2 border-l border-slate-200" ref="dropdownRef">
            <button
              @click="isDropdownOpen = !isDropdownOpen"
              class="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition focus:outline-none"
              :aria-expanded="isDropdownOpen"
              title="Account menu"
            >
              <img
                :src="user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`"
                :alt="user.name"
                class="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 object-cover flex-shrink-0"
              />
              <div class="hidden lg:block text-left">
                <p class="text-xs font-semibold text-slate-800 leading-tight">{{ user.name }}</p>
                <p class="text-[10px] text-slate-500 truncate max-w-[120px]">{{ roleLabel }}</p>
              </div>
              <ChevronDown
                class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                :class="{ 'rotate-180': isDropdownOpen }"
              />
            </button>

            <!-- Dropdown Menu -->
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div
                v-if="isDropdownOpen"
                class="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 text-xs focus:outline-none"
              >
                <!-- User Summary Header -->
                <div class="px-3.5 py-2.5 border-b border-slate-100">
                  <p class="font-semibold text-slate-900 truncate text-sm">{{ user.name }}</p>
                  <p class="text-[11px] text-slate-500 truncate mt-0.5">
                    <span class="font-mono">@{{ user.username }}</span>
                    <span v-if="user.email"> · {{ user.email }}</span>
                  </p>
                  <div class="mt-2">
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      :class="user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'"
                    >
                      {{ user.role === 'admin' ? 'Admin' : 'Standard' }}
                    </span>
                  </div>
                </div>

                <!-- Menu Links -->
                <div class="py-1">
                  <router-link
                    to="/profile"
                    @click="isDropdownOpen = false"
                    class="flex items-center space-x-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition font-medium"
                  >
                    <UserCircle class="w-4 h-4 text-slate-400" />
                    <span>Manage Profile</span>
                  </router-link>

                  <router-link
                    to="/schedule"
                    @click="isDropdownOpen = false"
                    class="flex items-center space-x-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition font-medium"
                  >
                    <CalendarClock class="w-4 h-4 text-slate-400" />
                    <span>My Schedule</span>
                  </router-link>

                  <router-link
                    v-if="canManage"
                    to="/admin"
                    @click="isDropdownOpen = false"
                    class="flex items-center space-x-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition font-medium"
                  >
                    <ShieldAlert class="w-4 h-4 text-slate-400" />
                    <span>Admin Console</span>
                  </router-link>
                </div>

                <!-- Sign Out Action -->
                <div class="border-t border-slate-100 pt-1">
                  <button
                    @click="handleLogoutClick"
                    class="w-full flex items-center space-x-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition font-medium text-left"
                  >
                    <LogOut class="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </transition>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import { CalendarCheck, CalendarClock, PlusCircle, ShieldAlert, LogOut, ChevronDown, UserCircle } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const { user, isAdmin, isManager, canManage, logout } = useAuth();

const isDropdownOpen = ref(false);
const dropdownRef = ref(null);

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});

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

async function handleLogoutClick() {
  isDropdownOpen.value = false;
  await logout();
  router.push('/login');
}
</script>
