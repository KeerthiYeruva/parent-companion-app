import { createHash } from "node:crypto";
import { classifyPlannerDocument } from "@/features/documents/services/planner-classifier";
import { extractMonthLabel } from "@/features/documents/services/month-extractor";
import type { FolderScanFile, PlannerExtractionSummary } from "@/features/documents/types/document-intelligence";

const extractChildHints = (relativePath: string, contentText?: string) => {
  const hints = new Set<string>();
  const gradeMatch = `${relativePath} ${contentText ?? ""}`.match(/grade\s*([0-9]+)/gi) ?? [];

  gradeMatch.forEach((match) => hints.add(match.trim()));

  return Array.from(hints);
};

export const buildFileHash = (file: FolderScanFile) => {
  return createHash("sha1").update(`${file.relativePath}|${file.size}|${file.modifiedAt}|${file.contentText ?? ""}`).digest("hex");
};

export const detectPlannerDocument = (file: FolderScanFile): PlannerExtractionSummary & { fileHash: string } => {
  const detectedType = classifyPlannerDocument(file.name, file.contentText);
  const monthLabel = extractMonthLabel(file.name, file.contentText);
  const childHints = extractChildHints(file.relativePath, file.contentText);
  const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();

  return {
    title,
    detectedType,
    monthLabel,
    childHints,
    fileHash: buildFileHash(file),
  };
};
