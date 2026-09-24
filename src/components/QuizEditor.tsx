import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Calendar, 
  Lock, 
  Save,
  HelpCircle,
  FileSpreadsheet,
  School,
  Users,
  CheckSquare,
  Square
} from 'lucide-react';

interface QuizEditorProps {
  quizId?: string | null;
  preselectedClassId?: string | null;
  lang: 'ar' | 'en';
  onSaved: () => void;
  onCancel: () => void;
}

interface QuestionForm {
  id?: string;
  text: string;
  points: number;
  options: string[];
  correctOptionIndex: number;
}

interface ClassItem {
  id: string;
  name: string;
  _count?: { students: number };
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  quizId,
  preselectedClassId,
  lang,
  onSaved,
  onCancel,
}) => {
  const isRtl = lang === 'ar';
  const isEdit = !!quizId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available classes for teacher
  const [myClasses, setMyClasses] = useState<ClassItem[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [showAllCentreClasses, setShowAllCentreClasses] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [penaltyPercent, setPenaltyPercent] = useState(25);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      text: '',
      points: 1,
      options: ['', '', '', ''],
      correctOptionIndex: 0,
    },
  ]);

  // Load teacher classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await apiFetch('/api/teacher/classes');
        if (res.ok) {
          const data = await res.json();
          const teacherAssigned = data.classes || [];
          const centreAll = data.allClasses || teacherAssigned;
          setMyClasses(teacherAssigned);
          setAllClasses(centreAll);

          if (!isEdit) {
            if (preselectedClassId) {
              setSelectedClassIds([preselectedClassId]);
            } else if (teacherAssigned.length > 0) {
              setSelectedClassIds([teacherAssigned[0].id]);
            } else if (centreAll.length > 0) {
              setSelectedClassIds([centreAll[0].id]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, [isEdit, preselectedClassId]);

  // If edit mode: load existing quiz
  useEffect(() => {
    if (!quizId) {
      // Defaults for new quiz: opens now, closes in 7 days
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setOpensAt(now.toISOString().slice(0, 16));
      setClosesAt(in7Days.toISOString().slice(0, 16));
      return;
    }

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/teacher/quizzes/${quizId}`);
        if (!res.ok) throw new Error('فشل تحميل الاختبار');
        const data = await res.json();
        const q = data.quiz;

        setTitle(q.title);
        setLanguage(q.language);
        setTimeLimitMinutes(q.timeLimitMinutes);
        setOpensAt(new Date(q.opensAt).toISOString().slice(0, 16));
        setClosesAt(new Date(q.closesAt).toISOString().slice(0, 16));
        setNegativeMarking(q.negativeMarking);
        setPenaltyPercent(q.penaltyPercent);
        setSelectedClassIds(q.classIds || []);
        setHasAttempts(q.hasAttempts);

        if (q.questions && q.questions.length > 0) {
          setQuestions(
            q.questions.map((question: any) => {
              const correctIdx = question.options.findIndex((o: any) => o.isCorrect);
              return {
                id: question.id,
                text: question.text,
                points: question.points,
                options: question.options.map((o: any) => o.text),
                correctOptionIndex: correctIdx !== -1 ? correctIdx : 0,
              };
            })
          );
        }
      } catch (err: any) {
        setError(err.message || 'خطأ في جلب بيانات الاختبار');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        text: '',
        points: 1,
        options: ['', '', '', ''],
        correctOptionIndex: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: keyof QuestionForm, val: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[optIdx] = val;
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  // Class Selection Handlers
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAllMyClasses = () => {
    const ids = (showAllCentreClasses ? allClasses : myClasses).map((c) => c.id);
    setSelectedClassIds(ids);
  };

  const handleDeselectAllClasses = () => {
    setSelectedClassIds([]);
  };

  const handleSingleClassDropdownSelect = (classId: string) => {
    if (!classId) return;
    setSelectedClassIds([classId]);
  };

  const displayedClasses = showAllCentreClasses ? allClasses : (myClasses.length > 0 ? myClasses : allClasses);

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError(isRtl ? 'عنوان الاختبار مطلوب' : 'Quiz title is required');
      return;
    }
    if (selectedClassIds.length === 0) {
      setError(isRtl ? 'يرجى تحديد شعبة واحدة على الأقل لتقديم هذا الاختبار' : 'Please select at least one class for this quiz');
      return;
    }
    if (!opensAt || !closesAt) {
      setError(isRtl ? 'يرجى تحديد تواريخ فتح وإغلاق الاختبار' : 'Please specify open and close dates');
      return;
    }
    if (new Date(closesAt) <= new Date(opensAt)) {
      setError(isRtl ? 'تاريخ الإغلاق يجب أن يكون بعد تاريخ الفتح' : 'Close date must be after open date');
      return;
    }

    if (!hasAttempts) {
      // Validate questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text.trim()) {
          setError(isRtl ? `نص السؤال رقم ${i + 1} مطلوب` : `Question ${i + 1} text is required`);
          return;
        }
        for (let j = 0; j < 4; j++) {
          if (!q.options[j]?.trim()) {
            setError(isRtl ? `الخيار رقم ${j + 1} في السؤال ${i + 1} مطلوب` : `Option ${j + 1} in question ${i + 1} is empty`);
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        language,
        timeLimitMinutes: Number(timeLimitMinutes),
        opensAt: new Date(opensAt).toISOString(),
        closesAt: new Date(closesAt).toISOString(),
        negativeMarking,
        penaltyPercent: Number(penaltyPercent),
        classIds: selectedClassIds,
      };

      if (!hasAttempts) {
        payload.questions = questions.map((q) => ({
          text: q.text.trim(),
          points: Number(q.points),
          options: q.options.map((o) => o.trim()),
          correctOptionIndex: q.correctOptionIndex,
        }));
      }

      const url = isEdit ? `/api/teacher/quizzes/${quizId}` : '/api/teacher/quizzes';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        onSaved();
      } else {
        setError(data.error || 'فشل في حفظ الاختبار');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-sm text-stone-500">
        {isRtl ? 'جاري تحميل بيانات الاختبار...' : 'Loading quiz...'}
      </div>
    );
  }

  // Calculate total students reached
  const selectedClassesInfo = allClasses.filter((c) => selectedClassIds.includes(c.id));
  const totalStudentsEnrolled = selectedClassesInfo.reduce((sum, c) => sum + (c._count?.students ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div>
          <button
            onClick={onCancel}
            className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2 font-medium"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isRtl ? 'إلغاء والعودة' : 'Cancel & Back'}</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            {isEdit
              ? (isRtl ? 'تعديل الاختبار والشعب المستهدفة' : 'Edit Quiz & Assigned Classes')
              : (isRtl ? 'إنشاء اختبار أسبوعي جديد' : 'Create New Assessment')}
          </h1>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="touch-target px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ الاختبار' : 'Save Quiz')}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-400 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* Lock Banner if attempts exist */}
      {hasAttempts && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl text-xs flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">
              {isRtl ? 'قفل الأسئلة لحماية نتائج ومحاولات الطلاب' : 'Questions Locked Due to Existing Attempts'}
            </h4>
            <p className="mt-1 leading-relaxed text-amber-900">
              {isRtl
                ? 'يحتوي هذا الاختبار على محاولات فعلية من الطلاب. تم قفل إضافة أو تعديل الأسئلة لضمان النزاهة الأكاديمية. يمكنك تعديل الشعب المستهدفة، الوقت المسموح، وتواريخ الفتح والإغلاق.'
                : 'Students have already submitted attempts for this quiz. Question editing is locked to preserve scoring integrity. You may still update target classes, time limit, and active dates.'}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROMINENT SECTION: TARGET CLASS PICKER (Crucial Feature) */}
      {/* ======================================================== */}
      <div className="bg-white border-2 border-teal-700/30 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>{isRtl ? 'تحديد الشعب المستهدفة للاختبار *' : 'Target Classes for Quiz *'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-mono font-bold">
                  {selectedClassIds.length} {isRtl ? 'شعب مختارة' : 'selected'}
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isRtl
                  ? 'اختر الشعبة أو الشعب الدراسية التي سيتاح لطلابها الدخول وأداء هذا الاختبار.'
                  : 'Select which student cohort(s) are eligible to take this assessment.'}
              </p>
            </div>
          </div>

          {/* Quick Select Helpers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllMyClasses}
              className="touch-target px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors"
            >
              {isRtl ? 'تحديد الكل' : 'Select All'}
            </button>
            <button
              type="button"
              onClick={handleDeselectAllClasses}
              className="touch-target px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold transition-colors"
            >
              {isRtl ? 'إلغاء التحديد' : 'Deselect All'}
            </button>
            <button
              type="button"
              onClick={() => setShowAllCentreClasses(!showAllCentreClasses)}
              className="touch-target px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
            >
              {showAllCentreClasses
                ? (isRtl ? 'عرض شعبي فقط' : 'Show My Classes Only')
                : (isRtl ? 'عرض كل شعب المركز' : 'Show All Centre Classes')}
            </button>
          </div>
        </div>

        {/* Dropdown Alternative for Single-Choice Convenience */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
          <label className="text-xs font-semibold text-stone-700 shrink-0">
            {isRtl ? 'أو اختر شعبة واحدة من القائمة المنسدلة:' : 'Or choose single class via dropdown:'}
          </label>
          <select
            value={selectedClassIds.length === 1 ? selectedClassIds[0] : ''}
            onChange={(e) => handleSingleClassDropdownSelect(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-medium focus:ring-1 focus:ring-teal-700"
          >
            <option value="">{isRtl ? '-- اختر شعبة محددة --' : '-- Pick a specific class --'}</option>
            {displayedClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls._count?.students ?? 0} {isRtl ? 'طالباً' : 'students'})
              </option>
            ))}
          </select>
        </div>

        {/* Interactive Checkbox Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {displayedClasses.map((cls) => {
            const isSelected = selectedClassIds.includes(cls.id);
            const isMyAssignedClass = myClasses.some((mc) => mc.id === cls.id);

            return (
              <div
                key={cls.id}
                onClick={() => handleToggleClass(cls.id)}
                className={`touch-target p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  isSelected
                    ? 'border-teal-800 bg-teal-50/80 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-teal-400 hover:bg-stone-50/60'
                }`}
              >
                <div className="pt-0.5">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-teal-800 shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-stone-400 shrink-0" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-stone-900">
                      {isRtl ? `شعبة ${cls.name}` : `Class ${cls.name}`}
                    </span>
                    {isMyAssignedClass && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {isRtl ? 'شعبتك' : 'Assigned'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1 font-mono">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>{cls._count?.students ?? 0} {isRtl ? 'طالباً مسجلاً' : 'students enrolled'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Feedback Banner */}
        {selectedClassIds.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isRtl
                ? '⚠️ تنبيه: لم تقم باختيار أي شعبة! يجب تحديد شعبة واحدة على الأقل ليتمكن الطلاب من رؤية الاختبار وأدائه.'
                : '⚠️ Notice: No class selected! At least one class is required so students can access this exam.'}
            </span>
          </div>
        ) : (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                {isRtl ? 'الشعب المستهدفة حالياً:' : 'Assigned classes:'}{' '}
                <strong className="font-mono text-teal-950">
                  {selectedClassesInfo.map((c) => c.name).join(', ')}
                </strong>
              </span>
            </div>
            <span className="font-mono font-bold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
              {totalStudentsEnrolled} {isRtl ? 'طالباً سيشملهم الاختبار' : 'students will receive this quiz'}
            </span>
          </div>
        )}
      </div>

      {/* Section 1: General Details */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
          {isRtl ? '1. البيانات الأساسية والإعدادات' : '1. General Settings'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              {isRtl ? 'عنوان الاختبار *' : 'Quiz Title *'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRtl ? 'مثال: اختبار الرياضيات الأسبوعي - الوحدة الثانية' : 'e.g. Weekly Math Quiz - Unit 2'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              dir="auto"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              {isRtl ? 'لغة الاختبار' : 'Language'}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              <option value="ar">{isRtl ? 'العربية (RTL)' : 'Arabic (RTL)'}</option>
              <option value="en">{isRtl ? 'English (LTR)' : 'English (LTR)'}</option>
            </select>
          </div>
        </div>

        {/* Time Limit & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              {isRtl ? 'المدة الزمنية (بالدقائق) *' : 'Time Limit (minutes) *'}
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              {isRtl ? 'تاريخ ووقت الفتح *' : 'Opens At *'}
            </label>
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              {isRtl ? 'تاريخ ووقت الإغلاق *' : 'Closes At *'}
            </label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>
        </div>

        {/* Negative Marking Config */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-900 block">
                {isRtl ? 'تفعيل نظام الخصم السالب (Negative Marking)' : 'Enable Negative Marking'}
              </span>
              <span className="text-[11px] text-stone-500">
                {isRtl
                  ? 'خصم نسبة مئوية من علامة السؤال في حال الإجابة الخاطئة، مع قفل العلامة عند الصفر.'
                  : 'Deducts percentage of question points for wrong answers; floored at 0.'}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-800"></div>
            </label>
          </div>

          {negativeMarking && (
            <div className="pt-2 border-t border-stone-200 flex items-center gap-4">
              <label className="text-xs font-semibold text-stone-700 shrink-0">
                {isRtl ? 'نسبة الخصم للإجابة الخاطئة (%):' : 'Penalty percentage (%):'}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={penaltyPercent}
                onChange={(e) => setPenaltyPercent(Math.max(0, Math.min(100, parseFloat(e.target.value || '0'))))}
                className="w-24 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-mono font-bold"
              />
              <span className="text-[11px] text-stone-500">
                {isRtl ? '(المعيار المعتاد 25% = ربع علامة السؤال)' : '(Default: 25%)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Questions Manager */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {isRtl ? '2. أسئلة الاختبار وخيارات الإجابة' : '2. Questions & Options'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {isRtl
                ? `إجمالي الأسئلة: ${questions.length} · مجموع العلامات: ${questions.reduce((s, q) => s + (Number(q.points) || 1), 0)}`
                : `Total: ${questions.length} questions · Max Score: ${questions.reduce((s, q) => s + (Number(q.points) || 1), 0)}`}
            </p>
          </div>

          {!hasAttempts && (
            <button
              type="button"
              onClick={handleAddQuestion}
              className="touch-target px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? '+ إضافة سؤال جديد' : '+ Add Question'}</span>
            </button>
          )}
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="p-5 rounded-2xl border border-stone-200 bg-stone-50/40 relative space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono font-bold text-teal-900 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
                  {isRtl ? `السؤال #${qIdx + 1}` : `Question #${qIdx + 1}`}
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-stone-500 font-medium">
                      {isRtl ? 'النقاط:' : 'Points:'}
                    </label>
                    <input
                      type="number"
                      min={0.25}
                      step={0.5}
                      disabled={hasAttempts}
                      value={q.points}
                      onChange={(e) => handleQuestionChange(qIdx, 'points', parseFloat(e.target.value || '1'))}
                      className="w-16 px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-mono font-bold bg-white text-center disabled:opacity-60"
                    />
                  </div>

                  {!hasAttempts && questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="touch-target p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                      title={isRtl ? 'حذف هذا السؤال' : 'Delete question'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <input
                  type="text"
                  disabled={hasAttempts}
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                  placeholder={isRtl ? 'اكتب نص السؤال هنا...' : 'Type question text here...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 disabled:opacity-60"
                  dir="auto"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2 pt-2">
                <span className="text-xs text-stone-500 block">
                  {isRtl ? 'الخيارات الأربعة (حدد الدائرة بجانب الخيار الصحيح):' : 'Options (select radio for correct key):'}
                </span>

                {q.options.map((opt, optIdx) => {
                  const isCorrect = q.correctOptionIndex === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-50/70'
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct_q_${qIdx}`}
                        disabled={hasAttempts}
                        checked={isCorrect}
                        onChange={() => handleQuestionChange(qIdx, 'correctOptionIndex', optIdx)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-60 ms-2"
                      />
                      <input
                        type="text"
                        disabled={hasAttempts}
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        placeholder={`${isRtl ? 'الخيار' : 'Option'} ${optIdx + 1}`}
                        className="w-full px-3 py-1.5 rounded-lg border-0 bg-transparent text-xs focus:outline-none focus:ring-0 text-stone-800 disabled:opacity-60"
                        dir="auto"
                      />
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-800 px-2 py-0.5 rounded bg-emerald-200 shrink-0 me-2">
                          {isRtl ? 'الصحيح ✓' : 'Correct ✓'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom add question button */}
        {!hasAttempts && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="touch-target px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? '+ إضافة سؤال آخر' : '+ Add Another Question'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
