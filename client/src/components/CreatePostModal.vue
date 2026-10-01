<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
  >
    <div
      class="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 transform transition-all"
    >
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
        <div class="flex items-center space-x-3">
          <div
            class="p-2.5 rounded-2xl"
            :class="isHandoff ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'"
          >
            <ArrowRightLeft v-if="isHandoff" class="w-5 h-5" />
            <MessageSquarePlus v-else class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 leading-tight">
              {{ isEditing ? 'Edit Post' : (isHandoff ? 'Create Hand-off Update' : 'Create Team Post') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Posting to <span class="font-semibold text-slate-700">{{ team?.name }}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="handleClose"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2"
        >
          <AlertCircle class="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Post Type Selector (Segmented buttons) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Post Type
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="postType = 'standard'"
              class="flex flex-col items-start p-3 rounded-2xl border text-left transition-all"
              :class="postType === 'standard' ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'"
            >
              <div class="flex items-center space-x-2">
                <MessageSquare class="w-4 h-4" :class="postType === 'standard' ? 'text-indigo-600' : 'text-slate-400'" />
                <span class="text-xs font-bold" :class="postType === 'standard' ? 'text-indigo-900' : 'text-slate-800'">
                  Standard Update
                </span>
              </div>
              <span class="text-[11px] text-slate-500 mt-1">
                General post for today's feed.
              </span>
            </button>

            <button
              type="button"
              @click="postType = 'handoff'"
              class="flex flex-col items-start p-3 rounded-2xl border text-left transition-all"
              :class="postType === 'handoff' ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'"
            >
              <div class="flex items-center space-x-2">
                <ArrowRightLeft class="w-4 h-4" :class="postType === 'handoff' ? 'text-amber-600' : 'text-slate-400'" />
                <span class="text-xs font-bold" :class="postType === 'handoff' ? 'text-amber-900' : 'text-slate-800'">
                  Hand-off Post
                </span>
              </div>
              <span class="text-[11px] text-slate-500 mt-1">
                Carries over to the next working day.
              </span>
            </button>
          </div>
        </div>

        <!-- Handoff Target Date Configuration (When postType === 'handoff') -->
        <div
          v-if="postType === 'handoff'"
          class="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5 transition-all"
        >
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-amber-900 uppercase tracking-wider">
              Display On Next Working Day
            </label>
            <span class="text-[11px] text-amber-700 font-medium">
              {{ formattedTargetDate }}
            </span>
          </div>

          <div class="flex items-center space-x-2">
            <input
              type="date"
              v-model="targetDate"
              :min="currentDate"
              required
              class="px-3 py-2 text-xs font-medium border border-amber-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
            <span class="text-xs text-amber-800">
              Incoming teammates on this day will see this hand-off at the top of their feed.
            </span>
          </div>
        </div>

        <!-- Title Input (Optional) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Title <span class="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            v-model="title"
            placeholder="e.g. End of Day Handoff, Client Meeting Notes, Deployment Wrap-up"
            class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <!-- Content Markdown Editor -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Post Content <span class="text-rose-500">*</span>
          </label>
          <MarkdownEditor
            v-model="content"
            :placeholder="isHandoff ? 'Write your hand-off update (e.g. what was completed, pending PRs, who to ping, next steps for Monday)...' : 'Share an update with your team (Markdown formatting supported)...'"
            :rows="6"
            :mention-users="members"
            required
          />
        </div>

        <!-- Modal Footer Actions -->
        <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="handleClose"
            :disabled="submitting"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            :disabled="submitting || !content.trim()"
            class="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isHandoff ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            <span>{{ isEditing ? 'Save Changes' : (isHandoff ? 'Publish Hand-off' : 'Publish Post') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  MessageSquarePlus,
  MessageSquare,
  ArrowRightLeft,
  X,
  AlertCircle,
  Loader2
} from '@lucide/vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import {
  calculateNextWorkingDay,
  formatFullDate,
  getLocalDateString
} from '@/utils/schedule.js';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  team: {
    type: Object,
    required: true
  },
  post: {
    type: Object,
    default: null
  },
  currentDate: {
    type: String,
    default: () => getLocalDateString()
  },
  orgWorkDays: {
    type: Array,
    default: () => [1, 2, 3, 4, 5]
  },
  members: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'saved']);

const title = ref('');
const content = ref('');
const postType = ref('standard');
const targetDate = ref('');
const submitting = ref(false);
const errorMessage = ref('');

const isEditing = computed(() => !!props.post?.id);
const isHandoff = computed(() => postType.value === 'handoff');

const formattedTargetDate = computed(() => {
  return targetDate.value ? formatFullDate(targetDate.value) : '';
});

// Watch show and initialize fields
watch(
  () => props.show,
  (val) => {
    if (val) {
      errorMessage.value = '';
      if (props.post) {
        title.value = props.post.title || '';
        content.value = props.post.content || '';
        postType.value = props.post.post_type || 'standard';
        targetDate.value = props.post.target_date || calculateNextWorkingDay(props.currentDate, props.orgWorkDays);
      } else {
        title.value = '';
        content.value = '';
        postType.value = 'standard';
        targetDate.value = calculateNextWorkingDay(props.currentDate, props.orgWorkDays);
      }
    }
  },
  { immediate: true }
);

// When switching to handoff, ensure targetDate is calculated if empty
watch(postType, (newType) => {
  if (newType === 'handoff' && !targetDate.value) {
    targetDate.value = calculateNextWorkingDay(props.currentDate, props.orgWorkDays);
  }
});

function handleClose() {
  emit('close');
}

async function handleSubmit() {
  if (!content.value.trim()) {
    errorMessage.value = 'Content cannot be empty.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  const payload = {
    title: title.value.trim() || null,
    content: content.value.trim(),
    post_type: postType.value,
    target_date: postType.value === 'handoff' ? targetDate.value : null
  };

  try {
    let res;
    if (isEditing.value) {
      res = await fetch(`/api/posts/${props.post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
    } else {
      payload.date = props.currentDate;
      res = await fetch(`/api/teams/${props.team.slug || props.team.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save post');
    }

    const data = await res.json();
    emit('saved', data.post);
    emit('close');
  } catch (err) {
    errorMessage.value = err.message || 'Something went wrong';
  } finally {
    submitting.value = false;
  }
}
</script>
