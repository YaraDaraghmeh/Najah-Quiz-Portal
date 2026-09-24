import { describe, it, expect } from 'vitest';
import { validateStudentsImport, validateQuizQuestionsImport } from './import';

describe('Spreadsheet Import Validation Tests', () => {
  it('validates correct student rows', () => {
    const rawRows = [
      { name: 'أحمد محمود', username: 'ahmad.m', className: '10A', password: 'pass' },
    ];
    const existing = new Set(['nour']);
    const classes = new Set(['10A', '10B']);
    const preview = validateStudentsImport(rawRows, existing, classes);

    expect(preview.successCount).toBe(1);
    expect(preview.errorCount).toBe(0);
    expect(preview.validRows[0].username).toBe('ahmad.m');
  });

  it('detects duplicate usernames and invalid classes', () => {
    const rawRows = [
      { name: 'طالب 1', username: 'nour', className: '10A' }, // duplicate with existing
      { name: 'طالب 2', username: 'student.2', className: '99Z' }, // invalid class
    ];
    const existing = new Set(['nour']);
    const classes = new Set(['10A', '10B']);
    const preview = validateStudentsImport(rawRows, existing, classes);

    expect(preview.successCount).toBe(0);
    expect(preview.errorCount).toBe(2);
    expect(preview.invalidRows[0].errors[0]).toContain('مستخدم بالفعل');
    expect(preview.invalidRows[1].errors[0]).toContain('غير موجودة');
  });

  it('validates quiz question rows and option count', () => {
    const rawRows = [
      {
        questionText: 'سؤال 1',
        points: '2.5',
        option1: 'أ',
        option2: 'ب',
        option3: 'ج',
        option4: 'د',
        correctOptionNumber: '2',
      },
      {
        questionText: 'سؤال ناقص',
        points: '1',
        option1: 'أ',
        option2: '', // missing option
        option3: 'ج',
        option4: 'د',
        correctOptionNumber: '5', // invalid correct number
      },
    ];

    const preview = validateQuizQuestionsImport(rawRows);
    expect(preview.successCount).toBe(1);
    expect(preview.errorCount).toBe(1);
    expect(preview.validRows[0].points).toBe(2.5);
    expect(preview.validRows[0].correctOptionIndex).toBe(1); // 0-indexed
  });
});
