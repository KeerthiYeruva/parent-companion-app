import { describe, expect, it } from 'vitest';
import { groupTestsByChild } from '@/features/tests/services/test-groups';
import type { ChildProfile, SchoolItem } from '@/types/domain';

const child: ChildProfile = {
  id: 'child-1',
  name: 'Luhas Reddy',
  grade: '5',
  section: 'A',
  academicYear: '2026-2027',
  colorTag: 'bg-blue-500',
};

const item = (id: string, category: SchoolItem['category'], dueDate: string): SchoolItem => ({
  id,
  childId: 'child-1',
  category,
  title: id,
  dueDate,
  status: 'Pending',
});

describe('test grouping', () => {
  it('groups only Class Tests, Unit Tests, and Exams by child', () => {
    const [group] = groupTestsByChild(
      [child],
      [
        item('homework', 'Homework', '2026-07-13'),
        item('class-test', 'ClassTest', '2026-07-15'),
        item('unit-test', 'UnitTest', '2026-07-16'),
        item('exam', 'Exam', '2026-07-17'),
      ]
    );

    expect(group.classTests.map((entry) => entry.id)).toEqual(['class-test']);
    expect(group.unitTests.map((entry) => entry.id)).toEqual(['unit-test']);
    expect(group.exams.map((entry) => entry.id)).toEqual(['exam']);
  });

  it('keeps rows chronological inside each section', () => {
    const [group] = groupTestsByChild(
      [child],
      [item('later', 'ClassTest', '2026-07-20'), item('earlier', 'ClassTest', '2026-07-14')]
    );

    expect(group.classTests.map((entry) => entry.id)).toEqual(['earlier', 'later']);
  });
});
