import dayjs from "dayjs";
import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import type { AppState, UploadedDocument } from "@/types/domain";

type DocumentsSlice = Pick<AppState, "documents" | "importIssues" | "addDocument">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createDocumentsSlice: StateCreator<AppState, [], [], DocumentsSlice> = (set, get) => ({
  documents: [],
  importIssues: [],
  addDocument: (document: Omit<UploadedDocument, "id" | "uploadedAt">) => {
    const newDoc = {
      ...document,
      id: createId("doc"),
      uploadedAt: dayjs().toISOString(),
    };

    appRepository.upsertDocument(newDoc).catch(() => {
      get().pushPersistenceWarning("Document could not be saved to local database.");
    });

    set((state) => ({
      documents: [newDoc, ...state.documents],
    }));
  },
});
