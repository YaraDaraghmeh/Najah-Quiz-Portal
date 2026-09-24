/**
 * Attempt logic and server-side timer enforcement helpers.
 *
 * Rules:
 * 1. deadlineAt = min(startedAt + timeLimitMinutes * 60 * 1000, quiz.closesAt)
 * 2. Timer is authoritative on the server.
 * 3. Grace period (e.g. 5 seconds) for network latency on final submit.
 */

export const GRACE_PERIOD_MS = 5000; // 5-second grace window for submit latency

export interface QuizTimerLimits {
  timeLimitMinutes: number;
  closesAt: Date;
}

/**
 * Computes authoritative server-side deadline:
 * deadlineAt = min(startedAt + timeLimit, quiz.closesAt)
 */
export function calculateDeadline(startedAt: Date, quiz: QuizTimerLimits): Date {
  const allottedMs = quiz.timeLimitMinutes * 60 * 1000;
  const nominalDeadline = new Date(startedAt.getTime() + allottedMs);
  const quizClosesAt = new Date(quiz.closesAt);

  // Return earlier of nominal time limit expiry or quiz closing date
  return nominalDeadline < quizClosesAt ? nominalDeadline : quizClosesAt;
}

/**
 * Checks if a given submission timestamp is within the permitted deadline (including grace period).
 */
export function isWithinDeadline(
  submittedAt: Date,
  deadlineAt: Date,
  graceMs: number = GRACE_PERIOD_MS
): boolean {
  return submittedAt.getTime() <= deadlineAt.getTime() + graceMs;
}

/**
 * Calculates remaining seconds from now until deadline. Returns 0 if already expired.
 */
export function getRemainingSeconds(deadlineAt: Date, now: Date = new Date()): number {
  const diffMs = deadlineAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}
