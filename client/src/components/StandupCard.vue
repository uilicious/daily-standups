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
          <p class="text-xs text-slate-500 mt-0.5">
            <span v-if="standup.user_username" class="font-mono text-slate-600">@{{ standup.user_username }}</span>
            <span v-if="standup.user_username && standup.user_email"> · </span>
            <span v-if="standup.user_email">{{ standup.user_email }}</span>
          </p>
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

    <!-- Dynamic Questions & Answers (Markdown Rendered) -->
    <div v-if="standup.answers && standup.answers.length > 0" class="space-y-3.5 pt-1">
      <div
        v-for="(ans, idx) in standup.answers"
        :key="ans.id || idx"
        class="rounded-xl p-3.5 border transition-colors"
        :class="getAnswerCardClass(ans)"
      >
        <div
          class="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1.5"
          :class="getQuestionHeaderClass(ans)"
        >
          <component :is="getQuestionIcon(ans, idx)" class="w-3.5 h-3.5 flex-shrink-0" />
          <span>{{ idx + 1 }}. {{ ans.question_text }}</span>
        </div>
        
        <div
          v-if="ans.answer && ans.answer.trim()"
          class="text-sm text-slate-800 leading-relaxed pl-5 markdown-content"
          v-html="renderMarkdown(ans.answer)"
        ></div>
        <p v-else class="text-sm text-slate-400 italic leading-relaxed pl-5">
          (No response provided)
        </p>
      </div>
    </div>

    <!-- Fallback for legacy 3 Questions Grid -->
    <div v-else class="space-y-4 pt-1">
      <!-- Question 1: Yesterday -->
      <div class="rounded-lg bg-slate-50/70 p-3.5 border border-slate-100">
        <div class="flex items-center space-x-2 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
          <History class="w-3.5 h-3.5 text-slate-500" />
          <span>1. What did you do yesterday (or previous working day)?</span>
        </div>
        <div
          class="text-sm text-slate-800 leading-relaxed pl-5 markdown-content"
          v-html="renderMarkdown(standup.yesterday || '')"
        ></div>
      </div>

      <!-- Question 2: Today -->
      <div class="rounded-lg bg-slate-50/70 p-3.5 border border-slate-100">
        <div class="flex items-center space-x-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-indigo-500" />
          <span>2. What are you working on today?</span>
        </div>
        <div
          class="text-sm text-slate-800 leading-relaxed pl-5 markdown-content"
          v-html="renderMarkdown(standup.today || '')"
        ></div>
      </div>

      <!-- Question 3: Blockers & Help Needed -->
      <div
        class="rounded-lg p-3.5 border transition-colors"
        :class="hasLegacyBlockers ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-slate-50/70 border-slate-100'"
      >
        <div class="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1.5" :class="hasLegacyBlockers ? 'text-amber-800' : 'text-slate-600'">
          <AlertTriangle v-if="hasLegacyBlockers" class="w-3.5 h-3.5 text-amber-600" />
          <ShieldCheck v-else class="w-3.5 h-3.5 text-emerald-600" />
          <span>3. Any blockers? And who do you need help from?</span>
        </div>
        <div
          v-if="standup.blockers && standup.blockers.trim()"
          class="text-sm leading-relaxed pl-5 markdown-content"
          :class="hasLegacyBlockers ? 'text-amber-900 font-medium' : 'text-slate-600'"
          v-html="renderMarkdown(standup.blockers)"
        ></div>
        <p v-else class="text-sm text-slate-500 italic leading-relaxed pl-5">
          None reported. All clear!
        </p>
      </div>
    </div>

    <!-- Emoji Reactions Bar -->
    <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
      <EmojiReactions
        target-type="standup"
        :target-id="standup.id"
        :reactions="standup.reactions || []"
        :current-user="user"
        @reactions-updated="(updated) => (standup.reactions = updated)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { History, CheckCircle2, AlertTriangle, ShieldCheck, MessageSquare } from '@lucide/vue';
import EmojiReactions from './EmojiReactions.vue';
import { useAuth } from '@/composables/useAuth.js';
import { renderMarkdown } from '@/utils/markdown.js';
import { formatTime, isEdited } from '@/utils/date.js';

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
  return isEdited(props.standup.created_at, props.standup.updated_at);
});

const formattedTime = computed(() => {
  return formatTime(props.standup.updated_at || props.standup.created_at);
});

function isBlockerQuestion(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('blocker') || lower.includes('help from') || lower.includes('impediment');
}

function hasActiveBlocker(answer) {
  if (!answer) return false;
  const cleaned = answer
    .replace(/[*_`#\-]/g, '')
    .trim()
    .toLowerCase();
  if (!cleaned) return false;
  if (['none', 'nil', 'n/a', 'no', 'none!', 'no blockers', 'all clear', 'no blocker', 'nope'].includes(cleaned)) {
    return false;
  }
  return true;
}

function getAnswerCardClass(ans) {
  if (isBlockerQuestion(ans.question_text)) {
    return hasActiveBlocker(ans.answer)
      ? 'bg-amber-50/70 border-amber-200'
      : 'bg-emerald-50/40 border-emerald-100';
  }
  return 'bg-slate-50/70 border-slate-100';
}

function getQuestionHeaderClass(ans) {
  if (isBlockerQuestion(ans.question_text)) {
    return hasActiveBlocker(ans.answer) ? 'text-amber-800' : 'text-emerald-700';
  }
  return 'text-slate-600';
}

function getQuestionIcon(ans, idx) {
  if (isBlockerQuestion(ans.question_text)) {
    return hasActiveBlocker(ans.answer) ? AlertTriangle : ShieldCheck;
  }
  if (idx === 0) return History;
  if (idx === 1) return CheckCircle2;
  return MessageSquare;
}

const hasLegacyBlockers = computed(() => {
  const b = props.standup.blockers?.trim()?.toLowerCase();
  if (!b) return false;
  const cleaned = b.replace(/[*_`#\-]/g, '').trim().toLowerCase();
  if (['none', 'nil', 'n/a', 'no', 'none!', 'no blockers', 'all clear', 'no blocker', 'nope'].includes(cleaned)) {
    return false;
  }
  return true;
});
</script>
