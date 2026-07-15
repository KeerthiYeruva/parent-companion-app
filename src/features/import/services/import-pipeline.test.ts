import { describe, expect, it } from 'vitest';
import { importPipeline } from '@/features/import/services/import-pipeline';

describe('importPipeline', () => {
  it('normalizes, validates, and builds valid school items', () => {
    const result = importPipeline.run(
      [
        {
          childName: 'aarav',
          category: 'Homework',
          title: 'Math worksheet',
          dueDate: '2026-07-10',
        },
      ],
      {
        sourceType: 'csv',
        documentId: 'doc-1',
        childNameToIdMap: {
          aarav: 'child-1',
        },
      }
    );

    expect(result.summary).toMatchObject({
      totalRecords: 1,
      normalizedRecords: 1,
      resolvedRecords: 1,
      validRecords: 1,
      issuesCount: 0,
      blockingIssues: 0,
      warningIssues: 0,
    });

    expect(result.normalizedRecords).toHaveLength(1);

    expect(result.items).toEqual([
      expect.objectContaining({
        childId: 'child-1',
        category: 'Homework',
        title: 'Math worksheet',
        description: undefined,
        dueDate: '2026-07-10',
        sourceDocumentId: 'doc-1',
        sourceDocumentIds: ['doc-1'],
      }),
    ]);
  });

  it('reports issues for invalid records and excludes them from items', () => {
    const result = importPipeline.run(
      [
        {
          childName: 'unknown child',
          category: 'NotARealCategory',
          title: '',
          dueDate: 'not-a-date',
        },
      ],
      {
        sourceType: 'manual',
        documentId: 'doc-2',
        childNameToIdMap: {
          aarav: 'child-1',
        },
      }
    );

    expect(result.items).toEqual([]);
    expect(result.normalizedRecords).toHaveLength(1);
    expect(result.summary.validRecords).toBe(0);
    expect(result.summary.issuesCount).toBe(4);
    expect(result.issues.map((issue) => issue.fieldName).sort()).toEqual([
      'category',
      'childName',
      'dueDate',
      'title',
    ]);
  });

  it('rejects parser artifacts before they become school items', () => {
    const result = importPipeline.run(
      [
        {
          childName: 'aarav',
          category: 'HomeStudy',
          title:
            'JULY: WEEK 2 1 06.07.2026 Monday Mathematics Course book Pg. No. 104 2 07.07.2026 Tuesday Science Practice Ch-2 How Things Move',
          dueDate: '2026-07-10',
        },
      ],
      {
        sourceType: 'future-pdf',
        documentId: 'doc-3',
        childNameToIdMap: {
          aarav: 'child-1',
        },
      }
    );

    expect(result.items).toEqual([]);
    expect(result.summary).toMatchObject({ validRecords: 0, issuesCount: 1 });
    expect(result.issues).toEqual([
      expect.objectContaining({ fieldName: 'title', issue: 'Row 1: Title is not parent-ready' }),
    ]);
  });

  it('merges unit test schedule and portion rows uploaded together', () => {
    const result = importPipeline.run(
      [
        {
          childName: 'aarav',
          category: 'UnitTest',
          subject: 'Math',
          title: 'Mathematics Unit Test',
          dueDate: '2026-07-20',
          description: '20/07/2026 MONDAY MATHEMATICS',
          sourceDocumentId: 'planner-doc',
          sourceRole: 'schedule',
        },
        {
          childName: 'aarav',
          category: 'UnitTest',
          subject: 'Mathematics',
          title: 'Mathematics portions',
          description: 'Chapter 1 - Place Value',
          sourceDocumentId: 'portion-doc',
          sourceRole: 'portion',
          parserIssue: 'Unit test portion found without an exam schedule date',
        },
      ],
      {
        sourceType: 'future-pdf',
        documentId: 'scan-run',
        childNameToIdMap: { aarav: 'child-1' },
      }
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        childId: 'child-1',
        category: 'UnitTest',
        subject: 'Mathematics',
        title: 'Mathematics Unit Test',
        dueDate: '2026-07-20',
        description: 'Chapter 1 - Place Value',
        sourceDocumentIds: ['planner-doc', 'portion-doc'],
      }),
    ]);
    expect(result.items[0].description).not.toContain('20/07/2026');
    expect(result.issues).toEqual([]);
  });

  it('keeps two homework rows on the same subject and date separate', () => {
    const result = importPipeline.run(
      [
        {
          childName: 'aarav',
          category: 'Homework',
          subject: 'Mathematics',
          title: 'Exercise 1',
          dueDate: '2026-07-15',
        },
        {
          childName: 'aarav',
          category: 'Homework',
          subject: 'Mathematics',
          title: 'Worksheet 2',
          dueDate: '2026-07-15',
        },
      ],
      {
        sourceType: 'future-pdf',
        documentId: 'doc-4',
        childNameToIdMap: { aarav: 'child-1' },
      }
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.title)).toEqual(['Exercise 1', 'Worksheet 2']);
  });

  it('keeps unit tests from different assessment cycles separate', () => {
    const result = importPipeline.run(
      [
        {
          childName: 'aarav',
          category: 'UnitTest',
          subject: 'Mathematics',
          title: 'Mathematics Unit Test',
          dueDate: '2026-07-20',
          sourceDocumentId: 'july-doc',
          sourceRole: 'schedule',
        },
        {
          childName: 'aarav',
          category: 'UnitTest',
          subject: 'Mathematics',
          title: 'Mathematics Unit Test',
          dueDate: '2026-08-20',
          sourceDocumentId: 'aug-doc',
          sourceRole: 'schedule',
        },
      ],
      {
        sourceType: 'future-pdf',
        documentId: 'doc-5',
        childNameToIdMap: { aarav: 'child-1' },
      }
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.dueDate).sort()).toEqual(['2026-07-20', '2026-08-20']);
  });
});
