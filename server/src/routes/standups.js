import {
  getUserById,
  getTodayStandupsForUser,
  saveStandup,
  getTeamById,
  getStandupById,
  toggleReaction
} from '../db/queries.js';

export default async function standupRoutes(fastify, options) {
  // Authentication check helper
  async function checkAuth(request, reply) {
    if (!request.session || !request.session.userId) {
      reply.code(401).send({ error: 'You must be logged in to access standups' });
      return null;
    }
    const user = await getUserById(request.session.userId);
    if (!user) {
      reply.code(401).send({ error: 'Invalid session user' });
      return null;
    }
    return user;
  }

  // Get current user's standup submissions for today
  fastify.get('/today', async (request, reply) => {
    const user = await checkAuth(request, reply);
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const userStandups = await getTodayStandupsForUser(user.id, todayStr);

    return {
      date: todayStr,
      standups: userStandups
    };
  });

  // Submit or update standup for a specific team
  fastify.post('/', async (request, reply) => {
    const user = await checkAuth(request, reply);
    if (!user) return;

    const { team_id, date, answers, yesterday, today, blockers } = request.body || {};

    if (!team_id) {
      return reply.code(400).send({ error: 'team_id is required' });
    }

    const team = await getTeamById(Number(team_id));
    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    // Check if user is a member of the team
    const isMember = user.teams.some(t => t.id === team.id);
    if (!isMember) {
      return reply.code(403).send({ error: `You are not a member of team "${team.name}"` });
    }

    const submissionDate = date || new Date().toISOString().split('T')[0];

    // Validate required questions
    if (Array.isArray(answers)) {
      const teamQuestions = team.questions || [];
      for (const q of teamQuestions) {
        if (q.is_required) {
          const ans = answers.find(a => Number(a.question_id) === Number(q.id));
          if (!ans || !ans.answer || !ans.answer.trim()) {
            return reply.code(400).send({ error: `Please answer required question: "${q.text}"` });
          }
        }
      }
    } else {
      // Fallback legacy validation
      if (!yesterday || !yesterday.trim()) {
        return reply.code(400).send({ error: 'Question 1: What did you do yesterday? is required' });
      }
      if (!today || !today.trim()) {
        return reply.code(400).send({ error: 'Question 2: What are you working on today? is required' });
      }
    }

    const saved = await saveStandup({
      user_id: user.id,
      team_id: team.id,
      date: submissionDate,
      answers,
      yesterday,
      today,
      blockers
    });

    return {
      ok: true,
      standup: saved
    };
  });

  // Toggle emoji reaction on a standup
  fastify.post('/:id/reactions', async (request, reply) => {
    const user = await checkAuth(request, reply);
    if (!user) return;

    const { id } = request.params;
    const standup = await getStandupById(Number(id));
    if (!standup) {
      return reply.code(404).send({ error: 'Standup not found' });
    }

    const isMember = (user.teams || []).some(t => t.id === standup.team_id);
    if (!isMember && user.role !== 'admin') {
      return reply.code(403).send({ error: 'You must be a team member to react to this standup' });
    }

    const { emoji } = request.body || {};
    if (!emoji || typeof emoji !== 'string' || !emoji.trim()) {
      return reply.code(400).send({ error: 'Emoji is required' });
    }

    const result = await toggleReaction({
      userId: user.id,
      targetType: 'standup',
      targetId: standup.id,
      emoji: emoji.trim()
    });

    return result;
  });
}
