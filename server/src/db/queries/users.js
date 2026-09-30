import db from '../index.js';
import { hashPassword } from '../../utils/auth.js';

export async function getUserById(id) {
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'avatar_url', 'role', 'created_at')
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

export async function getUserByIdWithPassword(id) {
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'password_hash', 'avatar_url', 'role', 'created_at')
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
  if (!email) return null;
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'avatar_url', 'role', 'created_at')
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

export async function getUserByUsername(username) {
  if (!username) return null;
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'avatar_url', 'role', 'created_at')
    .whereRaw('LOWER(username) = ?', [username.trim().toLowerCase()])
    .first();

  if (!user) return null;

  user.teams = await db('teams as t')
    .join('user_teams as ut', 'ut.team_id', 't.id')
    .where('ut.user_id', user.id)
    .select('t.id', 't.name', 't.slug', 't.description', 'ut.role as team_role')
    .orderBy('t.name', 'asc');

  return user;
}

export async function getUserByIdentifier(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'avatar_url', 'role', 'created_at')
    .whereRaw('LOWER(username) = ?', [clean])
    .orWhereRaw('LOWER(email) = ?', [clean])
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
  if (!email) return null;
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'password_hash', 'avatar_url', 'role', 'created_at')
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

export async function getUserByIdentifierWithPassword(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const user = await db('users')
    .select('id', 'username', 'email', 'name', 'password_hash', 'avatar_url', 'role', 'created_at')
    .whereRaw('LOWER(username) = ?', [clean])
    .orWhereRaw('LOWER(email) = ?', [clean])
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
    .select('id', 'username', 'email', 'name', 'avatar_url', 'role', 'created_at')
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

export async function createUser({ username, email, name, password, avatar_url, role = 'member', team_ids = [] }) {
  const cleanUsername = username ? username.trim().toLowerCase() : '';
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
  const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || cleanUsername || cleanEmail || 'User')}`;
  const passwordHash = password ? hashPassword(password) : null;
  const validRole = role === 'admin' ? 'admin' : 'member';

  const insertResult = await db('users').insert({
    username: cleanUsername,
    email: cleanEmail,
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
  if (email !== undefined) {
    updates.email = email && email.trim() ? email.trim().toLowerCase() : null;
  }
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
