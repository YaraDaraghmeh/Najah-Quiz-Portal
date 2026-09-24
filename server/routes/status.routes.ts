import { Router, Response } from 'express';
import { prisma } from '../../lib/db';

const router = Router();


router.get('/', async (_req, res: Response) => {
  try {
    const classCount = await prisma.class.count();
    const userCount = await prisma.user.count();
    const teacherCount = await prisma.user.count({ where: { role: 'TEACHER' } });
    const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });
    const quizCount = await prisma.quiz.count();
    const attemptCount = await prisma.attempt.count();

    const classes = await prisma.class.findMany({
      include: {
        _count: { select: { students: true, teacherClasses: true, quizClasses: true } },
      },
      orderBy: { name: 'asc' },
    });

    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        language: true,
        timeLimitMinutes: true,
        opensAt: true,
        closesAt: true,
        negativeMarking: true,
        penaltyPercent: true,
        createdBy: { select: { name: true } },
        classes: { select: { class: { select: { name: true } } } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { opensAt: 'asc' },
    });

    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        name: true,
        username: true,
        teacherClasses: { select: { class: { select: { name: true } } } },
      },
    });

    res.json({
      status: 'healthy',
      counts: {
        classes: classCount,
        users: userCount,
        teachers: teacherCount,
        students: studentCount,
        quizzes: quizCount,
        attempts: attemptCount,
      },
      classes,
      teachers,
      quizzes,
      demoCredentials: [
        { role: 'ADMIN', username: 'nour', password: 'Password123!', label: 'نور المشرفة (Admin - Full Access)' },
        { role: 'TEACHER', username: 'ahmad.khatib', password: 'Password123!', label: 'أحمد الخطيب (Teacher 10A, 10B)' },
        { role: 'TEACHER', username: 'rania.zoubi', password: 'Password123!', label: 'رانيا الزعبي (Teacher 11A)' },
        { role: 'STUDENT', username: 'omar.sayed', password: 'Student123!', label: 'عمر السيد (Student Class 10A)' },
        { role: 'STUDENT', username: 'zaid.nabulsi', password: 'Student123!', label: 'زيد النابلسي (Student Class 10B)' },
        { role: 'STUDENT', username: 'leen.husseini', password: 'Student123!', label: 'لين الحسيني (Student Class 11A)' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
