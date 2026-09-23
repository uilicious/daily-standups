<template>
  <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div class="flex items-center space-x-3">
        <div class="p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <CalendarDays class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-900">Usual Working Schedule</h2>
          <p class="text-xs text-slate-500">Select which days of the week you usually work. Defaults to weekdays.</p>
        </div>
      </div>

      <!-- Presets -->
      <div class="flex items-center space-x-2">
        <button
          type="button"
          @click="setPreset('weekdays')"
          class="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          Weekdays (Mon-Fri)
        </button>
        <button
          type="button"
          @click="setPreset('all')"
          class="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          All 7 Days
        </button>
        <button
          type="button"
          @click="setPreset('clear')"
          class="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Days Selector Cards (Mon to Sun) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
      <button
        v-for="day in weekDays"
        :key="day.id"
        type="button"
        @click="toggleDay(day.id)"
        class="flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer select-none"
        :class="isDaySelected(day.id)
          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm ring-2 ring-indigo-600/20'
          : 'border-slate-200 bg-slate-50/60 text-slate-500 hover:bg-slate-100 hover:border-slate-300'"
      >
        <span class="text-xs font-bold uppercase tracking-wider" :class="isDaySelected(day.id) ? 'text-indigo-600' : 'text-slate-400'">
          {{ day.short }}
        </span>
        <span class="text-sm font-semibold mt-1">
          {{ day.name }}
        </span>
        <div class="mt-2.5">
          <span
            v-if="isDaySelected(day.id)"
            class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white"
          >
            <Check class="w-3 h-3" />
            <span>Working</span>
          </span>
          <span
            v-else
            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/80 text-slate-500"
          >
            Off
          </span>
        </div>
      </button>
    </div>

    <!-- Summary & Save Button -->
    <div class="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
      <p class="text-xs text-slate-500">
        Currently working <span class="font-bold text-slate-800">{{ selectedDays.length }}</span> {{ selectedDays.length === 1 ? 'day' : 'days' }} per week.
        {{ selectedDays.length === 0 ? ' (You will be marked as not working on all days)' : '' }}
      </p>

      <button
        type="button"
        @click="$emit('save')"
        :disabled="saving"
        class="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-100"
      >
        <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
        <Save v-else class="w-4 h-4" />
        <span>{{ saving ? 'Saving...' : 'Save Schedule' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { CalendarDays, Check, Save, Loader2 } from '@lucide/vue';
import { WEEKDAYS } from '../../utils/schedule.js';

const props = defineProps({
  selectedDays: {
    type: Array,
    default: () => [1, 2, 3, 4, 5]
  },
  saving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:selectedDays', 'save']);

const weekDays = WEEKDAYS;

function isDaySelected(dayId) {
  return props.selectedDays.includes(dayId);
}

function toggleDay(dayId) {
  let updated;
  if (props.selectedDays.includes(dayId)) {
    updated = props.selectedDays.filter(d => d !== dayId);
  } else {
    updated = [...props.selectedDays, dayId].sort((a, b) => a - b);
  }
  emit('update:selectedDays', updated);
}

function setPreset(type) {
  if (type === 'weekdays') {
    emit('update:selectedDays', [1, 2, 3, 4, 5]);
  } else if (type === 'all') {
    emit('update:selectedDays', [1, 2, 3, 4, 5, 6, 7]);
  } else if (type === 'clear') {
    emit('update:selectedDays', []);
  }
}
</script>
