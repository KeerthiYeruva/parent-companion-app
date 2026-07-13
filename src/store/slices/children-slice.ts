import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import type { AppState, ChildProfile } from "@/types/domain";
import { upsertCloudChild, withUpdatedAt } from "@/features/sync/services/cloud-sync";

const childColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

type ChildrenSlice = Pick<AppState, "children" | "addChild" | "updateChild">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createChildrenSlice: StateCreator<
  AppState,
  [],
  [],
  ChildrenSlice
> = (set, get) => ({
  children: [],
  addChild: (child: Omit<ChildProfile, "id" | "colorTag">) => {
    const colorTag = childColors[get().children.length % childColors.length];
    const newChild = withUpdatedAt({ ...child, id: createId("child"), colorTag });

    appRepository.upsertChild(newChild).catch(() => {
      get().pushPersistenceWarning(
        "New child could not be saved to local database.",
      );
    });
    void upsertCloudChild(newChild).catch(() => {
      get().pushPersistenceWarning("New child could not be synced to cloud.");
    });

    set((state) => ({
      children: [...state.children, newChild],
    }));
  },
  updateChild: (id: string, updates: Omit<ChildProfile, "id" | "colorTag">) => {
    set((state) => ({
      children: state.children.map((child) => {
        if (child.id !== id) {
          return child;
        }

        const nextChild = withUpdatedAt({ ...child, ...updates });
        appRepository.upsertChild(nextChild).catch(() => {
          get().pushPersistenceWarning(
            "Child profile could not be saved to local database.",
          );
        });
        void upsertCloudChild(nextChild).catch(() => {
          get().pushPersistenceWarning(
            "Child profile could not be synced to cloud.",
          );
        });

        return nextChild;
      }),
    }));
  },
});
