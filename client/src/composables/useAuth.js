import { ref, computed } from 'vue';

const user = ref(null);
const loading = ref(true);
const initialized = ref(false);

export function useAuth() {
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isManager = computed(() => (user.value?.teams || []).some(t => t.team_role === 'manager'));
  const canManage = computed(() => isAdmin.value || isManager.value);
  const isAuthenticated = computed(() => !!user.value);
  const userTeams = computed(() => user.value?.teams || []);

  async function fetchUser() {
    loading.value = true;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        user.value = data.user;
      } else {
        user.value = null;
      }
    } catch (err) {
      user.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
    return user.value;
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    user.value = data.user;
    return data.user;
  }

  async function devLogin(email) {
    const res = await fetch('/api/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Dev login failed');
    }

    user.value = data.user;
    return data.user;
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      user.value = null;
    }
  }

  return {
    user,
    loading,
    initialized,
    isAdmin,
    isManager,
    canManage,
    isAuthenticated,
    userTeams,
    fetchUser,
    login,
    devLogin,
    logout
  };
}
