import type { RawImportRecord } from '@/features/import';

type ActivityExtractorDeps = {
  coScholasticSubjects: string[];
  knownSubjectPattern: string;
  normalizeText: (value: string) => string;
  buildDefaultDueDate: (defaultMonthLabel?: string, defaultYear?: string) => string;
  cleanExtractedSectionTitle: (value: string) => string;
  extractSectionBetweenHeaders: (
    text: string,
    subject: string,
    subjects: string[]
  ) => string | undefined;
  extractDateParts: (
    line: string
  ) => { dateToken: string; dueDate: string; parserIssue?: string } | undefined;
  isUnitTestDocument: (contentText: string, relativePath: string) => boolean;
};

const subjectActivitySubjects = [
  'Computer Science',
  'General Knowledge',
  'Social Studies',
  'Mathematics',
  'Science',
  'English',
  'Kannada',
  'Hindi',
  'Computer',
  'Math',
  'GK',
  'Talk the Talk',
  'CCA',
];

const subjectAliases: Record<string, string> = {
  computer: 'Computer Science',
  'computer science': 'Computer Science',
  gk: 'General knowledge',
  'general knowledge': 'General knowledge',
  cca: 'CCA',
  'talk the talk': 'Talk the Talk',
  math: 'Mathematics',
  mathematics: 'Mathematics',
  science: 'Science',
  english: 'English',
  hindi: 'Hindi',
  kannada: 'Kannada',
  'social studies': 'Social Studies',
};

const normalizeSubject = (value: string) => subjectAliases[value.toLowerCase()] ?? value;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const activitySubjectPattern = subjectActivitySubjects.map(escapeRegex).join('|');

const isDuplicateActivity = (rows: RawImportRecord[], next: RawImportRecord) =>
  rows.some(
    (row) =>
      row.category === next.category &&
      row.subject === next.subject &&
      row.title?.toLowerCase() === next.title?.toLowerCase()
  );

const pushUniqueActivity = (rows: RawImportRecord[], next: RawImportRecord) => {
  if (!next.title || isDuplicateActivity(rows, next)) {
    return;
  }
  rows.push(next);
};

const extractActivityTitle = (value: string, deps: ActivityExtractorDeps) => {
  const cleaned = deps.cleanExtractedSectionTitle(value.replace(/^\d+\.\s*/, ''));
  const colonLabel = cleaned.match(/^([^:]{3,60}):\s*(.+)$/);
  if (colonLabel?.[1] && /chart|project|activity|discussion|skill/i.test(colonLabel[1])) {
    return deps.cleanExtractedSectionTitle(colonLabel[1]);
  }

  const marked = cleaned.match(
    /(?:graded\s+)?(?:lab|creative|practical|map|art)?\s*activity(?:\s+and\s+group\s+discussion)?\s*[:\-�]?\s*(.+)$/i
  );
  if (marked?.[1]) {
    return deps.cleanExtractedSectionTitle(marked[1]);
  }

  return cleaned;
};

const splitNumberedActivities = (section: string, deps: ActivityExtractorDeps) => {
  const normalized = deps.normalizeText(section);
  const numbered = normalized.replace(/\s+(\d+\.)\s+/g, ' __ITEM__$1 ');
  const parts = numbered
    .split('__ITEM__')
    .map((part) => deps.normalizeText(part))
    .filter(Boolean);
  return parts.length > 1 ? parts : [normalized];
};

