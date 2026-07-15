import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { appRepository } from "@/db/repositories/app-repository";
import { firestore } from "@/lib/firebase";
import type {
  ChildProfile,
  DeletionRecord,
  SchoolItem,
  SyncEntityType,
  SyncQueueRecord,
  SyncReason,
  UploadedDocument,
} from "@/types/domain";

const familyId = import.meta.env.VITE_FIREBASE_FAMILY_ID;

const nowIso = () => new Date().toISOString();

const removeUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const logSync = (
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncQueueRecord["operation"],
  reason: SyncReason,
  skippedUnchanged = false,
) => {
  if (import.meta.env.DEV) {
    console.debug("[cloud-sync]", {
      entityType,
      entityId,
      operation,
      reason,
      skippedUnchanged,
    });
  }
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
};

const comparableEntity = (value: unknown) => JSON.stringify(canonicalize(value));

const documentMetadata = (document: UploadedDocument): UploadedDocument => ({
  id: document.id,
  title: document.title,
  type: document.type,
  childIds: document.childIds,
  uploadedAt: document.uploadedAt,
  fileName: document.fileName,
  fileSize: document.fileSize,
  fileHash: document.fileHash,
  relativePath: document.relativePath,
  modifiedAt: document.modifiedAt,
  extractedMonth: document.extractedMonth,
  updatedAt: document.updatedAt,
});

const cloudPayload = (
  entityType: SyncEntityType,
  payload: ChildProfile | SchoolItem | UploadedDocument,
) => entityType === "document" ? documentMetadata(payload as UploadedDocument) : payload;

const assertCloudReady = (): { db: Firestore; familyId: string } => {
  if (!firestore || !familyId) {
    throw new Error("Firebase cloud sync is not configured.");
  }

  return { db: firestore, familyId };
};

export const withUpdatedAt = <T extends { updatedAt?: string }>(
  entity: T,
  timestamp = nowIso(),
): T & { updatedAt: string } => ({
  ...entity,
  updatedAt: timestamp,
});

export const getEntityUpdatedAt = (entity: { updatedAt?: string; uploadedAt?: string }) =>
  entity.updatedAt ?? entity.uploadedAt ?? "1970-01-01T00:00:00.000Z";

export const isCloudNewer = <T extends { updatedAt?: string; uploadedAt?: string }>(
  local: T | undefined,
  cloud: T,
) => {
  if (!local) {
    return true;
  }

  return getEntityUpdatedAt(cloud) > getEntityUpdatedAt(local);
};

const entityCollectionName = (entityType: SyncEntityType) => {
  if (entityType === "child") return "children";
  if (entityType === "item") return "items";
  return "documents";
};

const deletionId = (entityType: SyncEntityType, entityId: string) =>
  `${entityType}:${entityId}`;

const buildQueueId = (entityType: SyncEntityType, entityId: string) =>
  `${entityType}:${entityId}`;

export const queueCloudUpsert = async (
  entityType: SyncEntityType,
  payload: ChildProfile | SchoolItem | UploadedDocument,
  reason: SyncReason = "user-change",
) => {
  const record: SyncQueueRecord = {
    id: buildQueueId(entityType, payload.id),
    entityType,
    entityId: payload.id,
    operation: "upsert",
    payload: cloudPayload(entityType, payload),
    updatedAt: getEntityUpdatedAt(payload),
    attempts: 0,
    reason,
  };

  await appRepository.upsertSyncQueueRecord(record);

  try {
    await writeQueuedOperation(record);
    await appRepository.deleteSyncQueueRecord(record.id);
  } catch (error) {
    await appRepository.upsertSyncQueueRecord({
      ...record,
      attempts: record.attempts + 1,
      lastError: error instanceof Error ? error.message : "Cloud write failed",
    });
    throw error;
  }
};

export const queueCloudDelete = async (
  entityType: SyncEntityType,
  entityId: string,
  sourceDocumentIds?: string[],
  reason: SyncReason = "user-change",
) => {
  const deletedAt = nowIso();
  const deletion: DeletionRecord = {
    id: deletionId(entityType, entityId),
    entityType,
    entityId,
    deletedAt,
    sourceDocumentIds,
  };
  const record: SyncQueueRecord = {
    id: buildQueueId(entityType, entityId),
    entityType,
    entityId,
    operation: "delete",
    sourceDocumentIds,
    updatedAt: deletedAt,
    attempts: 0,
    reason,
  };

  await appRepository.upsertDeletion(deletion);
  await appRepository.upsertSyncQueueRecord(record);

  try {
    await writeQueuedOperation(record);
    await appRepository.deleteSyncQueueRecord(record.id);
  } catch (error) {
    await appRepository.upsertSyncQueueRecord({
      ...record,
      attempts: record.attempts + 1,
      lastError: error instanceof Error ? error.message : "Cloud delete failed",
    });
    throw error;
  }
};

