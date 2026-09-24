import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import { lazyFinalizeAttemptIfExpired } from '../services/attempt.service';

const router = Router();

// Protect all teacher & admin routes in this module
router.use(requireAuth, requireRole(['TEACHER', 'ADMIN']));

// 1. Get Teacher's Classes
// GET /api/teacher/classes
router.get('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const allClasses = await prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { students: true } } },
    });

    if (req.user!.role === 'ADMIN') {
      res.json({
        classes: allClasses,
        allClasses,
        myClasses: allClasses,
        assignedClassIds: allClasses.map((c) => c.id),
      });
      return;
    }

    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: req.user!.id },
      include: {
        class: {
          include: { _count: { select: { students: true } } },
        },
      },
    });

    const myClasses = teacherClasses.map((tc) => tc.class);
    const assignedClassIds = myClasses.map((c) => c.id);

    // If teacher has assigned classes, return them; otherwise fallback to allClasses
    const classes = myClasses.length > 0 ? myClasses : allClasses;

    res.json({
      classes,
      myClasses,
      allClasses,
      assignedClassIds,
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الشعب' });
  }
});

// 2. Get Teacher's Quizzes
// GET /api/teacher/quizzes
router.get('/quizzes', async (req: AuthRequest, res: Response) => {
  try {
    const whereClause: any = {};
    if (req.user!.role === 'TEACHER') {
      whereClause.OR = [
        { createdById: req.user!.id },
        { classes: { some: { class: { teacherClasses: { some: { teacherId: req.user!.id } } } } } },
      ];
    }

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { name: true, username: true } },
        classes: { select: { class: { select: { id: true, name: true } } } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الاختبارات' });
  }
});

// 3. Get Single Quiz for Editing
// GET /api/teacher/quizzes/:id
router.get('/quizzes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        classes: { select: { classId: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'الاختبار غير موجود' });
      return;
    }

    // IDOR verification
    if (req.user!.role === 'TEACHER') {
      const tc = await prisma.teacherClass.findFirst({
        where: {
          teacherId: req.user!.id,
          classId: { in: quiz.classes.map((c) => c.classId) },
        },
      });
      if (quiz.createdById !== req.user!.id && !tc) {
        res.status(403).json({ error: 'غير مصرح لك بالوصول لهذا الاختبار' });
        return;
      }
    }

    res.json({
      quiz: {
        ...quiz,
        classIds: quiz.classes.map((c) => c.classId),
        hasAttempts: quiz._count.attempts > 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل قراءة الاختبار' });
  }
});

// 4. Create Quiz
const createQuizSchema = z.object({
  title: z.string().min(3, 'عنوان الاختبار يجب أن يتكون من 3 أحرف على الأقل'),
  language: z.enum(['ar', 'en']).default('ar'),
  timeLimitMinutes: z.number().int().min(1).max(180),
  opensAt: z.string(),
  closesAt: z.string(),
  negativeMarking: z.boolean().default(false),
  penaltyPercent: z.number().min(0).max(100).default(25),
  classIds: z.array(z.string()).min(1, 'يجب تحديد شعبة واحدة على الأقل'),
  questions: z.array(
    z.object({
      text: z.string().min(1, 'نص السؤال مطلوب'),
      points: z.number().min(0.25).max(100),
      options: z.array(z.string().min(1, 'نص الخيار مطلوب')).length(4, 'يجب توفير 4 خيارات'),
      correctOptionIndex: z.number().int().min(0).max(3),
    })
  ).min(1, 'يجب إضافة سؤال واحد على الأقل'),
});

