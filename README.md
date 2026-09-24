# Najah Quiz Portal - Amman Tutoring Centre

A mobile-first bilingual (Arabic / English) quiz assessment web application built for a tutoring centre in Amman (~300 students, 12 teachers). Features server-authoritative timers, negative marking penalties, zero answer leakage, and an embedded SQLite database managed via Prisma.

---

## Quickstart (Clean Machine Setup)

To run the application on any clean machine:

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Setup SQLite schema and seed realistic data
npm run setup

# 3. Launch development server (Port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Docker & Docker Compose (One-Command Run)

Run the entire system in an isolated container:

```bash
docker compose up --build
```

Access the app at `http://localhost:3000`.

The first container start creates the SQLite database and seeds the demo data. The
database is stored in the `sqlite_data` Docker volume and is not reseeded on
subsequent restarts. Set a strong session secret before deploying:

```bash
SESSION_SECRET="$(openssl rand -hex 32)" docker compose up --build -d
```

To stop the container without deleting data:

```bash
docker compose down
```

---

## Demo Login Credentials

The database has been seeded with realistic Jordan/Amman educational records:

| Role | Name | Username | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | نور المشرفة (Nour) | `nour` | `Password123!` | Tutoring centre owner; sees all classes and quizzes |
| **TEACHER** | أحمد الخطيب (Ahmad) | `ahmad.khatib` | `Password123!` | Assigned to 10A & 10B; created Arabic Math & Physics quizzes |
| **TEACHER** | رانيا الزعبي (Rania) | `rania.zoubi` | `Password123!` | Assigned to 11A; created English Science quiz |
| **TEACHER** | طارق حداد (Tareq) | `tareq.haddad` | `Password123!` | Assigned to 10A & 11A; created Mid-Term review quiz |
| **TEACHER** | منى المجالي (Mona) | `mona.majali` | `Password123!` | Assigned to 10B |
| **STUDENT** | عمر السيد (Omar) | `omar.sayed` | `Student123!` | Class 10A student |
| **STUDENT** | زيد النابلسي (Zaid) | `zaid.nabulsi` | `Student123!` | Class 10B student |
| **STUDENT** | لين الحسيني (Leen) | `leen.husseini` | `Student123!` | Class 11A student |

*(Total seeded students: 60 realistic Arabic students across classes 10A, 10B, and 11A. All students share the password `Student123!`)*.

---

## Running Automated Tests

Run the Vitest test suite covering pure scoring rules, negative marking calculations, zero-score flooring, and server-side timer enforcement:

```bash
npm test
```

---

## How to Reset / Re-Seed Sample Data

If you modify quizzes or test attempts and want to restore the pristine seed state:

```bash
npm run seed
```

---

## Stage Breakdown

- **Stage 1 [COMPLETED]**: Project setup, Prisma schema, SQLite file DB, realistic Amman seed data, server-authoritative timer logic, pure scoring function, 12 Vitest tests, Dockerfile, docker-compose, and documentation.
- **Stage 2**: Authentication & role-based access control.
- **Stage 3**: Scoring & attempt lifecycle APIs.
- **Stage 4**: Student mobile quiz taking flow with sticky timer.
- **Stage 5**: Teacher quiz creator & editor.
- **Stage 6**: Teacher results table, analytics, and CSV exports.
- **Stage 7**: Excel/CSV bulk import for students & teachers.
- **Stage 8**: Final polish, full RTL verification, and client delivery.
