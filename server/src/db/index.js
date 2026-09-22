import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { hashPassword } from '../utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'standups.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_teams (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS standups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      yesterday TEXT NOT NULL,
      today TEXT NOT NULL,
      blockers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, team_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_standups_team_date ON standups(team_id, date);
    CREATE INDEX IF NOT EXISTS idx_standups_user_date ON standups(user_id, date);
  `);

  seedFromExternalFile();
}

export function seedFromExternalFile() {
  const seedFilePath = process.env.SEED_FILE || path.join(dbDir, 'seed.json');
  if (!fs.existsSync(seedFilePath)) {
    console.warn(`[Seed] Seed file not found at ${seedFilePath}, skipping seeding.`);
    return;
  }

  let seedData;
  try {
    const raw = fs.readFileSync(seedFilePath, 'utf-8');
    seedData = JSON.parse(raw);
  } catch (err) {
    console.error(`[Seed] Error reading or parsing seed file ${seedFilePath}:`, err);
    return;
  }

  // 1. Seed teams if teams table is empty
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  if (teamCount === 0 && Array.isArray(seedData.teams)) {
    const insertTeam = db.prepare('INSERT INTO teams (name, slug, description) VALUES (?, ?, ?)');
    for (const team of seedData.teams) {
      insertTeam.run(team.name, team.slug, team.description || '');
    }
    console.log(`[Seed] Seeded ${seedData.teams.length} teams from ${path.basename(seedFilePath)}`);
  }

  // 2. Seed admin user ONLY if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0 && seedData.admin) {
    const admin = seedData.admin;
    const passwordHash = admin.password ? hashPassword(admin.password) : null;
    const avatar = admin.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(admin.name || admin.email)}`;

    const insertUser = db.prepare(`
      INSERT INTO users (email, name, password_hash, avatar_url, role)
      VALUES (?, ?, ?, ?, 'admin')
    `);

    const result = insertUser.run(
      admin.email.trim().toLowerCase(),
      admin.name.trim(),
      passwordHash,
      avatar
    );
    const adminId = result.lastInsertRowid;

    // Assign admin to designated teams if specified
    if (Array.isArray(admin.teams) && admin.teams.length > 0) {
      const getTeamBySlugOrId = db.prepare('SELECT id FROM teams WHERE slug = ? OR id = ?');
      const insertUserTeam = db.prepare('INSERT OR IGNORE INTO user_teams (user_id, team_id) VALUES (?, ?)');

      for (const teamIdentifier of admin.teams) {
        const team = getTeamBySlugOrId.get(teamIdentifier, teamIdentifier);
        if (team) {
          insertUserTeam.run(adminId, team.id);
        }
      }
    }

    console.log(`[Seed] Seeded initial admin user (${admin.email}) from ${path.basename(seedFilePath)}`);
  }
}

export default db;
