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
  createQuestion,
  updateQuestion,
  deleteQuestion,
  setTeamQuestions,
  resetTeamQuestionsToDefaults
} from '../db/queries.js';

export default async function adminRoutes(fastify, options) {
  // Admin-only middleware hook
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.session || !request.session.userId) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const user = await getUserById(request.session.userId);
    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin privileges required' });
    }

    request.currentUser = user;
  });

  // --- USER MANAGEMENT ---

  // 1. List all users with their teams
  fastify.get('/users', async (request, reply) => {
    const users = await getAllUsers();
    return { users };
  });

  // 2. Add new user & assign to teams
  fastify.post('/users', async (request, reply) => {
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

    const newUser = await createUser({
      email: email.trim(),
      name: name.trim(),
      password: password && password.trim() ? password.trim() : null,
      role: role === 'admin' ? 'admin' : 'member',
      team_ids: Array.isArray(team_ids) ? team_ids.map(Number) : []
    });

    return { ok: true, user: newUser };
  });

  // 3. Update user & assign teams
  fastify.put('/users/:id', async (request, reply) => {
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
    if (existing.role === 'admin' && role === 'member') {
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
      team_ids: Array.isArray(team_ids) ? team_ids.map(Number) : undefined
    });

    return { ok: true, user: updated };
  });

  // 4. Delete user
  fastify.delete('/users/:id', async (request, reply) => {
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

  // List all teams across the company for admin management
  fastify.get('/teams', async (request, reply) => {
    const teams = await getAllTeams();
    return { teams };
  });

  // 5. Create new team
  fastify.post('/teams', async (request, reply) => {
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

  // 6. Update team
  fastify.put('/teams/:id', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);
    const { name, description } = request.body || {};

    const updated = await updateTeam(teamId, { name, description });
    if (!updated) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    return { ok: true, team: updated };
  });

  // 7. Delete team
  fastify.delete('/teams/:id', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

    await deleteTeam(teamId);
    return { ok: true, message: 'Team deleted' };
  });

  // --- TEAM QUESTIONS MANAGEMENT ---

  // Get questions for a team
  fastify.get('/teams/:id/questions', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

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
    const { questionId } = request.params;
    const { text, is_required, order_index } = request.body || {};

    const updated = await updateQuestion(Number(questionId), { text, is_required, order_index });
    if (!updated) {
      return reply.code(404).send({ error: 'Question not found' });
    }

    return { ok: true, question: updated };
  });

  // Delete a single question
  fastify.delete('/teams/:id/questions/:questionId', async (request, reply) => {
    const { questionId } = request.params;
    await deleteQuestion(Number(questionId));
    return { ok: true, message: 'Question deleted' };
  });

  // Batch update / reorder all questions for a team
  fastify.put('/teams/:id/questions', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);
    const { questions } = request.body || {};

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

    const team = await getTeamById(teamId);
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const questions = await resetTeamQuestionsToDefaults(teamId);
    return { ok: true, questions };
  });
}
