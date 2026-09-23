<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center space-x-3 mb-2">
        <div class="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
          <CalendarClock class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Schedule</h1>
          <p class="text-sm text-slate-500 mt-0.5">Manage your usual working schedule and mark out-of-office days.</p>
        </div>
      </div>
    </div>

    <!-- Feedback Alerts -->
    <div
      v-if="successMessage"
      class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm animate-fadeIn"
    >
      <div class="flex items-center space-x-3">
        <CheckCircle2 class="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span class="font-medium">{{ successMessage }}</span>
      </div>
      <button
        @click="successMessage = ''"
        class="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:underline cursor-pointer"
      >
        Dismiss
      </button>
    </div>

    <div
      v-if="errorMessage"
      class="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm animate-fadeIn"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-rose-600 flex-shrink-0" />
        <span class="font-medium">{{ errorMessage }}</span>
      </div>
      <button
        @click="errorMessage = ''"
        class="text-xs font-bold uppercase tracking-wider text-rose-700 hover:underline cursor-pointer"
      >
        Dismiss
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-600 mb-3" />
      <p class="text-sm">Loading your schedule...</p>
    </div>

    <div v-else class="space-y-8">
      <!-- Section 1: Usual Working Schedule -->
      <WeeklyScheduleCard
        v-model:selected-days="selectedDays"
        :saving="savingSchedule"
        @save="saveWorkingDays"
      />

      <!-- Section 2: Out of Office (OOO) Days -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
        <div class="flex items-center space-x-3">
          <div class="p-2 rounded-xl bg-amber-50 text-amber-600">
            <CalendarOff class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Out of Office Days</h2>
            <p class="text-xs text-slate-500">Mark specific dates you will be away. Team feeds will gray out your face on these days.</p>
          </div>
        </div>

        <!-- 1. Interactive Monthly Calendar View -->
        <ScheduleCalendar
          :ooo-entries="oooDays"
          :selected-days="selectedDays"
          :today-str="todayStr"
          @cell-click="handleCalendarCellClick"
        />

        <!-- 2. Add OOO Entry Form -->
        <OooEntryForm
          ref="oooFormRef"
          :adding="addingOoo"
          @submit="handleAddOooSubmit"
        />

        <!-- 3. Scheduled OOO Days List with Tabs (Scheduled & Past with Pagination) -->
        <OooEntriesList
          :entries="oooDays"
          :today-str="todayStr"
          @edit="openEditModal"
          @delete="handleDeleteOoo"
        />
      </div>
    </div>

    <!-- Calendar Date Quick Edit Modal -->
    <OooModal
      v-model="calendarModalOpen"
      :entry-data="calendarModalForm"
      :saving="savingCalendarModal"
      @save="saveCalendarModal"
      @delete="deleteFromCalendarModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  CalendarClock,
  CalendarOff,
  CheckCircle2,
  AlertCircle,
  Loader2
} from '@lucide/vue';

import WeeklyScheduleCard from '../components/schedule/WeeklyScheduleCard.vue';
import ScheduleCalendar from '../components/schedule/ScheduleCalendar.vue';
import OooEntryForm from '../components/schedule/OooEntryForm.vue';
import OooEntriesList from '../components/schedule/OooEntriesList.vue';
import OooModal from '../components/schedule/OooModal.vue';

import { getLocalDateString } from '../utils/schedule.js';

const todayStr = getLocalDateString();

// State
const loading = ref(true);
const savingSchedule = ref(false);
const addingOoo = ref(false);
const savingCalendarModal = ref(false);

const successMessage = ref('');
const errorMessage = ref('');

const selectedDays = ref([1, 2, 3, 4, 5]);
const oooDays = ref([]);

const oooFormRef = ref(null);

// Modal state
const calendarModalOpen = ref(false);
const calendarModalForm = ref({
  id: null,
  startDate: '',
  endDate: '',
  period: 'all_day',
  reason: '',
  isExisting: false
});

