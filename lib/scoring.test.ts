import { describe, it, expect } from 'vitest';
import { calculateQuizScore, roundToPrecision } from './scoring';

describe('Scoring Logic Tests', () => {
  const sampleQuestions = [
    { id: 'q1', points: 1.0, correctOptionId: 'opt-1a' },
    { id: 'q2', points: 2.0, correctOptionId: 'opt-2b' },
    { id: 'q3', points: 3.0, correctOptionId: 'opt-3c' },
    { id: 'q4', points: 1.5, correctOptionId: 'opt-4d' },
  ];

  it('calculates perfect score without negative marking', () => {
    const answers = [
      { questionId: 'q1', selectedOptionId: 'opt-1a' },
      { questionId: 'q2', selectedOptionId: 'opt-2b' },
      { questionId: 'q3', selectedOptionId: 'opt-3c' },
      { questionId: 'q4', selectedOptionId: 'opt-4d' },
    ];
    const result = calculateQuizScore(sampleQuestions, answers, { negativeMarking: false });
    expect(result.score).toBe(7.5);
    expect(result.maxScore).toBe(7.5);
    expect(result.percentage).toBe(100);
    expect(result.correctCount).toBe(4);
    expect(result.wrongCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
  });

  it('calculates score with incorrect answers when negative marking is OFF', () => {
    const answers = [
      { questionId: 'q1', selectedOptionId: 'opt-1a' }, // Correct: +1.0
      { questionId: 'q2', selectedOptionId: 'opt-wrong' }, // Wrong: 0
      { questionId: 'q3', selectedOptionId: 'opt-wrong' }, // Wrong: 0
      // q4 is unanswered: 0
    ];
    const result = calculateQuizScore(sampleQuestions, answers, { negativeMarking: false });
    expect(result.score).toBe(1.0);
    expect(result.maxScore).toBe(7.5);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(2);
    expect(result.unansweredCount).toBe(1);
  });

  it('calculates score with negative marking penalty (25%)', () => {
    const questions = [
      { id: 'q1', points: 4.0, correctOptionId: 'opt-1' },
      { id: 'q2', points: 4.0, correctOptionId: 'opt-2' },
    ];
    const answers = [
      { questionId: 'q1', selectedOptionId: 'opt-1' }, // Correct: +4.0
      { questionId: 'q2', selectedOptionId: 'wrong' }, // Wrong: -4.0 * 0.25 = -1.0
    ];
    const result = calculateQuizScore(questions, answers, {
      negativeMarking: true,
      penaltyPercent: 25,
    });
    expect(result.score).toBe(3.0);
    expect(result.maxScore).toBe(8.0);
    expect(result.percentage).toBe(37.5);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
  });

  it('floors score at 0 when penalties exceed points earned', () => {
    const questions = [
      { id: 'q1', points: 1.0, correctOptionId: 'opt-1' },
      { id: 'q2', points: 4.0, correctOptionId: 'opt-2' },
      { id: 'q3', points: 4.0, correctOptionId: 'opt-3' },
    ];
    // Student got q1 wrong (-0.25), q2 wrong (-1.0), q3 wrong (-1.0)
    // Raw sum would be -2.25
    const answers = [
      { questionId: 'q1', selectedOptionId: 'wrong' },
      { questionId: 'q2', selectedOptionId: 'wrong' },
      { questionId: 'q3', selectedOptionId: 'wrong' },
    ];
    const result = calculateQuizScore(questions, answers, {
      negativeMarking: true,
      penaltyPercent: 25,
    });
    expect(result.score).toBe(0); // Strictly floored at 0
    expect(result.wrongCount).toBe(3);
    expect(result.correctCount).toBe(0);
  });

  it('handles decimal point values and penalties accurately without precision leaks', () => {
    const questions = [
      { id: 'q1', points: 3.33, correctOptionId: 'opt-1' },
      { id: 'q2', points: 2.67, correctOptionId: 'opt-2' },
    ];
    const answers = [
      { questionId: 'q1', selectedOptionId: 'opt-1' }, // +3.33
      { questionId: 'q2', selectedOptionId: 'wrong' }, // -2.67 * 0.25 = -0.6675 -> -0.67
    ];
    const result = calculateQuizScore(questions, answers, {
      negativeMarking: true,
      penaltyPercent: 25,
    });
    expect(result.score).toBe(2.66);
    expect(roundToPrecision(result.score)).toBe(2.66);
  });

  it('leaves unanswered questions at 0 penalty even with negative marking enabled', () => {
    const questions = [
      { id: 'q1', points: 2.0, correctOptionId: 'opt-1' },
      { id: 'q2', points: 2.0, correctOptionId: 'opt-2' },
    ];
    // Student answers q1 correctly, leaves q2 blank
    const answers = [{ questionId: 'q1', selectedOptionId: 'opt-1' }];
    const result = calculateQuizScore(questions, answers, {
      negativeMarking: true,
      penaltyPercent: 25,
    });
    expect(result.score).toBe(2.0);
    expect(result.unansweredCount).toBe(1);
    expect(result.wrongCount).toBe(0);
  });
});
