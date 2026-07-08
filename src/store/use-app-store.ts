"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { db } from "@/lib/db";
import { demoChildren, demoDocuments, demoItems } from "@/lib/seed";
import type { AppState } from "@/types/domain";
import { createChildrenSlice } from "@/store/slices/children-slice";
import { createItemsSlice } from "@/store/slices/items-slice";
import { createDocumentsSlice } from "@/store/slices/documents-slice";
import { createSelectionSlice } from "@/store/slices/selection-slice";

let hydrationPromise: Promise<void> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get, store) => ({
      ...createChildrenSlice(set, get, store),
      ...createItemsSlice(set, get, store),
      ...createDocumentsSlice(set, get, store),
      ...createSelectionSlice(set, get, store),
      seedDemoData: () => {
        const state = get();

        if (state.children.length > 0 || state.items.length > 0 || state.documents.length > 0) {
          db.children.bulkPut(state.children).catch(() => {
            // Dexie sync is best-effort for local backups.
          });
          db.items.bulkPut(state.items).catch(() => {
            // Dexie sync is best-effort for local backups.
          });
          db.documents.bulkPut(state.documents).catch(() => {
            // Dexie sync is best-effort for local backups.
          });
          return;
        }

        if (hydrationPromise) {
          return;
        }

        hydrationPromise = Promise.all([db.children.toArray(), db.items.toArray(), db.documents.toArray()])
          .then(([children, items, documents]) => {
            if (children.length > 0 || items.length > 0 || documents.length > 0) {
              const selectedChildIds =
                state.selectedChildIds.length > 0 ? state.selectedChildIds.filter((id) => children.some((child) => child.id === id)) : children.map((child) => child.id);

              set({
                children,
                items,
                documents,
                selectedChildIds,
              });
              return;
            }

            db.children.bulkPut(demoChildren).catch(() => {
              // Dexie sync is best-effort for local backups.
            });
            db.items.bulkPut(demoItems).catch(() => {
              // Dexie sync is best-effort for local backups.
            });
            db.documents.bulkPut(demoDocuments).catch(() => {
              // Dexie sync is best-effort for local backups.
            });

            set({
              children: demoChildren,
              items: demoItems,
              documents: demoDocuments,
              selectedChildIds: demoChildren.map((child) => child.id),
            });
          })
          .finally(() => {
            hydrationPromise = null;
          });
      },
    }),
    {
      name: "parent-companion-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedChildIds: state.selectedChildIds,
      }),
    },
  ),
);
