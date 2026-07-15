import type { DocumentType } from '@/types/domain';

const documentTypeLabels: Record<DocumentType | 'Unknown', string> = {
  ScholasticPlanner: 'Scholastic Planner',
  CoScholasticPlanner: 'Co-Scholastic Planner',
  UnitTestPortion: 'Unit Test Portions',
  ClassTestPortion: 'Class Test Portions',
  ExamCircular: 'Exam Circular',
  HomeworkSchedule: 'Homework Schedule',
  ActivitySchedule: 'Activity Schedule',
  Circular: 'School Circular',
  Unknown: 'School Document',
};

const cleanFileStem = (value: string) => {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b20\d{2}\s*20\d{2}\b/g, '')
    .replace(/\b20\d{6}\b/g, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\btemplate\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractGradeLabel = (value: string) => {
  const normalized = value.replace(/[_-]+/g, ' ');
  const numeric = normalized.match(/\b(?:grade|class)\s*(\d{1,2})\b/i)?.[1];
  if (numeric) {
    return `Grade ${numeric}`;
  }

  const roman = normalized.match(/\b(?:grade|class)\s*(i{1,3}|iv|v|vi{0,3}|ix|x|xi|xii)\b/i)?.[1];
  return roman ? `Grade ${roman.toUpperCase()}` : undefined;
};

export const formatSchoolDocumentTitle = (
  fileName: string,
  detectedType: DocumentType | 'Unknown'
) => {
  const gradeLabel = extractGradeLabel(fileName);
  const typeLabel = documentTypeLabels[detectedType];
  const fallback = cleanFileStem(fileName)
    .replace(/\bgrade\s*\d{1,2}\b/gi, '')
    .replace(/\bclass\s*(?:\d{1,2}|i{1,3}|iv|v|vi{0,3}|ix|x|xi|xii)\b/gi, '')
    .replace(
      /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  return [gradeLabel, typeLabel === 'School Document' && fallback ? fallback : typeLabel]
    .filter(Boolean)
    .join(' ');
};
