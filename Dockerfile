# ==============================================================================
# Multi-Stage Dockerfile for Daily Standups Application
# 1. client-builder: Builds the Vue 3 frontend
# 2. server-builder: Installs backend production dependencies (native addons)
# 3. runner: Lean production runtime image serving both API and static UI
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend (Vue 3 + Vite + Tailwind)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS client-builder
WORKDIR /build/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Server Dependencies (Compiles better-sqlite3 native modules)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS server-builder
WORKDIR /build/server

# Install build tools required for native C++ Node addons (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
RUN npm ci --omit=dev

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# 1. Copy built frontend to /app/client/dist (matching Fastify static file lookup)
COPY --from=client-builder /build/client/dist /app/client/dist

# 2. Setup server in /app/server
WORKDIR /app/server
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY server/package*.json ./
COPY server/data ./data
COPY server/src ./src

# Ensure data directory exists for SQLite database storage
RUN mkdir -p /app/server/data

# Persistent volume for SQLite database storage and custom seeds
VOLUME ["/app/server/data"]

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
