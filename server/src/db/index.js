import knex from 'knex';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { hashPassword } from '../utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../../data');

export const DEFAULT_STANDUP_QUESTIONS = [
  { text: 'What did you do yesterday (or the previous working day)?', is_required: true },
  { text: 'What are you working on today?', is_required: true },
  { text: 'Any blockers? And who do you need help from?', is_required: false }
];

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
  } else {
    const hasManagerId = await db.schema.hasColumn('teams', 'manager_id');
    if (hasManagerId) {
      try {
        await db.schema.alterTable('teams', (table) => {
          table.dropColumn('manager_id');
        });
      } catch (err) {
        // ignore if database driver does not support dropping column
      }
    }
  }

  // 3. user_teams junction table
  const hasUserTeams = await db.schema.hasTable('user_teams');
  if (!hasUserTeams) {
    await db.schema.createTable('user_teams', (table) => {
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('team_id').unsigned().notNullable()
        .references('id').inTable('teams').onDelete('CASCADE');
      table.string('role').notNullable().defaultTo('member');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.primary(['user_id', 'team_id']);
    });
  } else {
    const hasRole = await db.schema.hasColumn('user_teams', 'role');
    if (!hasRole) {
      await db.schema.alterTable('user_teams', (table) => {
        table.string('role').notNullable().defaultTo('member');
      });
    }
  }

  // 4. questions table (custom questions per team)
  const hasQuestions = await db.schema.hasTable('questions');
  if (!hasQuestions) {
    await db.schema.createTable('questions', (table) => {
      table.increments('id').primary();
      table.integer('team_id').unsigned().notNullable()
        .references('id').inTable('teams').onDelete('CASCADE');
      table.text('text').notNullable();
      table.integer('order_index').notNullable().defaultTo(0);
      table.boolean('is_required').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      table.index(['team_id', 'order_index']);
    });
  }

  // 5. standups table
  const hasStandups = await db.schema.hasTable('standups');
  if (!hasStandups) {
    await db.schema.createTable('standups', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('team_id').unsigned().notNullable()
        .references('id').inTable('teams').onDelete('CASCADE');
      table.string('date', 10).notNullable(); // YYYY-MM-DD
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      table.unique(['user_id', 'team_id', 'date']);
      table.index(['team_id', 'date']);
      table.index(['user_id', 'date']);
    });
  }

  // 6. standup_answers table (dynamic responses to questions)
  const hasStandupAnswers = await db.schema.hasTable('standup_answers');
  if (!hasStandupAnswers) {
    await db.schema.createTable('standup_answers', (table) => {
      table.increments('id').primary();
      table.integer('standup_id').unsigned().notNullable()
        .references('id').inTable('standups').onDelete('CASCADE');
      table.integer('question_id').unsigned().nullable()
        .references('id').inTable('questions').onDelete('SET NULL');
      table.text('question_text').notNullable();
      table.text('answer').notNullable().defaultTo('');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      table.index(['standup_id']);
    });
  }

  await seedFromExternalFile();
  await ensureQuestionsForExistingTeams();
  await migrateLegacyStandupAnswers();
  await syncAdminPasswordFromEnv();
}

export async function ensureQuestionsForExistingTeams() {
  const teams = await db('teams').select('id');
  for (const team of teams) {
    await seedQuestionsForTeam(team.id);
  }
}

export async function seedQuestionsForTeam(teamId) {
  const countRow = await db('questions').where('team_id', teamId).count('id as count').first();
  if (Number(countRow?.count || 0) === 0) {
    for (let i = 0; i < DEFAULT_STANDUP_QUESTIONS.length; i++) {
      const q = DEFAULT_STANDUP_QUESTIONS[i];
      await db('questions').insert({
        team_id: teamId,
        text: q.text,
        order_index: i,
        is_required: q.is_required
      });
    }
  }
}

