import { getUserById, getTodayStandupsForUser, saveStandup, getTeamById } from '../db/queries.js';

export default async function standupRoutes(fastify, options) {
  // Authentication check helper
  function checkAuth(request, reply) {
    if (!request.session || !request.session.userId) {
      reply.code(401).send({ error: 'You must be logged in to access standups' });
      return null;
    }
    const user = getUserById(request.session.userId);
    if (!user) {
      reply.code(401).send({ error: 'Invalid session user' });
      return null;
    }
    return user;
  }

  // Get current user's standup submissions for today
  fastify.get('/today', async (request, reply) => {
    const user = checkAuth(request, reply);
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const userStandups = getTodayStandupsForUser(user.id, todayStr);

    return {
      date: todayStr,
      standups: userStandups
    };
  });

  // Submit or update standup for a specific team
  fastify.post('/', async (request, reply) => {
    const user = checkAuth(request, reply);
    if (!user) return;

    const { team_id, date, yesterday, today, blockers } = request.body || {};

    if (!team_id) {
      return reply.code(400).send({ error: 'team_id is required' });
    }
    if (!yesterday || !yesterday.trim()) {
      return reply.code(400).send({ error: 'Question 1: What did you do yesterday? is required' });
    }
    if (!today || !today.trim()) {
      return reply.code(400).send({ error: 'Question 2: What are you working on today? is required' });
    }

    const team = getTeamById(Number(team_id));
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    // Check if user is a member of the team
    const isMember = user.teams.some(t => t.id === team.id);
    if (!isMember) {
      return reply.code(403).send({ error: `You are not a member of team "${team.name}"` });
    }

    const submissionDate = date || new Date().toISOString().split('T')[0];

    const saved = saveStandup({
      user_id: user.id,
      team_id: team.id,
      date: submissionDate,
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers ? blockers.trim() : ''
    });

    return {
      ok: true,
      standup: saved
    };
  });
}
