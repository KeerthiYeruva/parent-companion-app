import type { StateCreator } from "zustand";
import { db } from "@/lib/db";
import { deriveStatus } from "@/lib/status";
import type { AppState, SchoolItem } from "@/types/domain";

type ItemsSlice = Pick<AppState, "items" | "addItem" | "toggleItemComplete">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createItemsSlice: StateCreator<AppState, [], [], ItemsSlice> = (set) => ({
  items: [],
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => {
    const newItem = {
      ...item,
      id: createId("item"),
      status: deriveStatus(item.dueDate),
    };

    db.items.put(newItem).catch(() => {
      // Dexie sync is best-effort for local backups.
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

        db.items.put(nextItem).catch(() => {
          // Dexie sync is best-effort for local backups.
        });

        return nextItem;
      }),
    }));
  },
});
