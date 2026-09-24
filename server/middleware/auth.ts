import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../../lib/auth';
import { AuthRequest, UserRole } from '../types';

// Rate Limiter for Login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLogin(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && record.resetAt > now) {
    if (record.count >= 10) {
      res.status(429).json({ error: 'محاولات تسجيل دخول كثيرة جداً. يرجى الانتظار دقيقة واحدة.' });
      return;
    }
    record.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60 * 1000 });
  }
  next();
}

// Helper: Extract token from Cookie OR Bearer Authorization header OR x-session-token
export function extractToken(req: Request): string | undefined {
  if (req.cookies?.session_token) {
    return req.cookies.session_token;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  return undefined;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
    return;
  }
  const user = verifySessionToken(token);
  if (!user) {
    res.clearCookie('session_token');
    res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'ليس لديك صلاحية للوصول إلى هذا المورد' });
      return;
    }
    next();
  };
}
