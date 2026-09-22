import db from './index.js';
import { hashPassword } from '../utils/auth.js';

export function getUserById(id) {
  const user = db.prepare('SELECT id, email, name, avatar_url, role, created_at FROM users WHERE id = ?').get(id);
  if (!user) return null;

  const teams = db.prepare(`
    SELECT t.id, t.name, t.slug, t.description
    FROM teams t
    JOIN user_teams ut ON ut.team_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.name ASC
  `).all(id);

  user.teams = teams;
  return user;
}

export function getUserByEmail(email) {
  const user = db.prepare('SELECT id, email, name, avatar_url, role, created_at FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) return null;

  const teams = db.prepare(`
    SELECT t.id, t.name, t.slug, t.description
    FROM teams t
    JOIN user_teams ut ON ut.team_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.name ASC
  `).all(user.id);

  user.teams = teams;
  return user;
}

export function getUserByEmailWithPassword(email) {
  const user = db.prepare('SELECT id, email, name, password_hash, avatar_url, role, created_at FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) return null;

  const teams = db.prepare(`
    SELECT t.id, t.name, t.slug, t.description
    FROM teams t
    JOIN user_teams ut ON ut.team_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.name ASC
  `).all(user.id);

  user.teams = teams;
  return user;
}

export function getAllUsers() {
  const users = db.prepare('SELECT id, email, name, avatar_url, role, created_at FROM users ORDER BY name ASC').all();
  
  const userTeamsStmt = db.prepare(`
    SELECT t.id, t.name, t.slug
    FROM teams t
    JOIN user_teams ut ON ut.team_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.name ASC
  `);

  return users.map(user => {
    user.teams = userTeamsStmt.all(user.id);
    return user;
  });
}

export function createUser({ email, name, password, avatar_url, role = 'member', team_ids = [] }) {
  const avatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`;
  const passwordHash = password ? hashPassword(password) : null;

  const insertUser = db.prepare(`
    INSERT INTO users (email, name, password_hash, avatar_url, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertUser.run(email.trim().toLowerCase(), name.trim(), passwordHash, avatar, role);
  const userId = result.lastInsertRowid;

  if (team_ids && team_ids.length > 0) {
    const insertUserTeam = db.prepare('INSERT OR IGNORE INTO user_teams (user_id, team_id) VALUES (?, ?)');
    for (const teamId of team_ids) {
      insertUserTeam.run(userId, teamId);
    }
  }

  return getUserById(userId);
}

export function updateUser(id, { name, email, password, role, avatar_url, team_ids }) {
  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email.trim().toLowerCase());
  }
  if (password) {
    updates.push('password_hash = ?');
    params.push(hashPassword(password));
  }
  if (role !== undefined) {
    updates.push('role = ?');
    params.push(role);
  }
  if (avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    params.push(avatar_url);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (Array.isArray(team_ids)) {
    db.prepare('DELETE FROM user_teams WHERE user_id = ?').run(id);
    const insertUserTeam = db.prepare('INSERT OR IGNORE INTO user_teams (user_id, team_id) VALUES (?, ?)');
    for (const teamId of team_ids) {
      insertUserTeam.run(id, teamId);
    }
  }

  return getUserById(id);
}

export function deleteUser(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function getAllTeams() {
  return db.prepare(`
    SELECT t.id, t.name, t.slug, t.description, t.created_at,
           COUNT(ut.user_id) as member_count
    FROM teams t
    LEFT JOIN user_teams ut ON ut.team_id = t.id
    GROUP BY t.id
    ORDER BY t.id ASC
  `).all();
}

export function getTeamBySlug(slug) {
  return db.prepare('SELECT id, name, slug, description, created_at FROM teams WHERE slug = ?').get(slug);
}

export function getTeamById(id) {
  return db.prepare('SELECT id, name, slug, description, created_at FROM teams WHERE id = ?').get(id);
}

export function createTeam({ name, slug, description = '' }) {
  const generatedSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') : name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const result = db.prepare(`
    INSERT INTO teams (name, slug, description)
    VALUES (?, ?, ?)
  `).run(name.trim(), generatedSlug, description ? description.trim() : '');

  return getTeamById(result.lastInsertRowid);
}

export function updateTeam(id, { name, description }) {
  db.prepare(`
    UPDATE teams
    SET name = COALESCE(?, name),
        description = COALESCE(?, description)
    WHERE id = ?
  `).run(name ? name.trim() : null, description !== undefined ? description.trim() : null, id);

  return getTeamById(id);
}

export function deleteTeam(id) {
  return db.prepare('DELETE FROM teams WHERE id = ?').run(id);
}

export function getStandupsByTeamAndDate(teamId, date) {
  return db.prepare(`
    SELECT 
      s.id,
      s.user_id,
      s.team_id,
      s.date,
      s.yesterday,
      s.today,
      s.blockers,
      s.created_at,
      s.updated_at,
      u.name as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar,
      u.role as user_role
    FROM standups s
    JOIN users u ON u.id = s.user_id
    WHERE s.team_id = ? AND s.date = ?
    ORDER BY s.updated_at DESC
  `).all(teamId, date);
}

export function getTodayStandupsForUser(userId, date) {
  return db.prepare(`
    SELECT 
      s.id,
      s.team_id,
      s.date,
      s.yesterday,
      s.today,
      s.blockers,
      s.created_at,
      s.updated_at,
      t.name as team_name,
      t.slug as team_slug
    FROM standups s
    JOIN teams t ON t.id = s.team_id
    WHERE s.user_id = ? AND s.date = ?
  `).all(userId, date);
}

export function saveStandup({ user_id, team_id, date, yesterday, today, blockers }) {
  const stmt = db.prepare(`
    INSERT INTO standups (user_id, team_id, date, yesterday, today, blockers, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, team_id, date) DO UPDATE SET
      yesterday = excluded.yesterday,
      today = excluded.today,
      blockers = excluded.blockers,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(user_id, team_id, date, yesterday.trim(), today.trim(), blockers ? blockers.trim() : '');
  
  return db.prepare(`
    SELECT s.*, u.name as user_name, u.avatar_url as user_avatar, t.name as team_name
    FROM standups s
    JOIN users u ON u.id = s.user_id
    JOIN teams t ON t.id = s.team_id
    WHERE s.user_id = ? AND s.team_id = ? AND s.date = ?
  `).get(user_id, team_id, date);
}
