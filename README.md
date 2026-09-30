# Daily Standups Application

A lightweight morning standup application built with **Vue 3** (frontend) and **Node.js / Fastify** with **SQLite** (backend).

## Project Structure

```
daily-standups/
├── client/          # Vue 3 + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── views/
│   │   └── router/
│   └── package.json
├── server/          # Node.js + Fastify + SQLite backend
│   ├── data/
│   │   └── seed.json   # External initial seed data
│   ├── src/
│   │   ├── db/
│   │   ├── routes/
│   │   └── utils/
│   └── package.json
├── .env.example     # Environment variable template
└── .gitignore
```

## Getting Started

### 1. Install Dependencies
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Run in Development Mode

Run backend (Fastify) on port 3000:
```bash
cd server
npm run dev
```

Run frontend (Vite dev server) on port 5173:
```bash
cd client
npm run dev
```

### 3. Production Build & Serving
Build the Vue client:
```bash
cd client
npm run build
```

When `client/dist` exists, the Fastify server serves the static frontend alongside the API from a single process on port 3000:
```bash
cd server
npm start
```

## Initial Credentials & Configuration
Initial teams and admin user are seeded on first launch:
- **Default Admin Username:** `admin` (no email configured)
- **Default Admin Password:** `adminpassword123`

> **Note for Production:** In production, specify `ADMIN_USERNAME` (default `admin`), optional `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in your environment or `.env` file. When `ADMIN_PASSWORD` is supplied, the server automatically synchronizes the admin account's password on startup.

## Docker Deployment (DevOps)

### 1. Build the Docker Image
```bash
docker build -t daily-standups .
```

### 2. Run with SQLite (Default)
Mount a Docker volume to `/app/server/data` to persist your SQLite database across restarts:
```bash
docker run -d \
  --name daily-standups \
  -p 3000:3000 \
  -v daily_standups_data:/app/server/data \
  -e SESSION_SECRET="your-strong-random-secret-key-at-least-32-chars" \
  -e ADMIN_PASSWORD="your-secure-admin-password" \
  daily-standups
```

### 3. Run with PostgreSQL or MySQL
Provide your database connection via environment variables:
```bash
# PostgreSQL example
docker run -d \
  --name daily-standups \
  -p 3000:3000 \
  -e DB_CLIENT=pg \
  -e DATABASE_URL="postgres://user:password@postgres-host:5432/daily_standups" \
  -e SESSION_SECRET="your-strong-random-secret-key-at-least-32-chars" \
  -e ADMIN_PASSWORD="your-secure-admin-password" \
  daily-standups
```

### 4. Health Check
The container exposes a health check endpoint at `/api/health`. Docker will report container health automatically:
```bash
docker inspect --format='{{json .State.Health.Status}}' daily-standups
```

## Documentation

For more detailed guides and architecture references, consult the documentation:

- [**Architecture Overview**](docs/architecture.md): System design, Knex multi-database layer (SQLite, PostgreSQL, MySQL), database schema, and security model.
- [**Features & Modules**](docs/features.md): Details on customizable team questions, team posts & hand-off updates, avatars & profile photo uploads, role-based access control (RBAC), and markdown formatting.
- [**Deployment Guide**](docs/deployment.md): Complete guide to Docker deployments, environment variables reference, volume persistence, and database setups.
- [**DigitalOcean Deployment Guide**](docs/digitalocean-deployment.md): Step-by-step guide for deploying to DigitalOcean with PostgreSQL (App Platform & Droplet).
- [**Changelog**](CHANGELOG.md): Record of notable updates and release notes.

