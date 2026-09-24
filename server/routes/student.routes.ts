import { Router, Response } from 'express';
import { prisma } from '../../lib/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import { lazyFinalizeAttemptIfExpired } from '../services/attempt.service';
import { calculateDeadline, isWithinDeadline, getRemainingSeconds, GRACE_PERIOD_MS } from '../../lib/attempts';
import { calculateQuizScore, ScoringQuestion, StudentAnswer } from '../../lib/scoring';

const router = Router();

// Protect all student routes
router.use(requireAuth, requireRole(['STUDENT']));

// 1. Get Quizzes assigned to student's class
// GET /api/student/quizzes
router.get('/quizzes', async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { classId: true },
    });

    if (!student || !student.classId) {
      res.json({ available: [], upcoming: [], completed: [] });
      return;
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        classes: { some: { classId: student.classId } },
      },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { questions: true } },
        attempts: {
          where: { studentId: req.user!.id },
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            startedAt: true,
            deadlineAt: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { opensAt: 'asc' },
    });

    const now = new Date();
    const available: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

    for (const q of quizzes) {
      let myAttempt = q.attempts[0] || null;

      // Check lazy finalization if student has an attempt that expired
      if (myAttempt && myAttempt.status === 'IN_PROGRESS') {
        const finalized = await lazyFinalizeAttemptIfExpired(myAttempt.id);
        if (finalized) {
          myAttempt = {
            id: finalized.id,
            status: finalized.status,
            score: finalized.score,
            maxScore: finalized.maxScore,
            startedAt: finalized.startedAt,
            deadlineAt: finalized.deadlineAt,
            submittedAt: finalized.submittedAt,
          };
        }
      }

      const item = {
        id: q.id,
        title: q.title,
        language: q.language,
        timeLimitMinutes: q.timeLimitMinutes,
        opensAt: q.opensAt,
        closesAt: q.closesAt,
        negativeMarking: q.negativeMarking,
        penaltyPercent: q.penaltyPercent,
        teacherName: q.createdBy.name,
        questionCount: q._count.questions,
        attempt: myAttempt,
      };

      if (myAttempt && (myAttempt.status === 'SUBMITTED' || myAttempt.status === 'AUTO_FINALIZED')) {
        completed.push(item);
      } else if (now < new Date(q.opensAt)) {
        upcoming.push(item);
      } else if (now <= new Date(q.closesAt) || (myAttempt && myAttempt.status === 'IN_PROGRESS')) {
        available.push(item);
      } else {
        completed.push(item);
      }
    }

    res.json({ available, upcoming, completed });
  } catch (err) {
    console.error('Fetch student quizzes error:', err);
    res.status(500).json({ error: 'فشل في تحميل الاختبارات' });
  }
});

