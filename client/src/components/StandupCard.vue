<template>
  <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6 space-y-5">
    <!-- Header: User info & submission time -->
    <div class="flex items-start justify-between">
      <div class="flex items-center space-x-3.5">
        <img
          :src="standup.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${standup.user_name}`"
          :alt="standup.user_name"
          class="w-11 h-11 rounded-full border border-slate-200 bg-slate-50 object-cover flex-shrink-0"
        />
        <div>
          <div class="flex items-center space-x-2">
            <h3 class="font-semibold text-slate-900 text-base leading-tight">{{ standup.user_name }}</h3>
            <span
              v-if="standup.user_role === 'admin'"
              class="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
            >
              Admin
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">{{ standup.user_email }}</p>
        </div>
      </div>

      <div class="flex items-center space-x-2 text-right">
        <div class="text-xs text-slate-400">
          <span>{{ formattedTime }}</span>
          <span v-if="wasUpdated" class="text-slate-400 ml-1 text-[11px]">(edited)</span>
        </div>
        <button
          v-if="isOwner"
          @click="$emit('edit', standup)"
          class="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-2 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition"
        >
          Edit
        </button>
      </div>
    </div>

    <!-- 3 Questions Grid -->
    <div class="space-y-4 pt-1">
      <!-- Question 1: Yesterday -->
      <div class="rounded-lg bg-slate-50/70 p-3.5 border border-slate-100">
        <div class="flex items-center space-x-2 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
          <History class="w-3.5 h-3.5 text-slate-500" />
          <span>1. What did you do yesterday (or previous working day)?</span>
        </div>
        <p class="text-sm text-slate-800 whitespace-pre-line leading-relaxed pl-5">{{ standup.yesterday }}</p>
      </div>

      <!-- Question 2: Today -->
      <div class="rounded-lg bg-slate-50/70 p-3.5 border border-slate-100">
        <div class="flex items-center space-x-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-indigo-500" />
          <span>2. What are you working on today?</span>
        </div>
        <p class="text-sm text-slate-800 whitespace-pre-line leading-relaxed pl-5">{{ standup.today }}</p>
      </div>

      <!-- Question 3: Blockers & Help Needed -->
      <div
        class="rounded-lg p-3.5 border transition-colors"
        :class="hasBlockers ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-slate-50/70 border-slate-100'"
      >
        <div class="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1.5" :class="hasBlockers ? 'text-amber-800' : 'text-slate-600'">
          <AlertTriangle v-if="hasBlockers" class="w-3.5 h-3.5 text-amber-600" />
          <ShieldCheck v-else class="w-3.5 h-3.5 text-emerald-600" />
          <span>3. Any blockers? And who do you need help from?</span>
        </div>
        <p
          class="text-sm whitespace-pre-line leading-relaxed pl-5"
          :class="hasBlockers ? 'text-amber-900 font-medium' : 'text-slate-500 italic'"
        >
          {{ standup.blockers && standup.blockers.trim() ? standup.blockers : 'None reported. All clear!' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { History, CheckCircle2, AlertTriangle, ShieldCheck } from '@lucide/vue';
import { useAuth } from '@/composables/useAuth.js';

const props = defineProps({
  standup: {
    type: Object,
    required: true
  }
});

defineEmits(['edit']);

const { user } = useAuth();

const isOwner = computed(() => {
  return user.value && user.value.id === props.standup.user_id;
});

const wasUpdated = computed(() => {
  return props.standup.updated_at && props.standup.created_at && props.standup.updated_at !== props.standup.created_at;
});

const formattedTime = computed(() => {
  const dateStr = props.standup.updated_at || props.standup.created_at;
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
});

const hasBlockers = computed(() => {
  const b = props.standup.blockers?.trim()?.toLowerCase();
  if (!b) return false;
  // If explicitly states "none", "no blockers", "all good", "nil", "n/a", etc.
  if (['none', 'nil', 'n/a', 'no', 'none!', 'no blockers', 'all clear', 'no blocker'].includes(b)) {
    return false;
  }
  return true;
});
</script>
