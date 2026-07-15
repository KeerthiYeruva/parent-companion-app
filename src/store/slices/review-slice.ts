import type { StateCreator } from 'zustand';
import type { AppState, ReviewDraftRecord } from '@/types/domain';

type ReviewSlice = Pick<
  AppState,
  | 'reviewDrafts'
  | 'reviewedDocumentIds'
  | 'upsertReviewDraft'
  | 'clearReviewDraftsForDocument'
  | 'markDocumentReviewed'
>;

export const createReviewSlice: StateCreator<AppState, [], [], ReviewSlice> = (set) => ({
  reviewDrafts: [],
  reviewedDocumentIds: [],
  upsertReviewDraft: (draft: ReviewDraftRecord) => {
    set((state) => ({
      reviewDrafts: [
        ...state.reviewDrafts.filter(
          (entry) => !(entry.documentId === draft.documentId && entry.rowIndex === draft.rowIndex)
        ),
        draft,
      ].sort((left, right) => left.rowIndex - right.rowIndex),
    }));
  },
  clearReviewDraftsForDocument: (documentId: string) => {
    set((state) => ({
      reviewDrafts: state.reviewDrafts.filter((entry) => entry.documentId !== documentId),
    }));
  },
  markDocumentReviewed: (documentId: string) => {
    set((state) => ({
      reviewedDocumentIds: state.reviewedDocumentIds.includes(documentId)
        ? state.reviewedDocumentIds
        : [...state.reviewedDocumentIds, documentId],
    }));
  },
});
