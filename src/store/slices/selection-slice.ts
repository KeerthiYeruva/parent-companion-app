import type { StateCreator } from 'zustand';
import type { AppState } from '@/types/domain';

type SelectionSlice = Pick<AppState, 'selectedChildIds' | 'setSelectedChildIds'>;

export const createSelectionSlice: StateCreator<AppState, [], [], SelectionSlice> = (set) => ({
  selectedChildIds: [],
  setSelectedChildIds: (childIds: string[]) => {
    set({ selectedChildIds: childIds });
  },
});
