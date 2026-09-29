<template>
  <div class="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200">
        <CalendarCheck class="w-7 h-7" />
      </div>
      <h2 class="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
        Sign in to DailyStandup
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        Morning synchronizations made simple and organized.
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 sm:px-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
          <AlertCircle class="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 1. Google SSO Button -->
        <div>
          <button
            @click="handleGoogleLogin"
            :disabled="googleLoading"
            class="w-full flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
          >
            <!-- Google SVG Icon -->
            <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>
          <p v-if="googleConfigMessage" class="text-[11px] text-amber-600 mt-1.5 text-center">
            {{ googleConfigMessage }}
          </p>
        </div>

        <!-- Divider -->
        <div class="relative flex items-center justify-center">
          <div class="border-t border-slate-200 w-full"></div>
          <span class="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Or with password</span>
          <div class="border-t border-slate-200 w-full"></div>
        </div>

        <!-- 2. Password Login Form -->
        <form @submit.prevent="handlePasswordLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              v-model="email"
              required
              autocomplete="email"
              placeholder="name@company.com"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              v-model="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-100 flex items-center justify-center space-x-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import { CalendarCheck, AlertCircle, Loader2 } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const errorMessage = ref('');
const googleConfigMessage = ref('');

async function handlePasswordLogin() {
  errorMessage.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    const redirect = route.query.redirect || '/';
    router.push(redirect);
  } catch (err) {
    errorMessage.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  googleLoading.value = true;
  googleConfigMessage.value = '';
  try {
    const res = await fetch('/api/auth/google/url');
    const data = await res.json();
    if (data.configured && data.url) {
      window.location.href = data.url;
    } else {
      googleConfigMessage.value = data.message || 'Google OAuth is not configured on this server.';
    }
  } catch (err) {
    googleConfigMessage.value = 'Error initiating Google login: ' + err.message;
  } finally {
    googleLoading.value = false;
  }
}

onMounted(() => {
  if (route.query.error) {
    errorMessage.value = route.query.error;
  }
});
</script>
