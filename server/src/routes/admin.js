import {
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getUserByEmail
} from '../db/queries.js';

export default async function adminRoutes(fastify, options) {
  // Admin-only middleware hook
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.session || !request.session.userId) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const user = getUserById(request.session.userId);
    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin privileges required' });
    }

    request.currentUser = user;
  });

  // --- USER MANAGEMENT ---

  // 1. List all users with their teams
  fastify.get('/users', async (request, reply) => {
    const users = getAllUsers();
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

    const existing = getUserByEmail(email.trim());
    if (existing) {
      return reply.code(409).send({ error: `A user with email "${email}" already exists` });
    }

    const newUser = createUser({
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

    const existing = getUserById(userId);
    if (!existing) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = getUserByEmail(email);
      if (emailConflict && emailConflict.id !== userId) {
        return reply.code(409).send({ error: `Email "${email}" is already used by another account` });
      }
    }

    // Prevent removing the last admin
    if (existing.role === 'admin' && role === 'member') {
      const allUsers = getAllUsers();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return reply.code(400).send({ error: 'Cannot demote the last remaining admin' });
      }
    }

    const updated = updateUser(userId, {
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

    const existing = getUserById(userId);
    if (!existing) {
      return reply.code(404).send({ error: 'User not found' });
    }

    deleteUser(userId);
    return { ok: true, message: `User ${existing.name} deleted` };
  });

  // --- TEAM MANAGEMENT ---

  // List all teams across the company for admin management
  fastify.get('/teams', async (request, reply) => {
    const teams = getAllTeams();
    return { teams };
  });

  // 5. Create new team
  fastify.post('/teams', async (request, reply) => {
    const { name, slug, description } = request.body || {};

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Team name is required' });
    }

    try {
      const newTeam = createTeam({
        name: name.trim(),
        slug: slug && slug.trim() ? slug.trim() : undefined,
        description: description || ''
      });
      return { ok: true, team: newTeam };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
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

    const updated = updateTeam(teamId, { name, description });
    if (!updated) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    return { ok: true, team: updated };
  });

  // 7. Delete team
  fastify.delete('/teams/:id', async (request, reply) => {
    const { id } = request.params;
    const teamId = Number(id);

    deleteTeam(teamId);
    return { ok: true, message: 'Team deleted' };
  });
}
