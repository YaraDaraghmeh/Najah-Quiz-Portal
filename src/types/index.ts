// Core User Types
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  classId?: string | null;
  className?: string | null;
}

export interface DemoUserItem {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  className?: string | null;
  defaultPassword: string;
}

// Class & Cohort Types
export interface ClassItem {
  id: string;
  name: string;
  _count?: {
    students?: number;
    teacherClasses?: number;
    quizClasses?: number;
  };
}

export interface TeacherClassInfo {
  id: string;
  name: string;
  _count?: { students: number };
}

// Quiz & Question Types
export interface QuizOption {
  id: string;
  text: string;
  order: number;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  text: string;
  points: number;
  order: number;
  options: QuizOption[];
}

export interface StudentQuizItem {
  id: string;
  title: string;
  language: string;
  timeLimitMinutes: number;
  opensAt: string;
  closesAt: string;
  negativeMarking: boolean;
  penaltyPercent: number;
  teacherName: string;
  questionCount: number;
  attempt?: {
    id: string;
    status: string;
    score: number | null;
    maxScore: number;
    startedAt: string;
    deadlineAt: string;
    submittedAt?: string | null;
  } | null;
}

export interface TeacherQuiz {
  id: string;
  title: string;
  language: string;
  timeLimitMinutes: number;
  opensAt: string;
  closesAt: string;
  negativeMarking: boolean;
  penaltyPercent: number;
  createdBy: { name: string; username: string };
  classes: Array<{ class: { id: string; name: string } }>;
  _count: { questions: number; attempts: number };
}

// Attempt & Result Types
export interface AttemptAnswer {
  questionId: string;
  selectedOptionId: string | null;
}

export interface QuestionFeedback {
  id: string;
  text: string;
  points: number;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect?: boolean;
  options: Array<{
    id: string;
    text: string;
    order: number;
    isCorrect?: boolean;
  }>;
}

export interface AttemptResult {
  attemptId: string;
  quizTitle: string;
  quizLanguage: string;
  closesAt: string;
  canRevealCorrectAnswers: boolean;
  status: string;
  score: number | null;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  questions: QuestionFeedback[];
}

// Teacher Analytics & Stats Types
export interface StudentResultRow {
  studentId: string;
  name: string;
  username: string;
  className: string;
  status: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  timeSpentSeconds: number | null;
  startedAt: string | null;
  submittedAt: string | null;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
}

export interface QuestionStatItem {
  id: string;
  order: number;
  text: string;
  points: number;
  correctCount: number;
  answeredCount: number;
  successRate: number;
  isHard: boolean;
}

export interface QuizStatsSummary {
  totalAssigned: number;
  completedCount: number;
  notAttemptedCount: number;
  average: number;
  median: number;
  highest: number;
  lowest: number;
}

export interface QuizResultsPayload {
  quiz: {
    id: string;
    title: string;
    language: string;
    timeLimitMinutes: number;
    opensAt: string;
    closesAt: string;
    negativeMarking: boolean;
    penaltyPercent: number;
  };
  stats: QuizStatsSummary;
  distribution: ScoreDistributionBucket[];
  questionStats: QuestionStatItem[];
  students: StudentResultRow[];
}
