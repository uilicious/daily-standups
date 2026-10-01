import {
  getUserWorkSchedule,
  setUserWorkSchedule,
  getUserOooDays,
  getUserOooEntries,
  saveOooEntry,
  deleteOooEntry,
  deleteOooEntryByDate,
  getUserById
} from '../db/queries.js';

export default async function scheduleRoutes(fastify, options) {
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

  // 1. Get current user's schedule & OOO entries
  fastify.get('/me', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const schedule = await getUserWorkSchedule(user.id);
    const oooEntries = await getUserOooEntries(user.id);

    return {
      work_days: schedule.work_days,
      ooo_entries: oooEntries,
      ooo_days: oooEntries
    };
  });

  // 2. Update weekly working schedule (days 1=Mon .. 7=Sun)
  fastify.put('/me/workdays', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { work_days } = request.body || {};
    if (!Array.isArray(work_days)) {
      return reply.code(400).send({ error: 'work_days must be an array of day numbers (1=Monday ... 7=Sunday)' });
    }

    const updated = await setUserWorkSchedule(user.id, work_days);
    return { ok: true, work_days: updated.work_days };
  });

  // 3. Add or update out of office entry (multi-date or single date treated as one entry)
  fastify.post('/me/ooo', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { id, date, startDate, endDate, reason, period } = request.body || {};

    const effectiveStart = startDate || date;
    if (!effectiveStart) {
      return reply.code(400).send({ error: 'Please provide at least a valid start date' });
    }

    const updatedEntries = await saveOooEntry(user.id, {
      id,
      startDate: effectiveStart,
      endDate: endDate || effectiveStart,
      reason,
      period
    });

    return { ok: true, ooo_entries: updatedEntries, ooo_days: updatedEntries };
  });

  // 4. Update an existing OOO entry by id
  fastify.put('/me/ooo/:id', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { id } = request.params;
    const { date, startDate, endDate, reason, period } = request.body || {};

    const effectiveStart = startDate || date;
    if (!effectiveStart) {
      return reply.code(400).send({ error: 'Please provide at least a valid start date' });
    }

    const updatedEntries = await saveOooEntry(user.id, {
      id,
      startDate: effectiveStart,
      endDate: endDate || effectiveStart,
      reason,
      period
    });

    return { ok: true, ooo_entries: updatedEntries, ooo_days: updatedEntries };
  });

  // 5. Delete an OOO entry by id
  fastify.delete('/me/ooo/:id', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { id } = request.params;
    const updatedEntries = await deleteOooEntry(user.id, id);
    return { ok: true, ooo_entries: updatedEntries, ooo_days: updatedEntries };
  });

  // 6. Delete an OOO entry covering a date (YYYY-MM-DD)
  fastify.delete('/me/ooo/date/:date', async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply);
    if (!user) return;

    const { date } = request.params;
    const updatedEntries = await deleteOooEntryByDate(user.id, date);
    return { ok: true, ooo_entries: updatedEntries, ooo_days: updatedEntries };
  });
}
