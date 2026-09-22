import { getTeamById, getTeamBySlug, getStandupsByTeamAndDate, getUserById, getQuestionsByTeamId } from '../db/queries.js';

export default async function teamRoutes(fastify, options) {
  // Helper to ensure user is logged in
  async function getAuthenticatedUser(request, reply) {
    if (!request.session || !request.session.userId) {
      reply.code(401).send({ error: 'Authentication required' });
      return null;
    }

    const user = await getUserById(request.session.userId);
    if (!user) {
      reply.code(401).send({ error: 'User not found' });
      return null;
    }

    return user;
  }

  // Get teams that the current authenticated user belongs to
  fastify.get('/', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    // Only return the teams this user is a member of
    return { teams: user.teams || [] };
  });

  // Get specific team (only if member)
  fastify.get('/:idOrSlug', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { idOrSlug } = request.params;
    let team = isNaN(idOrSlug) ? await getTeamBySlug(idOrSlug) : await getTeamById(Number(idOrSlug));
    if (!team) {
      team = await getTeamBySlug(idOrSlug);
    }

    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    // Verify membership
    const isMember = (user.teams || []).some(t => t.id === team.id);
    if (!isMember) {
      return reply.code(403).send({ error: 'Access denied. You do not belong to this team.' });
    }

    return { team };
  });

  // Get questions for team (only if member)
  fastify.get('/:idOrSlug/questions', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { idOrSlug } = request.params;
    let team = isNaN(idOrSlug) ? await getTeamBySlug(idOrSlug) : await getTeamById(Number(idOrSlug));
    if (!team) {
      team = await getTeamBySlug(idOrSlug);
    }

    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    const isMember = (user.teams || []).some(t => t.id === team.id);
    if (!isMember) {
      return reply.code(403).send({ error: 'Access denied. You do not belong to this team.' });
    }

    const questions = await getQuestionsByTeamId(team.id);
    return { team, questions };
  });

  // Get standups for team on date (only if member)
  fastify.get('/:idOrSlug/standups', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { idOrSlug } = request.params;
    const { date } = request.query;

    let team = isNaN(idOrSlug) ? await getTeamBySlug(idOrSlug) : await getTeamById(Number(idOrSlug));
    if (!team) {
      team = await getTeamBySlug(idOrSlug);
    }

    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    // Verify membership: A user can only access standups for teams they belong to
    const isMember = (user.teams || []).some(t => t.id === team.id);
    if (!isMember) {
      return reply.code(403).send({ error: 'Access denied. You do not belong to this team.' });
    }

    const queryDate = date || new Date().toISOString().split('T')[0];
    const standups = await getStandupsByTeamAndDate(team.id, queryDate);

    return {
      team,
      date: queryDate,
      standups
    };
  });
}
