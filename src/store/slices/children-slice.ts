import type { StateCreator } from 'zustand';
import { appRepository } from '@/db/repositories/app-repository';
import type { AppState, ChildProfile } from '@/types/domain';
import {
  deleteCloudChildAndLinkedData,
  upsertCloudChild,
  withUpdatedAt,
} from '@/features/sync/services/cloud-sync';

const childColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

type ChildrenSlice = Pick<AppState, 'children' | 'addChild' | 'updateChild' | 'deleteChild'>;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createChildrenSlice: StateCreator<AppState, [], [], ChildrenSlice> = (set, get) => ({
  children: [],
  addChild: (child: Omit<ChildProfile, 'id' | 'colorTag'>) => {
    const colorTag = childColors[get().children.length % childColors.length];
    const newChild = withUpdatedAt({ ...child, id: createId('child'), colorTag });

    void appRepository
      .upsertChild(newChild)
      .then(() => upsertCloudChild(newChild))
      .catch(() => {
        get().pushPersistenceWarning('New child could not be saved or synced.');
      });

    set((state) => ({
      children: [...state.children, newChild],
    }));
  },
  updateChild: (id: string, updates: Omit<ChildProfile, 'id' | 'colorTag'>) => {
    set((state) => ({
      children: state.children.map((child) => {
        if (child.id !== id) {
          return child;
        }

        const candidate = { ...child, ...updates };
        const oldContent = { ...child };
        const newContent = { ...candidate };
        delete oldContent.updatedAt;
        delete newContent.updatedAt;
        if (JSON.stringify(oldContent) === JSON.stringify(newContent)) {
          return child;
        }
        const nextChild = withUpdatedAt(candidate);
        void appRepository
          .upsertChild(nextChild)
          .then(() => upsertCloudChild(nextChild))
          .catch(() => {
            get().pushPersistenceWarning('Child profile could not be saved or synced.');
          });

        return nextChild;
      }),
    }));
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

    void appRepository
      .deleteChildAndLinkedData(
        id,
        linkedItemIds,
        documentsToDelete.map((document) => document.id),
        documentsToUpdate
      )
      .then(() =>
        deleteCloudChildAndLinkedData({
          childId: id,
          linkedItemIds,
          documentIdsToDelete: documentsToDelete.map((document) => document.id),
          documentsToUpdate,
        })
      )
      .catch(() => {
        get().pushPersistenceWarning('Child could not be fully deleted.');
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
