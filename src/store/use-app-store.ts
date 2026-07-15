import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appRepository } from '@/db/repositories/app-repository';
import type { AppState } from '@/types/domain';
import { buildHydratedSnapshot, hasInMemoryEntities } from '@/store/hydration';
import { createChildrenSlice } from '@/store/slices/children-slice';
import { createItemsSlice } from '@/store/slices/items-slice';
import { createDocumentsSlice } from '@/store/slices/documents-slice';
import { createPersistenceSlice } from '@/store/slices/persistence-slice';
import { createReviewSlice } from '@/store/slices/review-slice';
import { createScanSlice } from '@/store/slices/scan-slice';
import { createSelectionSlice } from '@/store/slices/selection-slice';

let hydrationPromise: Promise<void> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get, store) => ({
      ...createChildrenSlice(set, get, store),
      ...createItemsSlice(set, get, store),
      ...createDocumentsSlice(set, get, store),
      ...createPersistenceSlice(set, get, store),
      ...createScanSlice(set, get, store),
      ...createReviewSlice(set, get, store),
      ...createSelectionSlice(set, get, store),
      hydrateLocalData: () => {
        const state = get();

        if (hasInMemoryEntities(state)) {
          appRepository.upsertChildren(state.children).catch(() => {
            get().pushPersistenceWarning('Children could not be saved to local database.');
          });
          appRepository.upsertItems(state.items).catch(() => {
            get().pushPersistenceWarning('Items could not be saved to local database.');
          });
          appRepository.upsertDocuments(state.documents).catch(() => {
            get().pushPersistenceWarning('Documents could not be saved to local database.');
          });
        }

        if (hydrationPromise) {
          return;
        }

        hydrationPromise = Promise.all([
          appRepository.listChildren(),
          appRepository.listItems(),
          appRepository.listDocuments(),
        ])
          .then(([children, items, documents]) => {
            if (children.length > 0 || items.length > 0 || documents.length > 0) {
              set(
                buildHydratedSnapshot({
                  children,
                  items,
                  documents,
                  selectedChildIds: state.selectedChildIds,
                })
              );
            }
          })
          .catch(() => {
            get().pushPersistenceWarning(
              'Local database is unavailable. Changes may stay in memory for this session.'
            );
          })
          .finally(() => {
            hydrationPromise = null;
          });
      },
    }),
    {
      name: 'parent-companion-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedChildIds: state.selectedChildIds,
        connectedFolderName: state.connectedFolderName,
        lastScanAt: state.lastScanAt,
        scanQueue: state.scanQueue,
        reviewDrafts: state.reviewDrafts,
        reviewedDocumentIds: state.reviewedDocumentIds,
        persistenceWarnings: state.persistenceWarnings,
      }),
    }
  )
);
