import type { ChildProfile } from "@/types/domain";

const normalize = (value: string) => value.trim().toLowerCase();

const romanToNumber: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
  xi: "11",
  xii: "12",
};

const numberToRoman = Object.entries(romanToNumber).reduce<Record<string, string>>((acc, [roman, number]) => {
  acc[number] = roman;
  return acc;
}, {});

export const normalizeGrade = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^(grade|class)[\s_-]*[-:]?[\s_-]*/i, "")
    .trim();

  return romanToNumber[normalized] ?? normalized;
};

const buildGradeTokens = (grade: string) => {
  const roman = numberToRoman[grade];
  return [grade, roman].filter(Boolean);
};

const buildGradeAliases = (grade: string) => {
  return buildGradeTokens(grade).flatMap((token) => [
    `grade ${token}`,
    `grade_${token}`,
    `grade-${token}`,
    `grade${token}`,
    `class ${token}`,
    `class_${token}`,
    `class-${token}`,
    `class${token}`,
  ]);
};

const buildSectionAliases = (grade: string, section: string) => {
  const normalizedSection = normalize(section);
  if (!normalizedSection) {
    return [];
  }

  return buildGradeTokens(grade).flatMap((token) => [
    `grade ${token} section ${normalizedSection}`,
    `grade ${token} sec ${normalizedSection}`,
    `grade ${token}-${normalizedSection}`,
    `grade${token}${normalizedSection}`,
    `class ${token} section ${normalizedSection}`,
    `class ${token} sec ${normalizedSection}`,
    `class ${token}-${normalizedSection}`,
    `class${token}${normalizedSection}`,
  ]);
};

export const buildChildAliasMap = (children: ChildProfile[]) => {
  const aliases: Record<string, string> = {};
  const childrenByGrade = children.reduce<Record<string, ChildProfile[]>>((acc, child) => {
    const grade = normalizeGrade(child.grade);
    if (!grade) {
      return acc;
    }

    acc[grade] = [...(acc[grade] ?? []), child];
    return acc;
  }, {});

  children.forEach((child) => {
    const normalizedName = normalize(child.name);
    const grade = normalizeGrade(child.grade);

    aliases[normalizedName] = child.id;
    buildSectionAliases(grade, child.section).forEach((alias) => {
      aliases[normalize(alias)] = child.id;
    });
  });

  Object.entries(childrenByGrade).forEach(([grade, gradeChildren]) => {
    if (gradeChildren.length !== 1) {
      return;
    }

    const [child] = gradeChildren;
    const gradeAliases = buildGradeAliases(grade);

    gradeAliases.filter(Boolean).forEach((alias) => {
      aliases[normalize(alias)] = child.id;
    });
  });

  return aliases;
};
