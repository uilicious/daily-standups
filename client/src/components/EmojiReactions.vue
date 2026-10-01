<template>
  <div class="relative flex items-center flex-wrap gap-1.5" ref="containerRef">
    <!-- Existing Reactions Chips -->
    <div
      v-for="reaction in localReactions"
      :key="reaction.emoji"
      class="relative group"
    >
      <button
        type="button"
        @click="toggleReaction(reaction.emoji)"
        class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs transition border cursor-pointer select-none active:scale-95"
        :class="[
          reaction.has_reacted
            ? 'bg-indigo-50/90 border-indigo-300 text-indigo-700 font-semibold shadow-2xs hover:bg-indigo-100 hover:border-indigo-400'
            : 'bg-slate-50/80 border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800'
        ]"
      >
        <span class="text-sm leading-none">{{ reaction.emoji }}</span>
        <span class="text-xs font-semibold">{{ reaction.count }}</span>
      </button>

      <!-- Immediate Hover Tooltip -->
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
      >
        <div class="bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap text-center max-w-xs">
          <div class="font-semibold text-slate-200 mb-0.5 flex items-center justify-center space-x-1">
            <span>{{ reaction.emoji }}</span>
            <span class="capitalize">{{ getEmojiName(reaction.emoji) }}</span>
          </div>
          <div class="text-slate-300 font-normal">
            {{ formatReactorsList(reaction) }}
          </div>
        </div>
        <!-- Arrow -->
        <div class="w-2 h-2 -mt-1 bg-slate-900 rotate-45"></div>
      </div>
    </div>

    <!-- Add Reaction Button -->
    <div class="relative">
      <button
        ref="buttonRef"
        type="button"
        @click="togglePicker"
        title="Add reaction"
        class="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 transition cursor-pointer active:scale-95"
        :class="{ 'bg-indigo-50 text-indigo-600 border-indigo-300': isPickerOpen }"
      >
        <SmilePlus class="w-3.5 h-3.5" />
      </button>

      <!-- Emoji Picker Popover -->
      <div
        v-if="isPickerOpen"
        ref="popoverRef"
        class="absolute z-50 bottom-full mb-2 left-0 sm:left-auto sm:-translate-x-1/4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 text-slate-800 animate-in fade-in zoom-in-95 duration-100"
      >
        <!-- Popular Quick Palette -->
        <div class="mb-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1 flex items-center justify-between">
            <span>Popular Reactions</span>
            <button
              type="button"
              @click="closePicker"
              class="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="emoji in POPULAR_EMOJIS"
              :key="emoji"
              type="button"
              @click="selectEmoji(emoji)"
              class="h-9 rounded-xl flex items-center justify-center text-xl transition hover:bg-slate-100 hover:scale-110 active:scale-95 cursor-pointer relative"
              :class="hasUserReactedWith(emoji) ? 'bg-indigo-50 border border-indigo-200' : ''"
              :title="getEmojiName(emoji)"
            >
              <span>{{ emoji }}</span>
              <span
                v-if="hasUserReactedWith(emoji)"
                class="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-600"
              ></span>
            </button>
          </div>
        </div>

        <hr class="border-slate-100 my-2" />

        <!-- Search & Custom Emoji Input -->
        <div>
          <div class="relative mb-2">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref="searchInputRef"
              type="text"
              v-model="searchQuery"
              @keydown.enter.prevent="handleEnterKey"
              placeholder="Search or paste emoji..."
              class="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <!-- Custom / Typed Emoji Direct Add Button -->
          <div v-if="directEmojiMatch" class="mb-2">
            <button
              type="button"
              @click="selectEmoji(directEmojiMatch)"
              class="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
            >
              <span>React with custom emoji:</span>
              <span class="text-base leading-none">{{ directEmojiMatch }}</span>
            </button>
          </div>

          <!-- Filtered Emoji Grid -->
          <div class="max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
            <div v-if="filteredEmojis.length > 0" class="grid grid-cols-6 gap-1">
              <button
                v-for="item in filteredEmojis"
                :key="item.emoji"
                type="button"
                @click="selectEmoji(item.emoji)"
                class="h-8 rounded-lg flex items-center justify-center text-lg transition hover:bg-slate-100 hover:scale-110 active:scale-95 cursor-pointer relative"
                :class="hasUserReactedWith(item.emoji) ? 'bg-indigo-50 border border-indigo-200' : ''"
                :title="item.name"
              >
                <span>{{ item.emoji }}</span>
                <span
                  v-if="hasUserReactedWith(item.emoji)"
                  class="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-indigo-600"
                ></span>
              </button>
            </div>
            <div v-else-if="!directEmojiMatch" class="py-3 text-center text-xs text-slate-400">
              No matching emojis found
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { SmilePlus, Search, X } from '@lucide/vue';

