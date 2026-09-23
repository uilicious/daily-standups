<template>
  <div>
    <!-- Section Header & Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div class="flex items-center space-x-2">
        <h3 class="text-sm font-bold text-slate-900">Out of Office History</h3>
      </div>

      <!-- Tabs: Scheduled (default) vs Past -->
      <div class="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold select-none self-start sm:self-auto">
        <button
          type="button"
          @click="activeTab = 'scheduled'"
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition"
          :class="activeTab === 'scheduled' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <CalendarClock class="w-3.5 h-3.5" />
          <span>Scheduled</span>
          <span
            class="ml-1 px-1.5 py-0.2 rounded-full text-[10px]"
            :class="activeTab === 'scheduled' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'"
          >
            {{ scheduledEntries.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'past'"
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition"
          :class="activeTab === 'past' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <History class="w-3.5 h-3.5" />
          <span>Past</span>
          <span
            class="ml-1 px-1.5 py-0.2 rounded-full text-[10px]"
            :class="activeTab === 'past' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'"
          >
            {{ pastEntries.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- TAB 1: Scheduled Entries -->
    <div v-if="activeTab === 'scheduled'">
      <!-- Empty State -->
      <div
        v-if="scheduledEntries.length === 0"
        class="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500 bg-slate-50/40"
      >
        <CalendarCheck class="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p class="text-sm font-semibold text-slate-700">No upcoming out-of-office dates scheduled</p>
        <p class="text-xs text-slate-400 mt-0.5">Use the calendar or form above to mark upcoming leaves.</p>
      </div>

      <!-- Scheduled Entries List -->
      <div v-else class="space-y-2">
        <div
          v-for="item in scheduledEntries"
          :key="item.id || item.start_date"
          @click="$emit('edit', item)"
          class="group flex items-center justify-between p-3.5 sm:px-4 rounded-2xl border transition cursor-pointer bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-xs"
        >
          <div class="flex-1 pr-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition">
                <span v-if="item.start_date && item.end_date && item.start_date !== item.end_date">
                  {{ formatFullDate(item.start_date) }} – {{ formatFullDate(item.end_date) }}
                  <span class="text-xs font-normal text-slate-500 ml-1">({{ getEntryDaysCount(item) }} days)</span>
                </span>
                <span v-else>
                  {{ formatFullDate(item.start_date || item.date) }}
                </span>
              </span>

              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
                :class="item.period === 'morning' ? 'bg-sky-50 text-sky-700 border border-sky-200' : item.period === 'afternoon' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600 border border-slate-200'"
              >
                {{ item.period === 'morning' ? 'Morning (AM)' : item.period === 'afternoon' ? 'Afternoon (PM)' : 'Whole Day' }}
              </span>

              <span
                v-if="isEntryToday(item, todayStr)"
                class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                Today
              </span>
              <span
                v-else
                class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200"
              >
                Upcoming
              </span>
            </div>
            <p v-if="item.reason" class="text-xs text-slate-500 mt-1 whitespace-pre-line">{{ item.reason }}</p>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center space-x-1 flex-shrink-0 ml-2">
            <button
              type="button"
              @click.stop="$emit('edit', item)"
              class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
              title="Edit Out of Office"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click.stop="$emit('delete', item)"
              class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              title="Remove Out of Office"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Past Entries (Paginated to 10 entries) -->
    <div v-else-if="activeTab === 'past'">
      <!-- Empty State -->
      <div
        v-if="pastEntries.length === 0"
        class="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500 bg-slate-50/40"
      >
        <CalendarCheck class="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p class="text-sm font-semibold text-slate-700">No past out-of-office history</p>
        <p class="text-xs text-slate-400 mt-0.5">Past leaves and out-of-office periods will be archived here.</p>
      </div>

      <!-- Past Entries List -->
      <div v-else class="space-y-2">
        <div
          v-for="item in paginatedPastEntries"
          :key="item.id || item.start_date"
          @click="$emit('edit', item)"
          class="group flex items-center justify-between p-3.5 sm:px-4 rounded-2xl border transition cursor-pointer bg-slate-50/70 border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-xs"
        >
          <div class="flex-1 pr-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition">
                <span v-if="item.start_date && item.end_date && item.start_date !== item.end_date">
                  {{ formatFullDate(item.start_date) }} – {{ formatFullDate(item.end_date) }}
                  <span class="text-xs font-normal text-slate-400 ml-1">({{ getEntryDaysCount(item) }} days)</span>
                </span>
                <span v-else>
                  {{ formatFullDate(item.start_date || item.date) }}
                </span>
              </span>

              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
                :class="item.period === 'morning' ? 'bg-sky-50 text-sky-600 border border-sky-100' : item.period === 'afternoon' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-200/80 text-slate-500'"
              >
                {{ item.period === 'morning' ? 'Morning (AM)' : item.period === 'afternoon' ? 'Afternoon (PM)' : 'Whole Day' }}
              </span>

              <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/80 text-slate-500">
                Past
              </span>
            </div>
            <p v-if="item.reason" class="text-xs text-slate-400 mt-1 whitespace-pre-line">{{ item.reason }}</p>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center space-x-1 flex-shrink-0 ml-2">
            <button
              type="button"
              @click.stop="$emit('edit', item)"
              class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition cursor-pointer"
              title="Edit Out of Office"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click.stop="$emit('delete', item)"
              class="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition cursor-pointer"
              title="Remove Out of Office"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Pagination Controls for Past Entries -->
        <div
          v-if="pastEntries.length > pageSize"
          class="flex items-center justify-between pt-3 px-1 text-xs text-slate-500"
        >
          <span>
            Showing <strong class="text-slate-700">{{ paginationRangeText }}</strong> of <strong class="text-slate-700">{{ pastEntries.length }}</strong>
          </span>

          <div class="flex items-center space-x-1.5">
            <button
              type="button"
              @click="pastPage--"
              :disabled="pastPage <= 1"
              class="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span class="px-2 py-1 font-semibold text-slate-700">
              {{ pastPage }} / {{ totalPastPages }}
            </span>

            <button
              type="button"
              @click="pastPage++"
              :disabled="pastPage >= totalPastPages"
              class="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
            >
              <span>Next</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  CalendarClock,
  CalendarCheck,
  History,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight
} from '@lucide/vue';
import {
  formatFullDate,
  getEntryDaysCount,
  isPastEntry,
  isEntryToday
} from '../../utils/schedule.js';

const props = defineProps({
  entries: {
    type: Array,
    default: () => []
  },
  todayStr: {
    type: String,
    required: true
  }
});

defineEmits(['edit', 'delete']);

// Active tab: 'scheduled' (default) or 'past'
const activeTab = ref('scheduled');

// Scheduled (active/upcoming) entries: end_date >= today
const scheduledEntries = computed(() => {
  return props.entries
    .filter(item => !isPastEntry(item, props.todayStr))
    .sort((a, b) => {
      const dateA = a.start_date || a.date || '';
      const dateB = b.start_date || b.date || '';
      return dateA.localeCompare(dateB); // chronological: nearest upcoming first
    });
});

// Past entries: end_date < today
const pastEntries = computed(() => {
  return props.entries
    .filter(item => isPastEntry(item, props.todayStr))
    .sort((a, b) => {
      const dateA = a.end_date || a.start_date || a.date || '';
      const dateB = b.end_date || b.start_date || b.date || '';
      return dateB.localeCompare(dateA); // most recent past first
    });
});

// Pagination for past entries: 10 per page
const pageSize = 10;
const pastPage = ref(1);

const totalPastPages = computed(() => {
  return Math.max(1, Math.ceil(pastEntries.value.length / pageSize));
});

const paginatedPastEntries = computed(() => {
  const start = (pastPage.value - 1) * pageSize;
  return pastEntries.value.slice(start, start + pageSize);
});

const paginationRangeText = computed(() => {
  const total = pastEntries.value.length;
  if (total === 0) return '0';
  const start = (pastPage.value - 1) * pageSize + 1;
  const end = Math.min(pastPage.value * pageSize, total);
  return `${start}–${end}`;
});
</script>
