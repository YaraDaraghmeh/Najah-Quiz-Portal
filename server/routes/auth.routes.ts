import { Router, Response } from 'express';
import { prisma } from '../../lib/db';
import { verifyPassword, createSessionToken, verifySessionToken, SessionUser } from '../../lib/auth';
import { extractToken, rateLimitLogin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const isProd = process.env.NODE_ENV === 'production';

router.post('/login', rateLimitLogin, async (req, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: String(username).trim().toLowerCase() },
      include: { class: true },
    });

    if (!user) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }

    const sessionPayload: SessionUser = {
      id: user.id,
      role: user.role as SessionUser['role'],
      name: user.name,
      username: user.username,
      classId: user.classId,
    };

    const token = createSessionToken(sessionPayload, 24);

    res.cookie('session_token', token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        classId: user.classId,
        className: user.class?.name || null,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ في السيرفر' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ user: null });
    return;
  }
  const sessionUser = verifySessionToken(token);
  if (!sessionUser) {
    res.status(401).json({ user: null });
    return;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { class: true },
  });

  if (!dbUser) {
    res.status(401).json({ user: null });
    return;
  }

  res.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      username: dbUser.username,
      role: dbUser.role,
      classId: dbUser.classId,
      className: dbUser.class?.name || null,
    },
    token,
  });
});

// GET /api/auth/demo-users
router.get('/demo-users', async (_req, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        class: { select: { id: true, name: true } },
        teacherClasses: { select: { class: { select: { id: true, name: true } } } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        className: u.class?.name || (u.teacherClasses?.map((tc) => tc.class.name).join(', ') || null),
        defaultPassword: u.role === 'STUDENT' ? 'Student123!' : 'Password123!',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch demo users' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res: Response) => {
  res.clearCookie('session_token', { path: '/' });
  res.json({ success: true });
});

export default router;