const props = defineProps({
  targetType: {
    type: String,
    required: true,
    validator: val => ['post', 'standup'].includes(val)
  },
  targetId: {
    type: Number,
    required: true
  },
  reactions: {
    type: Array,
    default: () => []
  },
  currentUser: {
    type: Object,
    default: () => null
  }
});

const emit = defineEmits(['reactions-updated']);

// Local state for optimistic updates
const localReactions = ref([...props.reactions]);

watch(
  () => props.reactions,
  (newVal) => {
    localReactions.value = Array.isArray(newVal) ? [...newVal] : [];
  },
  { deep: true }
);

const isPickerOpen = ref(false);
const searchQuery = ref('');
const containerRef = ref(null);
const popoverRef = ref(null);
const buttonRef = ref(null);
const searchInputRef = ref(null);
const isSubmitting = ref(false);

const POPULAR_EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀', '👏', '🔥', '💯'];

// Curated emoji list with search keywords
const EMOJI_DICTIONARY = [
  // Popular / Reactions
  { emoji: '👍', name: 'thumbs up', keywords: ['thumbs', 'up', 'like', 'approve', '+1', 'yes'] },
  { emoji: '👎', name: 'thumbs down', keywords: ['thumbs', 'down', 'dislike', '-1', 'no'] },
  { emoji: '❤️', name: 'red heart', keywords: ['heart', 'love', 'like'] },
  { emoji: '🎉', name: 'party popper', keywords: ['tada', 'party', 'celebrate', 'congrats', 'cheers'] },
  { emoji: '🚀', name: 'rocket', keywords: ['rocket', 'launch', 'ship', 'fast', 'speed'] },
  { emoji: '👀', name: 'eyes', keywords: ['eyes', 'look', 'watching', 'see', 'review'] },
  { emoji: '👏', name: 'clapping hands', keywords: ['clap', 'applause', 'bravo', 'kudos'] },
  { emoji: '🔥', name: 'fire', keywords: ['fire', 'hot', 'lit', 'awesome'] },
  { emoji: '💯', name: 'hundred points', keywords: ['100', 'hundred', 'perfect', 'score'] },
  { emoji: '🙌', name: 'raising hands', keywords: ['hands', 'celebrate', 'hooray', 'praise'] },
  { emoji: '✨', name: 'sparkles', keywords: ['sparkle', 'magic', 'clean', 'shiny', 'star'] },
  { emoji: '💡', name: 'light bulb', keywords: ['bulb', 'idea', 'tip', 'smart'] },
  { emoji: '😂', name: 'face with tears of joy', keywords: ['laugh', 'lol', 'haha', 'funny', 'joy'] },
  { emoji: '🤣', name: 'rolling on floor laughing', keywords: ['rofl', 'laugh', 'lol'] },
  { emoji: '😊', name: 'smiling face', keywords: ['smile', 'happy', 'warm'] },
  { emoji: '😍', name: 'heart eyes', keywords: ['love', 'crush', 'heart'] },
  { emoji: '😎', name: 'cool sunglasses', keywords: ['cool', 'sunglasses', 'awesome'] },
  { emoji: '🤔', name: 'thinking face', keywords: ['thinking', 'hmm', 'wonder'] },
  { emoji: '😅', name: 'sweat smile', keywords: ['sweat', 'phew', 'relief', 'nervous'] },
  { emoji: '🥳', name: 'partying face', keywords: ['party', 'birthday', 'celebration'] },
  { emoji: '🤯', name: 'exploding head', keywords: ['mindblown', 'shocked', 'wow'] },
  { emoji: '😭', name: 'loudly crying', keywords: ['cry', 'tears', 'sad', 'sob'] },
  { emoji: '😴', name: 'sleeping face', keywords: ['sleep', 'tired', 'zzz'] },
  { emoji: '🫡', name: 'saluting face', keywords: ['salute', 'respect', 'aye'] },
  { emoji: '🤝', name: 'handshake', keywords: ['handshake', 'deal', 'agree', 'partner'] },
  { emoji: '🙏', name: 'folded hands', keywords: ['pray', 'thanks', 'thank you', 'please'] },
  { emoji: '💪', name: 'flexed biceps', keywords: ['muscle', 'strong', 'flex', 'power'] },
  { emoji: '👋', name: 'waving hand', keywords: ['wave', 'hello', 'hi', 'bye'] },
  { emoji: '✅', name: 'check mark', keywords: ['check', 'done', 'tick', 'complete', 'ok', 'pass'] },
  { emoji: '❌', name: 'cross mark', keywords: ['cross', 'x', 'cancel', 'failed', 'no', 'stop'] },
  { emoji: '⚠️', name: 'warning', keywords: ['warning', 'alert', 'caution'] },
  { emoji: '⭐', name: 'star', keywords: ['star', 'favorite', 'gold'] },
  { emoji: '🎯', name: 'bullseye', keywords: ['target', 'goal', 'bullseye', 'direct'] },
  { emoji: '🏆', name: 'trophy', keywords: ['trophy', 'winner', 'first', 'award'] },
  { emoji: '🥇', name: '1st place medal', keywords: ['gold', 'first', 'medal', 'winner'] },
  { emoji: '☕', name: 'hot beverage', keywords: ['coffee', 'tea', 'break', 'morning'] },
  { emoji: '🍻', name: 'clinking beer mugs', keywords: ['beer', 'cheers', 'drink'] },
  { emoji: '🍕', name: 'pizza', keywords: ['pizza', 'food', 'snack'] },
  { emoji: '🐛', name: 'bug', keywords: ['bug', 'defect', 'issue', 'fix'] },
  { emoji: '🛠️', name: 'hammer and wrench', keywords: ['tools', 'fix', 'build', 'maintain'] },
  { emoji: '📝', name: 'memo', keywords: ['memo', 'note', 'document', 'write'] },
  { emoji: '📦', name: 'package', keywords: ['package', 'box', 'release', 'delivery'] },
  { emoji: '⚡', name: 'high voltage', keywords: ['lightning', 'zap', 'fast', 'electric'] },
  { emoji: '🔒', name: 'locked', keywords: ['lock', 'security', 'private', 'safe'] },
  { emoji: '💬', name: 'speech balloon', keywords: ['chat', 'message', 'comment'] }
];

