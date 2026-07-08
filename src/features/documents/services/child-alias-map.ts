import type { ChildProfile } from "@/types/domain";

const normalize = (value: string) => value.trim().toLowerCase();

export const buildChildAliasMap = (children: ChildProfile[]) => {
  const aliases: Record<string, string> = {};

  children.forEach((child) => {
    const grade = child.grade.trim();
    const normalizedName = normalize(child.name);
    const gradeAliases = [
      `grade ${grade}`,
      `grade${grade}`,
      `class ${grade}`,
      `class${grade}`,
      grade,
    ];

    aliases[normalizedName] = child.id;
    gradeAliases.forEach((alias) => {
      aliases[normalize(alias)] = child.id;
    });
  });

  return aliases;
};
