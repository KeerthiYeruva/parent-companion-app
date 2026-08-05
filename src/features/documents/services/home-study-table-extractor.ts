import type { RawImportRecord } from '@/features/import';
import type { FixedTableExtractorDeps } from '@/features/documents/services/fixed-table-types';

export const isFixedHomeStudyHeader = (line: string, normalizeText: (value: string) => string) => {
  const header = normalizeText(line)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return (
    /\bs no\b/.test(header) &&
    /\bdate\b/.test(header) &&
    /\bday\b/.test(header) &&
    /\bsubject\b/.test(header) &&
    /\bhome\s*study\b/.test(header)
  );
};

const isHomeStudyBoundary = (line: string, deps: FixedTableExtractorDeps) =>
  new RegExp(
    String.raw`\b(?:${deps.monthNameToken}\s*:\s*WEEK\s*\d*|${deps.monthNameToken}\s+MONTH\b|ACTIVITIES\s+OF\s+THE\s+MONTH|SUBJECT\s+ACTIVITIES|CO\s*SCHOLASTIC|UNIT\s*TEST|CLASS\s*TEST(?:\s+AND)?\s+PORTIONS)\b`,
    'i'
  ).test(deps.normalizeText(line));

const splitTableLine = (line: string, normalizeText: (value: string) => string) =>
  line.split('\t').map((cell) => normalizeText(cell));

const parseLooseSubjectAndTitle = (value: string, deps: FixedTableExtractorDeps) => {
  const normalized = deps.normalizeText(value);
  const words = normalized.split(' ').filter(Boolean);
  for (let size = 2; size >= 1; size -= 1) {
    const subject = deps.normalizeTableSubject(words.slice(0, size).join(' '));
    if (subject) {
      return { subject, title: words.slice(size).join(' ').trim() };
    }
  }
  return { title: normalized };
};

const shouldAppendLooseHomeStudyContinuation = (
  row: RawImportRecord,
  line: string,
  normalizeText: (value: string) => string
) => {
  if (!row.title) {
    return true;
  }
  return /^(?:pg\.?\s*no\.?|read\b|home\s*study\s+pg\.?|chapter\b)/i.test(normalizeText(line));
};

const appendFixedContinuation = (
  rows: RawImportRecord[],
  line: string,
  normalizeText: (value: string) => string
) => {
  const tail = normalizeText(line.replace(/^\t+/, '').split('\t').filter(Boolean).join(' '));
  const lastRow = rows[rows.length - 1];
  if (!tail || !lastRow) {
    return;
  }
  lastRow.title = `${lastRow.title} ${tail}`.replace(/\s+/g, ' ').trim();
  lastRow.description = `${lastRow.description} ${tail}`.trim();
};

const findDateCell = (cells: string[], deps: FixedTableExtractorDeps) => {
  const dateIndex = cells.findIndex((cell) => Boolean(deps.extractDateParts(cell)));
  if (dateIndex < 0) {
    return undefined;
  }

  const dateParts = deps.extractDateParts(cells[dateIndex]);
  return dateParts ? { dateIndex, dateParts } : undefined;
};

const findSubjectCell = (cells: string[], deps: FixedTableExtractorDeps, startIndex = 0) => {
  for (let index = startIndex; index < cells.length; index += 1) {
    const subject = deps.normalizeTableSubject(cells[index] ?? '');
    if (subject) {
      return { subjectIndex: index, subject };
    }
  }

  return undefined;
};

const extractCellsTitleAfter = (
  cells: string[],
  startIndex: number,
  normalizeText: (value: string) => string
) => normalizeText(cells.slice(startIndex).join(' '));

