"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { appRepository } from "@/db/repositories/app-repository";
import { demoChildren, demoDocuments, demoItems } from "@/lib/seed";
import type { AppState } from "@/types/domain";
import { buildHydratedSnapshot, hasInMemoryEntities } from "@/store/hydration";
import { createChildrenSlice } from "@/store/slices/children-slice";
import { createItemsSlice } from "@/store/slices/items-slice";
import { createDocumentsSlice } from "@/store/slices/documents-slice";
import { createPersistenceSlice } from "@/store/slices/persistence-slice";
import { createSelectionSlice } from "@/store/slices/selection-slice";

let hydrationPromise: Promise<void> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get, store) => ({
      ...createChildrenSlice(set, get, store),
      ...createItemsSlice(set, get, store),
      ...createDocumentsSlice(set, get, store),
      ...createPersistenceSlice(set, get, store),
      ...createSelectionSlice(set, get, store),
      seedDemoData: () => {
        const state = get();

        if (hasInMemoryEntities(state)) {
          appRepository.upsertChildren(state.children).catch(() => {
            get().pushPersistenceWarning("Children could not be saved to local database.");
          });
          appRepository.upsertItems(state.items).catch(() => {
            get().pushPersistenceWarning("Items could not be saved to local database.");
          });
          appRepository.upsertDocuments(state.documents).catch(() => {
            get().pushPersistenceWarning("Documents could not be saved to local database.");
          });
          return;
        }

        if (hydrationPromise) {
          return;
        }

        hydrationPromise = Promise.all([appRepository.listChildren(), appRepository.listItems(), appRepository.listDocuments()])
          .then(([children, items, documents]) => {
            if (children.length > 0 || items.length > 0 || documents.length > 0) {
              set(buildHydratedSnapshot({ children, items, documents, selectedChildIds: state.selectedChildIds }));
              return;
            }

            appRepository.upsertChildren(demoChildren).catch(() => {
              get().pushPersistenceWarning("Default children could not be seeded into local database.");
            });
            appRepository.upsertItems(demoItems).catch(() => {
              get().pushPersistenceWarning("Default items could not be seeded into local database.");
            });
            appRepository.upsertDocuments(demoDocuments).catch(() => {
              get().pushPersistenceWarning("Default documents could not be seeded into local database.");
            });

            set(buildHydratedSnapshot({ children: demoChildren, items: demoItems, documents: demoDocuments, selectedChildIds: [] }));
          })
          .catch(() => {
            get().pushPersistenceWarning("Local database is unavailable. Showing in-memory defaults for this session.");
            set(buildHydratedSnapshot({ children: demoChildren, items: demoItems, documents: demoDocuments, selectedChildIds: [] }));
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
