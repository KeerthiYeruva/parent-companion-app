import dayjs from "dayjs";
import type { StateCreator } from "zustand";
import { appRepository } from "@/db/repositories/app-repository";
import type { AppState, UploadedDocument } from "@/types/domain";
import {
  deleteCloudDocumentAndItems,
  upsertCloudDocument,
} from "@/features/import/services/cloud-sync";

type DocumentsSlice = Pick<
  AppState,
  "documents" | "importIssues" | "addDocument" | "deleteDocument"
>;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createDocumentsSlice: StateCreator<
  AppState,
  [],
  [],
  DocumentsSlice
> = (set, get) => ({
  documents: [],
  importIssues: [],
  addDocument: (document: Omit<UploadedDocument, "id" | "uploadedAt">) => {
    const existingDocument = get().documents.find(
      (entry) =>
        (document.fileHash && entry.fileHash === document.fileHash) ||
        (document.relativePath &&
          entry.relativePath === document.relativePath) ||
        (document.fileName &&
          entry.fileName === document.fileName &&
          entry.title === document.title),
    );

    const newDoc: UploadedDocument = {
      ...document,
      id: existingDocument?.id ?? createId("doc"),
      uploadedAt: existingDocument?.uploadedAt ?? dayjs().toISOString(),
    };

    appRepository.upsertDocument(newDoc).catch(() => {
      get().pushPersistenceWarning(
        "Document could not be saved to local database.",
      );
    });

    void upsertCloudDocument(newDoc).catch(() => {
      get().pushPersistenceWarning("Document could not be synced to cloud.");
    });

    set((state) => ({
      documents: [
        newDoc,
        ...state.documents.filter((entry) => entry.id !== newDoc.id),
      ],
    }));
  },
  deleteDocument: (documentId: string) => {
    const document = get().documents.find((entry) => entry.id === documentId);
    const sourceDocumentIds = [documentId, document?.fileHash].filter(
      (value): value is string => Boolean(value),
    );
    void appRepository
      .deleteDocumentAndItems(documentId, sourceDocumentIds)
      .then(() => deleteCloudDocumentAndItems(documentId, sourceDocumentIds))
      .catch(() => {
        get().pushPersistenceWarning("Document could not be fully deleted.");
      });
    set((state) => ({
      documents: state.documents.filter((entry) => entry.id !== documentId),
      items: state.items.filter(
        (item) =>
          !(
            (item.sourceDocumentId &&
              sourceDocumentIds.includes(item.sourceDocumentId)) ||
            (item.sourceDocumentIds ?? []).some((sourceDocumentId) =>
              sourceDocumentIds.includes(sourceDocumentId),
            )
          ),
      ),
    }));
  },
});
