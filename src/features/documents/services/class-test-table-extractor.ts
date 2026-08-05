import type { RawImportRecord } from '@/features/import';
import type { FixedTableExtractorDeps } from '@/features/documents/services/fixed-table-types';

export const isFixedClassTestHeader = (line: string, normalizeText: (value: string) => string) =>
  /\bclass\s*test\b(?:\s+(?:i{1,3}|[1-9]))?(?:\s+timetable)?(?:\s+and)?\s+portions?\b/i.test(
    normalizeText(line)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );

const hasClassTestSectionTitle = (line: string, normalizeText: (value: string) => string) =>
  /class\s+test\s+and\s+portions/i.test(normalizeText(line)) ||
  /class\s*test\s*[-–]?\s*(?:i{1,3}|[1-9])?\s*timetable\s+and\s+portions/i.test(
    normalizeText(line)
  );

const isClassTestBoundary = (line: string, deps: FixedTableExtractorDeps) =>
  new RegExp(
    String.raw`\b(?:${deps.monthNameToken}\s*:\s*WEEK\s*\d*|${deps.monthNameToken}\s+MONTH\b|ACTIVITIES\s+OF\s+THE\s+MONTH|SUBJECT\s+ACTIVITIES|CO\s*SCHOLASTIC|UNIT\s*TEST|CLASS\s*TEST(?:\s+AND)?\s+PORTIONS)\b`,
    'i'
  ).test(deps.normalizeText(line));

const splitTableLine = (line: string, normalizeText: (value: string) => string) =>
  line.split('\t').map((cell) => normalizeText(cell));

const appendPortion = (
  row: RawImportRecord | undefined,
  line: string,
  deps: FixedTableExtractorDeps
) => {
  const tail = deps.normalizeText(line.replace(/^\t+/, '').split('\t').filter(Boolean).join(' '));
  if (!row || !tail) {
    return;
  }
  row.description = `${row.description ?? ''} ${tail}`.trim();
};

export const extractClassTestRows = (
  contentText: string,
  childName: string | undefined,
  deps: FixedTableExtractorDeps
): RawImportRecord[] => {
  const rows: RawImportRecord[] = [];
  let inClassTestTable = false;
  let pendingPortion: string | undefined;
  const lines = contentText.split(/\r?\n/);

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      return;
    }

    if (
      hasClassTestSectionTitle(line, deps.normalizeText) ||
      isFixedClassTestHeader(line, deps.normalizeText)
    ) {
      inClassTestTable = true;
      return;
    }

    if (!inClassTestTable) {
      return;
    }

    if (deps.isSchoolNoteLine(line) || deps.isScholasticMatrixArtifactLine(line)) {
      return;
    }

    if (isClassTestBoundary(line, deps)) {
      inClassTestTable = false;
      pendingPortion = undefined;
      return;
    }

    if (!line.includes('\t')) {
      if (!deps.inferCategory(line)) {
        appendPortion(rows.at(-1), line, deps);
      }
      return;
    }

    const cells = splitTableLine(line, deps.normalizeText);
    const dateParts = deps.extractDateParts(cells[0] ?? '');

    if (!dateParts) {
      const tail = deps.normalizeText(
        line.replace(/^\t+/, '').split('\t').filter(Boolean).join(' ')
      );
      const nextCells = splitTableLine(lines[lineIndex + 1] ?? '', deps.normalizeText);
      const nextDateParts = deps.extractDateParts(nextCells[0] ?? '');
      const nextHasDayColumn = Boolean(deps.extractVisibleWeekday(nextCells[1] ?? ''));
      const nextSubjectCellIndex = nextHasDayColumn ? 2 : 1;
      const nextSubject = deps.normalizeTableSubject(nextCells[nextSubjectCellIndex] ?? '');
      const nextPortionTitle = deps.normalizeText(
        nextCells.slice(nextSubjectCellIndex + 1).join(' ')
      );

      if (tail && nextDateParts && nextSubject && !nextPortionTitle) {
        pendingPortion = pendingPortion
          ? `${pendingPortion} ${tail}`.replace(/\s+/g, ' ').trim()
          : tail;
        return;
      }

      appendPortion(rows.at(-1), line, deps);
      return;
    }

    const hasDayColumn = Boolean(deps.extractVisibleWeekday(cells[1] ?? ''));
    const subjectCellIndex = hasDayColumn ? 2 : 1;
    const subject = deps.normalizeTableSubject(cells[subjectCellIndex] ?? '');
    const sameLinePortion = deps.normalizeText(cells.slice(subjectCellIndex + 1).join(' '));
    if (!subject) {
      return;
    }

    const portionDetails = [pendingPortion, sameLinePortion].filter(Boolean).join(' ');
    rows.push({
      childName,
      category: 'ClassTest',
      subject,
      title: `${subject} Class Test`,
      dueDate: dateParts.dueDate,
      description: portionDetails || line,
      parserIssue: dateParts.parserIssue,
    });
    pendingPortion = undefined;
  });

  return rows;
};
