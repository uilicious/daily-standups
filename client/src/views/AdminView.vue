<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <ShieldCheck class="w-7 h-7 text-indigo-600" />
          <span>Admin</span>
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ isAdmin ? 'Manage user accounts, teams, standup questions, and team members.' : 'Manage your team members and customize standup questions.' }}
        </p>
      </div>

      <!-- Tab Switcher (Admins see Users and Teams tabs; Managers focus on Teams) -->
      <div v-if="isAdmin" class="flex items-center space-x-2 bg-slate-200/70 p-1 rounded-xl self-start">
        <button
          @click="activeTab = 'users'"
          class="px-4 py-1.5 rounded-lg text-sm font-semibold transition"
          :class="activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        >
          Users ({{ users.length }})
        </button>
        <button
          @click="activeTab = 'teams'"
          class="px-4 py-1.5 rounded-lg text-sm font-semibold transition"
          :class="activeTab === 'teams' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        >
          Teams ({{ teams.length }})
        </button>
        <button
          @click="activeTab = 'settings'"
          class="px-4 py-1.5 rounded-lg text-sm font-semibold transition"
          :class="activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        >
          Organization
        </button>
      </div>
    </div>

    <!-- Notification Alert -->
    <div v-if="alertMessage" class="mb-6 p-4 rounded-xl flex items-center justify-between text-sm" :class="alertType === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'">
      <div class="flex items-center space-x-2">
        <AlertCircle v-if="alertType === 'error'" class="w-5 h-5 text-rose-600" />
        <CheckCircle2 v-else class="w-5 h-5 text-emerald-600" />
        <span>{{ alertMessage }}</span>
      </div>
      <button @click="alertMessage = ''" class="text-xs font-bold uppercase tracking-wider hover:underline">Dismiss</button>
    </div>

    <!-- TAB 1: USERS (Admin Only) -->
    <div v-if="activeTab === 'users' && isAdmin" class="space-y-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Search bar -->
        <div class="relative w-full sm:w-72">
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            v-model="userSearch"
            placeholder="Search users..."
            class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <!-- Add User Button -->
        <button
          @click="openAddUserModal"
          class="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm w-full sm:w-auto justify-center"
        >
          <UserPlus class="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="py-3.5 px-6">User</th>
                <th class="py-3.5 px-6">Username</th>
                <th class="py-3.5 px-6">Role</th>
                <th class="py-3.5 px-6">Assigned Teams</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-slate-50/60 transition">
                <td class="py-4 px-6">
                  <div class="flex items-center space-x-3">
                    <img
                      :src="u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`"
                      :alt="u.name"
                      class="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 object-cover flex-shrink-0"
                    />
                    <div>
                      <p class="font-semibold text-slate-900 leading-tight">{{ u.name }}</p>
                      <p v-if="u.email" class="text-xs text-slate-500 mt-0.5">{{ u.email }}</p>
                      <p v-else class="text-xs text-slate-400 italic mt-0.5">No email configured</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <span class="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-medium">@{{ u.username }}</span>
                </td>
                <td class="py-4 px-6">
                  <span
                    class="px-2.5 py-1 rounded-full text-xs font-semibold"
                    :class="{
                      'bg-purple-100 text-purple-800 border border-purple-200': u.role === 'admin',
                      'bg-slate-100 text-slate-700': u.role !== 'admin'
                    }"
                  >
                    {{ u.role === 'admin' ? 'Admin' : 'Standard' }}
                  </span>
                </td>
                <td class="py-4 px-6">
                  <div class="flex flex-wrap gap-1.5 max-w-md">
                    <span
                      v-for="t in u.teams"
                      :key="t.id"
                      class="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {{ t.name }}
                    </span>
                    <span v-if="!u.teams || u.teams.length === 0" class="text-xs text-slate-400 italic">
                      No teams assigned
                    </span>
                  </div>
                </td>
                <td class="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                  <button
                    @click="openEditUserModal(u)"
                    class="text-indigo-600 hover:text-indigo-900 font-medium text-xs px-2.5 py-1 rounded hover:bg-indigo-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    v-if="u.id !== currentUser?.id"
                    @click="deleteUserConfirm(u)"
                    class="text-rose-600 hover:text-rose-900 font-medium text-xs px-2.5 py-1 rounded hover:bg-rose-50 transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: TEAMS -->
    <div v-if="activeTab === 'teams'" class="space-y-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-600">
          {{ isAdmin ? 'All active standup teams within the organization.' : 'Standup teams you manage.' }}
        </p>
        <button
          v-if="isAdmin"
          @click="openCreateTeamModal"
          class="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm"
        >
          <PlusCircle class="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="t in teams"
          :key="t.id"
          class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
        >
          <!-- Top: Avatar, Name, Slug & Quick Actions -->
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center space-x-3 min-w-0">
                <!-- Team Avatar Initial -->
                <div
                  class="w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0"
                  :class="getTeamColorClass(t.id)"
                >
                  {{ (t.name || 'T').charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-base text-slate-900 truncate leading-snug" :title="t.name">
                    {{ t.name }}
                  </h3>
                  <span class="inline-block text-xs font-mono text-slate-400 truncate">
                    /{{ t.slug }}
                  </span>
                </div>
              </div>

              <!-- Top-Right Actions: Edit & Delete -->
              <div class="flex items-center space-x-1 flex-shrink-0 -mr-1 -mt-1">
                <button
                  @click="openEditTeamModal(t)"
                  title="Edit team details"
                  class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-lg transition"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button
                  v-if="isAdmin"
                  @click="deleteTeamConfirm(t)"
                  title="Delete team (admin only)"
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-500 line-clamp-2 min-h-[2rem] leading-relaxed mb-3">
              {{ t.description || 'No description provided.' }}
            </p>

            <!-- Managers List -->
            <div v-if="t.managers && t.managers.length > 0" class="flex items-center space-x-2 mb-3.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Managers:</span>
              <div class="flex items-center -space-x-1.5 overflow-hidden flex-shrink-0">
                <img
                  v-for="m in t.managers"
                  :key="m.id"
                  :src="m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`"
                  :alt="m.name"
                  :title="m.email ? `${m.name} (@${m.username}, ${m.email})` : `${m.name} (@${m.username})`"
                  class="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover bg-slate-100"
                />
              </div>
              <span class="text-xs text-slate-700 font-medium truncate" :title="t.managers.map(m => m.name).join(', ')">
                {{ t.managers.map(m => m.name).join(', ') }}
              </span>
            </div>
            <div v-else class="mb-3.5 text-xs text-slate-400 italic">
              No managers assigned yet
            </div>

            <!-- Metadata / Stats Badges -->
            <div class="flex flex-wrap items-center gap-2 mb-4">
              <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                <Users class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ t.member_count }} {{ t.member_count === 1 ? 'member' : 'members' }}</span>
              </span>

              <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 text-xs font-medium">
                <ListChecks class="w-3.5 h-3.5 text-purple-600" />
                <span>{{ t.questions?.length || 0 }} {{ (t.questions?.length || 0) === 1 ? 'question' : 'questions' }}</span>
              </span>
            </div>
          </div>

          <!-- Footer: 3 Clean, Well-Spaced Actions -->
          <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <router-link
              :to="`/team/${t.slug}`"
              class="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition group"
            >
              <span>View Standups</span>
              <ArrowUpRight class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
            </router-link>

            <div class="flex items-center space-x-1.5">
              <button
                @click="openMembersModal(t)"
                class="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition shadow-xs"
                title="Manage team members and manager roles"
              >
                <Users class="w-3.5 h-3.5 text-slate-600" />
                <span>Members</span>
              </button>

              <button
                @click="openQuestionsModal(t)"
                class="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition shadow-xs"
                title="Customize questions for this team"
              >
                <HelpCircle class="w-3.5 h-3.5 text-purple-600" />
                <span>Questions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: ORGANIZATION SETTINGS (Admin Only) -->
    <div v-if="activeTab === 'settings' && isAdmin" class="space-y-6">
      <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div class="flex items-start justify-between pb-6 border-b border-slate-100 mb-6">
          <div class="flex items-center space-x-3.5">
            <div class="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Building2 class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900">Organization Work Schedule</h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Configure standard company working days. Feed date navigation will skip non-working days and hand-off posts will target the next working day.
              </p>
            </div>
          </div>
        </div>

        <!-- Weekly Days Grid (Mon-Sun) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Working Days
            </label>
            <div class="flex items-center space-x-2">
              <button
                type="button"
                @click="setOrgWorkDaysPreset([1, 2, 3, 4, 5])"
                class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition"
              >
                Mon–Fri
              </button>
              <button
                type="button"
                @click="setOrgWorkDaysPreset([1, 2, 3, 4, 5, 6, 7])"
                class="text-xs font-semibold text-slate-600 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                All 7 Days
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            <button
              v-for="day in WEEKDAYS"
              :key="day.id"
              type="button"
              @click="toggleOrgWorkDay(day.id)"
              class="flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center cursor-pointer"
              :class="orgWorkDays.includes(day.id) ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs font-semibold' : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300'"
            >
              <span class="text-xs uppercase tracking-wider font-bold mb-1">{{ day.short }}</span>
              <span class="text-sm">{{ day.name }}</span>
              <span
                class="mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                :class="orgWorkDays.includes(day.id) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'"
              >
                {{ orgWorkDays.includes(day.id) ? 'Working' : 'Off' }}
              </span>
            </button>
          </div>

          <div class="pt-4 flex items-center justify-end">
            <button
              @click="saveOrgWorkDays"
              :disabled="savingOrgSettings || orgWorkDays.length === 0"
              class="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="savingOrgSettings" class="w-4 h-4 animate-spin" />
              <Save v-else class="w-4 h-4" />
              <span>Save Work Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT USER -->
    <div
      v-if="userModal.show"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">
          {{ userModal.isEdit ? 'Edit User' : 'Add New User' }}
        </h3>
        <p class="text-xs text-slate-500 mb-6">
          Set user credentials, role, and assign team memberships.
        </p>

        <form @submit.prevent="saveUser" class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
            <input
              type="text"
              v-model="userModal.form.name"
              required
              placeholder="e.g. Jane Doe"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Username -->
          <div v-if="!userModal.isEdit">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username *</label>
            <input
              type="text"
              v-model="userModal.form.username"
              required
              pattern="^[a-zA-Z0-9._-]+$"
              placeholder="e.g. jdoe"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              Required unique username for sign-in. Letters, numbers, dots, hyphens, and underscores only. (Cannot be changed later)
            </p>
          </div>
          <div v-else>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username</label>
            <input
              type="text"
              :value="userModal.form.username"
              disabled
              class="w-full px-3.5 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-sm font-mono cursor-not-allowed"
            />
            <p class="text-[11px] text-amber-700 font-medium mt-1">
              Username cannot be changed.
            </p>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              v-model="userModal.form.email"
              placeholder="e.g. jane@company.com"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              {{ userModal.isEdit ? 'Sys admins can update the user’s email address here.' : 'Optional. If configured, user can also log in using email or Google SSO.' }}
            </p>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {{ userModal.isEdit ? 'Password (leave blank to keep current)' : 'Password (optional for password login)' }}
            </label>
            <input
              type="password"
              v-model="userModal.form.password"
              :placeholder="userModal.isEdit ? '••••••••' : 'Enter a password for direct login'"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              User can log in with this password, or via Google OAuth SSO if their email matches.
            </p>
          </div>

          <!-- Role -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
            <div class="grid grid-cols-2 gap-3">
              <label
                class="flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition text-sm"
                :class="userModal.form.role === 'member' ? 'border-indigo-600 bg-indigo-50/50 font-semibold text-indigo-900' : 'border-slate-200 text-slate-700'"
              >
                <input type="radio" value="member" v-model="userModal.form.role" class="text-indigo-600" />
                <span>Standard User</span>
              </label>

              <label
                class="flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition text-sm"
                :class="userModal.form.role === 'admin' ? 'border-indigo-600 bg-indigo-50/50 font-semibold text-indigo-900' : 'border-slate-200 text-slate-700'"
              >
                <input type="radio" value="admin" v-model="userModal.form.role" class="text-indigo-600" />
                <span>Admin User</span>
              </label>
            </div>
          </div>

          <!-- Team Assignments -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Assign to Teams (can belong to multiple)
            </label>
            <div class="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-44 overflow-y-auto">
              <label
                v-for="t in teams"
                :key="t.id"
                class="flex items-center space-x-3 p-2 rounded-lg hover:bg-white cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  :value="t.id"
                  v-model="userModal.form.team_ids"
                  class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <p class="text-sm font-semibold text-slate-800 leading-tight">{{ t.name }}</p>
                  <p class="text-[11px] text-slate-400">{{ t.description || 'No description' }}</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="userModal.show = false"
              class="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="userModal.saving"
              class="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {{ userModal.saving ? 'Saving...' : userModal.isEdit ? 'Save Changes' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: CREATE / EDIT TEAM -->
    <div
      v-if="teamModal.show"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <h3 class="text-lg font-bold text-slate-900 mb-1">
          {{ teamModal.isEdit ? 'Edit Team' : 'Create New Team' }}
        </h3>
        <p class="text-xs text-slate-500 mb-6">
          Standup feeds and dynamic questions are organized per team.
        </p>

        <form @submit.prevent="saveTeam" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Team Name *</label>
            <input
              type="text"
              v-model="teamModal.form.name"
              required
              placeholder="e.g. Mobile Engineering"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div v-if="!teamModal.isEdit">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Slug (URL friendly)</label>
            <input
              type="text"
              v-model="teamModal.form.slug"
              placeholder="e.g. mobile-engineering (leave empty to auto-generate)"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
            <textarea
              v-model="teamModal.form.description"
              rows="3"
              placeholder="What this team does..."
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="teamModal.show = false"
              class="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="teamModal.saving"
              class="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {{ teamModal.saving ? 'Saving...' : teamModal.isEdit ? 'Save Changes' : 'Create Team' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: MANAGE TEAM MEMBERS -->
    <div
      v-if="membersModal.show"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="text-lg font-bold text-slate-900">
                Team Members: {{ membersModal.team?.name }}
              </h3>
              <span class="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-600">
                /{{ membersModal.team?.slug }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Add or remove team members, and assign team manager roles.
            </p>
          </div>
          <button
            @click="membersModal.show = false"
            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Add Member Form -->
        <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-5">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Add Member to Team</label>
          <div class="flex flex-col sm:flex-row gap-2">
            <select
              v-model="membersModal.addUserId"
              class="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Select a user to add...</option>
              <option v-for="u in availableUsersForTeam" :key="u.id" :value="u.id">
                {{ u.name }} (@{{ u.username }}{{ u.email ? ' · ' + u.email : '' }})
              </option>
            </select>

            <select
              v-model="membersModal.addRole"
              class="w-full sm:w-32 px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>

            <button
              type="button"
              @click="addMemberToTeam"
              :disabled="!membersModal.addUserId || membersModal.adding"
              class="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              <UserPlus class="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <!-- Members List -->
        <div v-if="membersModal.loading" class="py-12 text-center text-slate-400 text-sm">
          <Loader2 class="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <span>Loading members...</span>
        </div>

        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Current Members ({{ membersModal.members.length }})
            </span>
          </div>

          <div class="divide-y divide-slate-100 max-h-[45vh] overflow-y-auto border border-slate-200 rounded-xl">
            <div
              v-for="m in membersModal.members"
              :key="m.id"
              class="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
            >
              <div class="flex items-center space-x-3 min-w-0">
                <img
                  :src="m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`"
                  :alt="m.name"
                  class="w-9 h-9 rounded-full border border-slate-200 bg-slate-100 object-cover flex-shrink-0"
                />
                <div class="min-w-0">
                  <div class="flex items-center space-x-2">
                    <p class="font-semibold text-sm text-slate-900 truncate">{{ m.name }}</p>
                    <span
                      v-if="m.team_role === 'manager'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200"
                    >
                      Manager
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 truncate">
                    <span class="font-mono text-slate-700">@{{ m.username }}</span>
                    <span v-if="m.email"> · {{ m.email }}</span>
                  </p>
                </div>
              </div>

              <div class="flex items-center space-x-2 flex-shrink-0">
                <!-- Role Selector -->
                <select
                  :value="m.team_role || 'member'"
                  @change="updateMemberRole(m.id, $event.target.value)"
                  class="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                </select>

                <!-- Remove Button -->
                <button
                  type="button"
                  @click="removeMemberFromTeam(m)"
                  title="Remove from team"
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="membersModal.members.length === 0" class="p-8 text-center text-xs text-slate-400 italic">
              No members in this team yet. Use the form above to add members.
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end pt-5 border-t border-slate-100 mt-5">
          <button
            type="button"
            @click="membersModal.show = false"
            class="px-5 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: CUSTOMIZE TEAM QUESTIONS -->
    <div
      v-if="questionsModal.show"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="text-lg font-bold text-slate-900">
                Custom Questions: {{ questionsModal.team?.name }}
              </h3>
              <span class="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-600">
                /{{ questionsModal.team?.slug }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Add, remove, edit, and reorder daily standup questions for this team.
            </p>
          </div>
          <button
            @click="questionsModal.show = false"
            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div v-if="questionsModal.loading" class="py-12 text-center text-slate-400 text-sm">
          <Loader2 class="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <span>Loading questions...</span>
        </div>

        <div v-else class="space-y-4">
          <!-- Question items list -->
          <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            <div
              v-for="(q, idx) in questionsModal.questions"
              :key="idx"
              class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-xs font-semibold text-slate-600">Question {{ idx + 1 }}</span>
                </div>

                <div class="flex items-center space-x-1">
                  <!-- Move Up -->
                  <button
                    type="button"
                    @click="moveQuestion(idx, -1)"
                    :disabled="idx === 0"
                    title="Move up"
                    class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp class="w-3.5 h-3.5" />
                  </button>
                  <!-- Move Down -->
                  <button
                    type="button"
                    @click="moveQuestion(idx, 1)"
                    :disabled="idx === questionsModal.questions.length - 1"
                    title="Move down"
                    class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown class="w-3.5 h-3.5" />
                  </button>
                  <!-- Remove Question -->
                  <button
                    type="button"
                    @click="removeQuestion(idx)"
                    title="Delete question"
                    class="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded ml-1"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- Question Text Input -->
              <input
                type="text"
                v-model="q.text"
                required
                placeholder="e.g. What did you work on yesterday?"
                class="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <!-- Required Toggle -->
              <div class="flex items-center justify-between pt-1 text-xs">
                <label class="flex items-center space-x-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    v-model="q.is_required"
                    class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span :class="q.is_required ? 'font-semibold text-indigo-900' : 'text-slate-500'">
                    {{ q.is_required ? 'Mandatory (Required to submit)' : 'Optional question' }}
                  </span>
                </label>
              </div>
            </div>

            <div v-if="questionsModal.questions.length === 0" class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
              No questions configured for this team. Click "+ Add Question" below.
            </div>
          </div>

          <!-- Actions row: Add question & Reset defaults -->
          <div class="flex items-center justify-between pt-2">
            <button
              type="button"
              @click="addQuestion"
              class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>

            <button
              type="button"
              @click="resetQuestions"
              class="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition px-2 py-1"
            >
              <RotateCcw class="w-3.5 h-3.5 text-slate-400" />
              <span>Reset to Default 3 Questions</span>
            </button>
          </div>

          <!-- Modal footer -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="questionsModal.show = false"
              class="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="saveQuestions"
              :disabled="questionsModal.saving"
              class="inline-flex items-center space-x-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Loader2 v-if="questionsModal.saving" class="w-4 h-4 animate-spin" />
              <span>{{ questionsModal.saving ? 'Saving...' : 'Save Questions' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth.js';
import {
  ShieldCheck,
  UserPlus,
  PlusCircle,
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Loader2,
  X,
  Pencil,
  ListChecks,
  ArrowUpRight,
  Building2,
  Save
} from '@lucide/vue';
import { WEEKDAYS } from '@/utils/schedule.js';

const { user: currentUser, isAdmin, isManager, canManage } = useAuth();

const activeTab = ref(isAdmin.value ? 'users' : 'teams');
const users = ref([]);
const teams = ref([]);
const userSearch = ref('');

const alertMessage = ref('');
const alertType = ref('success');

function getTeamColorClass(id) {
  const styles = [
    'bg-indigo-50 text-indigo-700 border border-indigo-100',
    'bg-emerald-50 text-emerald-700 border border-emerald-100',
    'bg-violet-50 text-violet-700 border border-violet-100',
    'bg-amber-50 text-amber-700 border border-amber-100',
    'bg-sky-50 text-sky-700 border border-sky-100',
    'bg-rose-50 text-rose-700 border border-rose-100'
  ];
  return styles[(id || 0) % styles.length];
}

// User Modal State
const userModal = ref({
  show: false,
  isEdit: false,
  saving: false,
  userId: null,
  form: {
    name: '',
    email: '',
    password: '',
    role: 'member',
    team_ids: []
  }
});

// Team Modal State
const teamModal = ref({
  show: false,
  isEdit: false,
  saving: false,
  teamId: null,
  form: {
    name: '',
    slug: '',
    description: ''
  }
});

// Members Modal State
const membersModal = ref({
  show: false,
  team: null,
  loading: false,
  adding: false,
  members: [],
  addUserId: '',
  addRole: 'member'
});

const availableUsersForTeam = computed(() => {
  if (!membersModal.value.team) return [];
  const existingMemberIds = new Set(membersModal.value.members.map(m => m.id));
  return users.value.filter(u => !existingMemberIds.has(u.id));
});

// Questions Modal State
const questionsModal = ref({
  show: false,
  team: null,
  loading: false,
  saving: false,
  questions: []
});

const filteredUsers = computed(() => {
  if (!userSearch.value.trim()) return users.value;
  const q = userSearch.value.toLowerCase();
  return users.value.filter(u =>
    u.name.toLowerCase().includes(q) ||
    (u.username && u.username.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q)) ||
    (u.teams && u.teams.some(t => t.name.toLowerCase().includes(q)))
  );
});

async function loadData() {
  try {
    const [uRes, tRes] = await Promise.all([
      fetch('/api/admin/users', { credentials: 'include' }),
      fetch('/api/admin/teams', { credentials: 'include' })
    ]);

    if (uRes.ok) {
      const uData = await uRes.json();
      users.value = uData.users || [];
    }
    if (tRes.ok) {
      const tData = await tRes.json();
      teams.value = tData.teams || [];
    }
  } catch (err) {
    showAlert('Failed to load data: ' + err.message, 'error');
  }
}

function showAlert(msg, type = 'success') {
  alertMessage.value = msg;
  alertType.value = type;
  setTimeout(() => {
    if (alertMessage.value === msg) {
      alertMessage.value = '';
    }
  }, 4000);
}

// User Actions
function openAddUserModal() {
  userModal.value = {
    show: true,
    isEdit: false,
    saving: false,
    userId: null,
    form: {
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'member',
      team_ids: []
    }
  };
}

function openEditUserModal(u) {
  userModal.value = {
    show: true,
    isEdit: true,
    saving: false,
    userId: u.id,
    form: {
      name: u.name,
      username: u.username,
      email: u.email || '',
      password: '',
      role: u.role === 'admin' ? 'admin' : 'member',
      team_ids: u.teams ? u.teams.map(t => t.id) : []
    }
  };
}

async function saveUser() {
  const isEdit = userModal.value.isEdit;

  if (!userModal.value.form.name || !userModal.value.form.name.trim()) {
    showAlert('Full Name is required', 'error');
    return;
  }

  if (!isEdit) {
    const rawUsername = userModal.value.form.username ? userModal.value.form.username.trim() : '';
    if (!rawUsername) {
      showAlert('Username is required', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(rawUsername)) {
      showAlert('Username can only contain letters, numbers, dots, hyphens, and underscores', 'error');
      return;
    }
    userModal.value.form.username = rawUsername.toLowerCase();
  }

  userModal.value.saving = true;
  try {
    const url = isEdit ? `/api/admin/users/${userModal.value.userId}` : '/api/admin/users';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = { ...userModal.value.form };
    if (isEdit) {
      delete payload.username; // Username cannot be changed
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save user');
    }

    showAlert(isEdit ? 'User updated successfully' : 'New user created successfully');
    userModal.value.show = false;
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    userModal.value.saving = false;
  }
}

async function deleteUserConfirm(u) {
  const userDesc = u.email ? `"${u.name}" (@${u.username}, ${u.email})` : `"${u.name}" (@${u.username})`;
  if (!confirm(`Are you sure you want to delete user ${userDesc}?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }

    showAlert(`User "${u.name}" deleted`);
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// Team Actions
function openCreateTeamModal() {
  teamModal.value = {
    show: true,
    isEdit: false,
    saving: false,
    teamId: null,
    form: {
      name: '',
      slug: '',
      description: ''
    }
  };
}

function openEditTeamModal(t) {
  teamModal.value = {
    show: true,
    isEdit: true,
    saving: false,
    teamId: t.id,
    form: {
      name: t.name,
      slug: t.slug,
      description: t.description || ''
    }
  };
}

async function saveTeam() {
  teamModal.value.saving = true;
  try {
    const isEdit = teamModal.value.isEdit;
    const url = isEdit ? `/api/admin/teams/${teamModal.value.teamId}` : '/api/admin/teams';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(teamModal.value.form)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save team');
    }

    showAlert(isEdit ? 'Team updated successfully' : 'New team created successfully');
    teamModal.value.show = false;
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    teamModal.value.saving = false;
  }
}

async function deleteTeamConfirm(t) {
  if (!confirm(`Are you sure you want to delete team "${t.name}"? All standups associated with this team will also be deleted.`)) return;

  try {
    const res = await fetch(`/api/admin/teams/${t.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete team');
    }

    showAlert(`Team "${t.name}" deleted`);
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// Member Actions
async function openMembersModal(t) {
  membersModal.value = {
    show: true,
    team: t,
    loading: true,
    adding: false,
    members: [],
    addUserId: '',
    addRole: 'member'
  };

  try {
    const res = await fetch(`/api/admin/teams/${t.id}/members`, {
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      membersModal.value.members = data.members || [];
    } else {
      throw new Error('Failed to load team members');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    membersModal.value.loading = false;
  }
}

async function addMemberToTeam() {
  if (!membersModal.value.addUserId) return;
  membersModal.value.adding = true;
  try {
    const res = await fetch(`/api/admin/teams/${membersModal.value.team.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        user_id: membersModal.value.addUserId,
        role: membersModal.value.addRole
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add member to team');
    }

    membersModal.value.members = data.members || [];
    membersModal.value.addUserId = '';
    membersModal.value.addRole = 'member';
    showAlert('Member added to team');
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    membersModal.value.adding = false;
  }
}

async function updateMemberRole(userId, newRole) {
  try {
    const res = await fetch(`/api/admin/teams/${membersModal.value.team.id}/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: newRole })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update member role');
    }

    membersModal.value.members = data.members || [];
    showAlert('Member role updated');
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function removeMemberFromTeam(member) {
  if (!confirm(`Are you sure you want to remove ${member.name} from ${membersModal.value.team.name}?`)) return;

  try {
    const res = await fetch(`/api/admin/teams/${membersModal.value.team.id}/members/${member.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to remove member');
    }

    membersModal.value.members = data.members || [];
    showAlert(`${member.name} removed from team`);
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// Questions Actions
async function openQuestionsModal(t) {
  questionsModal.value = {
    show: true,
    team: t,
    loading: true,
    saving: false,
    questions: []
  };

  try {
    const res = await fetch(`/api/admin/teams/${t.id}/questions`, {
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      questionsModal.value.questions = (data.questions || []).map(q => ({ ...q }));
    } else {
      throw new Error('Failed to load team questions');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    questionsModal.value.loading = false;
  }
}

function addQuestion() {
  questionsModal.value.questions.push({
    id: null,
    text: '',
    is_required: true
  });
}

function removeQuestion(index) {
  questionsModal.value.questions.splice(index, 1);
}

function moveQuestion(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= questionsModal.value.questions.length) return;
  const item = questionsModal.value.questions.splice(index, 1)[0];
  questionsModal.value.questions.splice(targetIndex, 0, item);
}

async function resetQuestions() {
  if (!confirm('Reset questions to the 3 standard default standup questions?')) return;

  questionsModal.value.loading = true;
  try {
    const res = await fetch(`/api/admin/teams/${questionsModal.value.team.id}/questions/reset`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset questions');
    }

    questionsModal.value.questions = data.questions || [];
    showAlert('Questions reset to system defaults');
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    questionsModal.value.loading = false;
  }
}

async function saveQuestions() {
  // Validate that all question items have non-empty text
  for (let i = 0; i < questionsModal.value.questions.length; i++) {
    const q = questionsModal.value.questions[i];
    if (!q.text || !q.text.trim()) {
      showAlert(`Question #${i + 1} cannot be empty`, 'error');
      return;
    }
  }

  questionsModal.value.saving = true;
  try {
    const res = await fetch(`/api/admin/teams/${questionsModal.value.team.id}/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        questions: questionsModal.value.questions
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save questions');
    }

    showAlert(`Standup questions for "${questionsModal.value.team.name}" updated successfully`);
    questionsModal.value.show = false;
    await loadData();
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    questionsModal.value.saving = false;
  }
}

// Organization Settings State & Methods
const orgWorkDays = ref([1, 2, 3, 4, 5]);
const savingOrgSettings = ref(false);

async function fetchOrgSettings() {
  if (!isAdmin.value) return;
  try {
    const res = await fetch('/api/admin/settings', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.org_work_days)) {
        orgWorkDays.value = data.org_work_days;
      }
    }
  } catch (err) {
    console.error('Failed to load org settings:', err);
  }
}

function toggleOrgWorkDay(dayId) {
  if (orgWorkDays.value.includes(dayId)) {
    if (orgWorkDays.value.length === 1) {
      showAlert('At least one working day must be selected', 'error');
      return;
    }
    orgWorkDays.value = orgWorkDays.value.filter(d => d !== dayId);
  } else {
    orgWorkDays.value = [...orgWorkDays.value, dayId].sort((a, b) => a - b);
  }
}

function setOrgWorkDaysPreset(preset) {
  orgWorkDays.value = [...preset];
}

async function saveOrgWorkDays() {
  savingOrgSettings.value = true;
  try {
    const res = await fetch('/api/admin/settings/workdays', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ work_days: orgWorkDays.value })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update organization settings');
    }
    const data = await res.json();
    orgWorkDays.value = data.org_work_days;
    showAlert('Organization work schedule updated successfully!', 'success');
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    savingOrgSettings.value = false;
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    activeTab.value = 'teams';
  }
  loadData();
  fetchOrgSettings();
});
</script>