// POST /api/teacher/quizzes
router.post('/quizzes', async (req: AuthRequest, res: Response) => {
  try {
    const parse = createQuizSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message || 'بيانات غير صالحة' });
      return;
    }
    const data = parse.data;

    const opens = new Date(data.opensAt);
    const closes = new Date(data.closesAt);
    if (closes <= opens) {
      res.status(400).json({ error: 'تاريخ إغلاق الاختبار يجب أن يكون بعد تاريخ الفتح' });
      return;
    }

    // Verify teacher teaches all assigned classes (unless ADMIN)
    if (req.user!.role === 'TEACHER') {
      const allowed = await prisma.teacherClass.findMany({
        where: { teacherId: req.user!.id, classId: { in: data.classIds } },
      });
      if (allowed.length !== data.classIds.length) {
        res.status(403).json({ error: 'لا يمكنك تعيين الاختبار لشعب لست معلماً لها' });
        return;
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: data.title,
          language: data.language,
          timeLimitMinutes: data.timeLimitMinutes,
          opensAt: opens,
          closesAt: closes,
          negativeMarking: data.negativeMarking,
          penaltyPercent: data.penaltyPercent,
          createdById: req.user!.id,
          classes: {
            create: data.classIds.map((cid) => ({ classId: cid })),
          },
        },
      });

      for (let i = 0; i < data.questions.length; i++) {
        const qData = data.questions[i];
        const question = await tx.question.create({
          data: {
            quizId: quiz.id,
            text: qData.text,
            points: qData.points,
            order: i + 1,
          },
        });

        for (let optIdx = 0; optIdx < 4; optIdx++) {
          await tx.option.create({
            data: {
              questionId: question.id,
              text: qData.options[optIdx],
              isCorrect: optIdx === qData.correctOptionIndex,
              order: optIdx + 1,
            },
          });
        }
      }

      return quiz;
    });

    res.json({ success: true, quizId: created.id });
  } catch (err) {
    console.error('Create quiz error:', err);
    res.status(500).json({ error: 'فشل في إنشاء الاختبار' });
  }
});

// 5. Update Quiz (Rule 8: Block editing questions once any attempt exists)
// PUT /api/teacher/quizzes/:id
router.put('/quizzes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const existing = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        _count: { select: { attempts: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'الاختبار غير موجود' });
      return;
    }

    const hasAttempts = existing._count.attempts > 0;
    const { title, timeLimitMinutes, opensAt, closesAt, negativeMarking, penaltyPercent, classIds, questions } = req.body;

    // RULE 8 ENFORCEMENT:
    if (hasAttempts && questions) {
      res.status(400).json({
        error: 'لا يمكن تعديل أسئلة الاختبار نظراً لوجود محاولات سابقة من الطلاب. يمكنك فقط تعديل التواريخ والوقت.',
      });
      return;
    }

    const opens = opensAt ? new Date(opensAt) : existing.opensAt;
    const closes = closesAt ? new Date(closesAt) : existing.closesAt;

    if (closes <= opens) {
      res.status(400).json({ error: 'تاريخ الإغلاق يجب أن يكون بعد تاريخ الفتح' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          title: title || existing.title,
          timeLimitMinutes: timeLimitMinutes || existing.timeLimitMinutes,
          opensAt: opens,
          closesAt: closes,
          negativeMarking: negativeMarking !== undefined ? negativeMarking : existing.negativeMarking,
          penaltyPercent: penaltyPercent !== undefined ? penaltyPercent : existing.penaltyPercent,
        },
      });

      if (classIds && Array.isArray(classIds)) {
        await tx.quizClass.deleteMany({ where: { quizId } });
        await tx.quizClass.createMany({
          data: classIds.map((cid: string) => ({ quizId, classId: cid })),
        });
      }

      // If no attempts exist, allow replacing questions
      if (!hasAttempts && Array.isArray(questions)) {
        await tx.option.deleteMany({ where: { question: { quizId } } });
        await tx.question.deleteMany({ where: { quizId } });

        for (let i = 0; i < questions.length; i++) {
          const qData = questions[i];
          const question = await tx.question.create({
            data: {
              quizId,
              text: qData.text,
              points: qData.points || 1.0,
              order: i + 1,
            },
          });

          for (let optIdx = 0; optIdx < 4; optIdx++) {
            await tx.option.create({
              data: {
                questionId: question.id,
                text: qData.options[optIdx],
                isCorrect: optIdx === qData.correctOptionIndex,
                order: optIdx + 1,
              },
            });
          }
        }
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Update quiz error:', err);
    res.status(500).json({ error: 'فشل في تحديث الاختبار' });
  }
});

