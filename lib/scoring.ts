/**
 * Pure scoring calculation module for Najah Quiz Portal.
 * Enforces business rules:
 * 1. Correct answer: +question.points
 * 2. Wrong answer: -question.points * (quiz.penaltyPercent / 100) if negativeMarking is true, else 0
 * 3. Unanswered question: 0
 * 4. Final score is strictly floored at 0 (a student cannot receive a negative total score).
 * 5. Floating point values are rounded to 2 decimal places to prevent IEEE 754 precision artifacts.
 */

export interface ScoringQuestion {
  id: string;
  points: number;
  correctOptionId: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionId?: string | null;
}

export interface QuizScoringConfig {
  negativeMarking: boolean;
  penaltyPercent?: number; // e.g. 25 for 25%
}

export interface ScoringResult {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  questionResults: Array<{
    questionId: string;
    points: number;
    awardedPoints: number;
    status: 'CORRECT' | 'WRONG' | 'UNANSWERED';
    selectedOptionId: string | null;
    correctOptionId: string;
  }>;
}

/**
 * Rounds a number to a specified number of decimal places (default 2).
 */
export function roundToPrecision(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Pure scoring calculation function.
 */
export function calculateQuizScore(
  questions: ScoringQuestion[],
  answers: StudentAnswer[],
  config: QuizScoringConfig
): ScoringResult {
  const penaltyPercent = config.penaltyPercent ?? 25;
  const answerMap = new Map<string, string | null>();

  for (const ans of answers) {
    if (ans.selectedOptionId) {
      answerMap.set(ans.questionId, ans.selectedOptionId);
    }
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const questionResults = questions.map((q) => {
    maxScore += q.points;
    const selected = answerMap.get(q.id) ?? null;

    if (!selected) {
      unansweredCount++;
      return {
        questionId: q.id,
        points: q.points,
        awardedPoints: 0,
        status: 'UNANSWERED' as const,
        selectedOptionId: null,
        correctOptionId: q.correctOptionId,
      };
    }

    if (selected === q.correctOptionId) {
      correctCount++;
      const awarded = q.points;
      totalScore += awarded;
      return {
        questionId: q.id,
        points: q.points,
        awardedPoints: roundToPrecision(awarded),
        status: 'CORRECT' as const,
        selectedOptionId: selected,
        correctOptionId: q.correctOptionId,
      };
    }

    // Wrong answer
    wrongCount++;
    let penalty = 0;
    if (config.negativeMarking) {
      penalty = -roundToPrecision(q.points * (penaltyPercent / 100));
    }
    totalScore += penalty;

    return {
      questionId: q.id,
      points: q.points,
      awardedPoints: penalty,
      status: 'WRONG' as const,
      selectedOptionId: selected,
      correctOptionId: q.correctOptionId,
    };
  });

  // Strict floor at 0: A student cannot receive a negative score on a quiz
  const flooredScore = Math.max(0, totalScore);
  const finalScore = roundToPrecision(flooredScore, 2);
  const roundedMaxScore = roundToPrecision(maxScore, 2);
  const percentage = roundedMaxScore > 0 ? roundToPrecision((finalScore / roundedMaxScore) * 100, 1) : 0;

  return {
    score: finalScore,
    maxScore: roundedMaxScore,
    percentage,
    correctCount,
    wrongCount,
    unansweredCount,
    questionResults,
  };
}
