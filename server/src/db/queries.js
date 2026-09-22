import db, { seedQuestionsForTeam, DEFAULT_STANDUP_QUESTIONS } from './index.js';
import { hashPassword } from '../utils/auth.js';

// =============================================================================
// USER QUERIES
// =============================================================================

export async function getUserById(id) {
  const user = await db('users')
    .select('id', 'email', 'name', 'avatar_url', 'role', 'created_at')
    .where('id', id)
    .first();

  if (!user) return null;

  user.teams = await db('teams as t')
    .join('user_teams as ut', 'ut.team_id', 't.id')
    .where('ut.user_id', id)
    .select('t.id', 't.name', 't.slug', 't.description', 'ut.role as team_role')
    .orderBy('t.name', 'asc');

  return user;
}

export async function getUserByEmail(email) {
  const user = await db('users')
    .select('id', 'email', 'name', 'avatar_url', 'role', 'created_at')
    .whereRaw('LOWER(email) = ?', [email.trim().toLowerCase()])
    .first();

  if (!user) return null;

  user.teams = await db('teams as t')
    .join('user_teams as ut', 'ut.team_id', 't.id')
    .where('ut.user_id', user.id)
    .select('t.id', 't.name', 't.slug', 't.description', 'ut.role as team_role')
    .orderBy('t.name', 'asc');

  return user;
}

export async function getUserByEmailWithPassword(email) {
  const user = await db('users')
    .select('id', 'email', 'name', 'password_hash', 'avatar_url', 'role', 'created_at')
    .whereRaw('LOWER(email) = ?', [email.trim().toLowerCase()])
    .first();

  if (!user) return null;

  user.teams = await db('teams as t')
    .join('user_teams as ut', 'ut.team_id', 't.id')
    .where('ut.user_id', user.id)
    .select('t.id', 't.name', 't.slug', 't.description', 'ut.role as team_role')
    .orderBy('t.name', 'asc');

  return user;
}

export async function getAllUsers() {
  const users = await db('users')
    .select('id', 'email', 'name', 'avatar_url', 'role', 'created_at')
    .orderBy('name', 'asc');

  for (const user of users) {
    user.teams = await db('teams as t')
      .join('user_teams as ut', 'ut.team_id', 't.id')
      .where('ut.user_id', user.id)
      .select('t.id', 't.name', 't.slug', 'ut.role as team_role')
      .orderBy('t.name', 'asc');
  }

  return users;
}

