import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import { deriveStatus } from "@/lib/status";
import type { AppState, SchoolItem } from "@/types/domain";

type ItemsSlice = Pick<AppState, "items" | "addItem" | "toggleItemComplete">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createItemsSlice: StateCreator<AppState, [], [], ItemsSlice> = (set, get) => ({
  items: [],
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => {
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
});