const extractSubjectActivityRows = (
  contentText: string,
  childName: string | undefined,
  defaultMonthLabel: string | undefined,
  defaultYear: string | undefined,
  deps: ActivityExtractorDeps
): RawImportRecord[] => {
  const flatText = deps.normalizeText(contentText);
  const headerMatch = flatText.match(
    /SUBJECT\s+ACTIVITIES\s+OF\s+THE\s+MONTH(?:\s*[-�]\s*[A-Z]+)?/i
  );
  if (!headerMatch?.index) {
    return [];
  }

  const stopMatch =
    /\b(?:We expect the child|BOOKS TO BE BROUGHT|Dear Parents|AUGUST MONTH\s*[-�]\s*DICTATION TEST WORDS|Innovation Day)\b/i.exec(
      flatText.slice(headerMatch.index + headerMatch[0].length)
    );
  const activityText = flatText.slice(
    headerMatch.index + headerMatch[0].length,
    stopMatch ? headerMatch.index + headerMatch[0].length + stopMatch.index : undefined
  );
  const subjectRegex = new RegExp(`\\b(?:${activitySubjectPattern})\\b`, 'gi');
  const matches = Array.from(activityText.matchAll(subjectRegex));
  const dueDate = deps.buildDefaultDueDate(defaultMonthLabel, defaultYear);
  const rows: RawImportRecord[] = [];

  const sections = matches.map((match, index) => {
    const rawSubject = match[0];
    const start = (match.index ?? 0) + rawSubject.length;
    const end = matches[index + 1]?.index ?? activityText.length;
    return { rawSubject, section: deps.cleanExtractedSectionTitle(activityText.slice(start, end)) };
  });

  for (let index = 0; index < sections.length - 1; index += 1) {
    const numberedIndex = sections[index].section.search(/\b1\.\s+Graded\b/i);
    if (numberedIndex > 0) {
      const moved = sections[index].section.slice(numberedIndex).trim();
      sections[index].section = sections[index].section.slice(0, numberedIndex).trim();
      sections[index + 1].section = `${moved} ${sections[index + 1].section}`.trim();
    }
  }

  sections.forEach(({ rawSubject, section }) => {
    if (/^(?:CCA|Talk the Talk)$/i.test(rawSubject) || !section) {
      return;
    }

    splitNumberedActivities(section, deps).forEach((part) => {
      const title = extractActivityTitle(part, deps);
      if (!title || /^(?:activity|project|pg)$/i.test(title)) {
        return;
      }
      const category =
        /\bproject\b/i.test(part) && !/\bactivity\b/i.test(part) ? 'Project' : 'Activity';
      pushUniqueActivity(rows, {
        childName,
        category,
        subject: normalizeSubject(rawSubject),
        title,
        dueDate,
        description: deps.cleanExtractedSectionTitle(part),
      });
    });
  });

  return rows;
};

const extractCoScholasticRows = (
  contentText: string,
  childName: string | undefined,
  defaultMonthLabel: string | undefined,
  defaultYear: string | undefined,
  deps: ActivityExtractorDeps
): RawImportRecord[] => {
  if (!/co\s*scholastic/i.test(contentText)) {
    return [];
  }

  const dueDate = deps.buildDefaultDueDate(defaultMonthLabel, defaultYear);
  return deps.coScholasticSubjects.flatMap((subject) => {
    const section = deps.extractSectionBetweenHeaders(
      contentText,
      subject,
      deps.coScholasticSubjects
    );
    const title = section ? deps.cleanExtractedSectionTitle(section) : undefined;
    if (!title) {
      return [];
    }

    return [
      {
        childName,
        category: 'Activity',
        subject,
        title,
        dueDate,
        description: `${subject}: ${title}`,
      },
    ];
  });
};

const extractScholasticActivityRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string,
  defaultMonthLabel: string | undefined,
  defaultYear: string | undefined,
  deps: ActivityExtractorDeps
): RawImportRecord[] => {
  if (deps.isUnitTestDocument(contentText, relativePath)) {
    return [];
  }
  if (!/scholastic\s+planner|activities\s+of\s+the\s+month/i.test(contentText)) {
    return [];
  }

  const flatText = deps.normalizeText(contentText);
  const dueDate = deps.buildDefaultDueDate(defaultMonthLabel, defaultYear);
  const rows: RawImportRecord[] = extractSubjectActivityRows(
    contentText,
    childName,
    defaultMonthLabel,
    defaultYear,
    deps
  );
  const labMatch = flatText.match(
    new RegExp(
      String.raw`Graded Lab activity\s*[-�]\s*([^]+?)(?=\s+(?:Chapter\s*-?\s*\d+\s+)?(?:${deps.knownSubjectPattern})\b|\s+Graded Project\b|\s+CCA\b|$)`,
      'i'
    )
  );
  const projectMatch = flatText.match(
    new RegExp(
      String.raw`Graded Project\s*[-�]\s*([^]+?)(?=\s+(?:${deps.knownSubjectPattern})\b|\s+CCA\b|\s+Talk the Talk\b|$)`,
      'i'
    )
  );
  const ccaMatch = flatText.match(
    /CCA\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s+([^]+?)(?=\s+Talk the Talk\b|$)/i
  );
  const talkMatch = flatText.match(
    /Talk the Talk\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s+([^]+?)(?=\s+(?:Innovation Day|Dear Parents|Books?\s+to\s+be\s+brought)\b|$)/i
  );

  if (labMatch?.[1]) {
    const title = deps.cleanExtractedSectionTitle(labMatch[1]);
    pushUniqueActivity(rows, {
      childName,
      category: 'Activity',
      subject: 'Mathematics',
      title,
      dueDate,
      description: `Graded Lab Activity: ${title}`,
    });
  }

  if (projectMatch?.[1]) {
    const title = deps.cleanExtractedSectionTitle(projectMatch[1]);
    pushUniqueActivity(rows, {
      childName,
      category: 'Project',
      subject: 'Science',
      title,
      dueDate,
      description: `Graded Project: ${title}`,
    });
  }

  Array.from(
    flatText.matchAll(
      /\bGraded\s+((?:Speaking|Listening|Lab|Practical|Map|Art|Creative)\s+Skills?|Lab\s+activity)\b/gi
    )
  ).forEach((match) => {
    if (rows.length > 0) {
      return;
    }
    const title = deps.cleanExtractedSectionTitle(match[0]);
    if (
      !title ||
      /lab\s+activity/i.test(title) ||
      rows.some((row) => row.category === 'Activity' && row.title === title)
    ) {
      return;
    }

    pushUniqueActivity(rows, {
      childName,
      category: 'Activity',
      title,
      dueDate,
      description: title,
    });
  });

  Array.from(
    flatText.matchAll(/\b(?:Graded\s+Project|Project\s*:)\b\s*[:\-�]?\s*([^.;\n]+)?/gi)
  ).forEach((match) => {
    const title = deps.cleanExtractedSectionTitle(match[1] ?? match[0]);
    if (!title || title === 'Project' || /detected|content|^pg$/i.test(title)) {
      return;
    }

    pushUniqueActivity(rows, {
      childName,
      category: 'Project',
      title: title === 'Project' ? 'Project' : title,
      dueDate,
      description: `Project: ${title}`,
    });
  });

  [ccaMatch, talkMatch].forEach((match) => {
    if (!match?.[1] || !match[2]) {
      return;
    }

    const dateParts = deps.extractDateParts(match[1]);
    pushUniqueActivity(rows, {
      childName,
      category: 'Activity',
      subject: match === ccaMatch ? 'CCA' : 'Talk the Talk',
      title: deps.cleanExtractedSectionTitle(match[2]),
      dueDate: dateParts?.dueDate ?? dueDate,
      description: deps.cleanExtractedSectionTitle(match[0]),
      parserIssue: dateParts?.parserIssue,
    });
  });

  return rows.filter((row) => Boolean(row.title));
};

export const extractActivityRows = (
  contentText: string,
  childName: string | undefined,
  relativePath: string,
  defaultMonthLabel: string | undefined,
  defaultYear: string | undefined,
  deps: ActivityExtractorDeps
): RawImportRecord[] => [
  ...extractCoScholasticRows(contentText, childName, defaultMonthLabel, defaultYear, deps),
  ...extractScholasticActivityRows(
    contentText,
    childName,
    relativePath,
    defaultMonthLabel,
    defaultYear,
    deps
  ),
];
