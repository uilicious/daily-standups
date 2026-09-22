import crypto from 'crypto';

/**
 * Hashes a plaintext password using crypto.scrypt.
 * Format: salt:derivedKey
 */
export function hashPassword(password) {
  if (!password) return null;
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against the stored salt:hash string.
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    return false;
  }
}
