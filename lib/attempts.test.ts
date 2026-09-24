import { describe, it, expect } from 'vitest';
import { calculateDeadline, isWithinDeadline, getRemainingSeconds, GRACE_PERIOD_MS } from './attempts';

describe('Attempts & Deadline Server-Side Enforcement Tests', () => {
  it('enforces nominal time limit when quiz closing date is later', () => {
    const startedAt = new Date('2026-09-23T10:00:00.000Z');
    const closesAt = new Date('2026-09-23T12:00:00.000Z'); // 2 hours later
    const deadline = calculateDeadline(startedAt, {
      timeLimitMinutes: 20,
      closesAt,
    });
    // Expected: 10:20:00
    expect(deadline.toISOString()).toBe('2026-09-23T10:20:00.000Z');
  });

  it('caps deadline to quiz.closesAt if quiz closes sooner than time limit', () => {
    const startedAt = new Date('2026-09-23T10:00:00.000Z');
    // Student starts 5 minutes before the quiz officially closes
    const closesAt = new Date('2026-09-23T10:05:00.000Z');
    const deadline = calculateDeadline(startedAt, {
      timeLimitMinutes: 20, // would have been 10:20:00
      closesAt,
    });
    // Deadline must be strictly capped to 10:05:00
    expect(deadline.toISOString()).toBe('2026-09-23T10:05:00.000Z');
  });

  it('permits submissions exactly at or before deadline', () => {
    const deadline = new Date('2026-09-23T10:20:00.000Z');
    const beforeDeadline = new Date('2026-09-23T10:19:59.000Z');
    const atDeadline = new Date('2026-09-23T10:20:00.000Z');

    expect(isWithinDeadline(beforeDeadline, deadline)).toBe(true);
    expect(isWithinDeadline(atDeadline, deadline)).toBe(true);
  });

  it('allows submission within the 5000ms grace period for network latency', () => {
    const deadline = new Date('2026-09-23T10:20:00.000Z');
    const withinGrace = new Date(deadline.getTime() + 3000); // 3 seconds late

    expect(isWithinDeadline(withinGrace, deadline, GRACE_PERIOD_MS)).toBe(true);
  });

  it('rejects submissions after deadline and grace period', () => {
    const deadline = new Date('2026-09-23T10:20:00.000Z');
    const wayTooLate = new Date(deadline.getTime() + GRACE_PERIOD_MS + 1000); // 6 seconds late

    expect(isWithinDeadline(wayTooLate, deadline, GRACE_PERIOD_MS)).toBe(false);
  });

  it('computes remaining seconds accurately and floors at zero when expired', () => {
    const deadline = new Date('2026-09-23T10:20:00.000Z');
    const now = new Date('2026-09-23T10:18:30.000Z');
    expect(getRemainingSeconds(deadline, now)).toBe(90);

    const pastNow = new Date('2026-09-23T10:25:00.000Z');
    expect(getRemainingSeconds(deadline, pastNow)).toBe(0);
  });
});
