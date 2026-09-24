import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  ArrowLeft, 
  ArrowRight, 
  Download, 
  Award, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  TrendingUp, 
  BarChart, 
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  Eye
} from 'lucide-react';

interface QuizResultsStatsProps {
  quizId: string;
  lang: 'ar' | 'en';
  onBack: () => void;
}

interface ResultsPayload {
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
  stats: {
    totalAssigned: number;
    completedCount: number;
    notAttemptedCount: number;
    average: number;
    median: number;
    highest: number;
    lowest: number;
  };
  distribution: Array<{ range: string; count: number }>;
  questionStats: Array<{
    id: string;
    order: number;
    text: string;
    points: number;
    correctCount: number;
    answeredCount: number;
    successRate: number;
    isHard: boolean;
  }>;
  students: Array<{
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
  }>;
}

export const QuizResultsStats: React.FC<QuizResultsStatsProps> = ({
  quizId,
  lang,
  onBack,
}) => {
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isRtl = lang === 'ar';

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/teacher/quizzes/${quizId}/results`);
        if (!res.ok) throw new Error('فشل تحميل نتائج الاختبار');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'خطأ في جلب النتائج');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [quizId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-sm text-stone-500">
        <div className="w-10 h-10 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>{isRtl ? 'جاري تجميع البيانات الإحصائية والدرجات...' : 'Compiling analytics...'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
        <p className="text-sm text-rose-800 font-semibold">{error || 'تعذر تحميل الإحصائيات'}</p>
        <button
          onClick={onBack}
          className="touch-target mt-4 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
        >
          {isRtl ? 'العودة' : 'Back'}
        </button>
      </div>
    );
  }

  // Filter students
  const filteredStudents = data.students.filter((st) => {
    if (classFilter !== 'ALL' && st.className !== classFilter) return false;
    if (statusFilter !== 'ALL' && st.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return st.name.toLowerCase().includes(q) || st.username.toLowerCase().includes(q);
    }
    return true;
  });

  const uniqueClasses = Array.from(new Set(data.students.map((s) => s.className))).sort();

  const handleDownloadCsv = () => {
    window.location.href = `/api/teacher/quizzes/${quizId}/export-csv`;
  };

  const formatSeconds = (sec: number | null) => {
    if (sec === null) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2 font-medium"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isRtl ? 'العودة للاختبارات' : 'Back to Quizzes'}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
              {data.quiz.language.toUpperCase()}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              {data.quiz.timeLimitMinutes} {isRtl ? 'دقيقة' : 'min'}
            </span>
            {data.quiz.negativeMarking && (
              <span className="text-[11px] font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                {isRtl ? `خصم سالب ${data.quiz.penaltyPercent}%` : `Negative -${data.quiz.penaltyPercent}%`}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-1" dir={data.quiz.language === 'ar' ? 'rtl' : 'ltr'}>
            {data.quiz.title}
          </h1>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleDownloadCsv}
          className="touch-target px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>{isRtl ? 'تصدير النتائج كـ Excel (CSV)' : 'Export CSV (Excel)'}</span>
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <span className="text-xs text-stone-500 block">{isRtl ? 'إجمالي الطلاب' : 'Assigned'}</span>
          <span className="text-xl font-bold font-mono text-stone-900">{data.stats.totalAssigned}</span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{isRtl ? 'في الشعب المخصصة' : 'Enrolled'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <span className="text-xs text-stone-500 block">{isRtl ? 'المكتملة' : 'Completed'}</span>
          <span className="text-xl font-bold font-mono text-teal-800">{data.stats.completedCount}</span>
          <span className="text-[11px] text-teal-600 block mt-0.5">
            {data.stats.totalAssigned > 0 ? `${Math.round((data.stats.completedCount / data.stats.totalAssigned) * 100)}% مشاركة` : '0%'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <span className="text-xs text-stone-500 block">{isRtl ? 'المتوسط الحسابي' : 'Average'}</span>
          <span className="text-xl font-bold font-mono text-stone-900">{data.stats.average}</span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{isRtl ? 'معدل علامات الشعب' : 'Mean score'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <span className="text-xs text-stone-500 block">{isRtl ? 'الوسيط (Median)' : 'Median'}</span>
          <span className="text-xl font-bold font-mono text-stone-900">{data.stats.median}</span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{isRtl ? 'العلامة الوسطى' : '50th percentile'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <span className="text-xs text-stone-500 block">{isRtl ? 'أعلى علامة' : 'Highest'}</span>
          <span className="text-xl font-bold font-mono text-emerald-700">{data.stats.highest}</span>
          <span className="text-[11px] text-emerald-600 block mt-0.5">{isRtl ? 'أفضل إنجاز' : 'Top score'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200">
          <span className="text-xs text-stone-500 block">{isRtl ? 'أدنى علامة' : 'Lowest'}</span>
          <span className="text-xl font-bold font-mono text-stone-700">{data.stats.lowest}</span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{isRtl ? 'أقل علامة مسجلة' : 'Min score'}</span>
        </div>
      </div>

      {/* Middle Row: Score Distribution Histogram + Hard Questions Spotter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
            <BarChart className="w-4 h-4 text-teal-700" />
            <span>{isRtl ? 'توزيع درجات الطلاب (Score Distribution)' : 'Score Distribution Buckets'}</span>
          </h2>

          <div className="space-y-3">
            {data.distribution.map((bucket, idx) => {
              const maxCount = Math.max(...data.distribution.map((b) => b.count), 1);
              const barWidth = (bucket.count / maxCount) * 100;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-stone-700">
                    <span>{bucket.range}</span>
                    <span className="font-bold">{bucket.count} {isRtl ? 'طالباً' : 'students'}</span>
                  </div>
                  <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spot Hard Questions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>{isRtl ? 'تحليل صعوبة الأسئلة (Spot Hard Questions)' : 'Question Difficulty Analysis'}</span>
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              {isRtl
                ? 'يتم تمييز الأسئلة التي قلت فيها نسبة الإجابة الصحيحة عن 40% باللون البرتقالي لتحديد نقاط الضعف.'
                : 'Questions with < 40% correct rate are flagged to spot topics needing revision.'}
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {data.questionStats.map((q) => (
                <div
                  key={q.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    q.isHard
                      ? 'border-amber-300 bg-amber-50/70 text-amber-950'
                      : 'border-stone-100 bg-stone-50/60 text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[280px]">
                    <span className="font-mono font-bold text-[11px] shrink-0">#{q.order}</span>
                    <span className="truncate" dir="auto">{q.text}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    {q.isHard && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                        {isRtl ? 'صعب ⚠️' : 'Hard'}
                      </span>
                    )}
                    <span className="font-bold">{q.successRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Student Submissions Table */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-700" />
            <span>{isRtl ? 'قائمة نتائج الطلاب والمشاركات' : 'Student Results Table'}</span>
            <span className="text-xs font-mono text-stone-500 font-normal">
              ({filteredStudents.length} / {data.students.length})
            </span>
          </h2>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute start-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث باسم الطالب...' : 'Search student...'}
                className="ps-8 pe-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs bg-white text-stone-700"
            >
              <option value="ALL">{isRtl ? 'كل الشعب' : 'All Classes'}</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs bg-white text-stone-700"
            >
              <option value="ALL">{isRtl ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="SUBMITTED">{isRtl ? 'تم التسليم' : 'Submitted'}</option>
              <option value="IN_PROGRESS">{isRtl ? 'جاري الحل' : 'In Progress'}</option>
              <option value="AUTO_FINALIZED">{isRtl ? 'إغلاق تلقائي' : 'Auto-Finalized'}</option>
              <option value="NOT_ATTEMPTED">{isRtl ? 'لم يتقدم' : 'Not Attempted'}</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-xs text-start">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
              <tr>
                <th className="p-3 text-start">{isRtl ? 'اسم الطالب' : 'Student Name'}</th>
                <th className="p-3 text-start">{isRtl ? 'اسم المستخدم' : 'Username'}</th>
                <th className="p-3 text-start">{isRtl ? 'الشعبة' : 'Class'}</th>
                <th className="p-3 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="p-3 text-start">{isRtl ? 'العلامة' : 'Score'}</th>
                <th className="p-3 text-start">{isRtl ? 'النسبة' : 'Percentage'}</th>
                <th className="p-3 text-start">{isRtl ? 'الوقت المستغرق' : 'Time Spent'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400">
                    {isRtl ? 'لا يوجد طلاب يطابقون شروط البحث' : 'No students matching filter'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.studentId} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3 font-semibold text-stone-900">{st.name}</td>
                    <td className="p-3 font-mono text-stone-500">@{st.username}</td>
                    <td className="p-3 font-mono font-bold text-stone-700">{st.className}</td>
                    <td className="p-3">
                      {st.status === 'SUBMITTED' && (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                          {isRtl ? 'تم التسليم' : 'Submitted'}
                        </span>
                      )}
                      {st.status === 'AUTO_FINALIZED' && (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 text-[10px]">
                          {isRtl ? 'إغلاق تلقائي' : 'Auto Finalized'}
                        </span>
                      )}
                      {st.status === 'IN_PROGRESS' && (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px]">
                          {isRtl ? 'جاري الحل' : 'In Progress'}
                        </span>
                      )}
                      {st.status === 'NOT_ATTEMPTED' && (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-stone-100 text-stone-500 text-[10px]">
                          {isRtl ? 'لم يتقدم' : 'Not Attempted'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-stone-900">
                      {st.score !== null ? `${st.score} / ${st.maxScore}` : '-'}
                    </td>
                    <td className="p-3 font-mono">
                      {st.percentage !== null ? (
                        <span
                          className={`font-bold ${
                            st.percentage >= 75
                              ? 'text-emerald-700'
                              : st.percentage >= 50
                              ? 'text-teal-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {st.percentage}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 font-mono text-stone-500">
                      {formatSeconds(st.timeSpentSeconds)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
