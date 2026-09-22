import { getUserByEmailWithPassword, getUserById, getUserByEmail, createUser, updateUser } from '../db/queries.js';
import { verifyPassword } from '../utils/auth.js';

export default async function authRoutes(fastify, options) {
  // 1. Password Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    const user = await getUserByEmailWithPassword(email);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    if (!user.password_hash) {
      return reply.code(401).send({ error: 'No password set for this account. Please sign in with Google SSO.' });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    request.session.userId = user.id;

    // Return sanitized user object
    const cleanUser = await getUserById(user.id);
    cleanUser.has_password = Boolean(user.password_hash);
    return { ok: true, user: cleanUser };
  });

  // 2. Current Authenticated User
  fastify.get('/me', async (request, reply) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const user = await getUserById(request.session.userId);
    if (!user) {
      request.session.destroy();
      return reply.code(401).send({ error: 'User no longer exists' });
    }

    const fullUser = await getUserByEmailWithPassword(user.email);
    user.has_password = Boolean(fullUser?.password_hash);

    return { user };
  });

  // 3. Logout
  fastify.post('/logout', async (request, reply) => {
    if (request.session) {
      request.session.destroy();
    }
    return { ok: true };
  });

  // 4. Google SSO: Generate OAuth URL
  fastify.get('/google/url', async (request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId) {
      return reply.send({
        configured: false,
        message: 'Google OAuth Client ID is not configured in environment variables (GOOGLE_CLIENT_ID)'
      });
    }

    const scope = encodeURIComponent('openid profile email');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account`;

    return { configured: true, url: authUrl };
  });

  // 5. Google SSO: OAuth Callback
  fastify.get('/google/callback', async (request, reply) => {
    const { code, error } = request.query;
    const clientRedirectBase = process.env.CLIENT_URL || 'http://localhost:5173';

    if (error || !code) {
      return reply.redirect(`${clientRedirectBase}/login?error=${encodeURIComponent(error || 'No auth code provided')}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      return reply.redirect(`${clientRedirectBase}/login?error=${encodeURIComponent('Google OAuth not fully configured on server')}`);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return reply.redirect(`${clientRedirectBase}/login?error=${encodeURIComponent(tokenData.error_description || 'Failed to exchange token with Google')}`);
      }

      // Fetch user profile from Google
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await userinfoRes.json();

      if (!profile.email) {
        return reply.redirect(`${clientRedirectBase}/login?error=${encodeURIComponent('Google did not return an email address')}`);
      }

      // Find user in DB
      let user = await getUserByEmail(profile.email);

      if (!user) {
        // If ALLOW_AUTO_SIGNUP is true, create user as member; otherwise check if admin configured
        const allowAutoSignup = process.env.ALLOW_AUTO_SIGNUP === 'true';
        if (allowAutoSignup) {
          user = await createUser({
            email: profile.email,
            name: profile.name || profile.email.split('@')[0],
            avatar_url: profile.picture,
            role: 'member'
          });
        } else {
          return reply.redirect(`${clientRedirectBase}/login?error=${encodeURIComponent('No account found for ' + profile.email + '. Please ask an administrator to add your email first.')}`);
        }
      }

      // Set session
      request.session.userId = user.id;
      return reply.redirect(`${clientRedirectBase}/`);
    } catch (err) {
      fastify.log.error(err);
      return reply.redirect(`${clientRedirectBase}/login?error=${encodeURIComponent('OAuth authentication failed: ' + err.message)}`);
    }
  });

  // 6. Dev Switch Login (Available in development mode for easy testing)
  fastify.post('/dev-login', async (request, reply) => {
    const isDev = process.env.NODE_ENV !== 'production' || process.env.DEV_LOGIN === 'true';
    if (!isDev) {
      return reply.code(403).send({ error: 'Dev login is disabled in production' });
    }

    const { email } = request.body || {};
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return reply.code(404).send({ error: `User with email ${email} not found` });
    }

    request.session.userId = user.id;
    const fullUser = await getUserByEmailWithPassword(user.email);
    user.has_password = Boolean(fullUser?.password_hash);
    return { ok: true, user };
  });

  // 7. Update current user profile
  fastify.put('/profile', async (request, reply) => {
    if (!request.session || !request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const userId = request.session.userId;
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const { name, avatar_url, current_password, new_password } = request.body || {};
    const updates = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return reply.code(400).send({ error: 'Display name cannot be empty' });
      }
      updates.name = name.trim();
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    if (new_password) {
      if (typeof new_password !== 'string' || new_password.trim().length < 6) {
        return reply.code(400).send({ error: 'New password must be at least 6 characters long' });
      }

      const fullUser = await getUserByEmailWithPassword(currentUser.email);
      if (fullUser && fullUser.password_hash) {
        if (!current_password) {
          return reply.code(400).send({ error: 'Current password is required to change your password' });
        }
        const isValid = verifyPassword(current_password, fullUser.password_hash);
        if (!isValid) {
          return reply.code(400).send({ error: 'Current password is incorrect' });
        }
      }
      updates.password = new_password.trim();
    }

    const updatedUser = await updateUser(userId, updates);
    const fullUpdatedUser = await getUserByEmailWithPassword(updatedUser.email);
    updatedUser.has_password = Boolean(fullUpdatedUser?.password_hash);

    return { ok: true, user: updatedUser };
  });
}
