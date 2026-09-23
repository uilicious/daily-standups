import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';

import TeamFeedView from '@/views/TeamFeedView.vue';
import SubmitStandupView from '@/views/SubmitStandupView.vue';
import AdminView from '@/views/AdminView.vue';
import LoginView from '@/views/LoginView.vue';
import NoTeamsView from '@/views/NoTeamsView.vue';
import ProfileView from '@/views/ProfileView.vue';
import ScheduleView from '@/views/ScheduleView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    meta: { requiresAuth: true }
  },
  {
    path: '/team/:slug',
    name: 'TeamFeed',
    component: TeamFeedView,
    meta: { requiresAuth: true }
  },
  {
    path: '/submit',
    name: 'SubmitStandup',
    component: SubmitStandupView,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/schedule',
    name: 'Schedule',
    component: ScheduleView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/no-teams',
    name: 'NoTeams',
    component: NoTeamsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const { user, initialized, fetchUser } = useAuth();

  if (!initialized.value) {
    await fetchUser();
  }

  const isAuth = !!user.value;
  const isAdmin = user.value?.role === 'admin';
  const isManager = (user.value?.teams || []).some(t => t.team_role === 'manager');
  const canManage = isAdmin || isManager;

  if (to.meta.guestOnly && isAuth) {
    return next('/');
  }

  if (to.meta.requiresAuth && !isAuth) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  if (to.meta.requiresAdmin && !canManage) {
    return next('/');
  }

  // Handle Home route `/`: redirect to the user's first assigned team
  if (to.path === '/' && isAuth) {
    const teams = user.value?.teams || [];
    if (teams.length > 0) {
      return next(`/team/${teams[0].slug}`);
    } else {
      return next('/no-teams');
    }
  }

  next();
});

export default router;
