# Architectural & Engineering Decisions 

This document records the architectural decisions, client requirements analysis, assumptions, and engineering rationale for the **Najah Tutoring Centre Portal (Amman)**.

---
Architecture & File Structure
```
├── prisma/
│   ├── schema.prisma       # Relational models (SQLite)
│   └── seed.ts             # Realistic Amman centre seed dataset
├── lib/
│   ├── db.ts               # PrismaClient singleton
│   ├── scoring.ts          # Pure scoring function (+points, -penalty%, 0 floor)
│   ├── scoring.test.ts     # Vitest tests for scoring
│   ├── attempts.ts         # Server-authoritative timer and deadline logic
│   ├── attempts.test.ts    # Vitest tests for deadline & grace period
│   ├── import.ts           # Excel/CSV validation routines
│   ├── import.test.ts      # Vitest tests for imports
│   └── auth.ts             # Bcrypt hashing and HMAC-SHA256 signed cookies
├── server/
│   ├── types.ts            # AuthRequest and backend interfaces
│   ├── middleware/
│   │   └── auth.ts         # Session auth, role verification, and rate limiting
│   ├── services/
│   │   └── attempt.service.ts # Attempt evaluation & lazy finalization logic
│   └── routes/
│       ├── index.ts        # Central API router mounting all modules
│       ├── auth.routes.ts  # Login, session verification, demo users, logout
│       ├── student.routes.ts # Student quizzes, attempts, autosave, submission
│       ├── teacher.routes.ts # Teacher quiz editor, stats, results, CSV export
│       ├── admin.routes.ts # User & class management CRUD
│       ├── import.routes.ts# Excel/CSV preview & batch commit
│       └── status.routes.ts# System health & verification metrics
├── src/
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces & domain models
│   ├── components/         # Modular React UI components
│   ├── lib/
│   │   └── api.ts          # API fetch client
│   ├── App.tsx             # Interactive review dashboard & frontend root
│   ├── main.tsx            # React root mount
│   └── index.css           # Tailwind CSS + Cairo/Plus Jakarta Sans typography
├── server.ts               # Express entrypoint with Vite dev middlewares
├── DECISIONS.md            # Technical decisions and architectural log
├── CLAUDE.md               # Project conventions
└── README.md               # Quickstart, demo credentials, and test instructions
```

## 1. Core Architecture & Technology Stack

### A. Full-Stack Node/Express + Vite SPA + Prisma SQLite
- **Decision**: Implemented an Express backend combined with Vite React 19 SPA, Prisma ORM, and local SQLite (`file:./dev.db`).
- **Rationale**:
  1. Zero external services requirement: SQLite provides ACID compliance, fast single-file persistence, and zero maintenance overhead for the 300 students and 12 teachers in Amman.
  2. The Express server directly mounts the Vite middleware in development and serves pre-built static assets in production, conforming to zero-flicker single-port execution on port 3000.
  3. Single-command clean machine setup: `npm install && npm run setup && npm run dev` triggers schema push, seed population, and immediate server start.

---

## 2. Core Business Assumptions & Rules

### A. Negative Marking Calculation
- **Rule**:
  - Correct Answer: `+question.points`
  - Wrong Answer: `-question.points * (penaltyPercent / 100)` (default 25%)
  - Unanswered Question: `0`
- **Floor at Zero**:
  - The total quiz score is strictly floored at `0` (`Math.max(0, calculatedScore)`).
  - *Rationale*: A student who attempts challenging questions and makes errors should not receive a negative grade that corrupts overall grade point averages or discourages participation.
- **Floating Point Decimal Cleanliness**:
  - All intermediate calculations and final totals are rounded to 2 decimal places (`roundToPrecision(val, 2)`) using `Math.round((val + Number.EPSILON) * 100) / 100` to eliminate IEEE 754 precision artifacts (e.g. `0.7500000000000001`).

### B. Server-Authoritative Timer & Grace Period
- **Rule**:
  - `deadlineAt = min(startedAt + timeLimitMinutes, quiz.closesAt)`.
  - The client countdown timer is purely cosmetic. All submission timestamps are validated server-side.
  - Submissions exceeding `deadlineAt` are rejected, with a strict **5000ms grace period** (`GRACE_PERIOD_MS = 5000`) to account for mobile network latency in Amman.
  - Resume behavior: Refreshing the browser or reconnecting fetches the original `startedAt` and `deadlineAt`, computing `remainingSeconds = max(0, deadlineAt - now)`. It never restarts the clock.

