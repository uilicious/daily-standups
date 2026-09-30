<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-600 mb-3" />
      <p class="text-sm">Loading team feed...</p>
    </div>

    <!-- Access Denied State -->
    <div v-else-if="accessDenied" class="bg-white border border-amber-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
      <div class="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Lock class="w-7 h-7" />
      </div>
      <h2 class="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
      <p class="text-sm text-slate-600 max-w-md mx-auto mb-6">
        You are not a member of the <span class="font-semibold text-slate-800">"{{ route.params.slug }}"</span> team and cannot view or access its feed.
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
          <div class="flex items-center space-x-3 flex-wrap gap-y-1">
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ team.name }}</h1>
            <div class="flex items-center space-x-1.5">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {{ standups.length }} {{ standups.length === 1 ? 'standup' : 'standups' }}
              </span>
              <span v-if="todayPosts.length > 0" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {{ todayPosts.length }} {{ todayPosts.length === 1 ? 'post' : 'posts' }}
              </span>
            </div>
          </div>
          <p class="text-slate-500 text-sm mt-1 max-w-2xl">{{ team.description || 'Daily team synchronizations and updates.' }}</p>
        </div>

        <!-- Action Buttons: Create Post & Post Standup -->
        <div class="flex items-center space-x-2.5 flex-wrap gap-y-2">
          <button
            @click="openCreatePostModal"
            class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <MessageSquarePlus class="w-4 h-4 text-indigo-600" />
            <span>Create Post</span>
          </button>

          <router-link
            :to="{ path: '/submit', query: { team: team.id } }"
            class="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
          >
            <PlusCircle class="w-4 h-4" />
            <span>Post Standup</span>
          </router-link>
        </div>
      </div>

      <!-- Date Filter & Member Search Toolbar -->
      <div class="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Date Navigator (skips non-working days) -->
        <div class="flex items-center space-x-2 w-full sm:w-auto">
          <button
            @click="changeDate(-1)"
            title="Previous Working Day"
            class="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
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
            :disabled="isNextDisabled"
            title="Next Working Day"
            class="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronRight class="w-4 h-4" />
          </button>

          <button
            v-if="!isToday"
            @click="goToToday"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition border border-indigo-200 cursor-pointer"
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
              placeholder="Filter by author or text..."
              class="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      <!-- Team Members Availability Row (No card, small row, left-aligned) -->
      <div v-if="members.length > 0" class="flex items-center flex-wrap gap-2.5 px-1 py-1">
        <span class="text-xs font-semibold text-slate-500 flex-shrink-0">Members:</span>
        <div class="flex items-center flex-wrap gap-2">
          <div
            v-for="member in members"
            :key="member.id"
            class="relative group"
            :title="getMemberTitle(member)"
          >
            <!-- Avatar with thick green ring if standup submitted (Standard posts do NOT add green ring) -->
            <div class="relative cursor-pointer transition-transform duration-150 group-hover:scale-110">
              <img
                :src="member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.name || member.username || 'User')}`"
                :alt="member.name"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover transition-all duration-200 bg-slate-100"
                :class="[
                  getMemberOpacityClass(member),
                  member.has_standup ? 'ring-[3px] ring-emerald-500 ring-offset-2 ring-offset-slate-50' : ''
                ]"
              />

              <!-- Half-day AM / PM indicator -->
              <span
                v-if="member.is_ooo && member.ooo_period === 'morning'"
                class="absolute -bottom-1 -right-1 px-1 py-0.2 text-[8px] font-extrabold bg-sky-500 text-white rounded-full leading-none shadow-xs"
              >
                AM
              </span>
              <span
                v-else-if="member.is_ooo && member.ooo_period === 'afternoon'"
                class="absolute -bottom-1 -right-1 px-1 py-0.2 text-[8px] font-extrabold bg-orange-500 text-white rounded-full leading-none shadow-xs"
              >
                PM
              </span>
            </div>

            <!-- Floating Tooltip on Hover -->
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30 transition-all">
              <div class="bg-slate-900/95 text-white text-[11px] rounded-lg py-1.5 px-2.5 whitespace-nowrap shadow-xl backdrop-blur-xs text-center min-w-[120px]">
                <div class="font-bold text-white text-xs">{{ member.name }}</div>
                <div class="flex items-center justify-center space-x-1.5 mt-1 text-[11px]">
                  <span class="w-2 h-2 rounded-full inline-block" :class="getStatusDotClass(member)"></span>
                  <span class="font-medium" :class="getStatusTextClass(member)">{{ getMemberStatusLabel(member) }}</span>
                </div>
                <div v-if="member.has_standup" class="text-emerald-400 text-[10px] font-semibold mt-1 flex items-center justify-center space-x-1">
                  <span>✓ Standup submitted</span>
                </div>
                <div v-if="member.ooo_reason" class="text-slate-300 text-[10px] italic mt-1 max-w-[180px] truncate">
                  "{{ member.ooo_reason }}"
                </div>
              </div>
              <div class="w-2 h-2 bg-slate-900/95 rotate-45 -mt-1"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- INCOMING HAND-OFFS SECTION (Prominently displayed updates from previous shifts) -->
      <div v-if="incomingHandoffs.length > 0" class="space-y-3 pt-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <ArrowRightLeft class="w-4 h-4 text-amber-600" />
            <span>Incoming Hand-offs To Follow Up Today ({{ incomingHandoffs.length }})</span>
          </div>
          <span class="text-xs text-slate-400">Updates handed over from previous working shifts</span>
        </div>

        <div class="space-y-4">
          <PostCard
            v-for="post in incomingHandoffs"
            :key="'incoming-' + post.id"
            :post="post"
            :current-user="user"
            :is-team-manager="isManager"
            @edit="handleEditPost"
            @delete="handleDeletePost"
          />
        </div>
      </div>

      <!-- FEED FILTER TABS (All / Standups / Posts) -->
      <div v-if="totalFeedItemsCount > 0" class="flex items-center justify-between border-b border-slate-200/80 pb-2 pt-2">
        <div class="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            @click="feedFilter = 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            :class="feedFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            All Activity ({{ totalFeedItemsCount }})
          </button>
          <button
            @click="feedFilter = 'standups'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            :class="feedFilter === 'standups' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Standups ({{ standups.length }})
          </button>
          <button
            @click="feedFilter = 'posts'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            :class="feedFilter === 'posts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Posts & Updates ({{ todayPosts.length }})
          </button>
        </div>

        <span class="text-xs text-slate-400">
          Showing activity for {{ displayDate }}
        </span>
      </div>

      <!-- MAIN FEED ITEMS -->
      <div v-if="feedFilter === 'all' && combinedFeedItems.length > 0" class="space-y-4">
        <template v-for="item in combinedFeedItems" :key="item.id">
          <StandupCard
            v-if="item.type === 'standup'"
            :standup="item.data"
            @edit="handleEditStandup"
          />
          <PostCard
            v-else-if="item.type === 'post'"
            :post="item.data"
            :current-user="user"
            :is-team-manager="isManager"
            @edit="handleEditPost"
            @delete="handleDeletePost"
          />
        </template>
      </div>

      <!-- Filtered: Standups Only -->
      <div v-else-if="feedFilter === 'standups' && filteredStandups.length > 0" class="space-y-4">
        <StandupCard
          v-for="standup in filteredStandups"
          :key="standup.id"
          :standup="standup"
          @edit="handleEditStandup"
        />
      </div>

      <!-- Filtered: Posts Only -->
      <div v-else-if="feedFilter === 'posts' && filteredTodayPosts.length > 0" class="space-y-4">
        <PostCard
          v-for="post in filteredTodayPosts"
          :key="post.id"
          :post="post"
          :current-user="user"
          :is-team-manager="isManager"
          @edit="handleEditPost"
          @delete="handleDeletePost"
        />
      </div>

      <!-- Empty State -->
      <div
        v-else-if="totalFeedItemsCount === 0 && incomingHandoffs.length === 0"
        class="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center"
      >
        <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CalendarDays class="w-7 h-7" />
        </div>
        <h3 class="text-base font-semibold text-slate-900 mb-1">No updates for {{ displayDate }}</h3>
        <p class="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          <span v-if="searchQuery">No items match your filter "{{ searchQuery }}".</span>
          <span v-else>No one in {{ team.name }} has posted an update or standup for this day yet.</span>
        </p>

        <div class="flex items-center justify-center space-x-3">
          <button
            @click="openCreatePostModal"
            class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            <MessageSquarePlus class="w-4 h-4 text-indigo-600" />
            <span>Create Post</span>
          </button>

          <router-link
            :to="{ path: '/submit', query: { team: team.id, date: selectedDate } }"
            class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <PlusCircle class="w-4 h-4" />
            <span>Post Standup</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Create / Edit Post Modal -->
    <CreatePostModal
      :show="createPostModalOpen"
      :team="team || {}"
      :post="selectedPostForEdit"
      :current-date="selectedDate"
      :org-work-days="orgWorkDays"
      @close="createPostModalOpen = false"
      @saved="handlePostSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import StandupCard from '@/components/StandupCard.vue';
