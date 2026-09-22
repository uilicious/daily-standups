import knex from 'knex';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { hashPassword } from '../utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../../data');

function getDatabaseConfig() {
  const dbClient = (process.env.DB_CLIENT || '').toLowerCase();
  const databaseUrl = process.env.DATABASE_URL || '';

  // 1. PostgreSQL
  if (dbClient === 'pg' || dbClient === 'postgres' || dbClient === 'postgresql' || databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    return {
      client: 'pg',
      connection: databaseUrl || {
        host: process.env.PGHOST || process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
        user: process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'daily_standups',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
      },
      pool: { min: 2, max: 10 }
    };
  }

  // 2. MySQL
  if (dbClient === 'mysql' || dbClient === 'mysql2' || databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://')) {
    return {
      client: 'mysql2',
      connection: databaseUrl || {
        host: process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
        user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'daily_standups'
      },
      pool: { min: 2, max: 10 }
    };
  }

  // 3. Default: SQLite (better-sqlite3)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqliteFile = process.env.SQLITE_FILENAME || (databaseUrl.startsWith('sqlite://') ? databaseUrl.replace('sqlite://', '') : path.join(dbDir, 'standups.db'));

  return {
    client: 'better-sqlite3',
    connection: {
      filename: sqliteFile
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.pragma('journal_mode = WAL');
        conn.pragma('foreign_keys = ON');
        done(null, conn);
      }
    }
  };
}

const db = knex(getDatabaseConfig());

export async function initDatabase() {
  // 1. users table
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email').unique().notNullable();
      table.string('name').notNullable();
      table.string('password_hash').nullable();
      table.text('avatar_url').nullable();
      table.string('role').notNullable().defaultTo('member');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 2. teams table
  const hasTeams = await db.schema.hasTable('teams');
  if (!hasTeams) {
    await db.schema.createTable('teams', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('slug').unique().notNullable();
      table.text('description').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 3. user_teams junction table
  const hasUserTeams = await db.schema.hasTable('user_teams');
  if (!hasUserTeams) {
    await db.schema.createTable('user_teams', (table) => {
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('team_id').unsigned().notNullable()
        .references('id').inTable('teams').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.primary(['user_id', 'team_id']);
    });
  }

  // 4. standups table
  const hasStandups = await db.schema.hasTable('standups');
  if (!hasStandups) {
    await db.schema.createTable('standups', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('team_id').unsigned().notNullable()
        .references('id').inTable('teams').onDelete('CASCADE');
      table.string('date', 10).notNullable(); // YYYY-MM-DD
      table.text('yesterday').notNullable();
      table.text('today').notNullable();
      table.text('blockers').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      table.unique(['user_id', 'team_id', 'date']);
      table.index(['team_id', 'date']);
      table.index(['user_id', 'date']);
    });
  }

  await seedFromExternalFile();
}

export async function seedFromExternalFile() {
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
  const teamCountRow = await db('teams').count('id as count').first();
  const teamCount = Number(teamCountRow?.count || 0);

  if (teamCount === 0 && Array.isArray(seedData.teams)) {
    for (const team of seedData.teams) {
      await db('teams').insert({
        name: team.name,
        slug: team.slug,
        description: team.description || ''
      });
    }
    console.log(`[Seed] Seeded ${seedData.teams.length} teams from ${path.basename(seedFilePath)}`);
  }

  // 2. Seed admin user ONLY if users table is empty
  const userCountRow = await db('users').count('id as count').first();
  const userCount = Number(userCountRow?.count || 0);

  if (userCount === 0 && seedData.admin) {
    const admin = seedData.admin;
    const passwordHash = admin.password ? hashPassword(admin.password) : null;
    const avatar = admin.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(admin.name || admin.email)}`;

    const insertResult = await db('users').insert({
      email: admin.email.trim().toLowerCase(),
      name: admin.name.trim(),
      password_hash: passwordHash,
      avatar_url: avatar,
      role: 'admin'
    });

    let adminId = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    if (typeof adminId === 'object' && adminId !== null) {
      adminId = adminId.id || adminId;
    }

    // Assign admin to designated teams if specified
    if (Array.isArray(admin.teams) && admin.teams.length > 0) {
      for (const teamIdentifier of admin.teams) {
        const team = await db('teams')
          .where('slug', teamIdentifier)
          .orWhere('id', isNaN(teamIdentifier) ? -1 : Number(teamIdentifier))
          .first();
        if (team) {
          await db('user_teams')
            .insert({ user_id: adminId, team_id: team.id })
            .onConflict(['user_id', 'team_id'])
            .ignore();
        }
      }
    }

    console.log(`[Seed] Seeded initial admin user (${admin.email}) from ${path.basename(seedFilePath)}`);
  }
}

export default db;
