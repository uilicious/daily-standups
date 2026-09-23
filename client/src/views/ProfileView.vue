<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Breadcrumb / Header -->
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Account Profile</h1>
      <p class="text-sm text-slate-500 mt-1">Manage your personal details, avatar photo, and password.</p>
    </div>

    <!-- Feedback Alerts -->
    <div
      v-if="successMessage"
      class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3 text-sm animate-fadeIn"
    >
      <Check class="w-5 h-5 text-emerald-600 flex-shrink-0" />
      <span class="font-medium">{{ successMessage }}</span>
    </div>

    <div
      v-if="errorMessage"
      class="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-3 text-sm animate-fadeIn"
    >
      <AlertCircle class="w-5 h-5 text-rose-600 flex-shrink-0" />
      <span class="font-medium">{{ errorMessage }}</span>
    </div>

    <!-- Schedule & Availability Quick Link -->
    <div class="mb-8 p-4 sm:p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="p-2.5 rounded-2xl bg-indigo-600 text-white">
          <CalendarClock class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900">Work Schedule & Availability</h3>
          <p class="text-xs text-slate-500">Manage your working days and schedule out-of-office days.</p>
        </div>
      </div>
      <router-link
        to="/schedule"
        class="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm"
      >
        <span>Open My Schedule</span>
      </router-link>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-8">
      <!-- Section 1: Display Photo / Avatar -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <Camera class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Profile Photo</h2>
            <p class="text-xs text-slate-500">Pick an animal avatar, upload your own picture, or keep default.</p>
          </div>
        </div>

        <div class="flex flex-col md:flex-row items-center md:items-start gap-8">
          <!-- Current / Preview Avatar -->
          <div class="flex flex-col items-center text-center">
            <div class="relative group">
              <div class="w-28 h-28 rounded-full ring-4 ring-indigo-50 shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                <img
                  :src="previewAvatarUrl"
                  :alt="form.name || 'User'"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-if="isAvatarChanged"
                class="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow"
              >
                New
              </div>
            </div>
            <p class="text-xs font-semibold text-slate-700 mt-3">Live Preview</p>
            <button
              v-if="isAvatarChanged"
              type="button"
              @click="resetAvatarToCurrent"
              class="mt-1 text-xs text-slate-500 hover:text-indigo-600 underline font-medium"
            >
              Undo changes
            </button>
          </div>

          <!-- Avatar Selection Controls -->
          <div class="flex-1 w-full space-y-4">
            <!-- Selector Tabs -->
            <div class="flex border-b border-slate-200">
              <button
                type="button"
                @click="avatarTab = 'animals'"
                class="pb-2.5 px-4 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5"
                :class="avatarTab === 'animals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
              >
                <Sparkles class="w-3.5 h-3.5" />
                <span>Animal Avatars</span>
              </button>
              <button
                type="button"
                @click="avatarTab = 'upload'"
                class="pb-2.5 px-4 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5"
                :class="avatarTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
              <button
                type="button"
                @click="avatarTab = 'dicebear'"
                class="pb-2.5 px-4 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5"
                :class="avatarTab === 'dicebear' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
              >
                <Smile class="w-3.5 h-3.5" />
                <span>Default Dicebear</span>
              </button>
            </div>

            <!-- Tab 1: Animal Avatars Grid -->
            <div v-if="avatarTab === 'animals'" class="pt-2">
              <p class="text-xs text-slate-500 mb-3">Click an animal avatar to choose it:</p>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
                <button
                  v-for="animal in ANIMAL_AVATARS"
                  :key="animal.id"
                  type="button"
                  @click="selectAnimalAvatar(animal)"
                  class="group flex flex-col items-center p-2 rounded-2xl border transition relative"
                  :class="selectedAvatarUrl === animal.dataUrl ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
                >
                  <img
                    :src="animal.dataUrl"
                    :alt="animal.name"
                    class="w-12 h-12 rounded-full transition-transform group-hover:scale-110"
                  />
                  <span class="text-[11px] font-medium text-slate-700 mt-1.5">{{ animal.name }}</span>
                  <div
                    v-if="selectedAvatarUrl === animal.dataUrl"
                    class="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow"
                  >
                    <Check class="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </button>
              </div>
            </div>

            <!-- Tab 2: Upload Photo -->
            <div v-else-if="avatarTab === 'upload'" class="pt-2">
              <p class="text-xs text-slate-500 mb-3">Upload any picture from your device (PNG, JPG, WebP, GIF):</p>
              <div
                @click="triggerFileInput"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                class="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center"
                :class="isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'"
              >
                <div class="p-3 rounded-full bg-slate-100 text-slate-600 mb-2">
                  <Upload class="w-6 h-6" />
                </div>
                <p class="text-sm font-semibold text-slate-800">
                  <span class="text-indigo-600 underline">Click to upload</span> or drag and drop
                </p>
                <p class="text-xs text-slate-400 mt-1">High resolution images will be cropped into a sharp square</p>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileChange"
                />
              </div>
            </div>

            <!-- Tab 3: Default Dicebear -->
            <div v-else-if="avatarTab === 'dicebear'" class="pt-2">
              <p class="text-xs text-slate-500 mb-3">Revert to your standard generated Dicebear avatar:</p>
              <div class="flex items-center space-x-4 p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <img
                  :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.name || user?.name || 'User')}`"
                  alt="Default Dicebear"
                  class="w-14 h-14 rounded-full border border-slate-200 bg-white"
                />
                <div>
                  <p class="text-sm font-bold text-slate-800">Default Seed Avatar</p>
                  <p class="text-xs text-slate-500 mt-0.5">Generates an illustrated persona based on your name.</p>
                  <button
                    type="button"
                    @click="selectDicebearAvatar"
                    class="mt-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  >
                    Use This Avatar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Display Name & Email -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <UserCircle class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Personal Information</h2>
            <p class="text-xs text-slate-500">Update how your name appears to team members across standup feeds.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Display Name -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Display Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium transition"
              placeholder="Your full name"
            />
          </div>

          <!-- Email (Read-Only) -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Email Address
            </label>
            <input
              :value="user?.email"
              disabled
              type="email"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed"
            />
            <p class="text-[11px] text-slate-400 mt-1">Email is tied to your organization account and cannot be modified directly.</p>
          </div>
        </div>

        <!-- Role & Teams summary -->
        <div class="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <div class="flex items-center space-x-2">
            <span class="text-slate-400">System Role:</span>
            <span
              class="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px]"
              :class="user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ user?.role === 'admin' ? 'Admin' : 'Standard' }}
            </span>
          </div>

          <div v-if="user?.teams?.length > 0" class="flex items-center space-x-1.5 flex-wrap">
            <span class="text-slate-400">Your Teams:</span>
            <span
              v-for="t in user.teams"
              :key="t.id"
              class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
            >
              {{ t.name }} <span v-if="t.team_role === 'manager'" class="text-amber-600 font-semibold">(Manager)</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Section 3: Password Update -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Password & Security</h2>
            <p class="text-xs text-slate-500">
              {{ user?.has_password ? 'Change your current account password.' : 'You do not have a password set. Set a new password below.' }}
            </p>
          </div>
        </div>

        <div class="space-y-4 max-w-lg">
          <!-- Current Password (only required if user has a password) -->
          <div v-if="user?.has_password">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Current Password
            </label>
            <div class="relative">
              <input
                v-model="form.current_password"
                :type="showCurrentPassword ? 'text' : 'password'"
                class="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
                placeholder="Enter current password"
              />
              <button
                type="button"
                @click="showCurrentPassword = !showCurrentPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <EyeOff v-if="showCurrentPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              New Password
            </label>
            <div class="relative">
              <input
                v-model="form.new_password"
                :type="showNewPassword ? 'text' : 'password'"
                class="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition"
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <EyeOff v-if="showNewPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Minimum 6 characters.</p>
          </div>

          <!-- Confirm New Password -->
          <div v-if="form.new_password">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div class="relative">
              <input
                v-model="form.confirm_password"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="w-full px-4 py-2.5 pr-10 rounded-xl border focus:outline-none text-sm transition"
                :class="isPasswordMatch ? 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600' : 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'"
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p v-if="!isPasswordMatch && form.confirm_password" class="text-[11px] text-rose-500 mt-1">
              Passwords do not match.
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end space-x-4 pt-4">
        <button
          type="button"
          @click="resetForm"
          :disabled="saving"
          class="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving || !canSubmit"
          class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw v-if="saving" class="w-4 h-4 animate-spin" />
          <span>{{ saving ? 'Saving Changes...' : 'Save Profile Changes' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth.js';
import { ANIMAL_AVATARS } from '@/utils/animalAvatars.js';
import {
  Camera,
  CalendarClock,
  UserCircle,
  KeyRound,
  Check,
  AlertCircle,
  Upload,
  Sparkles,
  Smile,
  Eye,
  EyeOff,
  RefreshCw
} from '@lucide/vue';

const { user, updateProfile } = useAuth();

const avatarTab = ref('animals');
const selectedAvatarUrl = ref('');
const isDragging = ref(false);
const fileInputRef = ref(null);

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const saving = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const form = reactive({
  name: '',
  current_password: '',
  new_password: '',
  confirm_password: ''
});

// Initialize form from current user
function initForm() {
  if (user.value) {
    form.name = user.value.name || '';
    selectedAvatarUrl.value = user.value.avatar_url || '';
    form.current_password = '';
    form.new_password = '';
    form.confirm_password = '';
  }
}

onMounted(() => {
  initForm();
});

watch(user, () => {
  if (!form.name && user.value) {
    initForm();
  }
});

const previewAvatarUrl = computed(() => {
  if (selectedAvatarUrl.value) return selectedAvatarUrl.value;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.name || user.value?.name || 'User')}`;
});

