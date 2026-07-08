import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import { deriveStatus } from "@/lib/status";
import type { AppState, ImportedItemReplacementScope, SchoolItem } from "@/types/domain";

type ItemsSlice = Pick<AppState, "items" | "addItem" | "replaceItemsForSourceDocuments" | "toggleItemComplete" | "setItemPrepStatus">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const itemKey = (item: Omit<SchoolItem, "id" | "status" | "completedAt"> | SchoolItem) => [
  item.childId,
  item.category,
  item.subject ?? "",
  item.title.trim().toLowerCase(),
  item.dueDate,
  item.sourceDocumentId ?? "",
].join("__");

export const createItemsSlice: StateCreator<AppState, [], [], ItemsSlice> = (set, get) => ({
  items: [],
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => {
    if (get().items.some((existing) => itemKey(existing) === itemKey(item))) {
      return;
    }

    const newItem = {
      ...item,
      id: createId("item"),
      status: deriveStatus(item.dueDate),
    };

    appRepository.upsertItem(newItem).catch(() => {
      get().pushPersistenceWarning("New item could not be saved to local database.");
    });

    set((state) => ({
      items: [...state.items, newItem],
    }));
  },
  replaceItemsForSourceDocuments: (sourceDocumentIds: string[], items: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>, scope?: ImportedItemReplacementScope) => {
    const sourceDocumentIdSet = new Set(sourceDocumentIds);
    const nextItems = items.map((item) => ({
      ...item,
      id: createId("item"),
      status: deriveStatus(item.dueDate),
    }));

    appRepository.replaceItemsForSourceDocuments(sourceDocumentIds, nextItems, scope).catch(() => {
      get().pushPersistenceWarning("Re-imported items could not be saved to local database.");
    });

    set((state) => ({
      items: [
        ...state.items.filter((item) => {
          if (item.sourceDocumentId && sourceDocumentIdSet.has(item.sourceDocumentId)) {
            return false;
          }

          if (scope && item.sourceDocumentId && scope.childIds.includes(item.childId) && scope.categories.includes(item.category) && item.dueDate >= scope.fromDate && item.dueDate <= scope.toDate) {
            return false;
          }

          return true;
        }),
        ...nextItems,
      ],
    }));
  },
  toggleItemComplete: (id: string) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const completedAt = item.completedAt ? undefined : new Date().toISOString();
        const nextItem = {
          ...item,
          completedAt,
          status: deriveStatus(item.dueDate, completedAt),
        };

        appRepository.upsertItem(nextItem).catch(() => {
          get().pushPersistenceWarning("Item update could not be saved to local database.");
        });

        return nextItem;
      }),
    }));
  },
  setItemPrepStatus: (id: string, prepStatus: NonNullable<SchoolItem["prepStatus"]>) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const completedAt = prepStatus === "Ready" ? (item.completedAt ?? new Date().toISOString()) : undefined;
        const nextItem = {
          ...item,
          prepStatus,
          completedAt,
          status: deriveStatus(item.dueDate, completedAt),
        };

        appRepository.upsertItem(nextItem).catch(() => {
          get().pushPersistenceWarning("Item update could not be saved to local database.");
        });

        return nextItem;
      }),
    }));
  },
});
