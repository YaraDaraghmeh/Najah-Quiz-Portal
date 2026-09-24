import React from 'react';
import { Languages, LogOut, User, GraduationCap, Shield, School } from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    className?: string | null;
  } | null;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  lang,
  onToggleLang,
  onLogout,
  currentView,
  onNavigate,
}) => {
  const isRtl = lang === 'ar';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div 
          onClick={() => onNavigate(user?.role === 'STUDENT' ? 'student-dashboard' : 'teacher-dashboard')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            ن
          </div>
          <div>
            <span className="font-bold text-stone-900 tracking-tight block text-sm sm:text-base leading-tight">
              {isRtl ? 'مركز النجاح التعليمي' : 'Najah Tutoring Portal'}
            </span>
            <span className="text-[11px] text-stone-400 font-mono block">
              {isRtl ? 'منصة الاختبارات الإلكترونية - عمان' : 'Assessment System · Amman'}
            </span>
          </div>
        </div>

        {/* Navigation for Logged-In Roles */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {user.role === 'STUDENT' && (
              <button
                onClick={() => onNavigate('student-dashboard')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  currentView === 'student-dashboard'
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {isRtl ? 'اختباراتي' : 'My Quizzes'}
              </button>
            )}

            {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
              <>
                <button
                  onClick={() => onNavigate('teacher-dashboard')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    currentView === 'teacher-dashboard' || currentView === 'quiz-results'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {isRtl ? 'لوحة الاختبارات' : 'Quizzes Dashboard'}
                </button>
                <button
                  onClick={() => onNavigate('create-quiz')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    currentView === 'create-quiz'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {isRtl ? '+ إنشاء اختبار' : '+ Create Quiz'}
                </button>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => onNavigate('admin-panel')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    currentView === 'admin-panel'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {isRtl ? 'المستخدمون والشعب' : 'Users & Classes'}
                </button>
                <button
                  onClick={() => onNavigate('admin-import')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    currentView === 'admin-import'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {isRtl ? 'استيراد الجداول' : 'Import Spreadsheets'}
                </button>
              </>
            )}

            <button
              onClick={() => onNavigate('stage1-overview')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                currentView === 'stage1-overview'
                  ? 'bg-stone-200 text-stone-900'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              Stage 1 Status
            </button>
          </nav>
        )}

        {/* Right Section: Language Toggle & User Profile */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="touch-target px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-1.5 transition-colors"
            title="Toggle Language"
          >
            <Languages className="w-3.5 h-3.5 text-stone-500" />
            <span>{isRtl ? 'English' : 'عربي'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-end">
                <span className="text-xs font-semibold text-stone-900 leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {user.role === 'ADMIN'
                    ? (isRtl ? 'مدير النظام' : 'Admin')
                    : user.role === 'TEACHER'
                    ? (isRtl ? 'معلم' : 'Teacher')
                    : (isRtl ? `طالب (شعبة ${user.className || 'عامة'})` : `Student (${user.className || ''})`)}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs border border-teal-200">
                {user.role === 'ADMIN' ? (
                  <Shield className="w-4 h-4" />
                ) : user.role === 'TEACHER' ? (
                  <School className="w-4 h-4" />
                ) : (
                  <GraduationCap className="w-4 h-4" />
                )}
              </div>

              <button
                onClick={onLogout}
                className="touch-target p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title={isRtl ? 'تسجيل الخروج' : 'Logout'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs font-mono text-stone-400">
              {isRtl ? 'يرجى تسجيل الدخول' : 'Sign in'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
