import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Layers, 
  Check, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';

interface QuizOption {
  id: string;
  text: string;
  order: number;
}

interface QuizQuestion {
  id: string;
  text: string;
  points: number;
  order: number;
  options: QuizOption[];
}

interface QuizRunnerProps {
  quizId: string;
  lang: 'ar' | 'en';
  onCompleted: (attemptId: string) => void;
  onExit: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  quizId,
  lang,
  onCompleted,
  onExit,
}) => {
  const isRtl = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attempt & Quiz state
  const [attemptId, setAttemptId] = useState<string>('');
  const [quizTitle, setQuizTitle] = useState<string>('');
  const [quizLanguage, setQuizLanguage] = useState<'ar' | 'en'>('ar');
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [penaltyPercent, setPenaltyPercent] = useState<number>(25);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});

  // Navigation
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showNavGrid, setShowNavGrid] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Server Authoritative Timer
  const [deadlineAt, setDeadlineAt] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Initialize or Resume Quiz Attempt
  useEffect(() => {
    let mounted = true;
    const startOrResumeQuiz = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch(`/api/student/quizzes/${quizId}/start`, {
          method: 'POST',
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.completed && data.attemptId) {
            onCompleted(data.attemptId);
            return;
          }
          throw new Error(data.error || 'فشل في بدء الاختبار');
        }

        if (!mounted) return;

        setAttemptId(data.attempt.id);
        setQuizTitle(data.quiz.title);
        setQuizLanguage(data.quiz.language);
        setNegativeMarking(data.quiz.negativeMarking);
        setPenaltyPercent(data.quiz.penaltyPercent);
        setQuestions(data.quiz.questions);

        const dl = new Date(data.attempt.deadlineAt);
        setDeadlineAt(dl);
        setSecondsRemaining(Math.max(0, data.attempt.remainingSeconds));

        // Restore any saved answers
        const initialAnswers: Record<string, string | null> = {};
        if (data.attempt.answers && Array.isArray(data.attempt.answers)) {
          data.attempt.answers.forEach((ans: { questionId: string; selectedOptionId: string | null }) => {
            initialAnswers[ans.questionId] = ans.selectedOptionId;
          });
        }
        setAnswers(initialAnswers);
      } catch (err: any) {
        if (mounted) setError(err.message || 'حدث خطأ أثناء تحميل الاختبار');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    startOrResumeQuiz();
    return () => {
      mounted = false;
    };
  }, [quizId]);

  // 2. Authoritative Timer Loop
  useEffect(() => {
    if (!deadlineAt) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diffSec = Math.max(0, Math.floor((deadlineAt.getTime() - now) / 1000));
      setSecondsRemaining(diffSec);

      // Auto-submit when time expires
      if (diffSec <= 0) {
        clearInterval(timer);
        handleAutoSubmitOnExpiry();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineAt]);

  const handleAutoSubmitOnExpiry = async () => {
    if (isSubmitting || !attemptId) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/student/attempts/${attemptId}/submit`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        onCompleted(attemptId);
      }
    } catch (err) {
      console.error('Auto submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Answer selection with debounced autosave
  const handleSelectOption = async (questionId: string, optionId: string | null) => {
    // If student clicks already selected option, deselect it (vital for negative marking!)
    const currentVal = answers[questionId];
    const nextVal = currentVal === optionId ? null : optionId;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: nextVal,
    }));

    setSavingQuestionId(questionId);
    setSaveStatus('saving');

    try {
      const res = await apiFetch(`/api/student/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedOptionId: nextVal }),
      });

      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setTimeout(() => {
        setSaveStatus('idle');
        setSavingQuestionId(null);
      }, 1000);
    }
  };

  // 4. Submit confirmation and execution
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await apiFetch(`/api/student/attempts/${attemptId}/submit`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        onCompleted(attemptId);
      } else {
        setError(data.error || 'فشل في تسليم الاختبار');
        setIsSubmitting(false);
      }
    } catch {
      setError('حدث خطأ في الاتصال أثناء التسليم');
      setIsSubmitting(false);
    }
  };

  // Metrics
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Format time remaining MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining < 300 && secondsRemaining > 0;
  const isCriticalTime = secondsRemaining < 60 && secondsRemaining > 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-12 h-12 rounded-full border-3 border-teal-700 border-t-transparent animate-spin mx-auto mb-4" />
        <h3 className="text-base font-semibold text-stone-800">
          {isRtl ? 'جاري تجهيز بيئة الاختبار الآمنة...' : 'Preparing secure quiz session...'}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          {isRtl ? 'يتم التحقق من الوقت والمزامنة مع السيرفر' : 'Validating time authority with server'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-stone-900">{isRtl ? 'تعذر بدء الاختبار' : 'Quiz Cannot Be Started'}</h3>
        <p className="text-xs text-rose-700 mt-2">{error}</p>
        <button
          onClick={onExit}
          className="touch-target mt-6 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
        >
          {isRtl ? 'العودة للاختبارات' : 'Back to Quizzes'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Sticky Top Header Bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl px-4 py-3 mb-6 shadow-sm flex items-center justify-between gap-3">
        {/* Left: Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold transition-all ${
              isCriticalTime
                ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300'
                : isLowTime
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Autosave status indicator */}
          <span className="hidden sm:inline text-[11px] text-stone-400 font-mono">
            {saveStatus === 'saving' && (isRtl ? 'جاري الحفظ...' : 'Saving...')}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isRtl ? 'تم الحفظ' : 'Saved'}
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {isRtl ? 'خطأ في الحفظ' : 'Save error'}
              </span>
            )}
          </span>
        </div>

        {/* Center: Question indicator & Drawer Toggle */}
        <button
          onClick={() => setShowNavGrid(!showNavGrid)}
          className="touch-target px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-stone-500" />
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </button>

        {/* Right: Submit Button */}
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={isSubmitting}
          className="touch-target px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isRtl ? 'تسليم الاختبار' : 'Submit'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mb-6">
        <div
          className="bg-teal-700 h-full transition-all duration-300"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Navigator Drawer / Grid Modal */}
      {showNavGrid && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-stone-800">
              {isRtl ? 'لوحة التنقل السريع بين الأسئلة' : 'Question Navigator'}
            </span>
            <button
              onClick={() => setShowNavGrid(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowNavGrid(false);
                  }}
                  className={`touch-target py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    isCurrent
                      ? 'ring-2 ring-teal-600 bg-teal-800 text-white'
                      : isAnswered
                      ? 'bg-teal-100 text-teal-900 border border-teal-200'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-3 border-t border-stone-100 font-mono">
            <span>{isRtl ? `تمت الإجابة: ${answeredCount}` : `Answered: ${answeredCount}`}</span>
            <span>{isRtl ? `المتبقي: ${unansweredCount}` : `Unanswered: ${unansweredCount}`}</span>
          </div>
        </div>
      )}

      {/* Active Question Card (Single-Question-Per-Screen) */}
      {currentQuestion && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          {/* Question Header & Points */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-xs font-mono font-bold text-teal-800 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
              {isRtl ? `السؤال ${currentIndex + 1} من ${totalQuestions}` : `Question ${currentIndex + 1} of ${totalQuestions}`}
            </span>
            <span className="text-xs font-mono text-stone-500">
              {currentQuestion.points} {isRtl ? (currentQuestion.points === 1 ? 'علامة' : 'علامات') : 'pts'}
            </span>
          </div>

          {/* Question Text */}
          <h2
            className="text-lg font-bold text-stone-900 leading-relaxed mb-6"
            dir={quizLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            {currentQuestion.text}
          </h2>

          {/* 4 Touch-Friendly Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = answers[currentQuestion.id] === option.id;
              const optionLetters = ['أ', 'ب', 'ج', 'د'];
              const optionLettersEn = ['A', 'B', 'C', 'D'];
              const letter = quizLanguage === 'ar' ? optionLetters[optIdx] : optionLettersEn[optIdx];

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                  className={`touch-target w-full text-start p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/70 ring-1 ring-teal-700'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'bg-stone-100 text-stone-600 border border-stone-300'
                    }`}
                  >
                    {letter}
                  </div>
                  <span
                    className={`text-sm leading-relaxed ${
                      isSelected ? 'font-semibold text-teal-950' : 'text-stone-800'
                    }`}
                    dir={quizLanguage === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Deselect / Clear selection notice */}
          {answers[currentQuestion.id] && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleSelectOption(currentQuestion.id, answers[currentQuestion.id]!)}
                className="text-xs text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1"
              >
                <span>{isRtl ? 'إلغاء تحديد الإجابة (ترك السؤال دون حل)' : 'Clear selection'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prev / Next Bottom Navigation Bar */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
          disabled={currentIndex === 0}
          className="touch-target px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <span>{isRtl ? 'السؤال السابق' : 'Previous'}</span>
        </button>

        {currentIndex < totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentIndex((idx) => Math.min(totalQuestions - 1, idx + 1))}
            className="touch-target px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>{isRtl ? 'السؤال التالي' : 'Next Question'}</span>
            {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onClick={() => setShowConfirmModal(true)}
            className="touch-target px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{isRtl ? 'تسليم الاختبار النهائي' : 'Submit Final Quiz'}</span>
          </button>
        )}
      </div>

      {/* Confirm Submission Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-stone-900">
              {isRtl ? 'تأكيد تسليم الاختبار' : 'Confirm Quiz Submission'}
            </h3>

            <div className="my-4 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between text-stone-700">
                <span>{isRtl ? 'الأسئلة المجابة:' : 'Answered questions:'}</span>
                <span className="font-bold text-teal-800 font-mono">{answeredCount} / {totalQuestions}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>{isRtl ? 'الأسئلة المتروكة دون إجابة:' : 'Unanswered questions:'}</span>
                <span className={`font-bold font-mono ${unansweredCount > 0 ? 'text-amber-700' : 'text-stone-600'}`}>
                  {unansweredCount}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {isRtl
                    ? `لديك ${unansweredCount} أسئلة لم تقم بالإجابة عليها بعد. يمكنك العودة وإكمالها، أو تسليم الاختبار باحتساب الإجابات المحفوظة فقط.`
                    : `You have ${unansweredCount} unanswered questions. You can go back and answer them or proceed with submission.`}
                </p>
              </div>
            )}

            <p className="text-xs text-stone-500 mb-6">
              {isRtl
                ? 'عند التسليم، سيتم رصد علامتك فورياً ولن تتمكن من تعديل الإجابات مجدداً.'
                : 'Once submitted, your final score will be computed and your attempt will be permanently closed.'}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="touch-target flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                {isRtl ? 'الرجوع للأسئلة' : 'Review Questions'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="touch-target flex-1 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900 shadow-xs flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>{isRtl ? 'جاري الرصد...' : 'Submitting...'}</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تأكيد التسليم' : 'Confirm Submit'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
