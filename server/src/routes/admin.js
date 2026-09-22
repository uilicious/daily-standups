import {
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getUserByEmail,
  getQuestionsByTeamId,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  setTeamQuestions,
  resetTeamQuestionsToDefaults,
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  canUserManageTeam
} from '../db/queries.js';

export default async function adminRoutes(fastify, options) {
  // Admin & Manager middleware hook
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.session || !request.session.userId) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const user = await getUserById(request.session.userId);
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    const isManager = user.teams && user.teams.some(t => t.team_role === 'manager');
    if (user.role !== 'admin' && !isManager) {
      return reply.code(403).send({ error: 'Admin or manager privileges required' });
    }

    request.currentUser = user;
    request.isAdmin = user.role === 'admin';
  });

  // --- USER MANAGEMENT ---

  // 1. List all users with their teams (available to admin and manager to select members)
  fastify.get('/users', async (request, reply) => {
    const users = await getAllUsers();
    return { users };
  });

  // 2. Add new user & assign to teams (admin only)
  fastify.post('/users', async (request, reply) => {
    if (!request.isAdmin) {
      return reply.code(403).send({ error: 'Only administrators can create users' });
    }

    const { email, name, password, role = 'member', team_ids = [] } = request.body || {};

    if (!email || !email.trim()) {
      return reply.code(400).send({ error: 'Email is required' });
    }
    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Name is required' });
    }

    const existing = await getUserByEmail(email.trim());
    if (existing) {
      return reply.code(409).send({ error: `A user with email "${email}" already exists` });
    }

    const validRole = role === 'admin' ? 'admin' : 'member';

    const newUser = await createUser({
      email: email.trim(),
      name: name.trim(),
      password: password && password.trim() ? password.trim() : null,
      role: validRole,
      team_ids: Array.isArray(team_ids) ? team_ids : []
    });

    return { ok: true, user: newUser };
  });

  // 3. Update user & assign teams (admin only)
  fastify.put('/users/:id', async (request, reply) => {
    if (!request.isAdmin) {
      return reply.code(403).send({ error: 'Only administrators can edit user accounts' });
    }

    const { id } = request.params;
    const userId = Number(id);
    const { name, email, password, role, team_ids } = request.body || {};

    const existing = await getUserById(userId);
    if (!existing) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = await getUserByEmail(email);
      if (emailConflict && emailConflict.id !== userId) {
        return reply.code(409).send({ error: `Email "${email}" is already used by another account` });
      }
    }

    // Prevent removing the last admin
    if (existing.role === 'admin' && role && role !== 'admin') {
      const allUsers = await getAllUsers();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return reply.code(400).send({ error: 'Cannot demote the last remaining admin' });
      }
    }

    const updated = await updateUser(userId, {
      name,
      email,
      password: password && password.trim() ? password.trim() : undefined,
      role,
      team_ids: Array.isArray(team_ids) ? team_ids : undefined
    });

    return { ok: true, user: updated };
  });

  // 4. Delete user (admin only)
  fastify.delete('/users/:id', async (request, reply) => {
    if (!request.isAdmin) {
      return reply.code(403).send({ error: 'Only administrators can delete user accounts' });
    }

    const { id } = request.params;
    const userId = Number(id);

    if (userId === request.currentUser.id) {
      return reply.code(400).send({ error: 'You cannot delete your own account' });
    }

    const existing = await getUserById(userId);
    if (!existing) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await deleteUser(userId);
    return { ok: true, message: `User ${existing.name} deleted` };
  });

  // --- TEAM MANAGEMENT ---

  // List teams (all teams for admin, managed teams for manager)
  fastify.get('/teams', async (request, reply) => {
    const teams = await getAllTeams(request.currentUser);
    return { teams };
  });

  // 5. Create new team (admin only)
  fastify.post('/teams', async (request, reply) => {
    if (!request.isAdmin) {
      return reply.code(403).send({ error: 'Only administrators can create teams' });
    }

    const { name, slug, description } = request.body || {};

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Team name is required' });
    }

    try {
      const newTeam = await createTeam({
        name: name.trim(),
        slug: slug && slug.trim() ? slug.trim() : undefined,
        description: description || ''
      });
      return { ok: true, team: newTeam };
    } catch (err) {
      if (err.message && (err.message.includes('UNIQUE constraint') || err.message.includes('duplicate key') || err.message.includes('ER_DUP_ENTRY'))) {
        return reply.code(409).send({ error: 'A team with this slug or name already exists' });
      }
      throw err;
    }
  });

  // 6. Update team (admin or manager of the team)
  fastify.put('/teams/:id', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);
    const { name, description } = request.body || {};

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to edit this team' });
    }

    const updated = await updateTeam(teamId, { name, description });
    if (!updated) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    return { ok: true, team: updated };
  });

  // 7. Delete team (admin only - managers may NOT delete teams)
  fastify.delete('/teams/:id', async (request, reply) => {
    if (!request.isAdmin) {
      return reply.code(403).send({ error: 'Managers are not permitted to delete teams' });
    }

    const { id } = request.params;
    const teamId = Number(id);

    await deleteTeam(teamId);
    return { ok: true, message: 'Team deleted' };
  });

  // --- TEAM MEMBERS MANAGEMENT ---

  // Get members of a team
  fastify.get('/teams/:id/members', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to view members of this team' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const members = await getTeamMembers(teamId);
    return { members };
  });

  // Add member to a team (with role: 'member' or 'manager')
  fastify.post('/teams/:id/members', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to add members to this team' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const { user_id, role = 'member' } = request.body || {};
    if (!user_id) {
      return reply.code(400).send({ error: 'user_id is required' });
    }

    const validRole = role === 'manager' ? 'manager' : 'member';
    const members = await addTeamMember(teamId, user_id, validRole);
    return { ok: true, members };
  });

  // Update member role within a team ('member' <-> 'manager')
  fastify.put('/teams/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params;
    const teamId = Number(id);
    const targetUserId = Number(userId);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage roles for this team' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const { role } = request.body || {};
    if (!role || !['member', 'manager'].includes(role)) {
      return reply.code(400).send({ error: 'Role must be either "member" or "manager"' });
    }

    const members = await updateTeamMemberRole(teamId, targetUserId, role);
    return { ok: true, members };
  });

  // Remove member from a team
  fastify.delete('/teams/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params;
    const teamId = Number(id);
    const targetUserId = Number(userId);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to remove members from this team' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const members = await removeTeamMember(teamId, targetUserId);
    return { ok: true, members };
  });

  // --- TEAM QUESTIONS MANAGEMENT ---

  // Get questions for a team
  fastify.get('/teams/:id/questions', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage questions for this team' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const questions = await getQuestionsByTeamId(teamId);
    return { questions };
  });

  // Add a new question to a team
  fastify.post('/teams/:id/questions', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);
    const { text, is_required = true, order_index } = request.body || {};

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage questions for this team' });
    }

    if (!text || !text.trim()) {
      return reply.code(400).send({ error: 'Question text is required' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const question = await createQuestion(teamId, { text, is_required, order_index });
    return { ok: true, question };
  });

  // Update a single question
  fastify.put('/teams/:id/questions/:questionId', async (request, reply) => {
    const { id, questionId } = request.params;
    const teamId = Number(id);
    const { text, is_required, order_index } = request.body || {};

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage questions for this team' });
    }

    const updated = await updateQuestion(Number(questionId), { text, is_required, order_index });
    if (!updated) {
      return reply.code(404).send({ error: 'Question not found' });
    }

    return { ok: true, question: updated };
  });

  // Delete a single question
  fastify.delete('/teams/:id/questions/:questionId', async (request, reply) => {
    const { id, questionId } = request.params;
    const teamId = Number(id);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage questions for this team' });
    }

    await deleteQuestion(Number(questionId));
    return { ok: true, message: 'Question deleted' };
  });

  // Batch update / reorder all questions for a team
  fastify.put('/teams/:id/questions', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);
    const { questions } = request.body || {};

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage questions for this team' });
    }

    if (!Array.isArray(questions)) {
      return reply.code(400).send({ error: 'questions must be an array' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const updatedList = await setTeamQuestions(teamId, questions);
    return { ok: true, questions: updatedList };
  });

  // Reset a team's questions to system defaults
  fastify.post('/teams/:id/questions/reset', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

    const canManage = await canUserManageTeam(request.currentUser.id, teamId);
    if (!canManage) {
      return reply.code(403).send({ error: 'You do not have permission to manage questions for this team' });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const questions = await resetTeamQuestionsToDefaults(teamId);
    return { ok: true, questions };
  });
}
