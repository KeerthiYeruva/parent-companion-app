import type { DocumentType } from "@/types/domain";

const classifierRules: Array<{ type: DocumentType; patterns: RegExp[] }> = [
  { type: "ScholasticPlanner", patterns: [/scholastic/i, /planner/i] },
  { type: "CoScholasticPlanner", patterns: [/co[-\s]?scholastic/i, /planner/i] },
  { type: "UnitTestPortion", patterns: [/unit\s*test/i, /portion/i] },
  { type: "ClassTestPortion", patterns: [/class\s*test/i, /portion/i] },
  { type: "ExamCircular", patterns: [/exam/i, /circular/i] },
  { type: "HomeworkSchedule", patterns: [/homework/i, /(sheet|schedule)/i] },
  { type: "ActivitySchedule", patterns: [/(activity|activities)/i, /(calendar|schedule)/i] },
  { type: "Circular", patterns: [/circular/i] },
];

export const classifyPlannerDocument = (fileName: string, contentText?: string): DocumentType | "Unknown" => {
  const haystack = `${fileName}\n${contentText ?? ""}`;

  for (const rule of classifierRules) {
    if (rule.patterns.every((pattern) => pattern.test(haystack))) {
      return rule.type;
    }
  }

  return "Unknown";
};