export async function createUser({ email, name, password, avatar_url, role = 'member', team_ids = [] }) {
  const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`;
  const passwordHash = password ? hashPassword(password) : null;
  const validRole = role === 'admin' ? 'admin' : 'member';

  const insertResult = await db('users').insert({
    email: email.trim().toLowerCase(),
    name: name.trim(),
    password_hash: passwordHash,
    avatar_url: avatar,
    role: validRole
  });

  let userId = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (typeof userId === 'object' && userId !== null) {
    userId = userId.id || userId;
  }

  if (Array.isArray(team_ids) && team_ids.length > 0) {
    for (const item of team_ids) {
      const teamId = typeof item === 'object' && item !== null ? Number(item.id || item.team_id) : Number(item);
      const teamRole = typeof item === 'object' && item?.role ? (item.role === 'manager' ? 'manager' : 'member') : 'member';
      if (teamId) {
        await db('user_teams')
          .insert({ user_id: userId, team_id: teamId, role: teamRole })
          .onConflict(['user_id', 'team_id'])
          .merge(['role']);
      }
    }
  }

  return getUserById(userId);
}

export async function updateUser(id, { name, email, password, role, avatar_url, team_ids }) {
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (password) updates.password_hash = hashPassword(password);
  if (role !== undefined) updates.role = role === 'admin' ? 'admin' : 'member';
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  if (Object.keys(updates).length > 0) {
    await db('users').where('id', id).update(updates);
  }

  if (Array.isArray(team_ids)) {
    await db('user_teams').where('user_id', id).del();
    for (const item of team_ids) {
      const teamId = typeof item === 'object' && item !== null ? Number(item.id || item.team_id) : Number(item);
      const teamRole = typeof item === 'object' && item?.role ? (item.role === 'manager' ? 'manager' : 'member') : 'member';
      if (teamId) {
        await db('user_teams')
          .insert({ user_id: id, team_id: teamId, role: teamRole })
          .onConflict(['user_id', 'team_id'])
          .merge(['role']);
      }
    }
  }

  return getUserById(id);
}

export async function deleteUser(id) {
  return db('users').where('id', id).del();
}

// =============================================================================
// TEAM QUERIES
// =============================================================================

export async function getTeamManagers(teamId) {
  return db('users as u')
    .join('user_teams as ut', 'ut.user_id', 'u.id')
    .where('ut.team_id', teamId)
    .where('ut.role', 'manager')
    .select('u.id', 'u.name', 'u.email', 'u.avatar_url', 'ut.role as team_role')
    .orderBy('u.name', 'asc');
}

export async function getAllTeams(forUser = null) {
  let query = db('teams as t')
    .leftJoin('user_teams as ut', 'ut.team_id', 't.id')
    .select('t.id', 't.name', 't.slug', 't.description', 't.created_at')
    .count('ut.user_id as member_count')
    .groupBy('t.id', 't.name', 't.slug', 't.description', 't.created_at')
    .orderBy('t.id', 'asc');

  if (forUser && forUser.role !== 'admin') {
    query = query.whereExists(function () {
      this.select('*')
        .from('user_teams as ut_check')
        .whereRaw('ut_check.team_id = t.id')
        .where('ut_check.user_id', forUser.id)
        .where('ut_check.role', 'manager');
    });
  }

  const teams = await query;

  for (const t of teams) {
    t.member_count = Number(t.member_count || 0);
    t.questions = await getQuestionsByTeamId(t.id);
    t.managers = await getTeamManagers(t.id);
  }

  return teams;
}

export async function getTeamBySlug(slug) {
  const team = await db('teams').where('slug', slug).first();
  if (team) {
    team.questions = await getQuestionsByTeamId(team.id);
    team.managers = await getTeamManagers(team.id);
  }
  return team;
}

export async function getTeamById(id) {
  const team = await db('teams').where('id', id).first();
  if (team) {
    team.questions = await getQuestionsByTeamId(team.id);
    team.managers = await getTeamManagers(team.id);
  }
  return team;
}

export async function createTeam({ name, slug, description = '' }) {
  const generatedSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') : name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const result = await db('teams').insert({
    name: name.trim(),
    slug: generatedSlug,
    description: description ? description.trim() : ''
  });

  let teamId = Array.isArray(result) ? result[0] : result;
  if (typeof teamId === 'object' && teamId !== null) {
    teamId = teamId.id || teamId;
  }

  // Seed default 3 questions for new team
  await seedQuestionsForTeam(teamId);

  return getTeamById(teamId);
}

export async function updateTeam(id, { name, description }) {
  const updates = {};
  if (name !== undefined && name !== null) updates.name = name.trim();
  if (description !== undefined && description !== null) updates.description = description.trim();

  if (Object.keys(updates).length > 0) {
    await db('teams').where('id', id).update(updates);
  }

  return getTeamById(id);
}

export async function deleteTeam(id) {
  return db('teams').where('id', id).del();
}

// =============================================================================
// TEAM MEMBERS QUERIES & PERMISSIONS
// =============================================================================

export async function getTeamMembers(teamId) {
  return db('users as u')
    .join('user_teams as ut', 'ut.user_id', 'u.id')
    .where('ut.team_id', teamId)
    .select(
      'u.id',
      'u.name',
      'u.email',
      'u.avatar_url',
      'u.role as user_role',
      'ut.role as team_role',
      'ut.created_at as joined_at'
    )
    .orderBy('u.name', 'asc');
}

export async function addTeamMember(teamId, userId, teamRole = 'member') {
  const validRole = teamRole === 'manager' ? 'manager' : 'member';
  await db('user_teams')
    .insert({ user_id: Number(userId), team_id: Number(teamId), role: validRole })
    .onConflict(['user_id', 'team_id'])
    .merge(['role']);
  return getTeamMembers(teamId);
}

export async function updateTeamMemberRole(teamId, userId, teamRole) {
  const validRole = teamRole === 'manager' ? 'manager' : 'member';
  await db('user_teams')
    .where({ user_id: Number(userId), team_id: Number(teamId) })
    .update({ role: validRole });
  return getTeamMembers(teamId);
}

export async function removeTeamMember(teamId, userId) {
  await db('user_teams')
    .where({ user_id: Number(userId), team_id: Number(teamId) })
    .del();
  return getTeamMembers(teamId);
}

export async function canUserManageTeam(userId, teamId) {
  const user = await db('users').where('id', userId).first();
  if (!user) return false;
  if (user.role === 'admin') return true;

  const membership = await db('user_teams')
    .where({ user_id: userId, team_id: Number(teamId) })
    .first();

  return Boolean(membership && membership.role === 'manager');
}

// =============================================================================
// QUESTIONS QUERIES (Customizable per team)
// =============================================================================

export async function getQuestionsByTeamId(teamId) {
  const questions = await db('questions')
    .where('team_id', teamId)
    .orderBy('order_index', 'asc')
    .orderBy('id', 'asc');

  return questions.map(q => ({
    ...q,
    is_required: Boolean(q.is_required)
  }));
}

export async function getQuestionById(id) {
  const question = await db('questions').where('id', id).first();
  if (!question) return null;
  return {
    ...question,
    is_required: Boolean(question.is_required)
  };
}

export async function createQuestion(teamId, { text, is_required = true, order_index }) {
  let index = order_index;
  if (index === undefined || index === null) {
    const maxOrder = await db('questions').where('team_id', teamId).max('order_index as max_index').first();
    index = (maxOrder?.max_index ?? -1) + 1;
  }

  const result = await db('questions').insert({
    team_id: teamId,
    text: text.trim(),
    is_required: Boolean(is_required),
    order_index: index,
    updated_at: db.fn.now()
  });

  let qId = Array.isArray(result) ? result[0] : result;
  if (typeof qId === 'object' && qId !== null) qId = qId.id || qId;

  return getQuestionById(qId);
}

export async function updateQuestion(id, { text, is_required, order_index }) {
  const updates = { updated_at: db.fn.now() };
  if (text !== undefined) updates.text = text.trim();
  if (is_required !== undefined) updates.is_required = Boolean(is_required);
  if (order_index !== undefined) updates.order_index = Number(order_index);

  await db('questions').where('id', id).update(updates);
  return getQuestionById(id);
}

export async function deleteQuestion(id) {
  return db('questions').where('id', id).del();
}

export async function setTeamQuestions(teamId, questionsList) {
  // Replace / update questions list atomically
  const currentQuestions = await db('questions').where('team_id', teamId);
  const currentIds = new Set(currentQuestions.map(q => q.id));
  const keepIds = new Set();

  for (let i = 0; i < questionsList.length; i++) {
    const item = questionsList[i];
    if (item.id && currentIds.has(item.id)) {
      keepIds.add(item.id);
      await db('questions').where('id', item.id).update({
        text: item.text.trim(),
        is_required: item.is_required !== undefined ? Boolean(item.is_required) : true,
        order_index: i,
        updated_at: db.fn.now()
      });
    } else {
      const inserted = await db('questions').insert({
        team_id: teamId,
        text: item.text.trim(),
        is_required: item.is_required !== undefined ? Boolean(item.is_required) : true,
        order_index: i,
        updated_at: db.fn.now()
      });
      let newId = Array.isArray(inserted) ? inserted[0] : inserted;
      if (typeof newId === 'object' && newId !== null) newId = newId.id || newId;
      keepIds.add(newId);
    }
  }

  // Delete questions that were removed
  for (const q of currentQuestions) {
    if (!keepIds.has(q.id)) {
      await db('questions').where('id', q.id).del();
    }
  }

  return getQuestionsByTeamId(teamId);
}

export async function resetTeamQuestionsToDefaults(teamId) {
  await db('questions').where('team_id', teamId).del();
  for (let i = 0; i < DEFAULT_STANDUP_QUESTIONS.length; i++) {
    const q = DEFAULT_STANDUP_QUESTIONS[i];
    await db('questions').insert({
      team_id: teamId,
      text: q.text,
      order_index: i,
      is_required: q.is_required,
      updated_at: db.fn.now()
    });
  }
  return getQuestionsByTeamId(teamId);
}

// =============================================================================
// STANDUP QUERIES
// =============================================================================

async function attachAnswersToStandups(standups) {
  if (!standups || standups.length === 0) return standups;

  const standupIds = standups.map(s => s.id);
  const allAnswers = await db('standup_answers')
    .whereIn('standup_id', standupIds)
    .orderBy('id', 'asc');

  const answersByStandup = {};
  for (const ans of allAnswers) {
    if (!answersByStandup[ans.standup_id]) {
      answersByStandup[ans.standup_id] = [];
    }
    answersByStandup[ans.standup_id].push({
      id: ans.id,
      question_id: ans.question_id,
      question_text: ans.question_text,
      answer: ans.answer
    });
  }

  for (const s of standups) {
    s.answers = answersByStandup[s.id] || [];
  }

  return standups;
}

export async function getStandupsByTeamAndDate(teamId, date) {
  const standups = await db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.team_id', teamId)
    .where('s.date', date)
    .select(
      's.id',
      's.user_id',
      's.team_id',
      's.date',
      's.created_at',
      's.updated_at',
      'u.name as user_name',
      'u.email as user_email',
      'u.avatar_url as user_avatar',
      'u.role as user_role'
    )
    .orderBy('s.updated_at', 'desc');

  return attachAnswersToStandups(standups);
}

export async function getTodayStandupsForUser(userId, date) {
  const standups = await db('standups as s')
    .join('teams as t', 't.id', 's.team_id')
    .where('s.user_id', userId)
    .where('s.date', date)
    .select(
      's.id',
      's.team_id',
      's.date',
      's.created_at',
      's.updated_at',
      't.name as team_name',
      't.slug as team_slug'
    );

  return attachAnswersToStandups(standups);
}

export async function saveStandup({ user_id, team_id, date, answers, yesterday, today, blockers }) {
  // Upsert the standup parent row
  await db('standups')
    .insert({
      user_id,
      team_id,
      date,
      updated_at: db.fn.now()
    })
    .onConflict(['user_id', 'team_id', 'date'])
    .merge({
      updated_at: db.fn.now()
    });

  const standup = await db('standups')
    .where({ user_id, team_id, date })
    .first();

  // Clear previous answers for this standup submission
  await db('standup_answers').where('standup_id', standup.id).del();

  const teamQuestions = await getQuestionsByTeamId(team_id);
  const questionMap = new Map(teamQuestions.map(q => [q.id, q]));

  // Handle dynamic answers array
  if (Array.isArray(answers) && answers.length > 0) {
    for (const item of answers) {
      const q = item.question_id ? questionMap.get(Number(item.question_id)) : null;
      const questionText = item.question_text || q?.text || 'Question';
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: item.question_id ? Number(item.question_id) : null,
        question_text: questionText,
        answer: (item.answer || '').trim()
      });
    }
  } else {
    // Legacy support for { yesterday, today, blockers }
    const q1 = teamQuestions[0];
    const q2 = teamQuestions[1];
    const q3 = teamQuestions[2];

    if (yesterday !== undefined) {
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: q1?.id || null,
        question_text: q1?.text || DEFAULT_STANDUP_QUESTIONS[0].text,
        answer: yesterday.trim()
      });
    }
    if (today !== undefined) {
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: q2?.id || null,
        question_text: q2?.text || DEFAULT_STANDUP_QUESTIONS[1].text,
        answer: today.trim()
      });
    }
    if (blockers !== undefined) {
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: q3?.id || null,
        question_text: q3?.text || DEFAULT_STANDUP_QUESTIONS[2].text,
        answer: blockers.trim()
      });
    }
  }

  // Fetch complete response with metadata & answers
  const result = await db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .join('teams as t', 't.id', 's.team_id')
    .where('s.id', standup.id)
    .select('s.*', 'u.name as user_name', 'u.avatar_url as user_avatar', 't.name as team_name')
    .first();

  const enriched = await attachAnswersToStandups([result]);
  return enriched[0];
}