// Fetch user schedule & OOO entries
async function fetchSchedule() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch('/api/schedule/me', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to load schedule');
    }
    const data = await res.json();
    selectedDays.value = data.work_days || [1, 2, 3, 4, 5];
    oooDays.value = data.ooo_entries || data.ooo_days || [];
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Save working days
async function saveWorkingDays() {
  savingSchedule.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/schedule/me/workdays', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ work_days: selectedDays.value })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save working schedule');
    }

    const data = await res.json();
    selectedDays.value = data.work_days;
    successMessage.value = 'Working schedule saved successfully.';
    setTimeout(() => {
      if (successMessage.value === 'Working schedule saved successfully.') {
        successMessage.value = '';
      }
    }, 3000);
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    savingSchedule.value = false;
  }
}

// Add Out of Office Dates from Form
async function handleAddOooSubmit(payload) {
  addingOoo.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const res = await fetch('/api/schedule/me/ooo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to add out of office');
    }

    const data = await res.json();
    oooDays.value = data.ooo_entries || data.ooo_days || [];
    oooFormRef.value?.resetForm();

    successMessage.value = 'Out of office schedule updated successfully.';
    setTimeout(() => {
      if (successMessage.value === 'Out of office schedule updated successfully.') {
        successMessage.value = '';
      }
    }, 4000);
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    addingOoo.value = false;
  }
}

// Delete OOO entry from list
async function handleDeleteOoo(item) {
  errorMessage.value = '';
  try {
    let res;
    if (item.id) {
      res = await fetch(`/api/schedule/me/ooo/${item.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } else {
      const targetDate = item.start_date || item.date;
      res = await fetch(`/api/schedule/me/ooo/date/${targetDate}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    }

    if (!res.ok) {
      throw new Error('Failed to delete out of office entry');
    }

    const data = await res.json();
    oooDays.value = data.ooo_entries || data.ooo_days || [];
    successMessage.value = 'Removed out of office entry.';
    setTimeout(() => {
      if (successMessage.value === 'Removed out of office entry.') {
        successMessage.value = '';
      }
    }, 3000);
  } catch (err) {
    errorMessage.value = err.message;
  }
}

// Open modal from calendar cell click
function handleCalendarCellClick(cell) {
  if (cell.isOoo && cell.oooEntry) {
    calendarModalForm.value = {
      id: cell.oooEntry.id || null,
      startDate: cell.oooEntry.start_date || cell.oooEntry.date,
      endDate: cell.oooEntry.end_date || cell.oooEntry.start_date || cell.oooEntry.date,
      period: cell.oooEntry.period || 'all_day',
      reason: cell.oooEntry.reason || '',
      isExisting: true
    };
  } else {
    calendarModalForm.value = {
      id: null,
      startDate: cell.dateStr,
      endDate: cell.dateStr,
      period: 'all_day',
      reason: '',
      isExisting: false
    };
  }
  calendarModalOpen.value = true;
}

// Open modal from list item edit click
function openEditModal(item) {
  calendarModalForm.value = {
    id: item.id || null,
    startDate: item.start_date || item.date,
    endDate: item.end_date || item.start_date || item.date,
    period: item.period || 'all_day',
    reason: item.reason || '',
    isExisting: true
  };
  calendarModalOpen.value = true;
}

// Save modal
async function saveCalendarModal(payload) {
  savingCalendarModal.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch('/api/schedule/me/ooo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save out of office');
    }

    const data = await res.json();
    oooDays.value = data.ooo_entries || data.ooo_days || [];
    calendarModalOpen.value = false;
    successMessage.value = 'Out of office schedule updated successfully.';
    setTimeout(() => {
      if (successMessage.value === 'Out of office schedule updated successfully.') {
        successMessage.value = '';
      }
    }, 3000);
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    savingCalendarModal.value = false;
  }
}

// Delete modal
async function deleteFromCalendarModal({ id, startDate }) {
  savingCalendarModal.value = true;
  errorMessage.value = '';
  try {
    let res;
    if (id) {
      res = await fetch(`/api/schedule/me/ooo/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } else {
      res = await fetch(`/api/schedule/me/ooo/date/${startDate}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    }

    if (!res.ok) {
      throw new Error('Failed to remove out of office');
    }

    const data = await res.json();
    oooDays.value = data.ooo_entries || data.ooo_days || [];
    calendarModalOpen.value = false;
    successMessage.value = 'Removed out of office entry.';
    setTimeout(() => {
      if (successMessage.value === 'Removed out of office entry.') {
        successMessage.value = '';
      }
    }, 3000);
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    savingCalendarModal.value = false;
  }
}

onMounted(() => {
  fetchSchedule();
});
</script>