const writeQueuedOperation = async (
  record: SyncQueueRecord,
  executionReason: SyncReason = record.reason ?? "user-change",
) => {
  const { db, familyId: scopedFamilyId } = assertCloudReady();
  const collectionName = entityCollectionName(record.entityType);
  const reference = doc(db, "families", scopedFamilyId, collectionName, record.entityId);

  if (record.operation === "delete") {
    const deletion: DeletionRecord = {
      id: deletionId(record.entityType, record.entityId),
      entityType: record.entityType,
      entityId: record.entityId,
      deletedAt: record.updatedAt,
      sourceDocumentIds: record.sourceDocumentIds,
    };
    await setDoc(
      doc(db, "families", scopedFamilyId, "deletions", deletion.id),
      removeUndefined(deletion),
    );
    await deleteDoc(reference);
    logSync(record.entityType, record.entityId, record.operation, executionReason);
    return;
  }

  if (!record.payload) {
    throw new Error("Queued upsert is missing its payload.");
  }

  const payload = removeUndefined(cloudPayload(record.entityType, record.payload));
  const existingSnapshot = await getDoc(reference);
  if (existingSnapshot.exists()) {
    const existing = existingSnapshot.data() as typeof payload;
    if (
      getEntityUpdatedAt(existing) > record.updatedAt ||
      comparableEntity(existing) === comparableEntity(payload)
    ) {
      logSync(record.entityType, record.entityId, record.operation, executionReason, true);
      return;
    }
  }

  await setDoc(reference, payload);
  logSync(record.entityType, record.entityId, record.operation, executionReason);
};

export const retryQueuedCloudOperations = async () => {
  const queued = await appRepository.listSyncQueue();
  const syncedIds: string[] = [];

  for (const record of queued.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))) {
    try {
      await writeQueuedOperation(record, "retry");
      syncedIds.push(record.id);
    } catch (error) {
      await appRepository.upsertSyncQueueRecord({
        ...record,
        attempts: record.attempts + 1,
        lastError: error instanceof Error ? error.message : "Cloud sync failed",
      });
    }
  }

  await Promise.all(syncedIds.map((id) => appRepository.deleteSyncQueueRecord(id)));
  return { attempted: queued.length, synced: syncedIds.length };
};

const tombstoneBlocksEntity = (
  deletions: DeletionRecord[],
  entityType: SyncEntityType,
  entityId: string,
  entityUpdatedAt?: string,
) => {
  const tombstone = deletions.find(
    (entry) => entry.entityType === entityType && entry.entityId === entityId,
  );

  return Boolean(tombstone && tombstone.deletedAt >= (entityUpdatedAt ?? "1970-01-01T00:00:00.000Z"));
};

export const mergeCloudSnapshot = async ({
  children,
  items,
  documents,
  deletions,
}: {
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  deletions: DeletionRecord[];
}) => {
  const [localChildren, localItems, localDocuments, localDeletions] =
    await Promise.all([
      appRepository.listChildren(),
      appRepository.listItems(),
      appRepository.listDocuments(),
      appRepository.listDeletions(),
    ]);
  const allDeletions = [...localDeletions];
  deletions.forEach((deletion) => {
    const local = allDeletions.find((entry) => entry.id === deletion.id);
    if (!local || deletion.deletedAt > local.deletedAt) {
      allDeletions.push(deletion);
    }
  });

  const mergeEntities = <T extends { id: string; updatedAt?: string; uploadedAt?: string }>(
    local: T[],
    cloud: T[],
    entityType: SyncEntityType,
  ) => {
    const byId = new Map(local.map((entity) => [entity.id, entity]));
    cloud.forEach((entity) => {
      if (tombstoneBlocksEntity(allDeletions, entityType, entity.id, getEntityUpdatedAt(entity))) {
        byId.delete(entity.id);
        return;
      }

      if (isCloudNewer(byId.get(entity.id), entity)) {
        byId.set(entity.id, entity);
      }
    });

    Array.from(byId).forEach(([id, entity]) => {
      if (tombstoneBlocksEntity(allDeletions, entityType, id, getEntityUpdatedAt(entity))) {
        byId.delete(id);
      }
    });

    return Array.from(byId.values());
  };

  const mergedChildren = mergeEntities(localChildren, children, "child");
  const mergedItems = mergeEntities(localItems, items, "item");
  const mergedDocuments = mergeEntities(localDocuments, documents, "document");

  await Promise.all([
    appRepository.upsertChildren(mergedChildren),
    appRepository.upsertItems(mergedItems),
    appRepository.upsertDocuments(mergedDocuments),
    ...allDeletions.map((deletion) => appRepository.upsertDeletion(deletion)),
  ]);

  return {
    children: mergedChildren,
    items: mergedItems,
    documents: mergedDocuments,
  };
};

