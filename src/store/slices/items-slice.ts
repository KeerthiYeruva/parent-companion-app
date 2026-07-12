import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import { deriveStatus } from "@/lib/status";
import { buildLogicalItemKey, mergeResolvedItemFields } from "@/features/import/services/import-content";
import type {
  AppState,
  ImportedItemReplacementScope,
  SchoolItem,
} from "@/types/domain";
import {
  syncAllLocalItemsToCloud,
  upsertCloudItem,
} from "@/features/import/services/cloud-sync";

type ItemsSlice = Pick<
  AppState,
  | "items"
  | "addItem"
  | "replaceItemsForSourceDocuments"
  | "toggleItemComplete"
  | "setItemPrepStatus"
>;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const itemKey = (
  item: Omit<SchoolItem, "id" | "status" | "completedAt"> | SchoolItem,
) => buildLogicalItemKey(item);

const dedupeByItemKey = <
  T extends Omit<SchoolItem, "id" | "status" | "completedAt"> | SchoolItem,
>(
  items: T[],
) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const mergeItems = (
  existing: SchoolItem,
  incoming: Omit<SchoolItem, "id" | "status" | "completedAt">,
): SchoolItem => {
  const mergedContent = mergeResolvedItemFields(
    {
      title: existing.title,
      description: existing.description,
      chapterNumber: existing.chapterNumber,
      chapterName: existing.chapterName,
      subject: existing.subject,
    },
    {
      title: incoming.title,
      description: incoming.description,
      chapterNumber: incoming.chapterNumber,
      chapterName: incoming.chapterName,
      subject: incoming.subject,
    },
  );
  const completedAt = existing.completedAt ?? undefined;

  return {
    ...existing,
    ...incoming,
    ...mergedContent,
    sourceDocumentId: incoming.sourceDocumentId ?? existing.sourceDocumentId,
    completedAt,
    status: deriveStatus(incoming.dueDate ?? existing.dueDate, completedAt),
  };
};

export const createItemsSlice: StateCreator<AppState, [], [], ItemsSlice> = (
  set,
  get,
) => ({
  items: [],
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => {
    const existing = get().items.find((entry) => itemKey(entry) === itemKey(item));
    const nextItem = existing
      ? mergeItems(existing, item)
      : {
          ...item,
          id: createId("item"),
          status: deriveStatus(item.dueDate),
        };

    appRepository.upsertItem(nextItem).catch(() => {
      get().pushPersistenceWarning(
        "New item could not be saved to local database.",
      );
    });

    void upsertCloudItem(nextItem).catch(() => {
      get().pushPersistenceWarning("New item could not be synced to cloud.");
    });

    set((state) => ({
      items: existing
        ? state.items.map((entry) =>
            itemKey(entry) === itemKey(item) ? nextItem : entry,
          )
        : [...state.items, nextItem],
    }));
  },
  replaceItemsForSourceDocuments: (
    sourceDocumentIds: string[],
    items: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>,
    scope?: ImportedItemReplacementScope,
  ) => {
    const sourceDocumentIdSet = new Set(sourceDocumentIds);
    const nextItems = dedupeByItemKey(items);

    set((state) => {
      const retainedItems = state.items.filter((item) => {
        if (item.sourceDocumentId && sourceDocumentIdSet.has(item.sourceDocumentId)) {
          return false;
        }

        if (
          scope &&
          item.sourceDocumentId &&
          scope.childIds.includes(item.childId) &&
          scope.categories.includes(item.category) &&
          item.dueDate >= scope.fromDate &&
          item.dueDate <= scope.toDate
        ) {
          return false;
        }

        return true;
      });

      const mergedItems = [...retainedItems];
      nextItems.forEach((incoming) => {
        const existingIndex = mergedItems.findIndex((entry) => itemKey(entry) === itemKey(incoming));
        if (existingIndex >= 0) {
          mergedItems[existingIndex] = mergeItems(mergedItems[existingIndex], incoming);
          return;
        }

        mergedItems.push({
          ...incoming,
          id: createId("item"),
          status: deriveStatus(incoming.dueDate),
        });
      });

      appRepository
        .replaceItemsForSourceDocuments(
          sourceDocumentIds,
          mergedItems,
          scope,
        )
        .then(() => syncAllLocalItemsToCloud())
        .catch(() => {
          get().pushPersistenceWarning(
            "Imported items could not be fully synced.",
          );
        });

      return {
        items: mergedItems,
      };
    });
  },
  toggleItemComplete: (id: string) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const completedAt = item.completedAt
          ? undefined
          : new Date().toISOString();
        const nextItem = {
          ...item,
          completedAt,
          status: deriveStatus(item.dueDate, completedAt),
        };

        appRepository.upsertItem(nextItem).catch(() => {
          get().pushPersistenceWarning(
            "Item update could not be saved to local database.",
          );
        });
        void upsertCloudItem(nextItem).catch(() => {
          get().pushPersistenceWarning(
            "Item update could not be synced to cloud.",
          );
        });

        return nextItem;
      }),
    }));
  },
  setItemPrepStatus: (
    id: string,
    prepStatus: NonNullable<SchoolItem["prepStatus"]>,
  ) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const completedAt =
          prepStatus === "Ready"
            ? (item.completedAt ?? new Date().toISOString())
            : undefined;
        const nextItem = {
          ...item,
          prepStatus,
          completedAt,
          status: deriveStatus(item.dueDate, completedAt),
        };

        appRepository.upsertItem(nextItem).catch(() => {
          get().pushPersistenceWarning(
            "Item update could not be saved to local database.",
          );
        });
        void upsertCloudItem(nextItem).catch(() => {
          get().pushPersistenceWarning(
            "Item update could not be synced to cloud.",
          );
        });

        return nextItem;
      }),
    }));
  },
});
