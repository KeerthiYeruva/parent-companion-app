import type { StateCreator } from 'zustand';
import { appRepository } from '@/db/repositories/app-repository';
import { scanRepository } from '@/db/repositories/scan-repository';
import { normalizeGrade } from '@/features/documents/services/child-alias-map';
import { rebuildImportedItemsForChildFromStoredScans } from '@/features/import/services/rebuild-import';
import type { AppState, ChildProfile } from '@/types/domain';
import {
  deleteCloudChildAndLinkedData,
  upsertCloudChild,
  withUpdatedAt,
} from '@/features/sync/services/cloud-sync';
import { runLocalThenCloud, warningHandlers } from '@/features/sync/services/entity-sync';
import { syncWarning } from '@/features/sync/services/sync-policy';

const childColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

type ChildrenSlice = Pick<AppState, 'children' | 'addChild' | 'updateChild' | 'deleteChild'>;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createChildrenSlice: StateCreator<AppState, [], [], ChildrenSlice> = (set, get) => ({
  children: [],
  addChild: (child: Omit<ChildProfile, 'id' | 'colorTag'>) => {
    const colorTag = childColors[get().children.length % childColors.length];
    const newChild = withUpdatedAt({ ...child, id: createId('child'), colorTag });

    runLocalThenCloud({
      performLocal: () => appRepository.upsertChild(newChild),
      performCloud: () => upsertCloudChild(newChild),
      ...warningHandlers(get().pushPersistenceWarning, syncWarning('child', 'create', 'either')),
    });

    set((state) => ({
      children: [...state.children, newChild],
    }));
  },
  updateChild: (id: string, updates: Omit<ChildProfile, 'id' | 'colorTag'>) => {
    const currentChild = get().children.find((child) => child.id === id);
    if (!currentChild) {
      return;
    }

    const candidate = { ...currentChild, ...updates };
    const oldContent = { ...currentChild };
    const newContent = { ...candidate };
    delete oldContent.updatedAt;
    delete newContent.updatedAt;
    if (JSON.stringify(oldContent) === JSON.stringify(newContent)) {
      return;
    }

    const nextChild = withUpdatedAt(candidate);
    const gradeChanged = normalizeGrade(currentChild.grade) !== normalizeGrade(candidate.grade);
    const nextChildren = get().children.map((child) => (child.id === id ? nextChild : child));

    set({ children: nextChildren });

    runLocalThenCloud({
      performLocal: () => appRepository.upsertChild(nextChild),
      performCloud: () => upsertCloudChild(nextChild),
      onCloudSuccess: () => {
        if (!gradeChanged) {
          return;
        }

        const state = get();
        void rebuildImportedItemsForChildFromStoredScans({
          childId: id,
          children: nextChildren,
          items: state.items,
          documents: state.documents,
          scanQueue: state.scanQueue,
          resolveScanFileByDocumentId: (documentId) =>
            scanRepository.getScanFileByDocumentId(documentId),
          replaceItemsForSourceDocuments: state.replaceItemsForSourceDocuments,
          pushWarning: state.pushPersistenceWarning,
        });
      },
      ...warningHandlers(get().pushPersistenceWarning, syncWarning('child', 'update', 'either')),
    });
  },
  deleteChild: (id: string) => {
    const state = get();
    const linkedItemIds = state.items.filter((item) => item.childId === id).map((item) => item.id);
    const documentsToDelete = state.documents.filter(
      (document) => document.childIds.includes(id) && document.childIds.length === 1
    );
    const documentsToUpdate = state.documents
      .filter((document) => document.childIds.includes(id) && document.childIds.length > 1)
      .map((document) =>
        withUpdatedAt({
          ...document,
          childIds: document.childIds.filter((childId) => childId !== id),
        })
      );

    runLocalThenCloud({
      performLocal: () =>
        appRepository.deleteChildAndLinkedData(
          id,
          linkedItemIds,
          documentsToDelete.map((document) => document.id),
          documentsToUpdate
        ),
      performCloud: () =>
        deleteCloudChildAndLinkedData({
          childId: id,
          linkedItemIds,
          documentIdsToDelete: documentsToDelete.map((document) => document.id),
          documentsToUpdate,
        }),
      ...warningHandlers(get().pushPersistenceWarning, syncWarning('child', 'delete', 'either')),
    });

    set((current) => {
      const children = current.children.filter((child) => child.id !== id);
      const selectedChildIds = current.selectedChildIds.filter((childId) => childId !== id);

      return {
        children,
        items: current.items.filter((item) => item.childId !== id),
        documents: [
          ...current.documents.filter(
            (document) =>
              !documentsToDelete.some((deleted) => deleted.id === document.id) &&
              !documentsToUpdate.some((updated) => updated.id === document.id)
          ),
          ...documentsToUpdate,
        ],
        selectedChildIds:
          selectedChildIds.length > 0 ? selectedChildIds : children[0] ? [children[0].id] : [],
      };
    });
  },
});