const isAvatarChanged = computed(() => {
  return selectedAvatarUrl.value !== (user.value?.avatar_url || '');
});

const isPasswordMatch = computed(() => {
  if (!form.new_password) return true;
  return form.new_password === form.confirm_password;
});

const canSubmit = computed(() => {
  if (!form.name || !form.name.trim()) return false;
  if (form.new_password) {
    if (form.new_password.length < 6) return false;
    if (form.new_password !== form.confirm_password) return false;
    if (user.value?.has_password && !form.current_password) return false;
  }
  return true;
});

function selectAnimalAvatar(animal) {
  selectedAvatarUrl.value = animal.dataUrl;
}

function selectDicebearAvatar() {
  selectedAvatarUrl.value = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.name || user.value?.name || 'User')}`;
}

function resetAvatarToCurrent() {
  selectedAvatarUrl.value = user.value?.avatar_url || '';
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer.files?.[0];
  if (file && file.type.startsWith('image/')) {
    processImageFile(file);
  }
}

function processImageFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = 'Please choose an image file under 10MB.';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Downscale and center-crop to 256x256 square
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const minDim = Math.min(img.width, img.height);
      const startX = (img.width - minDim) / 2;
      const startY = (img.height - minDim) / 2;

      ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/png');
      selectedAvatarUrl.value = dataUrl;
      errorMessage.value = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetForm() {
  initForm();
  successMessage.value = '';
  errorMessage.value = '';
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!form.name.trim()) {
    errorMessage.value = 'Display name cannot be empty.';
    return;
  }

  if (form.new_password) {
    if (form.new_password.length < 6) {
      errorMessage.value = 'New password must be at least 6 characters.';
      return;
    }
    if (form.new_password !== form.confirm_password) {
      errorMessage.value = 'Passwords do not match.';
      return;
    }
    if (user.value?.has_password && !form.current_password) {
      errorMessage.value = 'Please provide your current password to change it.';
      return;
    }
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim()
    };

    if (selectedAvatarUrl.value !== user.value?.avatar_url) {
      payload.avatar_url = selectedAvatarUrl.value;
    }

    if (form.new_password) {
      payload.new_password = form.new_password;
      if (form.current_password) {
        payload.current_password = form.current_password;
      }
    }

    await updateProfile(payload);

    form.current_password = '';
    form.new_password = '';
    form.confirm_password = '';
    successMessage.value = 'Your profile has been updated successfully!';

    setTimeout(() => {
      successMessage.value = '';
    }, 4000);
  } catch (err) {
    errorMessage.value = err.message || 'Failed to update profile. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>