import PostCard from '@/components/PostCard.vue';
import CreatePostModal from '@/components/CreatePostModal.vue';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  MessageSquarePlus,
  Search,
  CalendarDays,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRightLeft
} from '@lucide/vue';
import {
  getLocalDateString,
  calculateNextWorkingDay,
  calculatePreviousWorkingDay
} from '@/utils/schedule.js';

const route = useRoute();
const router = useRouter();
const { user, userTeams } = useAuth();

const team = ref(null);
const standups = ref([]);
const posts = ref([]);
const members = ref([]);
const orgWorkDays = ref([1, 2, 3, 4, 5]);
const loading = ref(true);
const error = ref(null);
const accessDenied = ref(false);
const searchQuery = ref('');
const feedFilter = ref('all'); // 'all' | 'standups' | 'posts'

// Modals
const createPostModalOpen = ref(false);
const selectedPostForEdit = ref(null);

const selectedDate = ref(getLocalDateString());

const isToday = computed(() => {
  return selectedDate.value === getLocalDateString();
});

const isNextDisabled = computed(() => {
  const nextWorkDay = calculateNextWorkingDay(selectedDate.value, orgWorkDays.value);
  return nextWorkDay > getLocalDateString();
});

const isManager = computed(() => {
  if (!user.value || !team.value) return false;
  if (user.value.role === 'admin') return true;
  const userTeam = (user.value.teams || []).find(t => t.id === team.value.id);
  return userTeam?.role === 'manager' || userTeam?.team_role === 'manager';
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

// Incoming handoffs from another date targeting today
const incomingHandoffs = computed(() => {
  return posts.value.filter(p => p.is_incoming_handoff);
});

// Posts made on today's selected date
const todayPosts = computed(() => {
  return posts.value.filter(p => !p.is_incoming_handoff);
});

const totalFeedItemsCount = computed(() => {
  return standups.value.length + todayPosts.value.length;
});

const filteredStandups = computed(() => {
  if (!searchQuery.value.trim()) return standups.value;
  const q = searchQuery.value.toLowerCase();
  return standups.value.filter(s =>
    s.user_name?.toLowerCase().includes(q) ||
    s.user_email?.toLowerCase().includes(q) ||
    (s.yesterday && s.yesterday.toLowerCase().includes(q)) ||
    (s.today && s.today.toLowerCase().includes(q)) ||
    (s.blockers && s.blockers.toLowerCase().includes(q))
  );
});

const filteredTodayPosts = computed(() => {
  if (!searchQuery.value.trim()) return todayPosts.value;
  const q = searchQuery.value.toLowerCase();
  return todayPosts.value.filter(p =>
    p.user_name?.toLowerCase().includes(q) ||
    p.user_email?.toLowerCase().includes(q) ||
    (p.title && p.title.toLowerCase().includes(q)) ||
    (p.content && p.content.toLowerCase().includes(q))
  );
});

// Combined feed for "All Activity" tab
const combinedFeedItems = computed(() => {
  const items = [];
  filteredStandups.value.forEach(s => {
    items.push({
      type: 'standup',
      id: `standup-${s.id}`,
      data: s,
      timestamp: new Date(s.created_at || selectedDate.value).getTime()
    });
  });
  filteredTodayPosts.value.forEach(p => {
    items.push({
      type: 'post',
      id: `post-${p.id}`,
      data: p,
      timestamp: new Date(p.created_at || selectedDate.value).getTime()
    });
  });
  return items.sort((a, b) => b.timestamp - a.timestamp);
});

async function fetchStandups() {
  const slug = route.params.slug;
  if (!slug) return;

  // Check if current user belongs to this team (or is admin)
  const belongsToTeam = (user.value?.teams || []).some(t => t.slug === slug);
  if (!belongsToTeam && user.value?.role !== 'admin') {
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
      throw new Error('Failed to load feed');
    }
    const data = await res.json();
    team.value = data.team;
    standups.value = data.standups || [];
    members.value = data.members || [];
    posts.value = data.posts || [];
    if (Array.isArray(data.org_work_days)) {
      orgWorkDays.value = data.org_work_days;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function changeDate(daysOffset) {
  let newDateStr;
  if (daysOffset > 0) {
    newDateStr = calculateNextWorkingDay(selectedDate.value, orgWorkDays.value);
  } else {
    newDateStr = calculatePreviousWorkingDay(selectedDate.value, orgWorkDays.value);
  }

  const todayStr = getLocalDateString();
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

function openCreatePostModal() {
  selectedPostForEdit.value = null;
  createPostModalOpen.value = true;
}

function handleEditPost(post) {
  selectedPostForEdit.value = post;
  createPostModalOpen.value = true;
}

function handlePostSaved(savedPost) {
  const idx = posts.value.findIndex(p => p.id === savedPost.id);
  if (idx !== -1) {
    posts.value[idx] = savedPost;
  } else {
    // If post is for selectedDate or handoff targeting selectedDate, prepend
    if (
      savedPost.date === selectedDate.value ||
      (savedPost.post_type === 'handoff' && savedPost.target_date === selectedDate.value)
    ) {
      posts.value.unshift(savedPost);
    }
  }
}

async function handleDeletePost(post) {
  if (!confirm(`Are you sure you want to delete this ${post.post_type === 'handoff' ? 'hand-off update' : 'post'}?`)) {
    return;
  }
  try {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete post');
    }
    posts.value = posts.value.filter(p => p.id !== post.id);
  } catch (err) {
    alert(err.message || 'Failed to delete post');
  }
}

// Member Availability Helpers
function getMemberOpacityClass(member) {
  // If not scheduled or out of office all day -> grayed out
  if (!member.is_scheduled || (member.is_ooo && member.ooo_period === 'all_day')) {
    return 'grayscale opacity-35';
  }
  // If out of office for half-day (morning or afternoon) -> slightly muted with AM/PM indicator
  if (member.is_ooo && (member.ooo_period === 'morning' || member.ooo_period === 'afternoon')) {
    return 'opacity-85';
  }
  // Fully in office
  return 'opacity-100';
}

function getMemberStatusLabel(member) {
  if (member.is_ooo) {
    if (member.ooo_period === 'morning') return 'Out of office (Morning)';
    if (member.ooo_period === 'afternoon') return 'Out of office (Afternoon)';
    return 'Out of office';
  }
  if (!member.is_scheduled) {
    return 'Out of office (Scheduled off)';
  }
  return 'In office';
}

function getStatusDotClass(member) {
  if (member.is_ooo) {
    if (member.ooo_period === 'morning' || member.ooo_period === 'afternoon') {
      return 'bg-amber-400';
    }
    return 'bg-rose-400';
  }
  if (!member.is_scheduled) {
    return 'bg-slate-400';
  }
  return 'bg-emerald-400';
}

function getStatusTextClass(member) {
  if (member.is_ooo) {
    if (member.ooo_period === 'morning' || member.ooo_period === 'afternoon') {
      return 'text-amber-300';
    }
    return 'text-rose-300';
  }
  if (!member.is_scheduled) {
    return 'text-slate-300';
  }
  return 'text-emerald-300';
}

function getMemberTitle(member) {
  const status = getMemberStatusLabel(member);
  const standup = member.has_standup ? ' • Standup submitted' : '';
  const reason = member.ooo_reason ? ` (${member.ooo_reason})` : '';
  return `${member.name} - ${status}${reason}${standup}`;
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
