import { describe, expect, it } from 'vitest';
import { parsePastedRows } from '@/features/import/services/parse-pasted-rows';

describe('parsePastedRows', () => {
  it('parses comma-separated rows into raw records', () => {
    const rows = parsePastedRows(
      'Aarav,Homework,Math worksheet,2026-07-10,Do chapter 3\nMyra,ClassTest,Science prep,2026-07-12,Read chapter 4'
    );

    expect(rows).toEqual([
      {
        childName: 'Aarav',
        category: 'Homework',
        title: 'Math worksheet',
        dueDate: '2026-07-10',
        description: 'Do chapter 3',
      },
      {
        childName: 'Myra',
        category: 'ClassTest',
        title: 'Science prep',
        dueDate: '2026-07-12',
        description: 'Read chapter 4',
      },
    ]);
  });

  it('ignores empty lines and preserves defaults for missing fields', () => {
    const rows = parsePastedRows('\nAarav,Homework,Math worksheet\n\n');

    expect(rows).toEqual([
      {
        childName: 'Aarav',
        category: 'Homework',
        title: 'Math worksheet',
        dueDate: '',
        description: '',
      },
    ]);
  });

  it('trims whitespace around pasted fields', () => {
    const rows = parsePastedRows(
      '  Aarav , Homework , Math worksheet , 2026-07-10 , Do chapter 3  '
    );

    expect(rows).toEqual([
      expect.objectContaining({
        childName: 'Aarav',
        category: 'Homework',
        title: 'Math worksheet',
        dueDate: '2026-07-10',
        description: 'Do chapter 3',
      }),
    ]);
  });
});
