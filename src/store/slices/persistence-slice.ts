import type { StateCreator } from "zustand";
import type { AppState } from "@/types/domain";

type PersistenceSlice = Pick<AppState, "persistenceWarnings" | "pushPersistenceWarning" | "clearPersistenceWarnings">;

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
});
