import { describe, expect, it } from 'vitest';
import {
  buildPlannerItemDisplay,
  normalizeDisplayText,
} from '@/features/planning/services/planner-item-display';
import type { SchoolItem } from '@/types/domain';

const item = (overrides: Partial<SchoolItem>): SchoolItem => ({
  id: 'item-1',
  childId: 'child-1',
  category: 'ClassTest',
  title: 'Class Test',
  dueDate: '2026-07-13',
  status: 'Pending',
  ...overrides,
});

describe('buildPlannerItemDisplay', () => {
  it('normalizes equivalent display text across punctuation and dash styles', () => {
    expect(normalizeDisplayText('Chapter 2 - Addition')).toBe(
      normalizeDisplayText('chapter-2: Addition')
    );
  });

  it('hides description when it differs only by case', () => {
    const display = buildPlannerItemDisplay(
      item({
        title: 'Class Test Chapter 5',
        description: 'class test chapter 5',
      })
    );

    expect(display.description).toBeUndefined();
  });

  it('hides description when it differs only by punctuation or spacing', () => {
    const display = buildPlannerItemDisplay(
      item({
        title: 'Class Test: Chapter 5',
        description: 'Class   Test - Chapter 5',
      })
    );

    expect(display.description).toBeUndefined();
  });

  it('shows description when it contains different meaningful content', () => {
    const display = buildPlannerItemDisplay(
      item({
        title: 'Class Test',
        chapterNumber: '5',
        description: 'Numbers up Home Study Pg. No. 104',
      })
    );

    expect(display).toMatchObject({
      heading: 'Class Test',
      chapter: 'Chapter 5',
      description: 'Numbers up Home Study Pg. No. 104',
      category: 'Tests',
    });
  });

  it('keeps a description when it adds new information beyond the title', () => {
    const display = buildPlannerItemDisplay(
      item({
        title: 'Class Test',
        description: 'Bring the notebook',
      })
    );

    expect(display.description).toBe('Bring the notebook');
  });

  it('does not repeat exact title and chapter content', () => {
    const display = buildPlannerItemDisplay(
      item({
        category: 'Homework',
        title: 'Chapter 2 - Addition',
        description: 'Chapter-2: Addition',
      })
    );

    expect(display.heading).toBe('Chapter 2 - Addition');
    expect(display.chapter).toBeUndefined();
    expect(display.description).toBeUndefined();
  });

  it('keeps question range details when chapter contains the heading plus work', () => {
    const display = buildPlannerItemDisplay(
      item({
        category: 'Homework',
        subject: 'Mathematics',
        title: 'Chapter 2 - Addition, Subtraction and their Applications -: Q1-Q7',
        description: 'Chapter 2 -- Addition, Subtraction and their Applications -: Q1-Q7',
      })
    );

    expect(display.heading).toBe('Chapter 2 - Addition, Subtraction and their Applications');
    expect(display.chapter).toBeUndefined();
    expect(display.description).toBe('Homework: Q1-Q7');
  });

  it('removes repeated chapter text while preserving unique revision details', () => {
    const display = buildPlannerItemDisplay(
      item({
        category: 'Homework',
        title: 'Chapter 2 - Addition, Subtraction and their Applications -: Q1-Q7',
        description: 'Revision work: Q8-Q15 • Homework: Q1-Q7',
      })
    );

    expect(display.heading).toBe('Chapter 2 - Addition, Subtraction and their Applications');
    expect(display.description).toBe('Homework: Q1-Q7\nRevision: Q8-Q15');
  });

  it('keeps genuinely different chapter details', () => {
    const display = buildPlannerItemDisplay(
      item({
        category: 'UnitTest',
        title: 'Mathematics Unit Test',
        description: 'Portions: Chapter- 5 Numbers Up to 100 Chapter - 1 Things Around Us',
      })
    );

    expect(display.heading).toBe('Unit Test');
    expect(display.chapter).toBe(
      'Chapter 5 - Numbers Up to 100\nChapter 1 - Things Around Us\nPortions'
    );
    expect(display.description).toBeUndefined();
  });

  it('removes raw PDF date fragments from display only', () => {
    const source = item({
      category: 'Homework',
      title: '17/07/2022 6 FRIDAY COMPUTER',
      description: '17/07/2022 Friday Bring notebook',
    });
    const snapshot = { ...source };
    const display = buildPlannerItemDisplay(source);

    expect(display.heading).toBe('6 COMPUTER');
    expect(display.description).toBe('Bring notebook');
    expect(source).toEqual(snapshot);
  });
});
