import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { appRepository } from "@/db/repositories/app-repository";
import { firestore } from "@/lib/firebase";
import { ChildProfile, SchoolItem, UploadedDocument } from "@/types/domain";
const familyId = import.meta.env.VITE_FIREBASE_FAMILY_ID;
if (!familyId) {
  throw new Error("VITE_FIREBASE_FAMILY_ID is missing.");
}
const removeUndefined = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};
export const uploadLocalDataToCloud = async () => {
  const [children, items, documents] = await Promise.all([
    appRepository.listChildren(),
    appRepository.listItems(),
    appRepository.listDocuments(),
  ]);
  const batch = writeBatch(firestore);
  children.forEach((child) => {
    const reference = doc(
      collection(firestore, "families", familyId, "children"),
      child.id,
    );
    batch.set(reference, removeUndefined(child));
  });
  items.forEach((item) => {
    const reference = doc(
      collection(firestore, "families", familyId, "items"),
      item.id,
    );
    batch.set(reference, removeUndefined(item));
  });
  documents.forEach((document) => {
    const reference = doc(
      collection(firestore, "families", familyId, "documents"),
      document.id,
    );
    batch.set(reference, removeUndefined(document));
  });
  await batch.commit();
  return {
    children: children.length,
    items: items.length,
    documents: documents.length,
  };
};

export const downloadCloudDataToLocal = async () => {
  const [childrenSnapshot, itemsSnapshot, documentsSnapshot] =
    await Promise.all([
      getDocs(collection(firestore, "families", familyId, "children")),
      getDocs(collection(firestore, "families", familyId, "items")),
      getDocs(collection(firestore, "families", familyId, "documents")),
    ]);

  const children = childrenSnapshot.docs.map(
    (entry) => entry.data() as ChildProfile,
  );

  const items = itemsSnapshot.docs.map((entry) => entry.data() as SchoolItem);

  const documents = documentsSnapshot.docs.map(
    (entry) => entry.data() as UploadedDocument,
  );

  const hasCloudData =
    children.length > 0 || items.length > 0 || documents.length > 0;

  if (hasCloudData) {
    await appRepository.replaceSnapshot({
      children,
      items,
      documents,
    });
  }

  return {
    children,
    items,
    documents,
  };
};
export const upsertCloudItem = async (item: SchoolItem) => {
  const reference = doc(firestore, "families", familyId, "items", item.id);
  await setDoc(reference, removeUndefined(item));
};

export const syncAllLocalItemsToCloud = async () => {
  const localItems = await appRepository.listItems();
  const itemsCollection = collection(firestore, "families", familyId, "items");
  const cloudSnapshot = await getDocs(itemsCollection);
  const localItemIds = new Set(localItems.map((item) => item.id));
  const batch = writeBatch(firestore);
  cloudSnapshot.docs.forEach((cloudDocument) => {
    if (!localItemIds.has(cloudDocument.id)) {
      batch.delete(cloudDocument.ref);
    }
  });
  localItems.forEach((item) => {
    batch.set(doc(itemsCollection, item.id), removeUndefined(item));
  });
  await batch.commit();
};

export const upsertCloudChild = async (child: ChildProfile) => {
  const reference = doc(firestore, "families", familyId, "children", child.id);
  await setDoc(reference, removeUndefined(child));
};
export const upsertCloudDocument = async (document: UploadedDocument) => {
  const reference = doc(
    firestore,
    "families",
    familyId,
    "documents",
    document.id,
  );
  await setDoc(reference, removeUndefined(document));
};
export const deleteCloudDocumentAndItems = async (
  documentId: string,
  sourceDocumentIds: string[],
) => {
  const itemsCollection = collection(firestore, "families", familyId, "items");
  const itemsSnapshot = await getDocs(itemsCollection);
  const batch = writeBatch(firestore);
  itemsSnapshot.docs.forEach((itemDocument) => {
    const data = itemDocument.data() as {
      sourceDocumentId?: string;
      sourceDocumentIds?: string[];
    };
    if (
      (data.sourceDocumentId &&
        sourceDocumentIds.includes(data.sourceDocumentId)) ||
      (data.sourceDocumentIds ?? []).some((sourceDocumentId) =>
        sourceDocumentIds.includes(sourceDocumentId),
      )
    ) {
      batch.delete(itemDocument.ref);
    }
  });
  await batch.commit();
  await deleteDoc(
    doc(firestore, "families", familyId, "documents", documentId),
  );
};