// Helper to check if string contains unicode emojis
function extractFirstEmoji(str) {
  if (!str) return null;
  const trimmed = str.trim();
  // Regex for unicode emoji
  const match = trimmed.match(/\p{Extended_Pictographic}/u);
  if (match) return match[0];
  return null;
}

const directEmojiMatch = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return null;
  const emoji = extractFirstEmoji(query);
  if (emoji && query === emoji) {
    return emoji;
  }
  return null;
});

const filteredEmojis = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    return EMOJI_DICTIONARY;
  }
  return EMOJI_DICTIONARY.filter(item =>
    item.name.toLowerCase().includes(q) ||
    item.emoji === q ||
    item.keywords.some(k => k.toLowerCase().includes(q))
  );
});

function hasUserReactedWith(emoji) {
  const match = localReactions.value.find(r => r.emoji === emoji);
  return Boolean(match?.has_reacted);
}

function getEmojiName(emoji) {
  const found = EMOJI_DICTIONARY.find(e => e.emoji === emoji);
  return found?.name || emoji;
}

function formatReactorsList(reaction) {
  const users = reaction.users || [];
  if (users.length === 0) return 'No reactions yet';

  const currentUserId = props.currentUser?.id;
  const names = users.map(u => {
    if (currentUserId && u.id === currentUserId) return 'You';
    return u.name || u.username || 'Someone';
  });

  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  if (names.length === 3) {
    return `${names[0]}, ${names[1]}, and ${names[2]}`;
  }
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
}

function getReactionTooltip(reaction) {
  const users = reaction.users || [];
  if (users.length === 0) {
    return `${reaction.emoji} ${reaction.count}`;
  }

  const currentUserId = props.currentUser?.id;
  const names = users.map(u => {
    if (currentUserId && u.id === currentUserId) return 'You';
    return u.name || u.username || 'Someone';
  });

  if (names.length === 1) {
    return `${names[0]} reacted with ${reaction.emoji}`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} reacted with ${reaction.emoji}`;
  }
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''} reacted with ${reaction.emoji}`;
}