export const downloadCloudDataToLocal = async () => {
  const { db, familyId: scopedFamilyId } = assertCloudReady();
  const [childrenSnapshot, itemsSnapshot, documentsSnapshot, deletionsSnapshot] =
    await Promise.all([
      getDocs(collection(db, "families", scopedFamilyId, "children")),
      getDocs(collection(db, "families", scopedFamilyId, "items")),
      getDocs(collection(db, "families", scopedFamilyId, "documents")),
      getDocs(collection(db, "families", scopedFamilyId, "deletions")),
    ]);

  return mergeCloudSnapshot({
    children: childrenSnapshot.docs.map((entry) => entry.data() as ChildProfile),
    items: itemsSnapshot.docs.map((entry) => entry.data() as SchoolItem),
    documents: documentsSnapshot.docs.map((entry) => entry.data() as UploadedDocument),
    deletions: deletionsSnapshot.docs.map((entry) => entry.data() as DeletionRecord),
  });
};

export const uploadLocalDataToCloud = async () => {
  const { db, familyId: scopedFamilyId } = assertCloudReady();
  const [children, items, documents, deletions] = await Promise.all([
    appRepository.listChildren(),
    appRepository.listItems(),
    appRepository.listDocuments(),
    appRepository.listDeletions(),
  ]);
  const batch = writeBatch(db);
  children.forEach((child) => {
    batch.set(doc(db, "families", scopedFamilyId, "children", child.id), removeUndefined(child));
  });
  items.forEach((item) => {
    batch.set(doc(db, "families", scopedFamilyId, "items", item.id), removeUndefined(item));
  });
  documents.forEach((document) => {
    batch.set(doc(db, "families", scopedFamilyId, "documents", document.id), removeUndefined(document));
  });
  deletions.forEach((deletion) => {
    batch.set(doc(db, "families", scopedFamilyId, "deletions", deletion.id), removeUndefined(deletion));
  });
  await batch.commit();
  return {
    children: children.length,
    items: items.length,
    documents: documents.length,
  };
};

export const upsertCloudItem = (item: SchoolItem, reason?: SyncReason) =>
  queueCloudUpsert("item", item, reason);
export const upsertCloudChild = (child: ChildProfile) => queueCloudUpsert("child", child);
export const upsertCloudDocument = (document: UploadedDocument, reason?: SyncReason) =>
  queueCloudUpsert("document", document, reason);

export const deleteCloudDocumentAndItems = async (
  documentId: string,
  sourceDocumentIds: string[],
  linkedItemIds: string[] = [],
) => {
  await queueCloudDelete("document", documentId, sourceDocumentIds);
  await Promise.all(
    linkedItemIds.map((itemId) =>
      queueCloudDelete("item", itemId, sourceDocumentIds),
    ),
  );
};

export const deleteCloudChildAndLinkedData = async ({
  childId,
  linkedItemIds,
  documentIdsToDelete,
  documentsToUpdate,
}: {
  childId: string;
  linkedItemIds: string[];
  documentIdsToDelete: string[];
  documentsToUpdate: UploadedDocument[];
}) => {
  await queueCloudDelete("child", childId);
  await Promise.all([
    ...linkedItemIds.map((itemId) => queueCloudDelete("item", itemId)),
    ...documentIdsToDelete.map((documentId) =>
      queueCloudDelete("document", documentId, [documentId]),
    ),
    ...documentsToUpdate.map((document) => upsertCloudDocument(document)),
  ]);
};

export const startCloudSnapshotListeners = (
  onMergedSnapshot: (snapshot: {
    children: ChildProfile[];
    items: SchoolItem[];
    documents: UploadedDocument[];
  }) => void,
  onError?: (error: Error) => void,
): Unsubscribe | undefined => {
  if (!firestore || !familyId) {
    return undefined;
  }

  let children: ChildProfile[] = [];
  let items: SchoolItem[] = [];
  let documents: UploadedDocument[] = [];
  let deletions: DeletionRecord[] = [];
  let started = false;

  const merge = () => {
    if (!started) return;
    void mergeCloudSnapshot({ children, items, documents, deletions })
      .then(onMergedSnapshot)
      .catch((error: unknown) => {
        if (onError) onError(error instanceof Error ? error : new Error("Cloud merge failed"));
      });
  };

  const unsubscribeChildren = onSnapshot(
    collection(firestore, "families", familyId, "children"),
    (snapshot) => {
      children = snapshot.docs.map((entry) => entry.data() as ChildProfile);
      started = true;
      merge();
    },
    onError,
  );
  const unsubscribeItems = onSnapshot(
    collection(firestore, "families", familyId, "items"),
    (snapshot) => {
      items = snapshot.docs.map((entry) => entry.data() as SchoolItem);
      started = true;
      merge();
    },
    onError,
  );
  const unsubscribeDocuments = onSnapshot(
    collection(firestore, "families", familyId, "documents"),
    (snapshot) => {
      documents = snapshot.docs.map((entry) => entry.data() as UploadedDocument);
      started = true;
      merge();
    },
    onError,
  );
  const unsubscribeDeletions = onSnapshot(
    collection(firestore, "families", familyId, "deletions"),
    (snapshot) => {
      deletions = snapshot.docs.map((entry) => entry.data() as DeletionRecord);
      started = true;
      merge();
    },
    onError,
  );

  return () => {
    unsubscribeChildren();
    unsubscribeItems();
    unsubscribeDocuments();
    unsubscribeDeletions();
  };
};
