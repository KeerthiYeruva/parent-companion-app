import dayjs from "dayjs";
import type { StateCreator } from "zustand";
import { db } from "@/lib/db";
import type { AppState, UploadedDocument } from "@/types/domain";

type DocumentsSlice = Pick<AppState, "documents" | "importIssues" | "addDocument">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createDocumentsSlice: StateCreator<AppState, [], [], DocumentsSlice> = (set) => ({
  documents: [],
  importIssues: [],
  addDocument: (document: Omit<UploadedDocument, "id" | "uploadedAt">) => {
    const newDoc = {
      ...document,
      id: createId("doc"),
      uploadedAt: dayjs().toISOString(),
    };

    db.documents.put(newDoc).catch(() => {
      // Dexie sync is best-effort for local backups.
    });

    set((state) => ({
      documents: [newDoc, ...state.documents],
    }));
  },
});