// 2. Start (or Resume) a Quiz Attempt
// POST /api/student/quizzes/:id/start
router.post('/quizzes/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const studentId = req.user!.id;

    // Check student class mapping & IDOR
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student?.classId) {
      res.status(403).json({ error: 'لست مسجلاً في أي شعبة' });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classes: true,
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, order: true }, // NEVER EXPOSE isCorrect!
            },
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'الاختبار غير موجود' });
      return;
    }

    const isAssigned = quiz.classes.some((c) => c.classId === student.classId);
    if (!isAssigned) {
      res.status(403).json({ error: 'هذا الاختبار غير مخصص لشعبتك' });
      return;
    }

    const now = new Date();
    // Check if attempt already exists
    let attempt = await prisma.attempt.findUnique({
      where: { studentId_quizId: { studentId, quizId } },
      include: {
        answers: true,
      },
    });

    if (attempt) {
      // Lazy auto finalize if expired
      if (attempt.status === 'IN_PROGRESS') {
        const finalized = await lazyFinalizeAttemptIfExpired(attempt.id);
        if (finalized && finalized.status !== 'IN_PROGRESS') {
          res.status(400).json({
            error: 'انتهى الوقت المحدد للمحاولة وتم اعتماد إجاباتك تلقائياً',
            attemptId: attempt.id,
            completed: true,
          });
          return;
        }
      }

      if (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_FINALIZED') {
        res.status(400).json({
          error: 'لقد قمت بتقديم هذا الاختبار مسبقاً. لا يُسمح بإعادة التقديم.',
          attemptId: attempt.id,
          completed: true,
        });
        return;
      }

      // Resume in-progress attempt
      const remainingSeconds = getRemainingSeconds(attempt.deadlineAt, now);
      res.json({
        resumed: true,
        attempt: {
          id: attempt.id,
          startedAt: attempt.startedAt,
          deadlineAt: attempt.deadlineAt,
          remainingSeconds,
          status: attempt.status,
          answers: attempt.answers.map((a) => ({
            questionId: a.questionId,
            selectedOptionId: a.selectedOptionId,
          })),
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
          language: quiz.language,
          timeLimitMinutes: quiz.timeLimitMinutes,
          negativeMarking: quiz.negativeMarking,
          penaltyPercent: quiz.penaltyPercent,
          questions: quiz.questions,
        },
      });
      return;
    }

    // Creating a fresh attempt: Validate open window
    if (now < new Date(quiz.opensAt)) {
      res.status(400).json({ error: 'لم يحن موعد فتح الاختبار بعد' });
      return;
    }
    if (now > new Date(quiz.closesAt)) {
      res.status(400).json({ error: 'انتهت فترة تقديم الاختبار' });
      return;
    }

    // Calculate server authoritative deadline
    const deadlineAt = calculateDeadline(now, {
      timeLimitMinutes: quiz.timeLimitMinutes,
      closesAt: quiz.closesAt,
    });

    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    try {
      attempt = await prisma.attempt.create({
        data: {
          studentId,
          quizId,
          startedAt: now,
          deadlineAt,
          maxScore,
          status: 'IN_PROGRESS',
        },
        include: { answers: true },
      });
    } catch (createErr: any) {
      // Race condition safety: if duplicate insert hit unique constraint
      if (createErr.code === 'P2002') {
        const existing = await prisma.attempt.findUnique({
          where: { studentId_quizId: { studentId, quizId } },
          include: { answers: true },
        });
        if (existing) {
          attempt = existing;
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }

    const remainingSeconds = getRemainingSeconds(attempt.deadlineAt, now);
    res.json({
      resumed: false,
      attempt: {
        id: attempt.id,
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        remainingSeconds,
        status: attempt.status,
        answers: [],
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        language: quiz.language,
        timeLimitMinutes: quiz.timeLimitMinutes,
        negativeMarking: quiz.negativeMarking,
        penaltyPercent: quiz.penaltyPercent,
        questions: quiz.questions,
      },
    });
  } catch (err) {
    console.error('Start quiz error:', err);
    res.status(500).json({ error: 'فشل في بدء الاختبار' });
  }
});

// 3. Autosave Answer per question
// POST /api/student/attempts/:id/answer
router.post('/attempts/:id/answer', async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = req.params.id;
    const { questionId, selectedOptionId } = req.body;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.studentId !== req.user!.id) {
      res.status(404).json({ error: 'المحاولة غير موجودة أو غير مصرح بها' });
      return;
    }

    if (attempt.status !== 'IN_PROGRESS') {
      res.status(400).json({ error: 'المحاولة مكتملة بالفعل، لا يمكن تعديل الإجابات' });
      return;
    }

    const now = new Date();
    if (!isWithinDeadline(now, attempt.deadlineAt, GRACE_PERIOD_MS)) {
      await lazyFinalizeAttemptIfExpired(attempt.id);
      res.status(400).json({ error: 'انتهى الوقت المحدد للمحاولة' });
      return;
    }

    // Upsert answer
    await prisma.answer.upsert({
      where: {
        attemptId_questionId: { attemptId, questionId },
      },
      create: {
        attemptId,
        questionId,
        selectedOptionId: selectedOptionId || null,
        answeredAt: now,
      },
      update: {
        selectedOptionId: selectedOptionId || null,
        answeredAt: now,
      },
    });

    res.json({ success: true, savedAt: now });
  } catch (err) {
    console.error('Autosave answer error:', err);
    res.status(500).json({ error: 'فشل حفظ الإجابة' });
  }
});

