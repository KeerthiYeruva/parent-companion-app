import type { RawImportRecord } from '@/features/import';
import {
  extractClassTestRows,
  isFixedClassTestHeader,
} from '@/features/documents/services/class-test-table-extractor';
import {
  extractHomeStudyRows,
  isFixedHomeStudyHeader,
} from '@/features/documents/services/home-study-table-extractor';
import {
  extractFixedUnitTestRows,
  isFixedUnitTestHeader,
} from '@/features/documents/services/unit-test-table-extractor';
import type { FixedTableExtractorDeps } from '@/features/documents/services/fixed-table-types';

const normalizeHeaderText = (value: string, normalizeText: (value: string) => string) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isFixedTableTitle = (line: string, normalizeText: (value: string) => string) => {
  const title = normalizeHeaderText(line, normalizeText);
  return (
    /\bunit\s*test\s*(?:i|1)\s+exam\s+timetable\b/i.test(title) ||
    /\bclass\s*test\b(?:\s+(?:i{1,3}|[1-9]))?(?:\s+timetable)?(?:\s+and)?\s+portions?\b/i.test(
      title
    )
  );
};

export const isFixedTableLikeLine = (line: string, normalizeText: (value: string) => string) =>
  isFixedHomeStudyHeader(line, normalizeText) ||
  isFixedClassTestHeader(line, normalizeText) ||
  isFixedUnitTestHeader(line, normalizeText) ||
  isFixedTableTitle(line, normalizeText);

const mergeFixedTableRows = (rows: RawImportRecord[], normalizeText: (value: string) => string) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.category,
      row.subject ?? '',
      row.dueDate ?? '',
      normalizeText(row.title ?? '').toLowerCase(),
    ].join('__');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const extractFixedTableRows = (
  contentText: string,
  childName: string | undefined,
  deps: FixedTableExtractorDeps
): RawImportRecord[] =>
  mergeFixedTableRows(
    [
      ...extractClassTestRows(contentText, childName, deps),
      ...extractHomeStudyRows(contentText, childName, deps),
      ...extractFixedUnitTestRows(contentText, childName, deps),
    ],
    deps.normalizeText
  );
