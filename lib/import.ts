import * as XLSX from 'xlsx';

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreview<T> {
  validRows: T[];
  invalidRows: Array<{ row: number; data: any; errors: string[] }>;
  totalCount: number;
  successCount: number;
  errorCount: number;
}

export interface StudentImportRow {
  name: string;
  username: string;
  className: string;
  password?: string;
}

export interface TeacherImportRow {
  name: string;
  username: string;
  classes: string[]; // e.g. ["10A", "10B"]
  password?: string;
}

export interface QuestionImportRow {
  text: string;
  points: number;
  options: string[];
  correctOptionIndex: number; // 0-based
}

/**
 * Parses a buffer (CSV or XLSX) into raw JSON objects.
 */
export function parseSpreadsheetBuffer(buffer: Buffer): Array<Record<string, any>> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return rows;
}

/**
 * Validates student import data.
 */
export function validateStudentsImport(
  rawRows: Array<Record<string, any>>,
  existingUsernames: Set<string>,
  validClasses: Set<string>
): ImportPreview<StudentImportRow> {
  const validRows: StudentImportRow[] = [];
  const invalidRows: Array<{ row: number; data: any; errors: string[] }> = [];
  const seenInBatch = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1
    const errors: string[] = [];

    const name = String(row.name || row['الاسم'] || '').trim();
    const username = String(row.username || row['اسم_المستخدم'] || '').trim().toLowerCase();
    const className = String(row.className || row.class || row['الشعبة'] || row['الصف'] || '').trim().toUpperCase();
    const password = String(row.password || row['كلمة_المرور'] || 'Student123!').trim();

    if (!name) errors.push('اسم الطالب مطلوب');
    if (!username) {
      errors.push('اسم المستخدم مطلوب');
    } else if (username.length < 3) {
      errors.push('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
    } else if (existingUsernames.has(username) || seenInBatch.has(username)) {
      errors.push(`اسم المستخدم "${username}" مستخدم بالفعل`);
    }

    if (!className) {
      errors.push('الشعبة مطلوبة (مثال: 10A)');
    } else if (validClasses.size > 0 && !validClasses.has(className)) {
      errors.push(`الشعبة "${className}" غير موجودة في النظام`);
    }

    if (errors.length > 0) {
      invalidRows.push({ row: rowNum, data: row, errors });
    } else {
      seenInBatch.add(username);
      validRows.push({ name, username, className, password });
    }
  });

  return {
    validRows,
    invalidRows,
    totalCount: rawRows.length,
    successCount: validRows.length,
    errorCount: invalidRows.length,
  };
}

/**
 * Validates teacher import data.
 */
export function validateTeachersImport(
  rawRows: Array<Record<string, any>>,
  existingUsernames: Set<string>,
  validClasses: Set<string>
): ImportPreview<TeacherImportRow> {
  const validRows: TeacherImportRow[] = [];
  const invalidRows: Array<{ row: number; data: any; errors: string[] }> = [];
  const seenInBatch = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const errors: string[] = [];

    const name = String(row.name || row['الاسم'] || '').trim();
    const username = String(row.username || row['اسم_المستخدم'] || '').trim().toLowerCase();
    const classesRaw = String(row.classes || row['الشعب'] || '').trim();
    const password = String(row.password || row['كلمة_المرور'] || 'Password123!').trim();

    if (!name) errors.push('اسم المعلم مطلوب');
    if (!username) {
      errors.push('اسم المستخدم مطلوب');
    } else if (existingUsernames.has(username) || seenInBatch.has(username)) {
      errors.push(`اسم المستخدم "${username}" مستخدم بالفعل`);
    }

    const classesList = classesRaw
      ? classesRaw.split(/[,،]/).map(c => c.trim().toUpperCase()).filter(Boolean)
      : [];

    if (classesList.length === 0) {
      errors.push('يجب تعيين شعبة واحدة على الأقل للمعلم');
    } else {
      for (const cls of classesList) {
        if (validClasses.size > 0 && !validClasses.has(cls)) {
          errors.push(`الشعبة "${cls}" غير مسجلة بالنظام`);
        }
      }
    }

    if (errors.length > 0) {
      invalidRows.push({ row: rowNum, data: row, errors });
    } else {
      seenInBatch.add(username);
      validRows.push({ name, username, classes: classesList, password });
    }
  });

  return {
    validRows,
    invalidRows,
    totalCount: rawRows.length,
    successCount: validRows.length,
    errorCount: invalidRows.length,
  };
}

/**
 * Validates quiz questions import data.
 */
export function validateQuizQuestionsImport(
  rawRows: Array<Record<string, any>>
): ImportPreview<QuestionImportRow> {
  const validRows: QuestionImportRow[] = [];
  const invalidRows: Array<{ row: number; data: any; errors: string[] }> = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const errors: string[] = [];

    const text = String(row.questionText || row.text || row['نص_السؤال'] || '').trim();
    const pointsNum = parseFloat(row.points || row['العلامة'] || row['النقاط'] || '1');
    const opt1 = String(row.option1 || row['الخيار1'] || '').trim();
    const opt2 = String(row.option2 || row['الخيار2'] || '').trim();
    const opt3 = String(row.option3 || row['الخيار3'] || '').trim();
    const opt4 = String(row.option4 || row['الخيار4'] || '').trim();
    const correctVal = parseInt(String(row.correctOptionNumber || row.correct || row['الخيار_الصحيح'] || '1'), 10);

    if (!text) errors.push('نص السؤال مطلوب');
    if (isNaN(pointsNum) || pointsNum <= 0) errors.push('العلامة يجب أن تكون رقماً موجباً');
    if (!opt1 || !opt2 || !opt3 || !opt4) errors.push('يجب تقديم 4 خيارات لكل سؤال');
    if (isNaN(correctVal) || correctVal < 1 || correctVal > 4) errors.push('رقم الخيار الصحيح يجب أن يكون بين 1 و 4');

    if (errors.length > 0) {
      invalidRows.push({ row: rowNum, data: row, errors });
    } else {
      validRows.push({
        text,
        points: pointsNum,
        options: [opt1, opt2, opt3, opt4],
        correctOptionIndex: correctVal - 1,
      });
    }
  });

  return {
    validRows,
    invalidRows,
    totalCount: rawRows.length,
    successCount: validRows.length,
    errorCount: invalidRows.length,
  };
}