### C. Unique Attempt & Anti-Leakage Protection
- **Constraint**: `@@unique([studentId, quizId])` on the `Attempt` table guarantees only one attempt per student.
- **Zero Leakage**: The database column `isCorrect` on `Option` is filtered out from any student-facing API route. Correct answers and answer keys are never transmitted to the client while a quiz is active.

### D. Single Class per Student
- **Assumption**: Each student belongs to one primary class (`classId` on `User`).
- **Rationale**: Tutoring cohorts at the Amman centre run structured semester tracks (10A, 10B, 11A). Teachers teach across multiple classes via the many-to-many `TeacherClass` table.

---

## 3. What Was Built Beyond the Brief & Why

1. **Autosave Engine Architecture**:
   - Built an atomic answer recorder (`Answer` model with `@@unique([attemptId, questionId])`). As students navigate or select options on their phones, each choice is persisted immediately. If a student's battery dies or phone disconnects, answers are safely stored.
2. **Lazy Auto-Finalization for Abandoned Quizzes**:
   - If an attempt passes its deadline without an explicit submit, the server marks it `AUTO_FINALIZED` and scores the saved answers on next read, avoiding the need for heavy background cron jobs.
3. **Live AR/EN Bilingual Support**:
   - Full RTL support with `dir="rtl"`, Google Font `Cairo` for Arabic, and `Plus Jakarta Sans` for English. Includes a seamless header language toggle.
4. **Interactive Stage 1 Inspection Dashboard**:
   - Provides a comprehensive UI for the client (Nour) to inspect database health, counts, class distributions, seeded quizzes, and execute demo logins right in the browser.
5. **In-Memory Rate Limiting**:
   - Protects the `/api/auth/login` endpoint against brute-force attacks (10 attempts per minute per IP).
6. **Class Selection & Multi-Cohort Targeting**:
   - In `QuizEditor`, teachers can assign an exam to one or multiple cohorts using both an interactive checkbox card grid and a single-class dropdown.
   - Enrolled student count and assigned badges are displayed live.
   - Teachers can toggle to view all centre classes or their assigned cohorts.
   - In `TeacherDashboard`, teachers can filter quizzes by class and use quick-start buttons (`+ إنشاء اختبار لشعبة 10A`) to pre-select a cohort.

---

## 4. What Was Deliberately Left Out

- **External OAuth / SMS Verification**: Would introduce external dependencies and recurring API costs. Secure bcrypt password hashes with signed cookies were used instead.
- **WebSockets / Heavy Socket Server**: Polling or periodic HTTP requests for autosave are significantly more robust on flaky 3G/4G mobile networks than persistent bidirectional socket connections.

---

## 5. Roadmap: What to Build With Another Week

1. **Audio/TTS Voice Reader**: Audio narration of questions for younger students or students with reading difficulties.
2. **LaTeX Math Rendering**: Integrated KaTeX for complex Arabic/English mathematical equations.
3. **Automated PDF Grade Card Generator**: Branded PDF exports for parents with class performance percentiles and teacher remarks.
4. **Offline PWA Support**: Service Worker caching allowing students to buffer quiz questions even during transient drops in connectivity.

---

## 6. Architecture Modernization: Modular Layering & Separation of Concerns

- **Context**: The backend was originally bundled into a single monolithic  `server.ts` file, mixing authentication, user management, student attempt logic, teacher quiz editor endpoints, analytics, and static asset serving.
- **Refactoring Decisions**:
  1. **Separation of Routes & Controllers**:
     - Decomposed into focused route modules under `server/routes/` (`auth.routes.ts`, `student.routes.ts`, `teacher.routes.ts`, `admin.routes.ts`, `import.routes.ts`, `status.routes.ts`).
     - Consolidated all routes into `server/routes/index.ts` mounted at `/api`.
  2. **Service Layer Abstraction**:
     - Extracted attempt evaluation and lazy expiration handling into `server/services/attempt.service.ts`.
  3. **Middleware Isolation**:
     - Extracted authentication, role authorization, and rate limiting into `server/middleware/auth.ts`.
  4. **Strict Type Safety**:
     - Created `server/types.ts` with strongly typed `AuthRequest` and `UserRole`, eliminating ad-hoc `any` casts and compiler errors (`TS2339`).
  5. **Frontend Domain Modeling**:
     - Centralized shared types and interfaces under `src/types/index.ts`.
  6. **Build & Config Modernization**:
     - Resolved Vite native config warning by migrating to `import.meta.dirname`.
     - Renamed package to `najah-tutoring-portal` in `package.json`.
     - Verified zero-error TypeScript linting (`npm run lint`), passing Vitest suite (15/15 tests), and production build.