function togglePicker() {
  isPickerOpen.value = !isPickerOpen.value;
  if (isPickerOpen.value) {
    searchQuery.value = '';
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
}

function closePicker() {
  isPickerOpen.value = false;
  searchQuery.value = '';
}

function selectEmoji(emoji) {
  closePicker();
  toggleReaction(emoji);
}

function handleEnterKey() {
  if (directEmojiMatch.value) {
    selectEmoji(directEmojiMatch.value);
  } else if (filteredEmojis.value.length > 0) {
    selectEmoji(filteredEmojis.value[0].emoji);
  }
}

async function toggleReaction(emoji) {
  if (isSubmitting.value) return;

  const cleanEmoji = emoji.trim();
  if (!cleanEmoji) return;

  // Snapshot previous state for rollback on failure
  const previousState = JSON.parse(JSON.stringify(localReactions.value));

  // Optimistic UI update
  const currentUserId = props.currentUser?.id;
  const currentUserName = props.currentUser?.name || props.currentUser?.username || 'You';

  // Enforce 1 reaction per target per user:
  // Find if user already has an active reaction on this target
  const activeReactionIdx = localReactions.value.findIndex(r => r.has_reacted);

  if (activeReactionIdx !== -1) {
    const activeReaction = { ...localReactions.value[activeReactionIdx] };
    if (activeReaction.emoji === cleanEmoji) {
      // Toggling off the active emoji
      activeReaction.has_reacted = false;
      activeReaction.count -= 1;
      activeReaction.users = (activeReaction.users || []).filter(u => u.id !== currentUserId);
      if (activeReaction.count <= 0) {
        localReactions.value.splice(activeReactionIdx, 1);
      } else {
        localReactions.value[activeReactionIdx] = activeReaction;
      }
    } else {
      // Switching reaction from active emoji to cleanEmoji
      activeReaction.has_reacted = false;
      activeReaction.count -= 1;
      activeReaction.users = (activeReaction.users || []).filter(u => u.id !== currentUserId);
      if (activeReaction.count <= 0) {
        localReactions.value.splice(activeReactionIdx, 1);
      } else {
        localReactions.value[activeReactionIdx] = activeReaction;
      }

      // Add to new emoji
      const newIdx = localReactions.value.findIndex(r => r.emoji === cleanEmoji);
      if (newIdx !== -1) {
        const nr = { ...localReactions.value[newIdx] };
        nr.has_reacted = true;
        nr.count += 1;
        nr.users = [...(nr.users || []), { id: currentUserId, name: currentUserName }];
        localReactions.value[newIdx] = nr;
      } else {
        localReactions.value.push({
          emoji: cleanEmoji,
          count: 1,
          users: [{ id: currentUserId, name: currentUserName }],
          has_reacted: true
        });
      }
    }
  } else {
    // User had no active reaction: add to cleanEmoji
    const newIdx = localReactions.value.findIndex(r => r.emoji === cleanEmoji);
    if (newIdx !== -1) {
      const nr = { ...localReactions.value[newIdx] };
      nr.has_reacted = true;
      nr.count += 1;
      nr.users = [...(nr.users || []), { id: currentUserId, name: currentUserName }];
      localReactions.value[newIdx] = nr;
    } else {
      localReactions.value.push({
        emoji: cleanEmoji,
        count: 1,
        users: [{ id: currentUserId, name: currentUserName }],
        has_reacted: true
      });
    }
  }

  isSubmitting.value = true;

  try {
    const endpoint = props.targetType === 'post'
      ? `/api/posts/${props.targetId}/reactions`
      : `/api/standups/${props.targetId}/reactions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji: cleanEmoji })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update reaction');
    }

    const data = await res.json();
    if (data && Array.isArray(data.reactions)) {
      localReactions.value = data.reactions;
      emit('reactions-updated', data.reactions);
    }
  } catch (err) {
    console.error('Reaction toggle error:', err);
    // Rollback to previous state
    localReactions.value = previousState;
  } finally {
    isSubmitting.value = false;
  }
}

// Click outside handling
function handleClickOutside(event) {
  if (
    isPickerOpen.value &&
    containerRef.value &&
    !containerRef.value.contains(event.target)
  ) {
    closePicker();
  }
}

// Escape key handling
function handleKeyDown(event) {
  if (event.key === 'Escape' && isPickerOpen.value) {
    closePicker();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
