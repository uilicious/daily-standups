<template>
  <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white">
    <!-- Header with Month Title and Navigation -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <h3 class="text-sm font-bold text-slate-900">{{ calendarMonthTitle }}</h3>
        <span class="text-xs text-slate-400">Click any date to set Out of Office</span>
      </div>
      <div class="flex items-center space-x-1">
        <button
          type="button"
          @click="changeCalendarMonth(-1)"
          class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          title="Previous Month"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="resetCalendarToCurrentMonth"
          class="px-2 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
        >
          Today
        </button>
        <button
          type="button"
          @click="changeCalendarMonth(1)"
          class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          title="Next Month"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1.5 sm:gap-2">
      <!-- Day Headers: Mon - Sun -->
      <div
        v-for="d in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
        :key="d"
        class="text-center text-[11px] font-bold text-slate-400 py-1"
      >
        {{ d }}
      </div>

      <!-- Calendar Cells -->
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        class="aspect-square sm:aspect-auto sm:min-h-[58px] p-1.5 rounded-xl border flex flex-col justify-between transition-all select-none"
        :class="getCellClasses(cell)"
        @click="$emit('cell-click', cell)"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-semibold leading-none"
            :class="cell.isToday ? 'px-1.5 py-0.5 rounded-full bg-indigo-600 text-white' : ''"
          >
            {{ cell.dayNumber }}
          </span>
          <span
            v-if="cell.isOoo"
            class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-tight"
            :class="cell.oooPeriod === 'morning' ? 'bg-sky-500' : cell.oooPeriod === 'afternoon' ? 'bg-orange-500' : 'bg-amber-500'"
          >
            {{ cell.oooPeriod === 'morning' ? 'AM' : cell.oooPeriod === 'afternoon' ? 'PM' : 'OOO' }}
          </span>
        </div>

        <!-- Sub-label in cell -->
        <div class="text-[10px] truncate hidden sm:block">
          <span
            v-if="cell.isOoo"
            class="font-medium truncate block"
            :class="cell.oooPeriod === 'morning' ? 'text-sky-700' : cell.oooPeriod === 'afternoon' ? 'text-orange-700' : 'text-amber-700'"
          >
            {{ cell.oooReason || (cell.oooPeriod === 'morning' ? 'Morning off' : cell.oooPeriod === 'afternoon' ? 'Afternoon off' : 'Away') }}
          </span>
          <span v-else-if="!cell.isWorkingDay" class="text-slate-400 text-[9px]">
            Scheduled off
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { getLocalDateString } from '../../utils/schedule.js';

const props = defineProps({
  oooEntries: {
    type: Array,
    default: () => []
  },
  selectedDays: {
    type: Array,
    default: () => [1, 2, 3, 4, 5]
  },
  todayStr: {
    type: String,
    default: () => getLocalDateString()
  }
});

defineEmits(['cell-click']);

const today = new Date();
const calendarYear = ref(today.getFullYear());
const calendarMonth = ref(today.getMonth()); // 0-indexed

const calendarMonthTitle = computed(() => {
  const dt = new Date(calendarYear.value, calendarMonth.value, 1);
  return dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
});

function changeCalendarMonth(offset) {
  let newMonth = calendarMonth.value + offset;
  let newYear = calendarYear.value;
  if (newMonth < 0) {
    newMonth = 11;
    newYear -= 1;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear += 1;
  }
  calendarMonth.value = newMonth;
  calendarYear.value = newYear;
}

function resetCalendarToCurrentMonth() {
  const now = new Date();
  calendarYear.value = now.getFullYear();
  calendarMonth.value = now.getMonth();
}

function getCellOooInfo(dateStr) {
  const oooEntry = props.oooEntries.find(o => {
    const start = o.start_date || o.date;
    const end = o.end_date || o.start_date || o.date;
    return start <= dateStr && end >= dateStr;
  });

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dt.getUTCDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  const isWorkingDay = props.selectedDays.includes(isoDay);

  return {
    isOoo: !!oooEntry,
    oooPeriod: oooEntry ? (oooEntry.period || 'all_day') : 'all_day',
    oooReason: oooEntry?.reason || '',
    oooId: oooEntry?.id || null,
    oooEntry: oooEntry || null,
    isWorkingDay
  };
}

const calendarCells = computed(() => {
  const year = calendarYear.value;
  const month = calendarMonth.value;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const numDays = lastDay.getDate();

  // JavaScript getDay(): 0 is Sunday, 1 is Monday... 6 is Saturday
  // We want Monday = 0, Sunday = 6
  let firstDayOfWeek = firstDay.getDay() - 1;
  if (firstDayOfWeek === -1) firstDayOfWeek = 6;

  const cells = [];

  // Previous month trailing days
  if (firstDayOfWeek > 0) {
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === props.todayStr,
        ...getCellOooInfo(dateStr)
      });
    }
  }

  // Current month days
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === props.todayStr,
      ...getCellOooInfo(dateStr)
    });
  }

  // Next month leading days to fill grid (multiple of 7)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === props.todayStr,
        ...getCellOooInfo(dateStr)
      });
    }
  }

  return cells;
});

function getCellClasses(cell) {
  if (!cell.isCurrentMonth) {
    return 'opacity-30 border-transparent bg-slate-50/50 cursor-pointer';
  }
  if (cell.isOoo) {
    if (cell.oooPeriod === 'morning') {
      return 'border-sky-300 bg-sky-50/90 hover:bg-sky-100/80 cursor-pointer shadow-sm';
    }
    if (cell.oooPeriod === 'afternoon') {
      return 'border-orange-300 bg-orange-50/90 hover:bg-orange-100/80 cursor-pointer shadow-sm';
    }
    return 'border-amber-300 bg-amber-50/90 hover:bg-amber-100/80 cursor-pointer shadow-sm';
  }
  if (cell.isToday) {
    return 'border-indigo-300 bg-indigo-50/30 hover:bg-indigo-50/60 cursor-pointer';
  }
  if (!cell.isWorkingDay) {
    return 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer text-slate-400';
  }
  return 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-slate-700';
}
</script>
