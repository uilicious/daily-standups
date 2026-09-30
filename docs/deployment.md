# Deployment & Operations Guide

This guide provides instructions for deploying the Daily Standups application using Docker or standard Node.js runtime environments.

---

## 1. Quick Start with Docker

The application includes a production-ready, multi-stage `Dockerfile` that builds the Vue 3 frontend and packages it with the Fastify backend on a slim Node.js 20 base image.

### Building the Image

```bash
docker build -t daily-standups:latest .
```

### Running with Persistent SQLite (Recommended Default)

SQLite is zero-configuration and operates in WAL mode. Persist the database file by mounting a volume to `/app/server/data`:

```bash
docker run -d \
  --name daily-standups \
  -p 3000:3000 \
  -v daily_standups_data:/app/server/data \
  -e SESSION_SECRET="generate-a-strong-random-key-at-least-32-chars" \
  -e ADMIN_PASSWORD="your-strong-admin-password" \
  daily-standups:latest
```

---

## 2. Deploying with External Databases

To connect to an external PostgreSQL or MySQL instance, configure the corresponding environment variables:

### PostgreSQL

```bash
docker run -d \
  --name daily-standups \
  -p 3000:3000 \
  -e DB_CLIENT=pg \
  -e DATABASE_URL="postgres://user:password@pg-host:5432/daily_standups" \
  -e SESSION_SECRET="generate-a-strong-random-key-at-least-32-chars" \
  -e ADMIN_PASSWORD="your-strong-admin-password" \
  daily-standups:latest
```

### MySQL / MariaDB

```bash
docker run -d \
  --name daily-standups \
  -p 3000:3000 \
  -e DB_CLIENT=mysql2 \
  -e DATABASE_URL="mysql://user:password@mysql-host:3306/daily_standups" \
  -e SESSION_SECRET="generate-a-strong-random-key-at-least-32-chars" \
  -e ADMIN_PASSWORD="your-strong-admin-password" \
  daily-standups:latest
```

---

## 3. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the HTTP server to listen on. |
| `HOST` | `0.0.0.0` | Bind address for the HTTP server. |
| `NODE_ENV` | `development` | Runtime mode (`production` enables secure cookies & optimizations). |
| `SESSION_SECRET` | *(required in prod)* | Secret string (minimum 32 characters) for signing session cookies. |
| `ADMIN_USERNAME` | `admin` | Target username for the admin user. |
| `ADMIN_EMAIL` | *(none)* | Optional email for the admin user. |
| `ADMIN_PASSWORD` | *(none)* | If set, the server updates the admin password to this value on boot. |
| `DB_CLIENT` | `better-sqlite3` | Database dialect: `better-sqlite3`, `pg`, or `mysql2`. |
| `DATABASE_URL` | *(none)* | Connection URI for PostgreSQL or MySQL. |
| `SQLITE_FILENAME` | `./data/standups.db` | Custom file path for SQLite database. |
| `SEED_FILE` | `./data/seed.json` | Path to custom initial seed JSON file. |
| `GOOGLE_CLIENT_ID` | *(optional)* | Google OAuth client ID for SSO. |
| `GOOGLE_CLIENT_SECRET` | *(optional)* | Google OAuth client secret for SSO. |
| `GOOGLE_REDIRECT_URI` | *(optional)* | Callback URI for Google OAuth redirect. |

---

## 4. Understanding & Configuring `SESSION_SECRET`

### What is a Session Secret?

`SESSION_SECRET` is a private, high-entropy cryptographic key used by the Fastify backend (`@fastify/session` and `@fastify/cookie`) to sign and verify HTTP session cookies (`standup_sid`).

### How It Works

1. **Cryptographic Signing (HMAC)**: When a user authenticates, the server assigns a unique session identifier and generates an HMAC (Hash-based Message Authentication Code) signature using `SESSION_SECRET`.
2. **Tamper Prevention**: The signed cookie is sent to the client browser. On subsequent requests, the browser sends the cookie back. Fastify verifies that the cookie's signature matches the secret.
3. **Session Integrity**: If a user or malicious attacker attempts to alter the cookie (e.g., modifying the session ID to hijack another user's session or escalate to an administrator account), the cryptographic signature check fails immediately, and the server rejects the request with an unauthorized error.

### Production Requirements & Best Practices

- **Never Use the Default Fallback in Production**: The codebase contains a default fallback string purely to avoid crashes during local development. If left unchanged in production, anyone with access to the source code can forge valid session tokens.
- **Minimum Length**: The secret must be at least **32 characters long** to satisfy security requirements and prevent brute-force attacks.
- **Generating a Secure Key**: You can quickly generate a secure 32-byte secret using one of the following commands:
  ```bash
  # Using OpenSSL (recommended)
  openssl rand -hex 32

  # Using Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Secret Management**: Pass `SESSION_SECRET` strictly as an environment variable or via your secret manager (e.g., Docker secrets, Kubernetes secrets, AWS Secrets Manager, HashiCorp Vault). Never commit production secrets to Git.
- **Key Rotation**: If `SESSION_SECRET` is changed or rotated, all currently active user sessions will be invalidated, requiring all logged-in users to re-authenticate.

---

## 5. Health Checks & Monitoring

The backend exposes a health check endpoint at `/api/health`:

- **Endpoint**: `GET /api/health`
- **Response**: `{"status": "ok", "timestamp": "2026-09-29T..."}`
- **HTTP Code**: `200 OK`

Docker inspect status command:
```bash
docker inspect --format='{{json .State.Health.Status}}' daily-standups
```
