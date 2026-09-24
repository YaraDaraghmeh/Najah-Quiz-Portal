import { Router, Response } from 'express';
import { prisma } from '../../lib/db';
import { hashPassword } from '../../lib/auth';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.use(requireAuth, requireRole(['ADMIN']));

router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        class: { select: { id: true, name: true } },
        teacherClasses: { select: { class: { select: { id: true, name: true } } } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل المستخدمين' });
  }
});

// 2. Create single user
// POST /api/admin/users
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, role, password, classId, teacherClassIds } = req.body;
    if (!name || !username || !role) {
      res.status(400).json({ error: 'الاسم واسم المستخدم والدور مطلوبان' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
      return;
    }

    const passwordHash = await hashPassword(password || 'Password123!');
    const user = await prisma.user.create({
      data: {
        name,
        username: cleanUsername,
        role,
        passwordHash,
        classId: role === 'STUDENT' ? classId : null,
        teacherClasses: role === 'TEACHER' && Array.isArray(teacherClassIds)
          ? { create: teacherClassIds.map((cid: string) => ({ classId: cid })) }
          : undefined,
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'فشل إنشاء المستخدم' });
  }
});

// 3. Update a single user and replace their class assignments
// PUT /api/admin/users/:id
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, role, password, classId, teacherClassIds } = req.body;
    const userId = req.params.id;
    const validRoles = ['ADMIN', 'TEACHER', 'STUDENT'];

    if (!name || !username || !validRoles.includes(role)) {
      res.status(400).json({ error: 'الاسم واسم المستخدم والدور مطلوبان' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      res.status(404).json({ error: 'المستخدم غير موجود' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const duplicate = await prisma.user.findFirst({
      where: { username: cleanUsername, NOT: { id: userId } },
    });
    if (duplicate) {
      res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
      return;
    }

    const requestedTeacherClassIds = Array.isArray(teacherClassIds)
      ? [...new Set(teacherClassIds.filter((id): id is string => typeof id === 'string'))]
      : [];
    if (role === 'TEACHER' && requestedTeacherClassIds.length === 0) {
      res.status(400).json({ error: 'يجب تعيين شعبة واحدة على الأقل للمعلم' });
      return;
    }

    const requestedClassIds = role === 'STUDENT' && classId
      ? [classId]
      : requestedTeacherClassIds;
    if (requestedClassIds.length > 0) {
      const matchingClasses = await prisma.class.count({ where: { id: { in: requestedClassIds } } });
      if (matchingClasses !== requestedClassIds.length) {
        res.status(400).json({ error: 'إحدى الشعب المحددة غير موجودة' });
        return;
      }
    }

    const passwordHash = typeof password === 'string' && password.trim()
      ? await hashPassword(password)
      : undefined;
    const user = await prisma.$transaction(async (tx) => {
      await tx.teacherClass.deleteMany({ where: { teacherId: userId } });
      return tx.user.update({
        where: { id: userId },
        data: {
          name: String(name).trim(),
          username: cleanUsername,
          role,
          classId: role === 'STUDENT' ? (classId || null) : null,
          ...(passwordHash ? { passwordHash } : {}),
          teacherClasses: role === 'TEACHER'
            ? { create: requestedTeacherClassIds.map((id) => ({ classId: id })) }
            : undefined,
        },
      });
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: 'فشل تحديث المستخدم' });
  }
});

// 4. Delete a single user without cascading through owned quizzes
// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    if (req.user?.id === userId) {
      res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { createdQuizzes: true } } },
    });
    if (!user) {
      res.status(404).json({ error: 'المستخدم غير موجود' });
      return;
    }
    if (user.role === 'ADMIN' && (await prisma.user.count({ where: { role: 'ADMIN' } })) <= 1) {
      res.status(400).json({ error: 'لا يمكن حذف آخر حساب إدارة' });
      return;
    }
    if (user._count.createdQuizzes > 0) {
      res.status(409).json({ error: 'لا يمكن حذف مستخدم أنشأ اختبارات. احذف اختباراته أو غيّر ملكيتها أولاً.' });
      return;
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin user delete error:', err);
    res.status(500).json({ error: 'فشل حذف المستخدم' });
  }
});

// 5. Create Class
// POST /api/admin/classes
router.post('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'اسم الشعبة مطلوب (مثال: 12A)' });
      return;
    }
    const cleanName = String(name).trim().toUpperCase();
    const existing = await prisma.class.findUnique({ where: { name: cleanName } });
    if (existing) {
      res.status(400).json({ error: 'الشعبة موجودة بالفعل' });
      return;
    }
    const cls = await prisma.class.create({ data: { name: cleanName } });
    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ error: 'فشل إنشاء الشعبة' });
  }
});

export default router;
