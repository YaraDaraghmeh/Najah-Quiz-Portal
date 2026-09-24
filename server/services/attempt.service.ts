import { prisma } from '../../lib/db';
import { calculateQuizScore, ScoringQuestion, StudentAnswer } from '../../lib/scoring';
import { GRACE_PERIOD_MS } from '../../lib/attempts';

/**
 * Auto-finalizes an expired in-progress attempt lazily.
 * Calculates score based on current answers and marks attempt as AUTO_FINALIZED.
 */
export async function lazyFinalizeAttemptIfExpired(attemptId: string) {
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

  if (!attempt || attempt.status !== 'IN_PROGRESS') return attempt;

  const now = new Date();
  if (now.getTime() > attempt.deadlineAt.getTime() + GRACE_PERIOD_MS) {
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
        status: 'AUTO_FINALIZED',
        submittedAt: attempt.deadlineAt,
        score: result.score,
        maxScore: result.maxScore,
      },
      include: {
        quiz: {
          include: {
            questions: { include: { options: true } },
          },
        },
        answers: true,
      },
    });
    return updated;
  }

  return attempt;
}