// 4. Submit Attempt
// POST /api/student/attempts/:id/submit
router.post('/attempts/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = req.params.id;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt || attempt.studentId !== req.user!.id) {
      res.status(404).json({ error: 'المحاولة غير موجودة' });
      return;
    }

    if (attempt.status !== 'IN_PROGRESS') {
      res.json({
        alreadySubmitted: true,
        score: attempt.score,
        maxScore: attempt.maxScore,
      });
      return;
    }

    const now = new Date();
    // Allow up to GRACE_PERIOD_MS after deadlineAt for network lag
    const withinTime = isWithinDeadline(now, attempt.deadlineAt, GRACE_PERIOD_MS);

    // Score the answers using pure function
    const scoringQuestions: ScoringQuestion[] = attempt.quiz.questions.map((q) => {
      const correctOpt = q.options.find((o) => o.isCorrect);
      return {
        id: q.id,
        points: q.points,
        correctOptionId: correctOpt ? correctOpt.id : '',
      };
    });

    const studentAnswers: StudentAnswer[] = attempt.answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
    }));

    const result = calculateQuizScore(scoringQuestions, studentAnswers, {
      negativeMarking: attempt.quiz.negativeMarking,
      penaltyPercent: attempt.quiz.penaltyPercent,
    });

    const updated = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: withinTime ? 'SUBMITTED' : 'AUTO_FINALIZED',
        submittedAt: now,
        score: result.score,
        maxScore: result.maxScore,
      },
    });

    res.json({
      success: true,
      score: updated.score,
      maxScore: updated.maxScore,
      percentage: result.percentage,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      unansweredCount: result.unansweredCount,
    });
  } catch (err) {
    console.error('Submit attempt error:', err);
    res.status(500).json({ error: 'فشل في تسليم الاختبار' });
  }
});

// 5. Get Attempt Result
// GET /api/student/attempts/:id/result
router.get('/attempts/:id/result', async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = req.params.id;

    // Check lazy finalization
    await lazyFinalizeAttemptIfExpired(attemptId);

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt || attempt.studentId !== req.user!.id) {
      res.status(404).json({ error: 'المحاولة غير موجودة' });
      return;
    }

    const now = new Date();
    // Rule: Show correct answers only after the quiz's close date
    const canRevealCorrectAnswers = now >= new Date(attempt.quiz.closesAt);

    const scoringQuestions: ScoringQuestion[] = attempt.quiz.questions.map((q) => {
      const correctOpt = q.options.find((o) => o.isCorrect);
      return {
        id: q.id,
        points: q.points,
        correctOptionId: correctOpt ? correctOpt.id : '',
      };
    });

    const studentAnswers: StudentAnswer[] = attempt.answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
    }));

    const result = calculateQuizScore(scoringQuestions, studentAnswers, {
      negativeMarking: attempt.quiz.negativeMarking,
      penaltyPercent: attempt.quiz.penaltyPercent,
    });

    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a.selectedOptionId]));

    const questionsFeedback = attempt.quiz.questions.map((q) => {
      const selected = answersMap.get(q.id) || null;
      const correctOpt = q.options.find((o) => o.isCorrect);
      const isCorrect = selected === (correctOpt?.id || null);

      return {
        id: q.id,
        text: q.text,
        points: q.points,
        selectedOptionId: selected,
        // Only disclose correctOptionId if quiz has closed
        correctOptionId: canRevealCorrectAnswers ? (correctOpt ? correctOpt.id : null) : null,
        isCorrect: canRevealCorrectAnswers ? isCorrect : undefined,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          order: o.order,
          isCorrect: canRevealCorrectAnswers ? o.isCorrect : undefined,
        })),
      };
    });

    res.json({
      attemptId: attempt.id,
      quizTitle: attempt.quiz.title,
      quizLanguage: attempt.quiz.language,
      closesAt: attempt.quiz.closesAt,
      canRevealCorrectAnswers,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: result.percentage,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      unansweredCount: result.unansweredCount,
      questions: questionsFeedback,
    });
  } catch (err) {
    console.error('Fetch attempt result error:', err);
    res.status(500).json({ error: 'فشل في تحميل نتيجة الاختبار' });
  }
});

export default router;
