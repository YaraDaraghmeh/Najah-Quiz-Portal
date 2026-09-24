import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck,
  Lock,
  Sparkles
} from 'lucide-react';

interface ResultData {
  attemptId: string;
  quizTitle: string;
  quizLanguage: string;
  closesAt: string;
  canRevealCorrectAnswers: boolean;
  status: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  questions: Array<{
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
  }>;
}

interface QuizResultViewProps {
  attemptId: string;
  lang: 'ar' | 'en';
  onBack: () => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  attemptId,
  lang,
  onBack,
}) => {
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRtl = lang === 'ar';

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/student/attempts/${attemptId}/result`);
        if (!res.ok) {
          throw new Error('فشل في تحميل نتيجة الاختبار');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'خطأ في جلب النتيجة');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-10 h-10 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-stone-600">{isRtl ? 'جاري جلب النتيجة وتفاصيل الأداء...' : 'Loading score...'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-xs">
        <p className="text-sm text-rose-700 font-semibold">{error || 'تعذر العثور على النتيجة'}</p>
        <button
          onClick={onBack}
          className="touch-target mt-4 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
        >
          {isRtl ? 'العودة للوحة الاختبارات' : 'Back to Dashboard'}
        </button>
      </div>
    );
  }

  const getScoreBadge = (pct: number) => {
    if (pct >= 90) return { label: isRtl ? 'ممتاز جداً 🌟' : 'Outstanding 🌟', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pct >= 75) return { label: isRtl ? 'جيد جداً 👍' : 'Very Good 👍', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (pct >= 50) return { label: isRtl ? 'ناجح ✔️' : 'Passed ✔️', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: isRtl ? 'بحاجة للمراجعة 📚' : 'Needs Review 📚', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const badge = getScoreBadge(data.percentage);

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="touch-target px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{isRtl ? 'العودة لاختباراتي' : 'Back to Quizzes'}</span>
        </button>

        <span className="text-xs text-stone-400 font-mono">
          {isRtl ? 'معرف المحاولة:' : 'Attempt ID:'} {data.attemptId.slice(-6)}
        </span>
      </div>

      {/* Main Scorecard Banner */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs text-center relative overflow-hidden">
        <div className="max-w-md mx-auto">
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-3 ${badge.color}`}>
            {badge.label}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight" dir={data.quizLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {data.quizTitle}
          </h1>

          {/* Big Score Display */}
          <div className="my-6">
            <div className="text-5xl sm:text-6xl font-extrabold text-teal-900 font-mono tracking-tight">
              {data.score}
              <span className="text-2xl sm:text-3xl text-stone-400 font-normal"> / {data.maxScore}</span>
            </div>
            <div className="text-sm font-bold text-stone-500 font-mono mt-1">
              {data.percentage}%
            </div>
          </div>

          {/* Breakdown Pills Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 border-t border-stone-100 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="text-stone-500 block">{isRtl ? 'الإجابات الصحيحة' : 'Correct'}</span>
              <span className="text-base font-bold font-mono text-emerald-800">{data.correctCount}</span>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl">
              <XCircle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
              <span className="text-stone-500 block">{isRtl ? 'الإجابات الخاطئة' : 'Wrong'}</span>
              <span className="text-base font-bold font-mono text-rose-800">{data.wrongCount}</span>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl">
              <MinusCircle className="w-5 h-5 text-stone-400 mx-auto mb-1" />
              <span className="text-stone-500 block">{isRtl ? 'المتروكة' : 'Unanswered'}</span>
              <span className="text-base font-bold font-mono text-stone-700">{data.unansweredCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answers Protection Security Notice (if still active) */}
      {!data.canRevealCorrectAnswers ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 text-xs flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-amber-950">
              {isRtl ? 'حماية نموذج الإجابات أثناء فترة التقديم' : 'Answer Key Protected During Assessment Window'}
            </h4>
            <p className="mt-1 leading-relaxed">
              {isRtl
                ? `سيتم الكشف عن تفاصيل الإجابات الصحيحة ونموذج الحل التوضيحي تلقائياً لجميع الطلاب فور انتهاء الموعد الرسمي لإغلاق الاختبار بتاريخ: ${new Date(data.closesAt).toLocaleString('ar-JO')}.`
                : `Correct answers and detailed solution keys will be unlocked once the quiz closes for all students on: ${new Date(data.closesAt).toLocaleString()}.`}
            </p>
          </div>
        </div>
      ) : (
        /* Full Question by Question Breakdown after Quiz Close */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              {isRtl ? 'المراجعة التفصيلية للأسئلة والإجابات' : 'Detailed Question Review'}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              {isRtl ? 'تم فك قفل نموذج الحل' : 'Solutions Unlocked'}
            </span>
          </div>

          {data.questions.map((q, idx) => {
            const isCorrect = q.isCorrect;
            const isUnanswered = !q.selectedOptionId;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-5 transition-colors ${
                  isCorrect
                    ? 'border-emerald-200'
                    : isUnanswered
                    ? 'border-stone-200'
                    : 'border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-stone-600">
                    {isRtl ? `السؤال ${idx + 1}` : `Question ${idx + 1}`} ({q.points} {isRtl ? 'علامة' : 'pts'})
                  </span>

                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : isUnanswered
                        ? 'bg-stone-100 text-stone-600'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'إجابة صحيحة' : 'Correct'}</span>
                      </>
                    ) : isUnanswered ? (
                      <>
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'لم يُجب' : 'Unanswered'}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'إجابة خاطئة' : 'Incorrect'}</span>
                      </>
                    )}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-stone-900 mb-4" dir={data.quizLanguage === 'ar' ? 'rtl' : 'ltr'}>
                  {q.text}
                </h4>

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isSelectedByStudent = q.selectedOptionId === opt.id;
                    const isTheCorrectOption = opt.isCorrect;

                    let rowStyle = 'border-stone-200 bg-white text-stone-700';
                    if (isTheCorrectOption) {
                      rowStyle = 'border-emerald-400 bg-emerald-50/80 text-emerald-950 font-semibold';
                    } else if (isSelectedByStudent && !isTheCorrectOption) {
                      rowStyle = 'border-rose-300 bg-rose-50/80 text-rose-950';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${rowStyle}`}
                        dir={data.quizLanguage === 'ar' ? 'rtl' : 'ltr'}
                      >
                        <div className="flex items-center gap-2">
                          {isTheCorrectOption && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {isSelectedByStudent && !isTheCorrectOption && (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>{opt.text}</span>
                        </div>

                        <div className="text-[11px] font-mono shrink-0">
                          {isSelectedByStudent && (
                            <span className="px-2 py-0.5 rounded bg-stone-200/70 text-stone-800 me-2">
                              {isRtl ? 'إجابتك' : 'Your choice'}
                            </span>
                          )}
                          {isTheCorrectOption && (
                            <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                              {isRtl ? 'الإجابة الصحيحة' : 'Correct Key'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
