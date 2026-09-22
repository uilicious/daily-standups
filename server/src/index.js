import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import standupRoutes from './routes/standups.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const server = Fastify({
  logger: process.env.NODE_ENV !== 'test'
});

// Initialize database
initDatabase();

// Register CORS
await server.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Register Cookie & Session
await server.register(fastifyCookie);
await server.register(fastifySession, {
  secret: process.env.SESSION_SECRET || 'a-very-secure-standup-session-key-minimum-32-chars-long!',
  cookieName: 'standup_sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
    path: '/'
  }
});

// Health check endpoint
server.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register API Route Plugins
await server.register(authRoutes, { prefix: '/api/auth' });
await server.register(teamRoutes, { prefix: '/api/teams' });
await server.register(standupRoutes, { prefix: '/api/standups' });
await server.register(adminRoutes, { prefix: '/api/admin' });

// Serve static frontend in production or if client/dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  await server.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/'
  });

  server.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api')) {
      reply.code(404).send({ error: 'API route not found' });
    } else {
      reply.sendFile('index.html');
    }
  });
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`🚀 Fastify standups server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
