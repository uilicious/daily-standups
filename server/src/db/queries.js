import db from './index.js';
import { hashPassword } from '../utils/auth.js';

export async function getUserById(id) {
  const user = await db('users')
    .select('id', 'email', 'name', 'avatar_url', 'role', 'created_at')
    .where('id', id)
    .first();

  if (!user) return null;

  user.teams = await db('teams as t')
    .join('user_teams as ut', 'ut.team_id', 't.id')
    .where('ut.user_id', id)
    .select('t.id', 't.name', 't.slug', 't.description')
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
    .select('t.id', 't.name', 't.slug', 't.description')
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
    .select('t.id', 't.name', 't.slug', 't.description')
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
      .select('t.id', 't.name', 't.slug')
      .orderBy('t.name', 'asc');
  }

  return users;
}

export async function createUser({ email, name, password, avatar_url, role = 'member', team_ids = [] }) {
  const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`;
  const passwordHash = password ? hashPassword(password) : null;

  const insertResult = await db('users').insert({
    email: email.trim().toLowerCase(),
    name: name.trim(),
    password_hash: passwordHash,
    avatar_url: avatar,
    role
  });

  let userId = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  if (typeof userId === 'object' && userId !== null) {
    userId = userId.id || userId;
  }

  if (Array.isArray(team_ids) && team_ids.length > 0) {
    for (const teamId of team_ids) {
      await db('user_teams')
        .insert({ user_id: userId, team_id: Number(teamId) })
        .onConflict(['user_id', 'team_id'])
        .ignore();
    }
  }

  return getUserById(userId);
}

export async function updateUser(id, { name, email, password, role, avatar_url, team_ids }) {
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (password) updates.password_hash = hashPassword(password);
  if (role !== undefined) updates.role = role;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  if (Object.keys(updates).length > 0) {
    await db('users').where('id', id).update(updates);
  }

  if (Array.isArray(team_ids)) {
    await db('user_teams').where('user_id', id).del();
    for (const teamId of team_ids) {
      await db('user_teams')
        .insert({ user_id: id, team_id: Number(teamId) })
        .onConflict(['user_id', 'team_id'])
        .ignore();
    }
  }

  return getUserById(id);
}

export async function deleteUser(id) {
  return db('users').where('id', id).del();
}

export async function getAllTeams() {
  const teams = await db('teams as t')
    .leftJoin('user_teams as ut', 'ut.team_id', 't.id')
    .select('t.id', 't.name', 't.slug', 't.description', 't.created_at')
    .count('ut.user_id as member_count')
    .groupBy('t.id', 't.name', 't.slug', 't.description', 't.created_at')
    .orderBy('t.id', 'asc');

  // Normalize member_count to integer
  return teams.map(t => ({
    ...t,
    member_count: Number(t.member_count || 0)
  }));
}

export async function getTeamBySlug(slug) {
  return db('teams').where('slug', slug).first();
}

export async function getTeamById(id) {
  return db('teams').where('id', id).first();
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

export async function getStandupsByTeamAndDate(teamId, date) {
  return db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.team_id', teamId)
    .where('s.date', date)
    .select(
      's.id',
      's.user_id',
      's.team_id',
      's.date',
      's.yesterday',
      's.today',
      's.blockers',
      's.created_at',
      's.updated_at',
      'u.name as user_name',
      'u.email as user_email',
      'u.avatar_url as user_avatar',
      'u.role as user_role'
    )
    .orderBy('s.updated_at', 'desc');
}

export async function getTodayStandupsForUser(userId, date) {
  return db('standups as s')
    .join('teams as t', 't.id', 's.team_id')
    .where('s.user_id', userId)
    .where('s.date', date)
    .select(
      's.id',
      's.team_id',
      's.date',
      's.yesterday',
      's.today',
      's.blockers',
      's.created_at',
      's.updated_at',
      't.name as team_name',
      't.slug as team_slug'
    );
}

export async function saveStandup({ user_id, team_id, date, yesterday, today, blockers }) {
  await db('standups')
    .insert({
      user_id,
      team_id,
      date,
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers ? blockers.trim() : '',
      updated_at: db.fn.now()
    })
    .onConflict(['user_id', 'team_id', 'date'])
    .merge({
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers ? blockers.trim() : '',
      updated_at: db.fn.now()
    });

  return db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .join('teams as t', 't.id', 's.team_id')
    .where('s.user_id', user_id)
    .where('s.team_id', team_id)
    .where('s.date', date)
    .select('s.*', 'u.name as user_name', 'u.avatar_url as user_avatar', 't.name as team_name')
    .first();
}
