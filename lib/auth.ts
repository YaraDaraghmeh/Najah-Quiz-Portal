import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'najah-amman-tutoring-center-secret-key-2026';

export interface SessionUser {
  id: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  username: string;
  classId?: string | null;
}

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

/**
 * Compares plaintext password with bcrypt hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Creates a signed session token containing user details and expiration.
 */
export function createSessionToken(user: SessionUser, expiresInHours: number = 24): string {
  const payload = {
    ...user,
    exp: Date.now() + expiresInHours * 60 * 60 * 1000,
  };
  const base64Data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): SessionUser | null {
  if (!token || !token.includes('.')) return null;

  const [base64Data, signature] = token.split('.');
  if (!base64Data || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Data)
    .digest('base64url');

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(base64Data, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return {
      id: payload.id,
      role: payload.role,
      name: payload.name,
      username: payload.username,
      classId: payload.classId,
    };
  } catch {
    return null;
  }
}
