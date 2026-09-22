<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
      <!-- Title & Intro -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Daily Standup Update</h1>
        <p class="text-sm text-slate-500 mt-1">
          Share your progress, plans, and any blockers with your team before the morning standup.
        </p>
      </div>

      <!-- Alert / Notice -->
      <div v-if="successMessage" class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 text-sm">
        <CheckCircle2 class="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span>{{ successMessage }}</span>
      </div>

      <div v-if="errorMessage" class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2 text-sm">
        <AlertCircle class="w-5 h-5 text-rose-600 flex-shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="isExistingSubmission" class="mb-6 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-between text-xs sm:text-sm">
        <div class="flex items-center space-x-2">
          <Info class="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>You already submitted for this team today. Saving will update your previous entry.</span>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Team & Date Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Team Selection -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Team <span class="text-rose-500">*</span>
            </label>
            <div v-if="availableTeams.length > 0">
              <select
                v-model="selectedTeamId"
                @change="checkExistingSubmission"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option v-for="t in availableTeams" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
              <p class="text-[11px] text-slate-400 mt-1">
                Teams you are currently assigned to.
              </p>
            </div>
            <div v-else class="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              You are not assigned to any team yet. Please contact an admin.
            </div>
          </div>

          <!-- Date -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Standup Date <span class="text-rose-500">*</span>
            </label>
            <input
              type="date"
              v-model="standupDate"
              @change="checkExistingSubmission"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <hr class="border-slate-100" />

        <!-- Question 1: What did you do yesterday? -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-1.5">
            1. What did you do yesterday (or the previous working day)? <span class="text-rose-500">*</span>
          </label>
          <p class="text-xs text-slate-500 mb-2">Key tasks completed, PRs merged, bugs resolved, or discussions held.</p>
          <textarea
            v-model="form.yesterday"
            required
            rows="3"
            placeholder="e.g. Completed user profile API and reviewed pull request #38..."
            class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          ></textarea>
        </div>

        <!-- Question 2: What are you working on today? -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-1.5">
            2. What are you working on today? <span class="text-rose-500">*</span>
          </label>
          <p class="text-xs text-slate-500 mb-2">Primary goals and priorities for today's focus.</p>
          <textarea
            v-model="form.today"
            required
            rows="3"
            placeholder="e.g. Implementing SQLite standup models and writing unit tests..."
            class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          ></textarea>
        </div>

        <!-- Question 3: Blockers & Help Needed -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-1.5">
            3. Any blockers? And who do you need help from?
          </label>
          <p class="text-xs text-slate-500 mb-2">Dependencies, permissions needed, or code reviews waiting on a specific teammate. (Leave blank or write "None" if all clear).</p>
          <textarea
            v-model="form.blockers"
            rows="2"
            placeholder="e.g. Waiting on API credentials from John, or write 'None'"
            class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          ></textarea>
        </div>

        <!-- Submit Buttons -->
        <div class="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="cancel"
            class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="submitting || availableTeams.length === 0"
            class="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-100"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            <span>{{ submitting ? 'Saving...' : isExistingSubmission ? 'Update Standup' : 'Publish Standup' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import { CheckCircle2, AlertCircle, Info, Loader2 } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const { user, isAdmin } = useAuth();

const allTeams = ref([]);
const selectedTeamId = ref(null);
const standupDate = ref(new Date().toISOString().split('T')[0]);

const form = ref({
  yesterday: '',
  today: '',
  blockers: ''
});

const isExistingSubmission = ref(false);
const submitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// User's allowed teams: only teams the user belongs to
const availableTeams = computed(() => {
  return user.value?.teams || [];
});

async function loadTeams() {
  try {
    const res = await fetch('/api/teams', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      allTeams.value = data.teams || [];

      // Set initial selected team from query param or user's first team
      if (route.query.team) {
        selectedTeamId.value = Number(route.query.team);
      } else if (availableTeams.value.length > 0) {
        selectedTeamId.value = availableTeams.value[0].id;
      }
      
      if (route.query.date) {
        standupDate.value = route.query.date;
      }

      await checkExistingSubmission();
    }
  } catch (err) {
    console.error('Failed to load teams', err);
  }
}

async function checkExistingSubmission() {
  if (!selectedTeamId.value) return;

  try {
    const res = await fetch(`/api/teams/${selectedTeamId.value}/standups?date=${standupDate.value}`, {
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      const existing = (data.standups || []).find(s => s.user_id === user.value?.id);
      if (existing) {
        isExistingSubmission.value = true;
        form.value.yesterday = existing.yesterday;
        form.value.today = existing.today;
        form.value.blockers = existing.blockers || '';
      } else {
        isExistingSubmission.value = false;
        // Don't wipe fields if user just started typing, only if it was matching previous
      }
    }
  } catch (err) {
    // Ignore error
  }
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';
  submitting.value = true;

  try {
    const res = await fetch('/api/standups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        team_id: selectedTeamId.value,
        date: standupDate.value,
        yesterday: form.value.yesterday,
        today: form.value.today,
        blockers: form.value.blockers
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save standup');
    }

    successMessage.value = 'Standup saved successfully!';
    
    // Find target team slug to navigate to feed
    const targetTeam = allTeams.value.find(t => t.id === selectedTeamId.value);
    const slug = targetTeam ? targetTeam.slug : '';

    setTimeout(() => {
      router.push(`/team/${slug}?date=${standupDate.value}`);
    }, 600);
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    submitting.value = false;
  }
}

function cancel() {
  router.back();
}

onMounted(() => {
  loadTeams();
});
</script>
