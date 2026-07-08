import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import { buildHydratedSnapshot } from "@/store/hydration";
import type { AppState } from "@/types/domain";

type PersistenceSlice = Pick<AppState, "persistenceWarnings" | "pushPersistenceWarning" | "clearPersistenceWarnings" | "importBackupData">;

export const createPersistenceSlice: StateCreator<AppState, [], [], PersistenceSlice> = (set) => ({
  persistenceWarnings: [],
  pushPersistenceWarning: (message: string) => {
    set((state) => {
      if (state.persistenceWarnings.includes(message)) {
        return state;
      }

      return {
        persistenceWarnings: [...state.persistenceWarnings, message],
      };
    });
  },
  clearPersistenceWarnings: () => {
    set({ persistenceWarnings: [] });
  },
  importBackupData: async (backup) => {
    const snapshot = buildHydratedSnapshot(backup);
    await appRepository.replaceSnapshot(snapshot);
    set(snapshot);
  },
});
