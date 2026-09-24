import { Router, Response } from 'express';
import { prisma } from '../../lib/db';
import { hashPassword } from '../../lib/auth';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import {
  validateStudentsImport,
  validateTeachersImport,
  validateQuizQuestionsImport,
} from '../../lib/import';

const router = Router();

// Protect all import endpoints
router.use(requireAuth, requireRole(['ADMIN']));

// 1. Import Preview Endpoint
// POST /api/admin/import/preview
router.post('/preview', async (req: AuthRequest, res: Response) => {
  try {
    const { type, rows } = req.body; // type: 'students' | 'teachers' | 'quiz_questions'
    if (!type || !Array.isArray(rows)) {
      res.status(400).json({ error: 'النوع والصفوف مطلوبان للمعاينة' });
      return;
    }

    const existingUsers = await prisma.user.findMany({ select: { username: true } });
    const existingUsernames = new Set(existingUsers.map((u) => u.username));

    const classes = await prisma.class.findMany({ select: { name: true } });
    const validClasses = new Set(classes.map((c) => c.name));

    if (type === 'students') {
      const preview = validateStudentsImport(rows, existingUsernames, validClasses);
      res.json(preview);
    } else if (type === 'teachers') {
      const preview = validateTeachersImport(rows, existingUsernames, validClasses);
      res.json(preview);
    } else if (type === 'quiz_questions') {
      const preview = validateQuizQuestionsImport(rows);
      res.json(preview);
    } else {
      res.status(400).json({ error: 'نوع استيراد غير معروف' });
    }
  } catch (err) {
    console.error('Import preview error:', err);
    res.status(500).json({ error: 'فشل في معاينة البيانات' });
  }
});

// 2. Import Commit Endpoint
// POST /api/admin/import/commit
router.post('/commit', async (req: AuthRequest, res: Response) => {
  try {
    const { type, validRows, quizId } = req.body;
    if (!type || !Array.isArray(validRows) || validRows.length === 0) {
      res.status(400).json({ error: 'لا توجد صفوف صالحة للاستيراد' });
      return;
    }

    const classMap = new Map((await prisma.class.findMany()).map((c) => [c.name, c.id]));
    let insertedCount = 0;

    if (type === 'students') {
      for (const row of validRows) {
        const classId = classMap.get(row.className);
        if (!classId) continue;
        const passHash = await hashPassword(row.password || 'Student123!');
        await prisma.user.create({
          data: {
            name: row.name,
            username: row.username,
            role: 'STUDENT',
            classId,
            passwordHash: passHash,
          },
        });
        insertedCount++;
      }
    } else if (type === 'teachers') {
      for (const row of validRows) {
        const passHash = await hashPassword(row.password || 'Password123!');
        const teacher = await prisma.user.create({
          data: {
            name: row.name,
            username: row.username,
            role: 'TEACHER',
            passwordHash: passHash,
          },
        });

        for (const clsName of row.classes) {
          const classId = classMap.get(clsName);
          if (classId) {
            await prisma.teacherClass.create({
              data: { teacherId: teacher.id, classId },
            });
          }
        }
        insertedCount++;
      }
    } else if (type === 'quiz_questions') {
      if (!quizId) {
        res.status(400).json({ error: 'معرف الاختبار مطلوب لإضافة الأسئلة' });
        return;
      }
      const existingQCount = await prisma.question.count({ where: { quizId } });
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const question = await prisma.question.create({
          data: {
            quizId,
            text: row.text,
            points: row.points,
            order: existingQCount + i + 1,
          },
        });
        for (let optIdx = 0; optIdx < 4; optIdx++) {
          await prisma.option.create({
            data: {
              questionId: question.id,
              text: row.options[optIdx],
              isCorrect: optIdx === row.correctOptionIndex,
              order: optIdx + 1,
            },
          });
        }
        insertedCount++;
      }
    }

    res.json({ success: true, count: insertedCount });
  } catch (err) {
    console.error('Import commit error:', err);
    res.status(500).json({ error: 'فشل في حفظ البيانات المستوردة' });
  }
});

export default router;
