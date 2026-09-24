import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Award,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface QuizItem {
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

interface StudentDashboardProps {
  user: {
    id: string;
    name: string;
    username: string;
    className?: string | null;
  };
  lang: 'ar' | 'en';
  onStartQuiz: (quizId: string) => void;
  onViewResult: (attemptId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  lang,
  onStartQuiz,
  onViewResult,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'upcoming' | 'completed'>('available');
  const [quizzes, setQuizzes] = useState<{
    available: QuizItem[];
    upcoming: QuizItem[];
    completed: QuizItem[];
  }>({ available: [], upcoming: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [selectedQuizForStart, setSelectedQuizForStart] = useState<QuizItem | null>(null);

  const isRtl = lang === 'ar';

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/student/quizzes');
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error('Error fetching student quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const currentList = quizzes[activeTab];

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-950 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-200 text-xs font-mono mb-1">
              <span>{isRtl ? 'بوابة التقييم الأسبوعي' : 'Weekly Assessment Portal'}</span>
              <span aria-hidden="true">·</span>
              <span>{isRtl ? `الشعبة: ${user.className || 'عام'}` : `Class: ${user.className || 'General'}`}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isRtl ? `أهلاً بك، ${user.name}` : `Welcome, ${user.name}`}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-xl leading-relaxed">
              {isRtl
                ? 'يمكنك هنا أداء اختباراتك المقررة والاطلاع على نتائجك وتقييماتك فور انتهاء موعد الاختبار.'
                : 'Take your scheduled assessments and view your scores and detailed performance analytics.'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 self-start sm:self-auto">
            <Award className="w-8 h-8 text-amber-300 shrink-0" />
            <div>
              <span className="text-xs text-teal-200 block">{isRtl ? 'الاختبارات المنجزة' : 'Completed Quizzes'}</span>
              <span className="text-lg font-bold font-mono">{quizzes.completed.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-4 sm:gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'available'
              ? 'border-teal-700 text-teal-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>{isRtl ? 'متاحة للتقديم' : 'Available Now'}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-teal-100 text-teal-800">
            {quizzes.available.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-teal-700 text-teal-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>{isRtl ? 'قادمة قريباً' : 'Upcoming'}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-stone-100 text-stone-600">
            {quizzes.upcoming.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'completed'
              ? 'border-teal-700 text-teal-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>{isRtl ? 'المكتملة والنتائج' : 'Completed'}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-stone-100 text-stone-600">
            {quizzes.completed.length}
          </span>
        </button>
      </div>

      {/* List Content */}
      {loading ? (
        <div className="text-center py-12 text-stone-500 text-sm">
          {isRtl ? 'جاري تحميل الاختبارات...' : 'Loading quizzes...'}
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800">
            {isRtl ? 'لا توجد اختبارات في هذا القسم حالياً' : 'No quizzes in this section right now'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {isRtl
              ? 'سيتم إشعارك عندما يضيف معلمك اختبارات جديدة لشعبتك.'
              : 'New assessments added by your teachers will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((quiz) => {
            const hasStarted = quiz.attempt && quiz.attempt.status === 'IN_PROGRESS';
            const isCompleted = quiz.attempt && (quiz.attempt.status === 'SUBMITTED' || quiz.attempt.status === 'AUTO_FINALIZED');

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-colors"
              >
                <div>
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {quiz.language === 'ar' ? 'العربية' : 'English'}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      {quiz.questionCount} {isRtl ? 'سؤالاً' : 'Questions'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 leading-snug" dir={quiz.language === 'ar' ? 'rtl' : 'ltr'}>
                    {quiz.title}
                  </h3>

                  <p className="text-xs text-stone-500 mt-1">
                    {isRtl ? 'إعداد المعلم:' : 'Teacher:'} <span className="text-stone-700 font-medium">{quiz.teacherName}</span>
                  </p>

                  {/* Negative marking notice */}
                  {quiz.negativeMarking ? (
                    <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {isRtl
                          ? `خصم سالب: تُخصم ${quiz.penaltyPercent}% من علامة كل إجابة خاطئة`
                          : `Negative marking: -${quiz.penaltyPercent}% deducted for incorrect answers`}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{isRtl ? 'لا يوجد خصم للإجابات الخاطئة' : 'No penalty for wrong answers'}</span>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{quiz.timeLimitMinutes} {isRtl ? 'دقيقة' : 'min'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{isRtl ? 'ينتهي في:' : 'Closes:'} {new Date(quiz.closesAt).toLocaleDateString(isRtl ? 'ar-JO' : 'en-US')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-stone-100">
                  {isCompleted && quiz.attempt ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-stone-400 block">{isRtl ? 'علامتك' : 'Your Score'}</span>
                        <span className="text-lg font-bold font-mono text-teal-900">
                          {quiz.attempt.score ?? 0} / {quiz.attempt.maxScore}
                        </span>
                      </div>
                      <button
                        onClick={() => onViewResult(quiz.attempt!.id)}
                        className="touch-target px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>{isRtl ? 'عرض النتيجة' : 'View Result'}</span>
                        {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : hasStarted ? (
                    <button
                      onClick={() => onStartQuiz(quiz.id)}
                      className="touch-target w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 animate-spin-reverse" />
                      <span>{isRtl ? 'متابعة الاختبار الجاري (الوقت مستمر)' : 'Resume Quiz (Time Running)'}</span>
                    </button>
                  ) : activeTab === 'available' ? (
                    <button
                      onClick={() => setSelectedQuizForStart(quiz)}
                      className="touch-target w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{isRtl ? 'بدء الاختبار الآن' : 'Start Quiz'}</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 text-xs text-stone-400 font-mono">
                      {isRtl ? `يفتح بتاريخ: ${new Date(quiz.opensAt).toLocaleDateString('ar-JO')}` : `Opens on: ${new Date(quiz.opensAt).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Quiz Pre-Confirmation Modal */}
      {selectedQuizForStart && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-teal-800 mb-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold">{isRtl ? 'تأكيد بدء الاختبار' : 'Confirm Quiz Start'}</h3>
            </div>

            <h4 className="text-lg font-bold text-stone-900 mt-2" dir={selectedQuizForStart.language === 'ar' ? 'rtl' : 'ltr'}>
              {selectedQuizForStart.title}
            </h4>

            <div className="my-4 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2 text-stone-700">
              <div className="flex justify-between">
                <span>{isRtl ? 'المدة المتاحة:' : 'Time Limit:'}</span>
                <span className="font-bold font-mono">{selectedQuizForStart.timeLimitMinutes} {isRtl ? 'دقيقة' : 'minutes'}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'عدد الأسئلة:' : 'Questions:'}</span>
                <span className="font-bold font-mono">{selectedQuizForStart.questionCount} {isRtl ? 'سؤالاً' : 'questions'}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'نظام العلامات:' : 'Marking System:'}</span>
                <span className="font-bold text-amber-700">
                  {selectedQuizForStart.negativeMarking
                    ? (isRtl ? `خصم سالب ${selectedQuizForStart.penaltyPercent}%` : `Negative -${selectedQuizForStart.penaltyPercent}%`)
                    : (isRtl ? 'بدون خصم' : 'No penalty')}
                </span>
              </div>
            </div>

            {selectedQuizForStart.negativeMarking && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {isRtl
                    ? 'تنبيه: هذا الاختبار يعتمد نظام الخصم السالب. ترك السؤال دون إجابة لا يخصم علامات، بينما الإجابة الخاطئة تخصم من رصيدك.'
                    : 'Notice: This quiz has negative marking. Leaving a question blank has zero penalty, while incorrect answers deduct points.'}
                </p>
              </div>
            )}

            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              {isRtl
                ? 'ملاحظة هامة: بمجرد الضغط على بدء، سيبدأ العداد التنازلي على السيرفر ولا يمكن إيقافه. إذا انقطع الاتصال أو أغلقت الصفحة، يمكنك المتابعة في غضون الوقت المتبقي.'
                : 'Important: Once started, the server-side countdown begins immediately. If you disconnect, you can resume within your remaining time.'}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedQuizForStart(null)}
                className="touch-target flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const qid = selectedQuizForStart.id;
                  setSelectedQuizForStart(null);
                  onStartQuiz(qid);
                }}
                className="touch-target flex-1 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900 shadow-xs"
              >
                {isRtl ? 'بدء الآن' : 'Start Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
