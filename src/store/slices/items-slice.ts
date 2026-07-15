import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import { deriveStatus } from "@/lib/status";
import {
  buildImportKey,
  buildLogicalItemKey,
  mergeResolvedItemFields,
} from "@/features/import/services/import-content";
import type {
  AppState,
  ImportedItemReplacementScope,
  SchoolItem,
} from "@/types/domain";
import {
  queueCloudDelete,
  upsertCloudItem,
  withUpdatedAt,
} from "@/features/sync/services/cloud-sync";

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
    sourceDocumentIds: Array.from(
      new Set([
        ...(existing.sourceDocumentIds ?? []),
        ...(incoming.sourceDocumentIds ?? []),
        ...(existing.sourceDocumentId ? [existing.sourceDocumentId] : []),
        ...(incoming.sourceDocumentId ? [incoming.sourceDocumentId] : []),
      ]),
    ),
    completedAt,
    status: deriveStatus(incoming.dueDate ?? existing.dueDate, completedAt),
  };
};

const itemContent = (item: SchoolItem) => {
  const content = { ...item };
  delete content.updatedAt;
  return content;
};

const itemChanged = (left: SchoolItem, right: SchoolItem) =>
  JSON.stringify(itemContent(left)) !== JSON.stringify(itemContent(right));

export const createItemsSlice: StateCreator<AppState, [], [], ItemsSlice> = (
  set,
  get,
) => ({
  items: [],
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => {
    const existing = get().items.find(
      (entry) => itemKey(entry) === itemKey(item),
    );
    const nextItem = existing
      ? mergeItems(existing, item)
      : {
          ...item,
          id: createId("item"),
          status: deriveStatus(item.dueDate),
        };
    const stampedItem = existing && !itemChanged(existing, nextItem)
      ? existing
      : withUpdatedAt(nextItem);

    if (existing && stampedItem === existing) {
      return;
    }

    void appRepository.upsertItem(stampedItem)
      .then(() => {
        void upsertCloudItem(stampedItem)
          .then(() => {
            get().clearItemSync(stampedItem.id);
          })
          .catch(() => {
            get().queueItemSync(stampedItem.id);
            get().pushPersistenceWarning("New item could not be synced to cloud.");
          });
      })
      .catch(() => {
        get().pushPersistenceWarning("New item could not be saved to local database.");
      });

    set((state) => ({
      items: existing
        ? state.items.map((entry) =>
            itemKey(entry) === itemKey(item) ? stampedItem : entry,
          )
        : [...state.items, stampedItem],
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
      const isReplaceable = (item: SchoolItem) => {
        if (
          item.sourceDocumentId &&
          sourceDocumentIdSet.has(item.sourceDocumentId)
        ) {
          return true;
        }

        if (
          (item.sourceDocumentIds ?? []).some((sourceDocumentId) =>
            sourceDocumentIdSet.has(sourceDocumentId),
          )
        ) {
          return true;
        }

        if (
          scope &&
          item.sourceDocumentId &&
          scope.childIds.includes(item.childId) &&
          scope.categories.includes(item.category) &&
          item.dueDate >= scope.fromDate &&
          item.dueDate <= scope.toDate
        ) {
          return true;
        }

        return false;
      };

      const replaceableItems = state.items.filter(isReplaceable);
      const retainedItems = state.items.filter((item) => !isReplaceable(item));

      const mergedItems = [...retainedItems];
      const changedItems: SchoolItem[] = [];
      const reusedIds = new Set<string>();
      nextItems.forEach((incoming) => {
        const exactExisting = state.items.find(
          (entry) => !reusedIds.has(entry.id) && itemKey(entry) === itemKey(incoming),
        );
        const stableCandidates = exactExisting
          ? []
          : state.items.filter(
              (entry) =>
                !reusedIds.has(entry.id) &&
                buildImportKey(entry) === buildImportKey(incoming),
            );
        const existing = exactExisting ??
          (stableCandidates.length === 1 ? stableCandidates[0] : undefined);
        const existingIndex = existing
          ? mergedItems.findIndex((entry) => entry.id === existing.id)
          : -1;
        if (existing) reusedIds.add(existing.id);

        const nextItem = existing
          ? mergeItems(existing, incoming)
          : {
              ...incoming,
              id: createId("item"),
              status: deriveStatus(incoming.dueDate),
            };
        const reconciled = existing && !itemChanged(existing, nextItem)
          ? existing
          : withUpdatedAt(nextItem);

        if (existingIndex >= 0) {
          mergedItems[existingIndex] = reconciled;
          if (reconciled !== existing) changedItems.push(reconciled);
          return;
        }

        mergedItems.push(reconciled);
        if (reconciled !== existing) changedItems.push(reconciled);
      });

      const deletedItemIds = replaceableItems
        .filter((item) => !reusedIds.has(item.id))
        .map((item) => item.id);

      appRepository
        .applyItemImportChanges(changedItems, deletedItemIds)
        .then(() => Promise.all([
          ...changedItems.map((item) => upsertCloudItem(item, "import")),
          ...deletedItemIds.map((id) => queueCloudDelete("item", id, undefined, "import")),
        ]))
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
          updatedAt: new Date().toISOString(),
        };

        void appRepository.upsertItem(nextItem)
          .then(() => {
            void upsertCloudItem(nextItem)
              .then(() => {
                get().clearItemSync(nextItem.id);
              })
              .catch(() => {
                get().queueItemSync(nextItem.id);
                get().pushPersistenceWarning(
                  "Item update could not be synced to cloud.",
                );
              });
          })
          .catch(() => {
            get().pushPersistenceWarning(
              "Item update could not be saved to local database.",
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
          updatedAt: new Date().toISOString(),
        };

        void appRepository.upsertItem(nextItem)
          .then(() => {
            void upsertCloudItem(nextItem)
              .then(() => {
                get().clearItemSync(nextItem.id);
              })
              .catch(() => {
                get().queueItemSync(nextItem.id);
                get().pushPersistenceWarning(
                  "Item update could not be synced to cloud.",
                );
              });
          })
          .catch(() => {
            get().pushPersistenceWarning(
              "Item update could not be saved to local database.",
            );
          });

        return nextItem;
      }),
    }));
  },
});
