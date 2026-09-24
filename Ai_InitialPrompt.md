You are a senior full-stack engineer. Build a complete, production-quality MVP web app for a tutoring centre in Amman (about 300 students, 12 teachers). Treat this as a real client job. Where the brief is unclear, make a sensible decision and list it in DECISIONS.md.

## The client brief
Weekly quizzes currently run on paper. The client wants a simple website where students log in, take a timed multiple-choice quiz, and see their score at the end. Teachers create the quizzes. Each quiz has a time limit (usually 20 min) and an open/close date range. A student must not be able to take a quiz twice. The client wants to see how students did. Some teachers use negative marking for wrong answers and some don't; it depends on the teacher and the quiz. A typical quiz has 15 questions with 4 options each, and each question has its own point value. Many students have Arabic names and some quizzes are in Arabic, so Arabic must work properly (RTL). No designer: the UI must be clean and mobile-first, because most students only have a phone. Real data (students, teachers, last week's quiz) will arrive later as spreadsheets.

## Stack (required)
- React(Vite) 14+ (App Router) + TypeScript
- Prisma + SQLite (file DB), no external services
- Tailwind CSS
- Auth: email/username + password (bcrypt), httpOnly signed session cookie
- Tests: Vitest
- Must run on a clean machine with: `npm install && npm run setup && npm run dev`
  where `setup` runs prisma migrate + seed. Also provide a Dockerfile + docker-compose.yml that does the same with one command.

## Roles
- ADMIN (the client, Nour): sees everything, manages users/classes, imports spreadsheets.
- TEACHER: creates/edits quizzes for their own classes, sees results for their own quizzes/classes only.
- STUDENT: belongs to one class, sees quizzes assigned to their class, takes them, sees their own results.

## Data model (Prisma)
User(role, name, username, passwordHash, classId?), Class(name: 10A/10B/11A), TeacherClass (many-to-many), Quiz(title, language 'ar'|'en', timeLimitMinutes, opensAt, closesAt, negativeMarking boolean, penaltyPercent default 25, createdBy), QuizClass (which classes get the quiz), Question(quizId, text, points, order), Option(questionId, text, isCorrect, order), Attempt(studentId, quizId, startedAt, deadlineAt, submittedAt?, score?, maxScore) with @@unique([studentId, quizId]), Answer(attemptId, questionId, selectedOptionId?) with @@unique([attemptId, questionId]).

## Critical correctness rules (these will be tested by attackers)
1. The timer is enforced SERVER-SIDE. deadlineAt = min(startedAt + timeLimit, quiz.closesAt). Reject answers/submits after deadlineAt (allow a few seconds of grace). The client countdown is cosmetic only.
2. Refreshing the page or logging in from another device resumes the same attempt with the remaining time. It never restarts the clock or creates a second attempt.
3. One attempt per student per quiz: enforced by the DB unique constraint AND handled gracefully in code (race conditions / double-click / two tabs).
4. Correct answers are NEVER sent to the client before submission. Don't expose isCorrect in any student-facing API or page.
5. If a student abandons the quiz, the attempt is auto-finalized after the deadline (do it lazily on next read, no cron needed) and scored with whatever was saved. Save answers as the student goes (autosave per question).
6. Students can only see quizzes for their class, only inside the open window, only their own attempts. Teachers only see their own classes' data. Enforce this in every server route/action, not just in the UI. Check IDs (IDOR).
7. Scoring lives in one pure, well-tested function: correct = +points; wrong = -points * penaltyPercent/100 if quiz.negativeMarking, else 0; unanswered = 0. Final score is floored at 0 (document this decision). Handle decimals cleanly.
8. Editing a quiz after students have started must not corrupt existing attempts (block editing questions once any attempt exists; show a clear message).
9. Basic login rate limiting, generic error messages, CSRF-safe mutations, input validation with zod.

## Features
Student: login → dashboard (available / upcoming / completed quizzes with dates) → start screen (title, question count, time limit, negative-marking warning shown BEFORE starting) → quiz screen (one question per screen on mobile, sticky countdown timer, progress bar, prev/next, question navigator, confirm-before-submit, unanswered count) → result screen (score, percentage, correct/wrong/unanswered counts; show correct answers only after the quiz's close date, configurable).
Teacher: create quiz form (title, language, time limit, dates, negative marking + penalty, assign classes, add questions with 4 options and points, mark correct option), duplicate quiz, results page per quiz (table of students with score/time taken/status, not-attempted list, average/median/highest/lowest, score distribution chart, per-question % correct to spot hard questions), CSV export of results.
Admin: everything above plus user/class management and spreadsheet import.
Import: CSV/XLSX import for students, teachers, and a quiz (questions with options). Show a validation preview with row-level errors before committing. Handle Arabic text and UTF-8 properly. Provide the template files in /sample-data.

## Arabic / RTL / mobile
- Use `dir="auto"` on text content and quiz content so an Arabic quiz renders RTL and an English quiz LTR, even in the same UI. Support a UI language toggle (AR/EN) at least for main screens.
- Use a good Arabic font (Cairo or Noto Sans Arabic via next/font), use logical CSS properties (ms/me/ps/pe, text-start) so layouts don't break in RTL.
- Export CSV with UTF-8 BOM so Excel shows Arabic correctly.
- Mobile-first: 360px width minimum, tap targets >= 44px, no horizontal scroll, timer visible while scrolling, works with the on-screen keyboard.
- Clean, calm design: generous spacing, one accent color, clear states (loading, empty, error).

## Seed data (realistic)
- 1 admin, 4 teachers (Arabic names, each assigned to specific classes), 3 classes (10A, 10B, 11A) with ~20 students each (realistic Arabic names, some with Latin transliteration usernames).
- 4 quizzes: one Arabic math quiz with 15 questions (negative marking OFF), one English science quiz with 15 questions (negative marking ON, 25%), one currently closed quiz with completed attempts and varied scores (so results pages have real data), one upcoming quiz not yet open.
- Different point values per question (e.g. 1, 2, 3).
- Demo credentials for admin, teacher, student, listed in README.

## Tests (Vitest)
Cover the most important parts: scoring function (with/without negative marking, unanswered, decimals, floor at 0), attempt uniqueness and resume behavior, time-window enforcement (before open, after close, after deadline), server-side deadline on late submit, authorization (student can't see other class's quiz or others' results, teacher can't see other teacher's classes), and that correct answers are never leaked in student API responses.

## Deliverables
- Full source code, clean structure (separate lib/scoring, lib/attempts, lib/auth, lib/import), no dead code.
- README.md: one-command run, how to seed/reset sample data, demo logins, how to run tests.
- DECISIONS.md: assumptions (e.g. negative-marking penalty rule, floor at 0, when correct answers are revealed, one class per student, no password reset flow), what I built that wasn't asked and why (autosave, import preview, stats page, AR/EN toggle), what I deliberately left out, what I'd do next with another week.
- .env.example, .gitignore (no db files, no node_modules).

Work in clear stages so I can commit after each: (1) project setup + schema + seed, (2) auth + roles, (3) scoring + attempt logic with tests, (4) student flow UI, (5) teacher quiz creation, (6) results & stats, (7) import, (8) polish, RTL, docs. Start with stage 1 and stop after it so I can review.
