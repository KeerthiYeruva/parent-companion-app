import dayjs from 'dayjs';
import type { SchoolItem } from '@/types/domain';

const testCategories: SchoolItem['category'][] = ['ClassTest', 'UnitTest', 'Exam'];

const detailLabelPriority: Record<string, number> = {
  Homework: 0,
  Revision: 1,
};

export const itemTypeLabel = (category: SchoolItem['category']) => {
  if (category === 'ClassTest') return 'Class Test';
  if (category === 'UnitTest') return 'Unit Test';
  if (category === 'HomeStudy') return 'Home Study';
  return category.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const categoryGroupLabel = (category: SchoolItem['category']) => {
  if (testCategories.includes(category)) return 'Tests';
  if (category === 'Activity') return 'Activities';
  if (category === 'Project') return 'Projects';
  if (category === 'HomeStudy') return 'Study tasks';
  return category;
};

export const normalizeDisplayText = (value?: string) =>
  (value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(
      /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/g,
      ' '
    )
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const isEquivalentDisplayText = (first?: string, second?: string) =>
  Boolean(first && second && normalizeDisplayText(first) === normalizeDisplayText(second));

const containsEquivalentText = (container?: string, contained?: string) => {
  const normalizedContainer = normalizeDisplayText(container);
  const normalizedContained = normalizeDisplayText(contained);

  return Boolean(
    normalizedContainer && normalizedContained && normalizedContainer.includes(normalizedContained)
  );
};

const stripRawDateFragments = (value?: string) =>
  value
    ?.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, '')
    .replace(
      /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

const separatorBeforeColonPattern = () => {
  const slashS = `${String.fromCharCode(92)}s`;
  return new RegExp(`${slashS}+-${slashS}*:${slashS}*`, 'g');
};

const trimChapterSeparatorPattern = () => {
  const slashS = `${String.fromCharCode(92)}s`;
  return new RegExp(`[-:${slashS}]+$`, 'g');
};

const leadingChapterSeparatorPattern = () => {
  const slashS = `${String.fromCharCode(92)}s`;
  return new RegExp(`^[-:${slashS}]+`, 'g');
};

const cleanDisplayText = (value?: string) =>
  stripRawDateFragments(value)
    ?.replace(/[\u2012-\u2015]/g, '-')
    .replace(/[•]/g, '\n')
    .replace(/\bChapter\s*[-:]?\s*(\d+)/gi, 'Chapter $1')
    .replace(/\bUnit\s*Test\s*Portion\s*:?\s*/gi, 'Portions\n')
    .replace(separatorBeforeColonPattern(), ': ')
    .replace(/\s+:\s+/g, ': ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();

const questionRangePattern =
  /\b(?:Q|Question|Questions)\s*\.?\s*\d+\s*(?:[-\u2012-\u2015]\s*(?:Q\s*)?\d+)?\b/gi;

const extractQuestionRanges = (value: string) =>
  Array.from(value.matchAll(questionRangePattern)).map((match) =>
    match[0].replace(/\s+/g, '').replace(/[\u2012-\u2015]/g, '-')
  );

const detailLabel = (line: string, fallbackLabel: string) => {
  const normalized = line.toLowerCase();
  if (/revision\s*work|revision/.test(normalized)) return 'Revision';
  if (/home\s*work|homework/.test(normalized)) return 'Homework';
  return fallbackLabel;
};

const formatDetail = (line: string, fallbackLabel: string) => {
  const ranges = extractQuestionRanges(line);
  const label = detailLabel(line, fallbackLabel);

  if (ranges.length > 0) {
    return `${label}: ${ranges.join(', ')}`;
  }

  return line
    .replace(/^revision\s*work\s*:/i, 'Revision:')
    .replace(/^home\s*work\s*:/i, 'Homework:')
    .replace(/^homework\s*:/i, 'Homework:')
    .trim();
};

const splitChapterNameAndDetails = (chapterText: string) => {
  const firstRange = chapterText.search(questionRangePattern);

  if (firstRange < 0) {
    return {
      chapterName: chapterText.replace(trimChapterSeparatorPattern(), '').trim(),
      details: [] as string[],
    };
  }

  return {
    chapterName: chapterText.slice(0, firstRange).replace(trimChapterSeparatorPattern(), '').trim(),
    details: extractQuestionRanges(chapterText.slice(firstRange)),
  };
};

const parseDisplayParts = (value: string | undefined, fallbackDetailLabel: string) => {
  const cleaned = cleanDisplayText(value);
  const chapters: string[] = [];
  const details: string[] = [];
  const lines: string[] = [];

  if (!cleaned) {
    return { chapters, details, lines };
  }

  const hasPortions = /^portions\b/i.test(cleaned);
  if (hasPortions) {
    lines.push('Portions');
  }

  const chapterMatches = Array.from(
    cleaned.matchAll(/Chapter\s+(\d+)\s*[-:]?\s*([^]*?)(?=Chapter\s+\d+|$)/gi)
  );

  chapterMatches.forEach((match) => {
    const { chapterName, details: chapterDetails } = splitChapterNameAndDetails(
      match[2]?.replace(leadingChapterSeparatorPattern(), '').trim() ?? ''
    );
    const chapter = chapterName ? `Chapter ${match[1]} - ${chapterName}` : `Chapter ${match[1]}`;

    chapters.push(chapter);
    chapterDetails.forEach((detail) => {
      details.push(`${fallbackDetailLabel}: ${detail}`);
    });
  });

  cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^portions$/i.test(line))
    .filter((line) => !/^chapter\s+\d+/i.test(line))
    .forEach((line) => {
      if (extractQuestionRanges(line).length > 0 || /revision|home\s*work|homework/i.test(line)) {
        details.push(formatDetail(line, fallbackDetailLabel));
      } else if (!chapterMatches.length) {
        lines.push(line);
      }
    });

  return { chapters, details, lines };
};

const pushUnique = (target: string[], value?: string) => {
  if (!value) return;
  if (
    target.some(
      (existing) =>
        isEquivalentDisplayText(existing, value) || containsEquivalentText(existing, value)
    )
  ) {
    return;
  }

  const existingContainedByValue = target.findIndex((existing) =>
    containsEquivalentText(value, existing)
  );
  if (existingContainedByValue >= 0) {
    target.splice(existingContainedByValue, 1, value);
    return;
  }

  target.push(value);
};

const uniqueLines = (values: string[], suppressAgainst: string[] = []) => {
  const lines: string[] = [];

  values.forEach((value) => {
    if (
      suppressAgainst.some(
        (comparison) =>
          isEquivalentDisplayText(value, comparison) || containsEquivalentText(comparison, value)
      )
    ) {
      return;
    }

    pushUnique(lines, value);
  });

  return lines;
};

const sortDetails = (details: string[]) =>
  [...details].sort((first, second) => {
    const firstLabel = first.split(':')[0] ?? '';
    const secondLabel = second.split(':')[0] ?? '';
    const firstPriority = detailLabelPriority[firstLabel] ?? 10;
    const secondPriority = detailLabelPriority[secondLabel] ?? 10;
    return firstPriority - secondPriority || first.localeCompare(second);
  });

export const buildPlannerItemDisplay = (item: SchoolItem) => {
  const itemType = itemTypeLabel(item.category);
  const titleParts = parseDisplayParts(item.title, itemType);
  const descriptionParts = parseDisplayParts(item.description, itemType);
  const explicitChapter =
    item.chapterNumber || item.chapterName
      ? [item.chapterNumber ? `Chapter ${item.chapterNumber}` : undefined, item.chapterName]
          .filter(Boolean)
          .join(' - ')
      : undefined;
  const titleIsOnlyType = isEquivalentDisplayText(item.title, itemType);
  const titleStartsWithType = normalizeDisplayText(item.title).startsWith(
    normalizeDisplayText(itemType)
  );
  const isTest = testCategories.includes(item.category);

  const heading =
    isTest || titleIsOnlyType || titleStartsWithType
      ? itemType
      : (titleParts.chapters[0] ?? titleParts.lines[0] ?? cleanDisplayText(item.title) ?? itemType);

  const chapters = uniqueLines(
    [
      explicitChapter,
      ...(heading === itemType ? titleParts.chapters : titleParts.chapters.slice(1)),
      ...descriptionParts.chapters,
      ...descriptionParts.lines.filter((line) => /^portions$/i.test(line)),
    ].filter((value): value is string => Boolean(value)),
    [heading]
  );
  const details = uniqueLines(
    sortDetails([
      ...titleParts.details,
      ...descriptionParts.details,
      ...descriptionParts.lines.filter((line) => !/^portions$/i.test(line)),
    ]),
    [heading, ...chapters]
  );

  return {
    heading,
    chapter: chapters.join('\n') || undefined,
    description: details.join('\n') || undefined,
    date: dayjs(item.dueDate).format('ddd, DD MMM'),
    category: categoryGroupLabel(item.category),
    subject: item.subject,
  };
};
