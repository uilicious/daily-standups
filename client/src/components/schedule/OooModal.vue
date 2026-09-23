<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 overflow-hidden animate-fadeIn">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarOff class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">
              <span v-if="form.startDate && form.endDate && form.startDate !== form.endDate">
                {{ formatFullDate(form.startDate) }} – {{ formatFullDate(form.endDate) }}
              </span>
              <span v-else-if="form.startDate">
                {{ formatFullDate(form.startDate) }}
              </span>
              <span v-else>Out of Office</span>
            </h3>
            <p class="text-xs text-slate-500">
              {{ form.isExisting ? 'Edit out-of-office entry' : 'Set out-of-office dates' }}
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="close"
          class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="space-y-4 mb-6">
        <!-- Start Date & End Date -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              v-model="form.startDate"
              class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              End Date <span class="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              v-model="form.endDate"
              :min="form.startDate"
              class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            />
          </div>
        </div>

        <!-- Time of Day Option -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Time of Day</label>
          <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              @click="form.period = 'all_day'"
              class="py-2 px-2 text-xs font-semibold rounded-lg transition text-center select-none"
              :class="form.period === 'all_day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
            >
              Whole Day
            </button>
            <button
              type="button"
              @click="form.period = 'morning'"
              class="py-2 px-2 text-xs font-semibold rounded-lg transition text-center select-none"
              :class="form.period === 'morning' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
            >
              Morning
            </button>
            <button
              type="button"
              @click="form.period = 'afternoon'"
              class="py-2 px-2 text-xs font-semibold rounded-lg transition text-center select-none"
              :class="form.period === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
            >
              Afternoon
            </button>
          </div>
        </div>

        <!-- Remarks / Notes -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">
            Remarks / Notes <span class="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            v-model="form.reason"
            rows="2"
            placeholder="e.g. Doctor appointment, annual leave, family matter..."
            class="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y shadow-xs"
          ></textarea>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <div>
          <button
            v-if="form.isExisting"
            type="button"
            @click="handleDelete"
            :disabled="saving"
            class="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-40 cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>

        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSave"
            :disabled="!form.startDate || saving"
            class="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-40 shadow-sm cursor-pointer"
          >
            <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ form.isExisting ? 'Update OOO' : 'Save OOO' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { CalendarOff, Trash2, X, Loader2 } from '@lucide/vue';
import { formatFullDate } from '../../utils/schedule.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  entryData: {
    type: Object,
    default: () => ({})
  },
  saving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'save', 'delete']);

const form = ref({
  id: null,
  startDate: '',
  endDate: '',
  period: 'all_day',
  reason: '',
  isExisting: false
});

watch(
  () => props.entryData,
  (newData) => {
    if (newData) {
      form.value = {
        id: newData.id || null,
        startDate: newData.startDate || '',
        endDate: newData.endDate || newData.startDate || '',
        period: newData.period || 'all_day',
        reason: newData.reason || '',
        isExisting: !!newData.isExisting
      };
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => form.value.startDate,
  (newStart) => {
    if (newStart && (!form.value.endDate || form.value.endDate < newStart)) {
      form.value.endDate = newStart;
    }
  }
);

function close() {
  emit('update:modelValue', false);
}

function handleSave() {
  if (!form.value.startDate) return;
  emit('save', {
    id: form.value.id || undefined,
    startDate: form.value.startDate,
    endDate: form.value.endDate || form.value.startDate,
    period: form.value.period || 'all_day',
    reason: form.value.reason || ''
  });
}

function handleDelete() {
  emit('delete', {
    id: form.value.id,
    startDate: form.value.startDate
  });
}
</script>
