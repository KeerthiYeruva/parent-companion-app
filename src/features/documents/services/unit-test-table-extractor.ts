import type { RawImportRecord } from '@/features/import';
import type { FixedTableExtractorDeps } from '@/features/documents/services/fixed-table-types';

export const isFixedUnitTestHeader = (line: string, normalizeText: (value: string) => string) => {
  const header = normalizeText(line)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return (
    /\bdate day\b/.test(header) &&
    /\bsubject\b/.test(header) &&
    !/\bclass\s*test\b/.test(header) &&
    !/\bhome\s*study\b/.test(header) &&
    !/\bs no\b/.test(header)
  );
};

const hasUnitTestTitle = (line: string, normalizeText: (value: string) => string) =>
  /\bunit\s*test\s*(?:i|1)\s+exam\s+timetable\b/i.test(
    normalizeText(line)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );

const splitTableLine = (line: string, normalizeText: (value: string) => string) =>
  line.split('\t').map((cell) => normalizeText(cell));

export const extractFixedUnitTestRows = (
  contentText: string,
  childName: string | undefined,
  deps: FixedTableExtractorDeps
): RawImportRecord[] => {
  const rows: RawImportRecord[] = [];
  let inUnitTestTable = false;

  contentText.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      return;
    }

    if (/class\\s+test\\s+and\\s+portions/i.test(deps.normalizeText(line))) {
      inUnitTestTable = false;
      return;
    }

    if (hasUnitTestTitle(line, deps.normalizeText)) {
      inUnitTestTable = true;
      return;
    }

    if (isFixedUnitTestHeader(line, deps.normalizeText)) {
      return;
    }

    if (
      !inUnitTestTable ||
      deps.isSchoolNoteLine(line) ||
      deps.isScholasticMatrixArtifactLine(line)
    ) {
      return;
    }

    if (!line.includes('\t')) {
      const dateParts = deps.extractDateParts(line);
      const scheduleSubject = deps.unitTestScheduleSubjects.find((entry) =>
        new RegExp('\\b' + entry.replace(/\s+/g, '\\s+') + '\\b', 'i').test(line)
      );
      if (dateParts && scheduleSubject) {
        const subject = deps.normalizeUnitTestSubject(scheduleSubject);
        rows.push({
          childName,
          category: 'UnitTest',
          subject,
          title: subject + ' Unit Test',
          dueDate: dateParts.dueDate,
          description: deps.normalizeText(line),
          parserIssue: dateParts.parserIssue,
        });
      }
      return;
    }

    const cells = splitTableLine(line, deps.normalizeText);
    const populatedCells = cells.filter(Boolean);
    const dateParts = deps.extractDateParts(populatedCells[0] ?? '');
    const subjectText = populatedCells.slice(1).join(' ');
    const scheduleSubject = deps.unitTestScheduleSubjects.find((entry) =>
      new RegExp('\\b' + entry.replace(/\s+/g, '\\s+') + '\\b', 'i').test(subjectText)
    );
    const subject = scheduleSubject ? deps.normalizeUnitTestSubject(scheduleSubject) : undefined;
    if (!dateParts || !subject) {
      return;
    }
    rows.push({
      childName,
      category: 'UnitTest',
      subject,
      title: `${subject} Unit Test`,
      dueDate: dateParts.dueDate,
      description: line,
      parserIssue: dateParts.parserIssue,
    });
  });

  return rows;
};
