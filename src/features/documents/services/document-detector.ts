import { classifyPlannerDocument } from "@/features/documents/services/planner-classifier";
import { extractMonthLabel } from "@/features/documents/services/month-extractor";
import type { FolderScanFile, PlannerExtractionSummary } from "@/features/documents/types/document-intelligence";

const extractChildHints = (relativePath: string, contentText?: string) => {
  const hints = new Set<string>();
  const gradeMatch = `${relativePath} ${contentText ?? ""}`.match(/grade\s*([0-9]+)/gi) ?? [];

  gradeMatch.forEach((match) => hints.add(match.trim()));

  return Array.from(hints);
};

const toHex = (bytes: Uint8Array) => {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

export const buildFileHash = async (file: FolderScanFile) => {
  const payload = `${file.relativePath}|${file.size}|${file.modifiedAt}|${file.contentText ?? ""}`;
  const encoded = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-1", encoded);
  return toHex(new Uint8Array(digest));
};

export const detectPlannerDocument = async (file: FolderScanFile): Promise<PlannerExtractionSummary & { fileHash: string }> => {
  const detectedType = classifyPlannerDocument(file.name, file.contentText);
  const monthLabel = extractMonthLabel(file.name, file.contentText);
  const childHints = extractChildHints(file.relativePath, file.contentText);
  const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  const fileHash = await buildFileHash(file);

  return {
    title,
    detectedType,
    monthLabel,
    childHints,
    fileHash,
  };
};