async function migrateLegacyStandupAnswers() {
  const hasYesterday = await db.schema.hasColumn('standups', 'yesterday');
  if (!hasYesterday) return;

  const existingStandups = await db('standups').select('*');
  for (const s of existingStandups) {
    const existingCount = await db('standup_answers').where('standup_id', s.id).count('id as count').first();
    if (Number(existingCount?.count || 0) > 0) continue;

    const teamQuestions = await db('questions')
      .where('team_id', s.team_id)
      .orderBy('order_index', 'asc');

    const q1 = teamQuestions[0];
    const q2 = teamQuestions[1];
    const q3 = teamQuestions[2];

    if (s.yesterday) {
      await db('standup_answers').insert({
        standup_id: s.id,
        question_id: q1?.id || null,
        question_text: q1?.text || DEFAULT_STANDUP_QUESTIONS[0].text,
        answer: s.yesterday
      });
    }
    if (s.today) {
      await db('standup_answers').insert({
        standup_id: s.id,
        question_id: q2?.id || null,
        question_text: q2?.text || DEFAULT_STANDUP_QUESTIONS[1].text,
        answer: s.today
      });
    }
    if (s.blockers) {
      await db('standup_answers').insert({
        standup_id: s.id,
        question_id: q3?.id || null,
        question_text: q3?.text || DEFAULT_STANDUP_QUESTIONS[2].text,
        answer: s.blockers
      });
    }
  }

  try {
    await db.schema.alterTable('standups', (table) => {
      table.dropColumn('yesterday');
      table.dropColumn('today');
      table.dropColumn('blockers');
    });
  } catch (err) {
    // legacy columns already dropped
  }
}

export async function syncAdminPasswordFromEnv() {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword || !envPassword.trim()) {
    return;
  }

  const rawPassword = envPassword.trim();
  const newHash = hashPassword(rawPassword);

  let targetEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;

  if (!targetEmail) {
    const seedFilePath = process.env.SEED_FILE || path.join(dbDir, 'seed.json');
    if (fs.existsSync(seedFilePath)) {
      try {
        const raw = fs.readFileSync(seedFilePath, 'utf-8');
        const seedData = JSON.parse(raw);
        if (seedData.admin?.email) {
          targetEmail = seedData.admin.email.trim().toLowerCase();
        }
      } catch (e) {
        // ignore
      }
    }
  }

  let adminUser = null;
  if (targetEmail) {
    adminUser = await db('users').whereRaw('LOWER(email) = ?', [targetEmail]).first();
  }

  if (!adminUser) {
    adminUser = await db('users').where('role', 'admin').first();
  }

  if (adminUser) {
    await db('users')
      .where('id', adminUser.id)
      .update({
        password_hash: newHash,
        role: 'admin'
      });
    console.log(`[Auth] Admin password for "${adminUser.email}" was reset from environment (ADMIN_PASSWORD).`);
  } else {
    const emailToUse = targetEmail || 'admin@example.com';
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emailToUse)}`;
    await db('users').insert({
      email: emailToUse,
      name: 'System Administrator',
      password_hash: newHash,
      avatar_url: avatar,
      role: 'admin'
    });
    console.log(`[Auth] Admin user "${emailToUse}" created with password from environment (ADMIN_PASSWORD).`);
  }
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
      const inserted = await db('teams').insert({
        name: team.name,
        slug: team.slug,
        description: team.description || ''
      });
      let teamId = Array.isArray(inserted) ? inserted[0] : inserted;
      if (typeof teamId === 'object' && teamId !== null) teamId = teamId.id || teamId;
      await seedQuestionsForTeam(teamId);
    }
    console.log(`[Seed] Seeded ${seedData.teams.length} teams from ${path.basename(seedFilePath)}`);
  }

  // 2. Seed admin user ONLY if users table is empty
  const userCountRow = await db('users').count('id as count').first();
  const userCount = Number(userCountRow?.count || 0);

  if (userCount === 0 && seedData.admin) {
    const admin = seedData.admin;
    const initialPassword = process.env.ADMIN_PASSWORD || admin.password;
    const passwordHash = initialPassword ? hashPassword(initialPassword) : null;
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
