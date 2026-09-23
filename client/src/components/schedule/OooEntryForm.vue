<template>
  <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5">
    <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Add Out of Office Dates</h3>

    <!-- Row 1: Start Date and Time of Day -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
        <input
          type="date"
          v-model="form.startDate"
          class="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Time of Day</label>
        <div class="grid grid-cols-3 gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
          <button
            type="button"
            @click="form.period = 'all_day'"
            class="py-2 px-2 text-xs font-semibold rounded-lg transition text-center select-none"
            :class="form.period === 'all_day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
          >
            Whole Day
          </button>
          <button
            type="button"
            @click="form.period = 'morning'"
            class="py-2 px-2 text-xs font-semibold rounded-lg transition text-center select-none"
            :class="form.period === 'morning' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
          >
            Morning
          </button>
          <button
            type="button"
            @click="form.period = 'afternoon'"
            class="py-2 px-2 text-xs font-semibold rounded-lg transition text-center select-none"
            :class="form.period === 'afternoon' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'"
          >
            Afternoon
          </button>
        </div>
      </div>
    </div>

    <!-- Row 2: End Date -->
    <div class="mb-4">
      <label class="block text-xs font-semibold text-slate-700 mb-1.5">
        End Date <span class="font-normal text-slate-400">(optional, for multi-day leave)</span>
      </label>
      <input
        type="date"
        v-model="form.endDate"
        :min="form.startDate"
        class="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
      />
    </div>

    <!-- Row 3: Reason / Note -->
    <div class="mb-4">
      <label class="block text-xs font-semibold text-slate-700 mb-1.5">
        Reason / Note <span class="font-normal text-slate-400">(optional)</span>
      </label>
      <textarea
        v-model="form.reason"
        rows="3"
        placeholder="e.g. Annual leave, family commitment, travelling with limited internet access..."
        class="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y shadow-xs"
      ></textarea>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
      <span class="text-xs text-slate-500">
        <span v-if="dateRangeCount > 1">Adding <strong>{{ dateRangeCount }} days</strong> to your out-of-office schedule.</span>
        <span v-else-if="form.startDate">Adding <strong>1 day</strong> to your out-of-office schedule.</span>
        <span v-else>Select a date or date range to mark as out of office.</span>
      </span>

      <button
        type="button"
        @click="handleSubmit"
        :disabled="!form.startDate || adding"
        class="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition shadow-sm cursor-pointer"
      >
        <Loader2 v-if="adding" class="w-3.5 h-3.5 animate-spin" />
        <PlusCircle v-else class="w-3.5 h-3.5" />
        <span>{{ adding ? 'Adding...' : 'Mark Out of Office' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { PlusCircle, Loader2 } from '@lucide/vue';

const props = defineProps({
  adding: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit']);

const form = ref({
  startDate: '',
  endDate: '',
  period: 'all_day',
  reason: ''
});

// Whenever start date updates, set end date to start date automatically
watch(() => form.value.startDate, (newStart) => {
  if (newStart) {
    if (!form.value.endDate || form.value.endDate < newStart) {
      form.value.endDate = newStart;
    }
  }
});

const dateRangeCount = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return 1;
  const start = new Date(form.value.startDate);
  const end = new Date(form.value.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

function handleSubmit() {
  if (!form.value.startDate) return;
  emit('submit', {
    startDate: form.value.startDate,
    endDate: form.value.endDate || form.value.startDate,
    period: form.value.period || 'all_day',
    reason: form.value.reason || ''
  });
}

function resetForm() {
  form.value.startDate = '';
  form.value.endDate = '';
  form.value.period = 'all_day';
  form.value.reason = '';
}

defineExpose({ resetForm });
</script>
