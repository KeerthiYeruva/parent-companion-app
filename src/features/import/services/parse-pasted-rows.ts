import type { RawImportRecord } from "@/features/import/types/import-types";

// Expected header: childName,category,title,dueDate,description
export const parsePastedRows = (input: string): RawImportRecord[] => {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => {
    const [childName = "", category = "", title = "", dueDate = "", description = ""] = line
      .split(",")
      .map((part) => part.trim());

    return {
      childName,
      category,
      title,
      dueDate,
      description,
    };
  });
};
