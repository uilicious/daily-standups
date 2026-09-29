# Architecture Overview

This document describes the architectural design, technology stack, database layer, and security model of the Daily Standups application.

---

## 1. System Design

The application is structured as a decoupled client-server architecture that can be deployed independently or unified into a single process for production:

```
daily-standups/
├── client/              # Vue 3 SPA (Vite + Tailwind CSS)
└── server/              # Node.js REST API (Fastify + Knex.js)
```

- **Frontend**: Vue 3 Single Page Application (SPA) using Vite, Tailwind CSS, Lucide icons, and Vue Router.
- **Backend**: Fastify REST API in Node.js (ES Modules). Fastify provides fast HTTP processing and built-in schema validation.
- **Unified Production Serving**: When built (`client/dist`), Fastify serves static client assets alongside `/api` routes from a single port (default `3000`), avoiding the need for an external reverse proxy in simple deployments.

---

## 2. Multi-Database Layer (Knex.js)

The backend uses **Knex.js** as a query builder, providing database engine independence across SQLite, PostgreSQL, and MySQL.

### Supported Databases

| Engine | Driver | Configuration |
|---|---|---|
| **SQLite** (Default) | `better-sqlite3` | `DB_CLIENT=better-sqlite3` (or zero config). Uses WAL mode & foreign keys. Default path: `server/data/standups.db`. |
| **PostgreSQL** | `pg` | `DB_CLIENT=pg` with `DATABASE_URL` or `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`. |
| **MySQL / MariaDB** | `mysql2` | `DB_CLIENT=mysql2` with `DATABASE_URL` or `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, etc. |

### Schema Initialization & Migrations

Database tables are verified and initialized automatically on server startup via `initDatabase()` in `server/src/db/index.js`. Tables include:

- `users`: User accounts, emails, password hashes, avatar URLs, and global roles (`admin`, `member`).
- `teams`: Team definitions, names, slugs, and descriptions.
- `user_teams`: Team membership junction table with scoped roles (`member`, `manager`).
- `questions`: Customizable standup questions ordered by `order_index` per team.
- `standups`: Standup submission records per user, team, and date (`YYYY-MM-DD`).
- `standup_answers`: Dynamic answers linked to specific questions and standup entries.
- `user_work_schedules`: Individual weekly working days (e.g., `[1, 2, 3, 4, 5]`).
- `user_ooo_entries`: Scheduled Out of Office leaves (date ranges, period: `all_day`, `morning`, `afternoon`, reason).
- `org_settings`: Global configuration key-values (e.g., `org_work_days`).
- `team_posts`: Standard team announcements and hand-off handover updates.

---

## 3. Authentication & Security

- **Session Management**: Session authentication is powered by `@fastify/cookie` and `@fastify/session`. Cookies are configured with `httpOnly: true`, `sameSite: 'lax'`, and 7-day expiration.
- **Password Hashing**: Uses Node.js `crypto.scrypt` with a cryptographically secure salt.
- **Startup Password Sync**: If `ADMIN_PASSWORD` is defined in the environment, the admin user's password hash is automatically updated on startup, simplifying automated deployments.
- **Google OAuth 2.0**: Optional Single Sign-On (SSO) integration via Google OAuth.
- **Sanitized Markdown Rendering**: User Markdown input is sanitized using `DOMPurify` before DOM rendering to prevent XSS attacks.