// 6. Duplicate Quiz
// POST /api/teacher/quizzes/:id/duplicate
router.post('/quizzes/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const sourceQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classes: true,
        questions: {
          include: { options: true },
        },
      },
    });

    if (!sourceQuiz) {
      res.status(404).json({ error: 'الاختبار غير موجود' });
      return;
    }

    const now = new Date();
    const cloned = await prisma.$transaction(async (tx) => {
      const newQuiz = await tx.quiz.create({
        data: {
          title: `${sourceQuiz.title} (نسخة مكررة)`,
          language: sourceQuiz.language,
          timeLimitMinutes: sourceQuiz.timeLimitMinutes,
          opensAt: now,
          closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          negativeMarking: sourceQuiz.negativeMarking,
          penaltyPercent: sourceQuiz.penaltyPercent,
          createdById: req.user!.id,
          classes: {
            create: sourceQuiz.classes.map((c) => ({ classId: c.classId })),
          },
        },
      });

      for (const q of sourceQuiz.questions) {
        const newQ = await tx.question.create({
          data: {
            quizId: newQuiz.id,
            text: q.text,
            points: q.points,
            order: q.order,
          },
        });

        for (const opt of q.options) {
          await tx.option.create({
            data: {
              questionId: newQ.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
              order: opt.order,
            },
          });
        }
      }

      return newQuiz;
    });

    res.json({ success: true, newQuizId: cloned.id });
  } catch (err) {
    console.error('Duplicate quiz error:', err);
    res.status(500).json({ error: 'فشل في نسخ الاختبار' });
  }
});

// 7. Results & Statistics
// GET /api/teacher/quizzes/:id/results
router.get('/quizzes/:id/results', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;

    // Check quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classes: { include: { class: { include: { students: true } } } },
        questions: {
          orderBy: { order: 'asc' },
          include: { options: true },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'الاختبار غير موجود' });
      return;
    }

    // IDOR: verify teacher access
    if (req.user!.role === 'TEACHER') {
      const tc = await prisma.teacherClass.findFirst({
        where: {
          teacherId: req.user!.id,
          classId: { in: quiz.classes.map((c) => c.classId) },
        },
      });
      if (quiz.createdById !== req.user!.id && !tc) {
        res.status(403).json({ error: 'غير مصرح لك برؤية نتائج هذا الاختبار' });
        return;
      }
    }

    // Lazy auto-finalize all expired in-progress attempts for this quiz
    const inProgressAttempts = await prisma.attempt.findMany({
      where: { quizId, status: 'IN_PROGRESS' },
      select: { id: true },
    });
    for (const a of inProgressAttempts) {
      await lazyFinalizeAttemptIfExpired(a.id);
    }

    // Fetch all completed/in-progress attempts
    const attempts = await prisma.attempt.findMany({
      where: { quizId },
      include: {
        student: { select: { id: true, name: true, username: true, class: { select: { name: true } } } },
        answers: true,
      },
      orderBy: { score: 'desc' },
    });

    // Gather all students assigned to this quiz
    const allAssignedStudentsMap = new Map<string, { id: string; name: string; username: string; className: string }>();
    for (const qc of quiz.classes) {
      for (const st of qc.class.students) {
        allAssignedStudentsMap.set(st.id, {
          id: st.id,
          name: st.name,
          username: st.username,
          className: qc.class.name,
        });
      }
    }

    const totalAssignedCount = allAssignedStudentsMap.size;
    const attemptedMap = new Map(attempts.map((a) => [a.studentId, a]));

    const studentRows: any[] = [];
    const scores: number[] = [];

    allAssignedStudentsMap.forEach((student, studentId) => {
      const attempt = attemptedMap.get(studentId);
      if (attempt) {
        const timeSpentSeconds = attempt.submittedAt
          ? Math.max(0, Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000))
          : Math.max(0, Math.floor((new Date().getTime() - attempt.startedAt.getTime()) / 1000));

        const percentage = attempt.maxScore > 0 && attempt.score !== null
          ? Math.round((attempt.score / attempt.maxScore) * 1000) / 10
          : 0;

        if (attempt.score !== null) {
          scores.push(attempt.score);
        }

        studentRows.push({
          studentId: student.id,
          name: student.name,
          username: student.username,
          className: student.className,
          status: attempt.status,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage,
          timeSpentSeconds,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
        });
      } else {
        studentRows.push({
          studentId: student.id,
          name: student.name,
          username: student.username,
          className: student.className,
          status: 'NOT_ATTEMPTED',
          score: null,
          maxScore: quiz.questions.reduce((s, q) => s + q.points, 0),
          percentage: null,
          timeSpentSeconds: null,
          startedAt: null,
          submittedAt: null,
        });
      }
    });

    // Compute Summary Stats: Average, Median, Highest, Lowest
    scores.sort((a, b) => a - b);
    const completedAttemptsCount = attempts.filter((a) => a.score !== null).length;
    let avg = 0;
    let median = 0;
    let highest = 0;
    let lowest = 0;

    if (scores.length > 0) {
      avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
      highest = scores[scores.length - 1];
      lowest = scores[0];
      const mid = Math.floor(scores.length / 2);
      median = scores.length % 2 === 0 ? Math.round(((scores[mid - 1] + scores[mid]) / 2) * 100) / 100 : scores[mid];
    }

    // Score distribution buckets (0-25%, 26-50%, 51-75%, 76-100%)
    const distribution = [
      { range: '0% - 25%', count: 0 },
      { range: '26% - 50%', count: 0 },
      { range: '51% - 75%', count: 0 },
      { range: '76% - 100%', count: 0 },
    ];

    studentRows.forEach((r) => {
      if (r.percentage !== null) {
        if (r.percentage <= 25) distribution[0].count++;
        else if (r.percentage <= 50) distribution[1].count++;
        else if (r.percentage <= 75) distribution[2].count++;
        else distribution[3].count++;
      }
    });

    // Per-question % correct analysis to spot hard questions
    const questionStats = quiz.questions.map((q) => {
      const correctOpt = q.options.find((o) => o.isCorrect);
      let answeredCount = 0;
      let correctCount = 0;

      for (const a of attempts) {
        const studentAns = a.answers.find((ans) => ans.questionId === q.id);
        if (studentAns?.selectedOptionId) {
          answeredCount++;
          if (studentAns.selectedOptionId === correctOpt?.id) {
            correctCount++;
          }
        }
      }

      const totalAttempted = attempts.length;
      const successRate = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

      return {
        id: q.id,
        order: q.order,
        text: q.text,
        points: q.points,
        correctCount,
        answeredCount,
        successRate,
        isHard: successRate < 40 && totalAttempted > 0, // Flag hard questions (< 40% correct)
      };
    });

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        language: quiz.language,
        timeLimitMinutes: quiz.timeLimitMinutes,
        opensAt: quiz.opensAt,
        closesAt: quiz.closesAt,
        negativeMarking: quiz.negativeMarking,
        penaltyPercent: quiz.penaltyPercent,
      },
      stats: {
        totalAssigned: totalAssignedCount,
        completedCount: completedAttemptsCount,
        notAttemptedCount: totalAssignedCount - completedAttemptsCount,
        average: avg,
        median,
        highest,
        lowest,
      },
      distribution,
      questionStats,
      students: studentRows,
    });
  } catch (err) {
    console.error('Fetch quiz results error:', err);
    res.status(500).json({ error: 'فشل في تحميل نتائج الاختبار' });
  }
});

