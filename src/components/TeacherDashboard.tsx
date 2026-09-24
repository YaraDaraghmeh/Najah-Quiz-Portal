import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Plus, 
  BarChart3, 
  Edit3, 
  Copy, 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  Filter,
  Sparkles,
  School,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

interface TeacherQuiz {
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

interface TeacherClassInfo {
  id: string;
  name: string;
  _count?: { students: number };
}

interface TeacherDashboardProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  lang: 'ar' | 'en';
  onCreateQuiz: (classId?: string) => void;
  onEditQuiz: (quizId: string) => void;
  onViewStats: (quizId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  lang,
  onCreateQuiz,
  onEditQuiz,
  onViewStats,
}) => {
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'UPCOMING' | 'CLOSED'>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const isRtl = lang === 'ar';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizzesRes, classesRes] = await Promise.all([
        apiFetch('/api/teacher/quizzes'),
        apiFetch('/api/teacher/classes'),
      ]);

      if (quizzesRes.ok) {
        const qData = await quizzesRes.json();
        setQuizzes(qData.quizzes || []);
      }

      if (classesRes.ok) {
        const cData = await classesRes.json();
        setTeacherClasses(cData.classes || []);
      }
    } catch (err) {
      console.error('Error fetching teacher dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDuplicate = async (quizId: string) => {
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quizId}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(isRtl ? 'تم تكرار الاختبار بنجاح، يمكنك الآن تعديله' : 'Quiz duplicated successfully');
        fetchData();
      } else {
        setActionMsg(data.error || 'فشل التكرار');
      }
    } catch {
      setActionMsg('خطأ في الاتصال');
    }
  };

  const getStatus = (q: TeacherQuiz) => {
    const now = new Date();
    const opens = new Date(q.opensAt);
    const closes = new Date(q.closesAt);
    if (now < opens) return 'UPCOMING';
    if (now > closes) return 'CLOSED';
    return 'OPEN';
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (statusFilter !== 'ALL' && getStatus(q) !== statusFilter) return false;
    if (selectedClassFilter !== 'ALL') {
      const hasClass = q.classes.some((c) => c.class.id === selectedClassFilter || c.class.name === selectedClassFilter);
      if (!hasClass) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="text-xs font-mono text-stone-500 mb-1">
            {user.role === 'ADMIN' ? (isRtl ? 'لوحة تحكم الإدارة الكاملة' : 'Admin Portal') : (isRtl ? 'لوحة المعلم' : 'Teacher Portal')}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            {isRtl ? 'إدارة الاختبارات الأسبوعية والشعب' : 'Weekly Quizzes & Class Management'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
            {isRtl
              ? 'إنشاء ومتابعة الاختبارات، تخصيص الشعب المستهدفة، وتتبع درجات ومشاركات الطلاب في الوقت الفعلي.'
              : 'Create assessments, assign target classes, set time limits, and monitor student completion in real-time.'}
          </p>
        </div>

        <button
          onClick={() => onCreateQuiz()}
          className="touch-target px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? 'إنشاء اختبار جديد' : 'Create New Quiz'}</span>
        </button>
      </div>

      {/* Teacher Assigned Classes Banner with Direct "Create for Class" Quick Actions */}
      {teacherClasses.length > 0 && (
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-300 text-xs font-mono mb-1">
                <School className="w-4 h-4" />
                <span>{isRtl ? 'الشعب الدراسية المسندة إليك' : 'Your Assigned Cohorts'}</span>
              </div>
              <h2 className="text-base font-bold">
                {isRtl ? 'اختر الشعبة لبدء اختبار مخصص لها فوراً' : 'Pick a class to create a targeted exam'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {teacherClasses.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => onCreateQuiz(cls.id)}
                  className="touch-target px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold flex items-center gap-2 transition-colors"
                  title={isRtl ? `إنشاء اختبار جديد لشعبة ${cls.name}` : `Create quiz for class ${cls.name}`}
                >
                  <Plus className="w-3.5 h-3.5 text-teal-300" />
                  <span>{isRtl ? `شعبة ${cls.name}` : `Class ${cls.name}`}</span>
                  {cls._count?.students !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-teal-200">
                      {cls._count.students} {isRtl ? 'طالباً' : 'students'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold text-stone-400 hover:text-stone-700">✕</button>
        </div>
      )}

      {/* Filter Row: Class Cohort Filter + Status Filter */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Class Filter */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-stone-500 font-semibold shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span>{isRtl ? 'تصفية حسب الشعبة:' : 'Filter by Class:'}</span>
          </span>

          <button
            onClick={() => setSelectedClassFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              selectedClassFilter === 'ALL'
                ? 'bg-teal-800 text-white font-semibold'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {isRtl ? 'كل الشعب' : 'All Classes'}
          </button>

          {teacherClasses.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassFilter(cls.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedClassFilter === cls.id
                  ? 'bg-teal-800 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'ALL' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isRtl ? 'الكل' : 'All'} ({quizzes.length})
          </button>
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'OPEN' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isRtl ? 'مفتوح' : 'Open'}
          </button>
          <button
            onClick={() => setStatusFilter('UPCOMING')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'UPCOMING' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isRtl ? 'قادم' : 'Upcoming'}
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'CLOSED' ? 'bg-stone-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isRtl ? 'مغلق' : 'Closed'}
          </button>
        </div>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-stone-500">
          {isRtl ? 'جاري تحميل الاختبارات...' : 'Loading quizzes...'}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">
            {isRtl ? 'لا توجد اختبارات تطابق الفلتر المحدد' : 'No quizzes matching filter'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {isRtl ? 'اضغط على "إنشاء اختبار جديد" أو اختر إحدى شعبك لبدء إعداد التقييم.' : 'Click "Create New Quiz" to start.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuizzes.map((quiz) => {
            const status = getStatus(quiz);
            const hasAttempts = quiz._count.attempts > 0;

            return (
              <div
                key={quiz.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-teal-300 transition-colors shadow-xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {status === 'OPEN' && (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {isRtl ? 'مفتوح حالياً' : 'Open'}
                        </span>
                      )}
                      {status === 'UPCOMING' && (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {isRtl ? 'قادم قريباً' : 'Upcoming'}
                        </span>
                      )}
                      {status === 'CLOSED' && (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {isRtl ? 'مغلق' : 'Closed'}
                        </span>
                      )}

                      {/* Prominent Target Classes Badges */}
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[11px]">{isRtl ? 'الشعبة:' : 'Class:'}</span>
                        {quiz.classes.map((c) => (
                          <span
                            key={c.class.id}
                            className="px-2 py-0.5 rounded-md font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 text-xs"
                          >
                            {c.class.name}
                          </span>
                        ))}
                      </div>

                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="font-mono text-stone-500">{quiz.language.toUpperCase()}</span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="font-mono text-stone-600">
                        {quiz._count.questions} {isRtl ? 'سؤالاً' : 'Questions'}
                      </span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="font-mono text-stone-600">
                        {quiz.timeLimitMinutes} {isRtl ? 'دقيقة' : 'min'}
                      </span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="text-stone-600 font-medium">
                        {quiz.negativeMarking
                          ? (isRtl ? `خصم سالب ${quiz.penaltyPercent}%` : `Negative -${quiz.penaltyPercent}%`)
                          : (isRtl ? 'بدون خصم' : 'No penalty')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900" dir={quiz.language === 'ar' ? 'rtl' : 'ltr'}>
                      {quiz.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                      <span>{isRtl ? 'المعلم:' : 'Teacher:'} <span className="text-stone-700 font-medium">{quiz.createdBy.name}</span></span>
                      <span>
                        {new Date(quiz.opensAt).toLocaleDateString()} - {new Date(quiz.closesAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                    {/* Attempts count pill */}
                    <div className="px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-center">
                      <span className="text-[11px] text-stone-400 block leading-tight">{isRtl ? 'المحاولات' : 'Attempts'}</span>
                      <span className="text-sm font-bold font-mono text-teal-900">{quiz._count.attempts}</span>
                    </div>

                    {/* Stats & Results Button */}
                    <button
                      onClick={() => onViewStats(quiz.id)}
                      className="touch-target px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'النتائج والإحصائيات' : 'Results & Stats'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => onEditQuiz(quiz.id)}
                      className="touch-target px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      title={hasAttempts ? (isRtl ? 'يحتوي على محاولات، يسمح بتعديل الوقت والتواريخ فقط' : 'Has attempts') : undefined}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                    </button>

                    {/* Duplicate Button */}
                    <button
                      onClick={() => handleDuplicate(quiz.id)}
                      className="touch-target px-2.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      title={isRtl ? 'نسخ هذا الاختبار لشعبة أخرى' : 'Duplicate Quiz'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isRtl ? 'نسخ' : 'Clone'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
