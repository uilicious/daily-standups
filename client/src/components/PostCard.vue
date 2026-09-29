<template>
  <div
    class="bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all p-5 sm:p-6 space-y-4"
    :class="cardBorderClass"
  >
    <!-- Incoming Handoff Alert Header Banner -->
    <div
      v-if="post.is_incoming_handoff"
      class="flex items-center space-x-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 -mt-1"
    >
      <ArrowRightLeft class="w-4 h-4 text-amber-600 flex-shrink-0" />
      <span>
        Incoming hand-off from {{ formattedOriginalDate }} for today's shift
      </span>
    </div>

    <!-- Header: User info, badges, time, edit/delete -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center space-x-3.5">
        <img
          :src="post.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_name || post.user_email}`"
          :alt="post.user_name"
          class="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 object-cover flex-shrink-0"
        />
        <div>
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 class="font-semibold text-slate-900 text-sm sm:text-base leading-tight">
              {{ post.user_name }}
            </h3>

            <!-- Admin / Manager badge if present -->
            <span
              v-if="post.user_role === 'admin'"
              class="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
            >
              Admin
            </span>

            <!-- Post Type Badge -->
            <span
              v-if="post.post_type === 'handoff'"
              class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"
            >
              <ArrowRightLeft class="w-3 h-3 text-amber-600" />
              <span>Hand-off Update</span>
            </span>
            <span
              v-else
              class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              <MessageSquare class="w-3 h-3 text-slate-500" />
              <span>Update</span>
            </span>
          </div>

          <p class="text-xs text-slate-500 mt-0.5">{{ post.user_email }}</p>
        </div>
      </div>

      <!-- Timestamp & Actions -->
      <div class="flex items-center space-x-2 text-right flex-shrink-0">
        <div class="text-xs text-slate-400">
          <span>{{ formattedTimestamp }}</span>
          <span v-if="wasUpdated" class="text-slate-400 ml-1 text-[11px]">(edited)</span>
        </div>

        <div v-if="canManage" class="flex items-center space-x-1 ml-2">
          <button
            @click="$emit('edit', post)"
            title="Edit post"
            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition"
          >
            Edit
          </button>
          <button
            @click="$emit('delete', post)"
            title="Delete post"
            class="text-xs text-rose-600 hover:text-rose-800 font-medium p-1 rounded-lg hover:bg-rose-50 transition"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Optional Title -->
    <div v-if="post.title" class="pt-1">
      <h4 class="text-base font-bold text-slate-900 leading-snug">
        {{ post.title }}
      </h4>
    </div>

    <!-- Markdown Content Body -->
    <div
      class="text-sm text-slate-800 leading-relaxed markdown-content pl-0.5"
      v-html="renderedHtml"
    ></div>

    <!-- Target Date Footer for Handoff Posts -->
    <div
      v-if="post.post_type === 'handoff' && !post.is_incoming_handoff"
      class="text-xs text-slate-400 flex items-center space-x-1.5 pt-2 border-t border-slate-100"
    >
      <Calendar class="w-3.5 h-3.5 text-slate-400" />
      <span>
        Featured for next working day: <strong class="text-slate-600">{{ formattedTargetDate }}</strong>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ArrowRightLeft, MessageSquare, Trash2, Calendar } from '@lucide/vue';
import { renderMarkdown } from '@/utils/markdown.js';
import { formatFullDate } from '@/utils/schedule.js';

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    default: () => ({})
  },
  isTeamManager: {
    type: Boolean,
    default: false
  }
});

defineEmits(['edit', 'delete']);

const cardBorderClass = computed(() => {
  if (props.post.is_incoming_handoff) {
    return 'border-amber-300 bg-linear-to-b from-amber-50/20 to-white';
  }
  if (props.post.post_type === 'handoff') {
    return 'border-amber-200/80';
  }
  return 'border-slate-200';
});

const canManage = computed(() => {
  if (!props.currentUser || !props.currentUser.id) return false;
  if (props.currentUser.role === 'admin') return true;
  if (props.isTeamManager) return true;
  return props.post.user_id === props.currentUser.id;
});

const renderedHtml = computed(() => {
  return renderMarkdown(props.post.content || '');
});

const wasUpdated = computed(() => {
  if (!props.post.created_at || !props.post.updated_at) return false;
  const created = new Date(props.post.created_at).getTime();
  const updated = new Date(props.post.updated_at).getTime();
  return updated - created > 60000; // >1 minute difference
});

const formattedTimestamp = computed(() => {
  if (!props.post.created_at) return '';
  try {
    const d = new Date(props.post.created_at);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
});

const formattedOriginalDate = computed(() => {
  return formatFullDate(props.post.date);
});

const formattedTargetDate = computed(() => {
  return formatFullDate(props.post.target_date);
});
</script>
