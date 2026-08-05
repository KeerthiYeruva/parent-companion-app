export type FixedTableDateParts = {
  dateToken: string;
  dueDate: string;
  parserIssue?: string;
};

export type FixedTableExtractorDeps = {
  weekdayToken: string;
  monthNameToken: string;
  unitTestScheduleSubjects: string[];
  normalizeText: (value: string) => string;
  normalizeTableSubject: (value: string) => string | undefined;
  normalizeUnitTestSubject: (subject: string) => string;
  inferCategory: (value: string) => string | undefined;
  isSchoolNoteLine: (line: string) => boolean;
  isScholasticMatrixArtifactLine: (line: string) => boolean;
  extractDateParts: (line: string) => FixedTableDateParts | undefined;
  extractVisibleWeekday: (line: string) => string | undefined;
};
