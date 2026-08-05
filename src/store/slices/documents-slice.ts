import dayjs from 'dayjs';
import type { StateCreator } from 'zustand';
import { appRepository } from '@/db/repositories/app-repository';
import type { AppState, UploadedDocument } from '@/types/domain';
import {
  deleteCloudDocumentAndItems,
  upsertCloudDocument,
  withUpdatedAt,
} from '@/features/sync/services/cloud-sync';
import { runLocalThenCloud, warningHandlers } from '@/features/sync/services/entity-sync';
import { syncWarning } from '@/features/sync/services/sync-policy';

type DocumentsSlice = Pick<
  AppState,
  'documents' | 'importIssues' | 'addDocument' | 'deleteDocument'
>;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createDocumentsSlice: StateCreator<AppState, [], [], DocumentsSlice> = (set, get) => ({
  documents: [],
  importIssues: [],
  addDocument: (document: Omit<UploadedDocument, 'id' | 'uploadedAt'>) => {
    const existingDocument = get().documents.find(
      (entry) =>
        (document.fileHash && entry.fileHash === document.fileHash) ||
        (document.relativePath && entry.relativePath === document.relativePath) ||
        (document.fileName &&
          entry.fileName === document.fileName &&
          entry.title === document.title)
    );

    const newDoc: UploadedDocument = withUpdatedAt({
      ...document,
      id: existingDocument?.id ?? createId('doc'),
      uploadedAt: existingDocument?.uploadedAt ?? dayjs().toISOString(),
    });

    if (existingDocument) {
      const oldContent = { ...existingDocument };
      const newContent = { ...newDoc };
      delete oldContent.updatedAt;
      delete newContent.updatedAt;
      if (JSON.stringify(oldContent) === JSON.stringify(newContent)) {
        return;
      }
    }

    runLocalThenCloud({
      performLocal: () => appRepository.upsertDocument(newDoc),
      performCloud: () => upsertCloudDocument(newDoc, 'import'),
      ...warningHandlers(get().pushPersistenceWarning, syncWarning('document', 'upsert', 'either')),
    });

    set((state) => ({
      documents: [newDoc, ...state.documents.filter((entry) => entry.id !== newDoc.id)],
    }));
  },
  deleteDocument: (documentId: string) => {
    const document = get().documents.find((entry) => entry.id === documentId);
    const sourceDocumentIds = [documentId, document?.fileHash].filter((value): value is string =>
      Boolean(value)
    );
    const linkedItemIds = get()
      .items.filter(
        (item) =>
          (item.sourceDocumentId && sourceDocumentIds.includes(item.sourceDocumentId)) ||
          (item.sourceDocumentIds ?? []).some((sourceDocumentId) =>
            sourceDocumentIds.includes(sourceDocumentId)
          )
      )
      .map((item) => item.id);
    runLocalThenCloud({
      performLocal: () => appRepository.deleteDocumentAndItems(documentId, sourceDocumentIds),
      performCloud: () => deleteCloudDocumentAndItems(documentId, sourceDocumentIds, linkedItemIds),
      ...warningHandlers(get().pushPersistenceWarning, syncWarning('document', 'delete', 'either')),
    });
    set((state) => ({
      documents: state.documents.filter((entry) => entry.id !== documentId),
      items: state.items.filter(
        (item) =>
          !(
            (item.sourceDocumentId && sourceDocumentIds.includes(item.sourceDocumentId)) ||
            (item.sourceDocumentIds ?? []).some((sourceDocumentId) =>
              sourceDocumentIds.includes(sourceDocumentId)
            )
          )
      ),
    }));
  },
});
