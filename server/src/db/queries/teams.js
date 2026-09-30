import db, { seedQuestionsForTeam } from '../index.js';
import { getQuestionsByTeamId } from './questions.js';

export async function getTeamManagers(teamId) {
  return db('users as u')
    .join('user_teams as ut', 'ut.user_id', 'u.id')
    .where('ut.team_id', teamId)
    .where('ut.role', 'manager')
    .select('u.id', 'u.username', 'u.name', 'u.email', 'u.avatar_url', 'ut.role as team_role')
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

export async function getTeamMembers(teamId) {
  return db('users as u')
    .join('user_teams as ut', 'ut.user_id', 'u.id')
    .where('ut.team_id', teamId)
    .select(
      'u.id',
      'u.username',
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
