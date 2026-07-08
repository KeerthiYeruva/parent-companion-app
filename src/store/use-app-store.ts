"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { demoChildren, demoDocuments, demoItems } from "@/lib/seed";
import type { AppState } from "@/types/domain";
import { createChildrenSlice } from "@/store/slices/children-slice";
import { createItemsSlice } from "@/store/slices/items-slice";
import { createDocumentsSlice } from "@/store/slices/documents-slice";
import { createSelectionSlice } from "@/store/slices/selection-slice";

export const useAppStore = create<AppState>()(
  persist(
    (set, get, store) => ({
      ...createChildrenSlice(set, get, store),
      ...createItemsSlice(set, get, store),
      ...createDocumentsSlice(set, get, store),
      ...createSelectionSlice(set, get, store),
      seedDemoData: () => {
        if (get().children.length > 0) {
          return;
        }

        set({
          children: demoChildren,
          items: demoItems,
          documents: demoDocuments,
          selectedChildIds: demoChildren.map((child) => child.id),
        });
      },
    }),
    {
      name: "parent-companion-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        children: state.children,
        items: state.items,
        documents: state.documents,
        importIssues: state.importIssues,
        selectedChildIds: state.selectedChildIds,
      }),
    },
  ),
);
