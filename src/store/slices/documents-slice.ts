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
    const existingDocument = get().documents.find(
      (entry) =>
        (document.fileHash && entry.fileHash === document.fileHash) ||
        (document.relativePath && entry.relativePath === document.relativePath) ||
        (document.fileName && entry.fileName === document.fileName && entry.title === document.title),
    );

    const newDoc: UploadedDocument = {
      ...document,
      id: existingDocument?.id ?? createId("doc"),
      uploadedAt: existingDocument?.uploadedAt ?? dayjs().toISOString(),
    };

    appRepository.upsertDocument(newDoc).catch(() => {
      get().pushPersistenceWarning("Document could not be saved to local database.");
    });

    set((state) => ({
      documents: [newDoc, ...state.documents.filter((entry) => entry.id !== newDoc.id)],
    }));
  },
});