// 8. CSV Export with UTF-8 BOM
// GET /api/teacher/quizzes/:id/export-csv
router.get('/quizzes/:id/export-csv', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classes: { include: { class: { include: { students: true } } } },
      },
    });

    if (!quiz) {
      res.status(404).send('Quiz not found');
      return;
    }

    const attempts = await prisma.attempt.findMany({
      where: { quizId },
      include: {
        student: { select: { id: true, name: true, username: true, class: { select: { name: true } } } },
      },
    });

    const attemptMap = new Map(attempts.map((a) => [a.studentId, a]));

    const rows: string[] = [];
    // Header
    rows.push('اسم الطالب,اسم المستخدم,الشعبة,الحالة,العلامة,العلامة العظمى,النسبة المئوية,تاريخ التسليم');

    for (const qc of quiz.classes) {
      for (const st of qc.class.students) {
        const attempt = attemptMap.get(st.id);
        if (attempt && attempt.score !== null) {
          const pct = Math.round((attempt.score / attempt.maxScore) * 1000) / 10;
          const submittedStr = attempt.submittedAt ? attempt.submittedAt.toISOString() : '';
          rows.push(`"${st.name}","${st.username}","${qc.class.name}","${attempt.status}",${attempt.score},${attempt.maxScore},"${pct}%","${submittedStr}"`);
        } else {
          rows.push(`"${st.name}","${st.username}","${qc.class.name}","لم يتقدم",0,${quiz.timeLimitMinutes},"0%",""`);
        }
      }
    }

    // Prepend UTF-8 BOM so Excel opens Arabic correctly
    const csvContent = '\uFEFF' + rows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="quiz_${quiz.id}_results.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).send('Export error');
  }
});

export default router;
