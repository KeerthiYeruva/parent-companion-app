import { describe, expect, it } from 'vitest';
import type { ChildProfile, SchoolItem, UploadedDocument } from '@/types/domain';
import { buildHydratedSnapshot, hasInMemoryEntities } from '@/store/hydration';

const children: ChildProfile[] = [
  {
    id: 'child-1',
    name: 'Aarav',
    grade: '4',
    section: 'A',
    academicYear: '2026-2027',
    colorTag: 'bg-blue-500',
  },
];

const items: SchoolItem[] = [
  {
    id: 'item-1',
    childId: 'child-1',
    category: 'Homework',
    title: 'Math',
    dueDate: '2026-07-08',
    status: 'Pending',
  },
];

const documents: UploadedDocument[] = [
  {
    id: 'doc-1',
    title: 'Planner',
    type: 'ScholasticPlanner',
    childIds: ['child-1'],
    uploadedAt: '2026-07-08T00:00:00.000Z',
  },
];

describe('hydration helpers', () => {
  it('detects when in-memory entities exist', () => {
    expect(hasInMemoryEntities({ children, items: [], documents: [], selectedChildIds: [] })).toBe(
      true
    );
    expect(hasInMemoryEntities({ children: [], items, documents: [], selectedChildIds: [] })).toBe(
      true
    );
    expect(hasInMemoryEntities({ children: [], items: [], documents, selectedChildIds: [] })).toBe(
      true
    );
    expect(
      hasInMemoryEntities({ children: [], items: [], documents: [], selectedChildIds: [] })
    ).toBe(false);
  });

  it('normalizes selected child ids against hydrated children', () => {
    const snapshot = buildHydratedSnapshot({
      children,
      items,
      documents,
      selectedChildIds: ['child-1', 'missing'],
    });

    expect(snapshot.selectedChildIds).toEqual(['child-1']);
  });

  it('selects all children when no saved filters exist', () => {
    const snapshot = buildHydratedSnapshot({
      children,
      items,
      documents,
      selectedChildIds: [],
    });

    expect(snapshot.selectedChildIds).toEqual(['child-1']);
  });

  it('returns empty selection when no children are available', () => {
    const snapshot = buildHydratedSnapshot({
      children: [],
      items: [],
      documents: [],
      selectedChildIds: ['child-1'],
    });

    expect(snapshot.selectedChildIds).toEqual([]);
  });

  it('filters legacy unit test portion rows out of the visible plan', () => {
    const scheduleItem: SchoolItem = {
      id: 'item-2',
      childId: 'child-1',
      category: 'UnitTest',
      subject: 'Computer Science',
      title: 'Computer Science Unit Test',
      dueDate: '2026-07-17',
      status: 'Pending',
    };
    const legacyPortionItem: SchoolItem = {
      id: 'item-3',
      childId: 'child-1',
      category: 'UnitTest',
      subject: 'Computer Science',
      title: 'Unit Test Portion: Computer A Machine',
      dueDate: '2026-07-10',
      status: 'Pending',
    };

    const snapshot = buildHydratedSnapshot({
      children,
      items: [scheduleItem, legacyPortionItem],
      documents,
      selectedChildIds: [],
    });

    expect(snapshot.items).toEqual([scheduleItem]);
  });

  it('normalizes and deduplicates legacy date-weekday subject rows', () => {
    const duplicateRows: SchoolItem[] = [
      {
        id: 'item-4',
        childId: 'child-1',
        category: 'HomeStudy',
        title: '3 Wednesday Kannada',
        dueDate: '2026-07-08',
        status: 'Pending',
      },
      {
        id: 'item-5',
        childId: 'child-1',
        category: 'HomeStudy',
        title: '3 Wednesday Kannada',
        dueDate: '2026-07-08',
        status: 'Pending',
      },
    ];

    const snapshot = buildHydratedSnapshot({
      children,
      items: duplicateRows,
      documents,
      selectedChildIds: [],
    });

    expect(snapshot.items).toEqual([
      expect.objectContaining({ subject: 'Kannada', title: 'Study Kannada' }),
    ]);
  });

  it('keeps valid unit-test items with real dates intact', () => {
    const validUnitTest: SchoolItem = {
      id: 'item-6',
      childId: 'child-1',
      category: 'UnitTest',
      subject: 'Mathematics',
      title: 'Mathematics Unit Test',
      dueDate: '2026-07-20',
      status: 'Pending',
    };

    const snapshot = buildHydratedSnapshot({
      children,
      items: [validUnitTest],
      documents,
      selectedChildIds: [],
    });

    expect(snapshot.items).toEqual([validUnitTest]);
  });
});
