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

const isLegacyUndatedUnitTestPortionItem = (item: SchoolItem) => {
  return item.category === "UnitTest" && /^Unit Test Portion:/i.test(item.title);
};

const normalizeLegacyPlannerTitle = (item: SchoolItem): SchoolItem => {
  const match = item.title.match(/^\d{1,2}\s+(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\s+(.+)$/i);
  if (!match?.[1]) {
    return item;
  }

  const subject = item.subject ?? match[1].trim();
  return {
    ...item,
    subject,
    title: `Study ${subject}`,
  };
};

const dedupeItems = (items: SchoolItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [item.childId, item.category, item.subject ?? "", item.title, item.dueDate].join("|").toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const buildHydratedSnapshot = ({ children, items, documents, selectedChildIds }: HydrationInput): HydrationResult => {
  const visibleItems = dedupeItems(items.filter((item) => !isLegacyUndatedUnitTestPortionItem(item)).map(normalizeLegacyPlannerTitle));

  if (children.length === 0) {
    return {
      children,
      items: visibleItems,
      documents,
      selectedChildIds: [],
    };
  }

  const normalizedSelectedChildIds =
    selectedChildIds.length > 0 ? selectedChildIds.filter((id) => children.some((child) => child.id === id)) : children.map((child) => child.id);

  return {
    children,
    items: visibleItems,
    documents,
    selectedChildIds: normalizedSelectedChildIds,
  };
};
