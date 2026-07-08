import type { StateCreator } from "zustand";
import { deriveStatus } from "@/lib/status";
import type { AppState, SchoolItem } from "@/types/domain";

type ItemsSlice = Pick<AppState, "items" | "addItem" | "toggleItemComplete">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createItemsSlice: StateCreator<AppState, [], [], ItemsSlice> = (set) => ({
  items: [],
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => {
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id: createId("item"),
          status: deriveStatus(item.dueDate),
        },
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
        return {
          ...item,
          completedAt,
          status: deriveStatus(item.dueDate, completedAt),
        };
      }),
    }));
  },
});
