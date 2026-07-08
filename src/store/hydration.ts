import type { ChildProfile, SchoolItem, UploadedDocument } from "@/types/domain";

export interface HydrationInput {
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  selectedChildIds: string[];
}

export interface HydrationResult {
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  selectedChildIds: string[];
}

export const hasInMemoryEntities = ({ children, items, documents }: HydrationInput) => {
  return children.length > 0 || items.length > 0 || documents.length > 0;
};

export const buildHydratedSnapshot = ({ children, items, documents, selectedChildIds }: HydrationInput): HydrationResult => {
  if (children.length === 0) {
    return {
      children,
      items,
      documents,
      selectedChildIds: [],
    };
  }

  const normalizedSelectedChildIds =
    selectedChildIds.length > 0 ? selectedChildIds.filter((id) => children.some((child) => child.id === id)) : children.map((child) => child.id);

  return {
    children,
    items,
    documents,
    selectedChildIds: normalizedSelectedChildIds,
  };
};
