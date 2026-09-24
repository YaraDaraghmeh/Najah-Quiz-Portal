import React, { useState, useEffect } from 'react';
import {
  Users,
  Upload,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  School,
  ShieldCheck,
  Search,
  Eye,
  Check,
  X,
  Pencil,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../lib/api';

interface AdminPanelProps {
  lang: 'ar' | 'en';
  initialTab?: 'users' | 'import';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  lang,
  initialTab = 'users',
}) => {
  const isRtl = lang === 'ar';
  const [tab, setTab] = useState<'users' | 'import'>(initialTab);

  // Users & Classes State
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState<string>('');

  // Add User Modal/Form
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [newUserClassId, setNewUserClassId] = useState('');
  const [newUserTeacherClassIds, setNewUserTeacherClassIds] = useState<string[]>([]);
  const [newUserPassword, setNewUserPassword] = useState('Password123!');
  const [userModalMsg, setUserModalMsg] = useState<string | null>(null);

  // Add Class Form
  const [newClassName, setNewClassName] = useState('');
  const [classMsg, setClassMsg] = useState<string | null>(null);

  // Import State
  const [importType, setImportType] = useState<'students' | 'teachers' | 'quiz_questions'>('students');
  const [importText, setImportText] = useState('');
  const [selectedQuizIdForImport, setSelectedQuizIdForImport] = useState('');
  const [quizzesList, setQuizzesList] = useState<any[]>([]);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null);

  const fetchUsersAndClasses = async () => {
    try {
      setLoadingUsers(true);
      const [usersRes, classesRes, quizzesRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/teacher/classes'),
        apiFetch('/api/teacher/quizzes'),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
        if (data.classes?.length > 0 && !newUserClassId) {
          setNewUserClassId(data.classes[0].id);
        }
      }
      if (quizzesRes.ok) {
        const data = await quizzesRes.json();
        setQuizzesList(data.quizzes || []);
        if (data.quizzes?.length > 0 && !selectedQuizIdForImport) {
          setSelectedQuizIdForImport(data.quizzes[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsersAndClasses();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      setClassMsg(null);
      const res = await apiFetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setClassMsg(isRtl ? `تمت إضافة الشعبة ${data.class.name} بنجاح` : `Class ${data.class.name} created!`);
        setNewClassName('');
        fetchUsersAndClasses();
      } else {
        setClassMsg(data.error || 'فشل إنشاء الشعبة');
      }
    } catch {
      setClassMsg('خطأ في الاتصال بالسيرفر');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) return;
    if (newUserRole === 'TEACHER' && newUserTeacherClassIds.length === 0) {
      setUserModalMsg(isRtl ? 'يرجى اختيار شعبة واحدة على الأقل للمعلم' : 'Select at least one class for the teacher');
      return;
    }
    try {
      setUserModalMsg(null);
      const res = await apiFetch(editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users', {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          username: newUserUsername.trim(),
          role: newUserRole,
          password: newUserPassword,
          classId: newUserRole === 'STUDENT' ? newUserClassId : null,
          teacherClassIds: newUserRole === 'TEACHER' ? newUserTeacherClassIds : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUserModal(false);
        setEditingUser(null);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('Password123!');
        setNewUserTeacherClassIds([]);
        fetchUsersAndClasses();
      } else {
        setUserModalMsg(data.error || 'فشل إنشاء المستخدم');
      }
    } catch {
      setUserModalMsg('خطأ في الاتصال');
    }
  };

  const openAddUserModal = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserRole('STUDENT');
    setNewUserTeacherClassIds([]);
    setNewUserPassword('Password123!');
    setUserModalMsg(null);
    setShowAddUserModal(true);
  };

  const openEditUserModal = (user: any) => {
    setEditingUser(user);
    setNewUserName(user.name);
    setNewUserUsername(user.username);
    setNewUserRole(user.role);
    setNewUserClassId(user.class?.id || classes[0]?.id || '');
    setNewUserTeacherClassIds(user.teacherClasses?.map((tc: any) => tc.class.id) || []);
    setNewUserPassword('');
    setUserModalMsg(null);
    setShowAddUserModal(true);
  };

  const handleDeleteUser = async (user: any) => {
    const confirmed = window.confirm(
      isRtl ? `هل أنت متأكد من حذف المستخدم ${user.name}؟` : `Delete user ${user.name}?`
    );
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchUsersAndClasses();
      } else {
        window.alert(data.error || (isRtl ? 'فشل حذف المستخدم' : 'Failed to delete user'));
      }
    } catch {
      window.alert(isRtl ? 'خطأ في الاتصال بالسيرفر' : 'Server connection error');
    }
  };

  // SPREADSHEET IMPORT LOGIC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setImportText(csv);
        setPreviewResult(null);
        setCommitSuccessMsg(null);
      } catch (err) {
        console.error('File parsing error:', err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const loadSampleTemplateData = () => {
    if (importType === 'students') {
      setImportText(`name,username,className,password
ياسمين الحنيطي,yasmin.hneiti,10A,Student123!
يزن الرواشدة,yazan.rawashdeh,10B,Student123!
سارة القضاة,sara.qudah,11A,Student123!
خالد الشوابكة,khaled.shawabkeh,10A,Student123!
سامي النجار,sami.najjar,10B,Student123!`);
    } else if (importType === 'teachers') {
      setImportText(`name,username,classes,password
منى العواملة,mona.awamleh,"10A,10B",Password123!
بشار الكركي,bashar.karaki,11A,Password123!`);
    } else {
      setImportText(`questionText,points,option1,option2,option3,option4,correctOptionNumber
ما هي وحدة قياس القوة في النظام الدولي؟,1,النيوتن,الجول,الباسكال,الواط,1
ما هي عاصمة المملكة الأردنية الهاشمية؟,1,عمان,الزرقاء,إربد,العقبة,1
كم عدد كواكب المجموعة الشمسية المعتمدة رسمياً؟,2,ثمانية كواكب,تسعة كواكب,سبعة كواكب,ستة كواكب,1
ما ناتج 15 مضروبة في 6؟,1.5,90,75,85,100,1`);
    }
    setPreviewResult(null);
    setCommitSuccessMsg(null);
  };

  const handleValidatePreview = async () => {
    if (!importText.trim()) return;
    setValidating(true);
    setPreviewResult(null);
    setCommitSuccessMsg(null);

    try {
      // Parse CSV to JSON rows
      const wb = XLSX.read(importText, { type: 'string' });
      const wsName = wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { defval: '' });

      const res = await apiFetch('/api/admin/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, rows }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewResult(data);
      } else {
        setCommitSuccessMsg(data.error || 'فشل فحص البيانات');
      }
    } catch (err: any) {
      setCommitSuccessMsg(err.message || 'خطأ في معالجة الملف');
    } finally {
      setValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewResult || !previewResult.validRows || previewResult.validRows.length === 0) return;
    setCommitting(true);

    try {
      const res = await apiFetch('/api/admin/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          validRows: previewResult.validRows,
          quizId: importType === 'quiz_questions' ? selectedQuizIdForImport : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCommitSuccessMsg(
          isRtl
            ? `تم استيراد وحفظ ${data.count} سجلاً بنجاح في قاعدة البيانات!`
            : `Successfully imported ${data.count} records!`
        );
        setPreviewResult(null);
        setImportText('');
        fetchUsersAndClasses();
      } else {
        alert(data.error || 'فشل الاستيراد');
      }
    } catch {
      alert('خطأ في الاتصال بالسيرفر');
    } finally {
      setCommitting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-stone-500 mb-1">
            {isRtl ? 'إدارة مركز النجاح (نور المشرفة)' : 'Amman Centre Admin Portal'}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            {isRtl ? 'إدارة الشعب، المستخدمين واستيراد البيانات' : 'Classes, Users & Spreadsheet Import'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
            {isRtl
              ? 'إدارة الحسابات، إضافة شعب جديدة، ومعاينة واستيراد ملفات Excel وCSV بضمان فحص الأخطاء قبل الحفظ.'
              : 'Manage rosters, create classes, and bulk-import spreadsheets with row-level validation.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setTab('users')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${tab === 'users' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
          >
            {isRtl ? 'المستخدمون والشعب' : 'Users & Classes'}
          </button>
          <button
            onClick={() => setTab('import')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${tab === 'import' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
          >
            {isRtl ? 'استيراد الجداول' : 'Spreadsheet Import'}
          </button>
        </div>
      </div>

      {/* TAB 1: USERS & CLASSES */}
      {tab === 'users' && (
        <div className="space-y-6">
          {/* Classes Row */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <School className="w-4 h-4 text-teal-700" />
              <span>{isRtl ? 'الشعب الدراسية المسجلة' : 'Registered Classes'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {classes.map((cls) => (
                <div key={cls.id} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-stone-900">{cls.name}</span>
                    <span className="text-xs text-stone-500 ms-2">
                      ({cls._count?.students ?? 0} {isRtl ? 'طالباً' : 'students'})
                    </span>
                  </div>
                </div>
              ))}

              {/* Add class inline form */}
              <form onSubmit={handleCreateClass} className="flex gap-2">
                <input
                  type="text"
                  placeholder={isRtl ? 'رمز شعبة (مثال: 12B)' : 'New class (e.g. 12B)'}
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
                <button
                  type="submit"
                  className="touch-target px-3 py-1.5 rounded-xl bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {classMsg && (
              <p className="text-xs text-teal-800 mt-2 font-medium">{classMsg}</p>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <span>{isRtl ? 'دليل المستخدمين (طلاب ومعلمون وإدارة)' : 'Users Directory'}</span>
                <span className="text-xs font-mono text-stone-400 font-normal">
                  ({filteredUsers.length} / {users.length})
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute start-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={isRtl ? 'بحث بالاسم...' : 'Search user...'}
                    className="ps-8 pe-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs bg-white text-stone-700"
                >
                  <option value="ALL">{isRtl ? 'كل الأدوار' : 'All Roles'}</option>
                  <option value="STUDENT">{isRtl ? 'الطلاب فقط' : 'Students only'}</option>
                  <option value="TEACHER">{isRtl ? 'المعلمون فقط' : 'Teachers only'}</option>
                  <option value="ADMIN">{isRtl ? 'الإدارة فقط' : 'Admins only'}</option>
                </select>

                {/* Add User Button */}
                <button
                  onClick={openAddUserModal}
                  className="touch-target px-3.5 py-1.5 rounded-xl bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900 flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'إضافة مستخدم' : 'Add User'}</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-xs text-start">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                  <tr>
                    <th className="p-3 text-start">{isRtl ? 'الاسم' : 'Name'}</th>
                    <th className="p-3 text-start">{isRtl ? 'اسم المستخدم' : 'Username'}</th>
                    <th className="p-3 text-start">{isRtl ? 'الدور' : 'Role'}</th>
                    <th className="p-3 text-start">{isRtl ? 'الشعبة / المهام' : 'Class / Details'}</th>
                    <th className="p-3 text-end">{isRtl ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3 font-semibold text-stone-900">{u.name}</td>
                      <td className="p-3 font-mono text-stone-500">@{u.username}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'TEACHER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-teal-100 text-teal-800'
                            }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-stone-600">
                        {u.role === 'STUDENT' && (u.class?.name || '-')}
                        {u.role === 'TEACHER' && (u.teacherClasses?.map((tc: any) => tc.class.name).join(', ') || '-')}
                        {u.role === 'ADMIN' && (isRtl ? 'صلاحيات كاملة' : 'Full access')}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditUserModal(u)}
                            title={isRtl ? 'تعديل المستخدم' : 'Edit user'}
                            className="touch-target p-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-teal-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title={isRtl ? 'حذف المستخدم' : 'Delete user'}
                            className="touch-target p-2 rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SPREADSHEET IMPORT (CSV & EXCEL) */}
      {tab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                <span>{isRtl ? 'استيراد البيانات من الجداول (CSV / Excel)' : 'Spreadsheet Bulk Import'}</span>
              </h2>
              <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'قم باختيار نوع البيانات المراد استيرادها، ثم ارفع ملف الجدول أو الصق البيانات بصيغة CSV. يقوم النظام بفحص كافة الصفوف وعرض الأخطاء بدقة قبل اعتماد أي سجل في قاعدة البيانات.'
                  : 'Select data type, paste CSV text or upload spreadsheet. Validates all rows with previews before committing to database.'}
              </p>
            </div>

            {/* Step 1: Type Selection */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setImportType('students');
                  setPreviewResult(null);
                  setCommitSuccessMsg(null);
                }}
                className={`touch-target px-4 py-2 rounded-xl text-xs font-semibold transition-all ${importType === 'students'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                {isRtl ? '1. استيراد الطلاب' : '1. Import Students'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportType('teachers');
                  setPreviewResult(null);
                  setCommitSuccessMsg(null);
                }}
                className={`touch-target px-4 py-2 rounded-xl text-xs font-semibold transition-all ${importType === 'teachers'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                {isRtl ? '2. استيراد المعلمين' : '2. Import Teachers'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportType('quiz_questions');
                  setPreviewResult(null);
                  setCommitSuccessMsg(null);
                }}
                className={`touch-target px-4 py-2 rounded-xl text-xs font-semibold transition-all ${importType === 'quiz_questions'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                {isRtl ? '3. استيراد أسئلة اختبار' : '3. Import Quiz Questions'}
              </button>
            </div>

            {/* If Quiz Questions: Select which quiz */}
            {importType === 'quiz_questions' && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <label className="text-xs font-semibold text-stone-700 block">
                  {isRtl ? 'حدد الاختبار المستهدف لإضافة الأسئلة المستوردة إليه:' : 'Target Quiz:'}
                </label>
                <select
                  value={selectedQuizIdForImport}
                  onChange={(e) => setSelectedQuizIdForImport(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                >
                  {quizzesList.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.classes.map((c: any) => c.class.name).join(', ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Input area & Quick actions */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-stone-700">
                  {isRtl ? 'بيانات CSV أو ارفع ملف:' : 'CSV Data or Upload File:'}
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadSampleTemplateData}
                    className="touch-target px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-[11px] font-semibold"
                  >
                    {isRtl ? 'تحميل بيانات تجريبية جاهزة' : 'Load Sample Data'}
                  </button>

                  <label className="touch-target px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'رفع ملف (Excel/CSV)' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={isRtl ? 'الصق محتوى الـ CSV هنا أو ارفع الملف من الزر أعلاه...' : 'Paste CSV text here or upload file...'}
                className="w-full p-3.5 rounded-xl border border-stone-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-stone-50 focus:bg-white"
                dir="auto"
              />
            </div>

            {/* Validation Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleValidatePreview}
                disabled={validating || !importText.trim()}
                className="touch-target px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                <span>{validating ? (isRtl ? 'جاري الفحص...' : 'Validating...') : (isRtl ? 'معاينة وفحص الصفوف' : 'Preview & Validate')}</span>
              </button>
            </div>

            {/* Success Toast */}
            {commitSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{commitSuccessMsg}</span>
              </div>
            )}

            {/* Preview Results Breakdown */}
            {previewResult && (
              <div className="space-y-4 pt-4 border-t border-stone-100 animate-in fade-in">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                    <span className="text-stone-500">{isRtl ? 'إجمالي الصفوف: ' : 'Total: '}</span>
                    <strong className="font-mono text-stone-900">{previewResult.totalCount}</strong>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    <span>{isRtl ? 'صالحة للإدخال: ' : 'Valid: '}</span>
                    <strong className="font-mono">{previewResult.successCount}</strong>
                  </div>

                  {previewResult.errorCount > 0 && (
                    <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <span>{isRtl ? 'صفوف تحوي أخطاء: ' : 'Errors: '}</span>
                      <strong className="font-mono">{previewResult.errorCount}</strong>
                    </div>
                  )}
                </div>

                {/* Error Rows Table if any */}
                {previewResult.invalidRows.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                    <h3 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{isRtl ? 'تفاصيل الأخطاء المكتشفة في الملف:' : 'Detected Row Errors:'}</span>
                    </h3>
                    <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                      {previewResult.invalidRows.map((errRow: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-white border border-rose-200 text-rose-800 flex items-start gap-2">
                          <span className="font-mono font-bold shrink-0">{isRtl ? `السطر ${errRow.row}:` : `Row ${errRow.row}:`}</span>
                          <span>{errRow.errors.join(' · ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commit Action */}
                {previewResult.validRows.length > 0 && (
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCommitImport}
                      disabled={committing}
                      className="touch-target px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {committing
                          ? (isRtl ? 'جاري الاستيراد والحفظ...' : 'Committing...')
                          : isRtl
                            ? `اعتماد واستيراد (${previewResult.validRows.length}) صفاً صالحاً إلى قاعدة البيانات`
                            : `Commit & Import (${previewResult.validRows.length}) Valid Rows`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900">
                {editingUser
                  ? (isRtl ? 'تعديل المستخدم' : 'Edit User')
                  : (isRtl ? 'إضافة مستخدم جديد' : 'Add New User')}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {userModalMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl mb-3">
                {userModalMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {isRtl ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder={isRtl ? 'مثال: سامر العبادي' : 'e.g. Samer Abbadi'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {isRtl ? 'اسم المستخدم (فريد) *' : 'Username *'}
                </label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder={isRtl ? 'مثال: samer.abbadi' : 'e.g. samer.abbadi'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {isRtl ? 'الدور *' : 'Role *'}
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                >
                  <option value="STUDENT">{isRtl ? 'طالب (STUDENT)' : 'Student'}</option>
                  <option value="TEACHER">{isRtl ? 'معلم (TEACHER)' : 'Teacher'}</option>
                  <option value="ADMIN">{isRtl ? 'مشرف / إدارة (ADMIN)' : 'Admin'}</option>
                </select>
              </div>

              {newUserRole === 'STUDENT' && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    {isRtl ? 'الشعبة الدراسية *' : 'Class Cohort *'}
                  </label>
                  <select
                    value={newUserClassId}
                    onChange={(e) => setNewUserClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {newUserRole === 'TEACHER' && (
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    {isRtl ? 'الشعب الدراسية *' : 'Assigned Classes *'}
                  </label>
                  <div className="space-y-2 rounded-xl border border-stone-200 p-3">
                    {classes.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUserTeacherClassIds.includes(cls.id)}
                          onChange={(e) => {
                            setNewUserTeacherClassIds((selectedIds) => e.target.checked
                              ? [...selectedIds, cls.id]
                              : selectedIds.filter((id) => id !== cls.id));
                          }}
                          className="h-4 w-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700"
                        />
                        {cls.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  {isRtl ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="touch-target flex-1 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="touch-target flex-1 py-2 rounded-xl bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900"
                >
                  {editingUser
                    ? (isRtl ? 'حفظ التعديلات' : 'Save Changes')
                    : (isRtl ? 'حفظ المستخدم' : 'Save User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