const extractFixedHomeStudyRows = (
  contentText: string,
  childName: string | undefined,
  deps: FixedTableExtractorDeps
): RawImportRecord[] => {
  const rows: RawImportRecord[] = [];
  let inHomeStudyTable = false;
  let pendingDate: ReturnType<FixedTableExtractorDeps['extractDateParts']> | undefined;
  let pendingSubject: string | undefined;
  let pendingTitle: string | undefined;

  const takePendingTitle = () => {
    const title = pendingTitle;
    pendingTitle = undefined;
    return title;
  };

  const pushRow = (
    subject: string,
    dateParts: NonNullable<ReturnType<FixedTableExtractorDeps['extractDateParts']>>,
    title: string
  ) => {
    const normalizedTitle = deps.normalizeText(title);
    if (!normalizedTitle) {
      pendingDate = dateParts;
      pendingSubject = subject;
      return;
    }

    rows.push({
      childName,
      category: 'HomeStudy',
      subject,
      title: normalizedTitle,
      dueDate: dateParts.dueDate,
      description: normalizedTitle,
      parserIssue: dateParts.parserIssue,
    });
    pendingDate = undefined;
    pendingSubject = undefined;
  };

  contentText.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      return;
    }

    if (isFixedHomeStudyHeader(line, deps.normalizeText)) {
      inHomeStudyTable = true;
      pendingDate = undefined;
      pendingSubject = undefined;
      pendingTitle = undefined;
      return;
    }

    if (!inHomeStudyTable) {
      return;
    }

    if (deps.isSchoolNoteLine(line) || deps.isScholasticMatrixArtifactLine(line)) {
      return;
    }

    if (isHomeStudyBoundary(line, deps)) {
      inHomeStudyTable = false;
      pendingDate = undefined;
      pendingSubject = undefined;
      pendingTitle = undefined;
      return;
    }

    const cells = splitTableLine(line, deps.normalizeText);
    const dateCell = findDateCell(cells, deps);
    const subjectCell = findSubjectCell(cells, deps, dateCell ? dateCell.dateIndex + 1 : 0);

    if (pendingDate && subjectCell) {
      const title = extractCellsTitleAfter(cells, subjectCell.subjectIndex + 1, deps.normalizeText);
      pushRow(
        subjectCell.subject,
        pendingDate,
        [takePendingTitle(), title].filter(Boolean).join(' ')
      );
      return;
    }

    if (dateCell) {
      const subject = subjectCell?.subject ?? pendingSubject;
      const titleStart = subjectCell ? subjectCell.subjectIndex + 1 : dateCell.dateIndex + 1;
      const titleCells = cells.slice(titleStart).filter(Boolean);
      if (!subjectCell && deps.extractVisibleWeekday(titleCells[0] ?? '')) {
        titleCells.shift();
      }
      const title = deps.normalizeText(titleCells.join(' '));

      if (!subject) {
        pendingDate = dateCell.dateParts;
        return;
      }

      pushRow(subject, dateCell.dateParts, [takePendingTitle(), title].filter(Boolean).join(' '));
      return;
    }

    if (subjectCell && !pendingDate) {
      pendingSubject = subjectCell.subject;
      const title = extractCellsTitleAfter(cells, subjectCell.subjectIndex + 1, deps.normalizeText);
      if (title) {
        pendingTitle = pendingTitle ? `${pendingTitle} ${title}` : title;
      }
      return;
    }

    const tail = deps.normalizeText(line.replace(/^\t+/, '').split('\t').filter(Boolean).join(' '));
    if (tail && pendingDate && pendingSubject) {
      pushRow(pendingSubject, pendingDate, [takePendingTitle(), tail].filter(Boolean).join(' '));
      return;
    }

    if (tail && !pendingDate && /^deepa\b/i.test(tail)) {
      appendFixedContinuation(rows, line, deps.normalizeText);
      return;
    }

    if (
      tail &&
      !pendingDate &&
      /^(?:do\b|pg\s*\.?\s*no\.?|practice\b|read\b|learn\b|chapter\b)/i.test(tail)
    ) {
      pendingTitle = pendingTitle ? `${pendingTitle} ${tail}` : tail;
      return;
    }

    appendFixedContinuation(rows, line, deps.normalizeText);
  });

  return rows;
};

const extractLooseHomeStudyRows = (
  contentText: string,
  childName: string | undefined,
  deps: FixedTableExtractorDeps
): RawImportRecord[] => {
  const rows: RawImportRecord[] = [];
  let inHomeStudyTable = false;
  let activeRow: RawImportRecord | undefined;
  const rowPattern = new RegExp(
    `^\\d+\\s+(\\d{1,2}\\s*[./-]\\s*\\d{1,2}\\s*[./-]\\s*\\d{4})\\s+${deps.weekdayToken}\\s+(.+)$`,
    'i'
  );

  const flushActiveRow = () => {
    if (activeRow?.title) {
      rows.push({
        ...activeRow,
        title: deps.normalizeText(activeRow.title),
        description: deps.normalizeText(activeRow.description ?? activeRow.title),
      });
    }
    activeRow = undefined;
  };

  contentText.split(/\r?\n/).forEach((rawLine) => {
    const line = deps.normalizeText(rawLine);
    if (!line) {
      return;
    }

    if (isFixedHomeStudyHeader(line, deps.normalizeText)) {
      flushActiveRow();
      inHomeStudyTable = true;
      return;
    }

    if (!inHomeStudyTable) {
      return;
    }

    if (isHomeStudyBoundary(line, deps)) {
      flushActiveRow();
      inHomeStudyTable = false;
      return;
    }

    const rowMatch = line.match(rowPattern);
    if (rowMatch?.[1] && rowMatch[2]) {
      flushActiveRow();
      const dateParts = deps.extractDateParts(rowMatch[1].replace(/\s+/g, ''));
      const parsed = parseLooseSubjectAndTitle(rowMatch[2], deps);
      if (!dateParts || !parsed.subject) {
        return;
      }
      activeRow = {
        childName,
        category: 'HomeStudy',
        subject: parsed.subject,
        title: parsed.title,
        dueDate: dateParts.dueDate,
        description: parsed.title,
        parserIssue: dateParts.parserIssue,
      };
      return;
    }

    if (!activeRow || deps.isSchoolNoteLine(line) || deps.isScholasticMatrixArtifactLine(line)) {
      return;
    }

    if (!activeRow.subject) {
      const parsed = parseLooseSubjectAndTitle(line, deps);
      if (parsed.subject) {
        activeRow.subject = parsed.subject;
        activeRow.title = parsed.title;
        activeRow.description = parsed.title;
      }
      return;
    }

    if (!shouldAppendLooseHomeStudyContinuation(activeRow, line, deps.normalizeText)) {
      return;
    }

    activeRow.title = `${activeRow.title} ${line}`.replace(/\s+/g, ' ').trim();
    activeRow.description = `${activeRow.description ?? ''} ${line}`.trim();
  });

  flushActiveRow();
  return rows;
};

export const extractHomeStudyRows = (
  contentText: string,
  childName: string | undefined,
  deps: FixedTableExtractorDeps
) => {
  const fixedRows = extractFixedHomeStudyRows(contentText, childName, deps);
  return fixedRows.length > 0 ? fixedRows : extractLooseHomeStudyRows(contentText, childName, deps);
};
