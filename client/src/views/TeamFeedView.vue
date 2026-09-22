<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-600 mb-3" />
      <p class="text-sm">Loading team standups...</p>
    </div>

    <!-- Access Denied State -->
    <div v-else-if="accessDenied" class="bg-white border border-amber-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
      <div class="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Lock class="w-7 h-7" />
      </div>
      <h2 class="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
      <p class="text-sm text-slate-600 max-w-md mx-auto mb-6">
        You are not a member of the <span class="font-semibold text-slate-800">"{{ route.params.slug }}"</span> team and cannot view or access its daily standup feed.
      </p>

      <div class="flex items-center justify-center space-x-3">
        <router-link
          v-if="userTeams.length > 0"
          :to="`/team/${userTeams[0].slug}`"
          class="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
        >
          <span>Go to {{ userTeams[0].name }}</span>
        </router-link>
        <router-link
          v-else
          to="/"
          class="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <span>Return Home</span>
        </router-link>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-700">
      <AlertCircle class="w-8 h-8 mx-auto mb-2 text-rose-500" />
      <h3 class="font-semibold text-base mb-1">Failed to load team</h3>
      <p class="text-sm mb-4">{{ error }}</p>
      <router-link to="/" class="inline-flex px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
        Return Home
      </router-link>
    </div>

    <!-- Content -->
    <div v-else-if="team" class="space-y-6">
      <!-- Team Header Card -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-3">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ team.name }}</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {{ standups.length }} {{ standups.length === 1 ? 'standup' : 'standups' }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1 max-w-2xl">{{ team.description || 'Daily team synchronizations and updates.' }}</p>
        </div>

        <!-- Quick Post Action -->
        <div>
          <router-link
            :to="{ path: '/submit', query: { team: team.id } }"
            class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
          >
            <PlusCircle class="w-4 h-4" />
            <span>Post to {{ team.name }}</span>
          </router-link>
        </div>
      </div>

      <!-- Date Filter & Member Search Toolbar -->
      <div class="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Date Navigator -->
        <div class="flex items-center space-x-2 w-full sm:w-auto">
          <button
            @click="changeDate(-1)"
            title="Previous Day"
            class="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <div class="relative">
            <input
              type="date"
              v-model="selectedDate"
              @change="fetchStandups"
              class="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition cursor-pointer"
            />
          </div>

          <button
            @click="changeDate(1)"
            :disabled="isToday"
            title="Next Day"
            class="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight class="w-4 h-4" />
          </button>

          <button
            v-if="!isToday"
            @click="goToToday"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition border border-indigo-200"
          >
            Today
          </button>
        </div>

        <!-- Member Search Filter -->
        <div class="w-full sm:w-64">
          <div class="relative">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Filter by member..."
              class="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      <!-- Standup Cards Feed -->
      <div v-if="filteredStandups.length > 0" class="space-y-4">
        <StandupCard
          v-for="standup in filteredStandups"
          :key="standup.id"
          :standup="standup"
          @edit="handleEditStandup"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
        <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CalendarDays class="w-7 h-7" />
        </div>
        <h3 class="text-base font-semibold text-slate-900 mb-1">No standup updates for {{ displayDate }}</h3>
        <p class="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          <span v-if="searchQuery">No team members match your filter "{{ searchQuery }}".</span>
          <span v-else>No one in {{ team.name }} has posted their standup for this day yet.</span>
        </p>
        <router-link
          :to="{ path: '/submit', query: { team: team.id, date: selectedDate } }"
          class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <PlusCircle class="w-4 h-4" />
          <span>Post Your Standup</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import StandupCard from '@/components/StandupCard.vue';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Search,
  CalendarDays,
  AlertCircle,
  Loader2,
  Lock
} from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const { user, userTeams } = useAuth();

const team = ref(null);
const standups = ref([]);
const loading = ref(true);
const error = ref(null);
const accessDenied = ref(false);
const searchQuery = ref('');

// Date formatting helper YYYY-MM-DD
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const selectedDate = ref(getLocalDateString());

const isToday = computed(() => {
  return selectedDate.value === getLocalDateString();
});

const displayDate = computed(() => {
  if (isToday.value) return 'Today';
  try {
    const [y, m, d] = selectedDate.value.split('-');
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return selectedDate.value;
  }
});

const filteredStandups = computed(() => {
  if (!searchQuery.value.trim()) return standups.value;
  const q = searchQuery.value.toLowerCase();
  return standups.value.filter(s =>
    s.user_name.toLowerCase().includes(q) ||
    s.user_email.toLowerCase().includes(q) ||
    (s.yesterday && s.yesterday.toLowerCase().includes(q)) ||
    (s.today && s.today.toLowerCase().includes(q)) ||
    (s.blockers && s.blockers.toLowerCase().includes(q))
  );
});

async function fetchStandups() {
  const slug = route.params.slug;
  if (!slug) return;

  // Check if current user belongs to this team
  const belongsToTeam = (user.value?.teams || []).some(t => t.slug === slug);
  if (!belongsToTeam) {
    accessDenied.value = true;
    loading.value = false;
    return;
  }

  accessDenied.value = false;
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(`/api/teams/${slug}/standups?date=${selectedDate.value}`, {
      credentials: 'include'
    });
    if (!res.ok) {
      if (res.status === 403) {
        accessDenied.value = true;
        return;
      }
      if (res.status === 404) {
        throw new Error('Team not found');
      }
      throw new Error('Failed to load standups');
    }
    const data = await res.json();
    team.value = data.team;
    standups.value = data.standups || [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function changeDate(daysOffset) {
  const [y, m, d] = selectedDate.value.split('-');
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  dateObj.setDate(dateObj.getDate() + daysOffset);

  const todayStr = getLocalDateString();
  const newDateStr = getLocalDateString(dateObj);

  // Avoid navigating into the future
  if (newDateStr > todayStr) return;

  selectedDate.value = newDateStr;
  fetchStandups();
}

function goToToday() {
  selectedDate.value = getLocalDateString();
  fetchStandups();
}

function handleEditStandup(standup) {
  router.push({
    path: '/submit',
    query: {
      team: standup.team_id,
      date: standup.date
    }
  });
}

// Watch for route param change (switching between teams)
watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug) {
      fetchStandups();
    }
  }
);

onMounted(() => {
  if (route.query.date) {
    selectedDate.value = route.query.date;
  }
  fetchStandups();
});
</script>
