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

## Initial Credentials
Initial teams and admin user are loaded from `server/data/seed.json`:
- **Admin Email:** `admin@example.com`
- **Password:** `adminpassword123`
