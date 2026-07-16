import { useRef, useState } from 'react';
import type { DocumentType, ItemCategory, ItemStatus, PlannerBackup } from '@/types/domain';
import { useAppStore } from '@/store/use-app-store';

type StorageDiagnostics = {
  indexedDb: 'available' | 'unavailable';
  localStorageBytes: number;
  counts?: Record<string, number>;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const itemCategories = new Set<ItemCategory>([
  'Homework',
  'HomeStudy',
  'Activity',
  'ClassTest',
  'UnitTest',
  'Exam',
  'Project',
  'Circular',
]);
const itemStatuses = new Set<ItemStatus>(['Pending', 'Completed', 'Overdue', 'Upcoming', 'Past']);
const prepStatuses = new Set(['NotStarted', 'InProgress', 'Ready']);
const documentTypes = new Set<DocumentType>([
  'ScholasticPlanner',
  'CoScholasticPlanner',
  'UnitTestPortion',
  'ClassTestPortion',
  'ExamCircular',
  'HomeworkSchedule',
  'ActivitySchedule',
  'Circular',
]);

const isString = (value: unknown): value is string => typeof value === 'string';
const optionalString = (value: unknown) => value === undefined || isString(value);
const optionalNumber = (value: unknown) => value === undefined || typeof value === 'number';
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const isBackupChild = (value: unknown) =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.name) &&
  isString(value.grade) &&
  isString(value.section) &&
  isString(value.academicYear) &&
  isString(value.colorTag) &&
  optionalString(value.updatedAt);

const isBackupItem = (value: unknown) =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.childId) &&
  itemCategories.has(value.category as ItemCategory) &&
  isString(value.title) &&
  isString(value.dueDate) &&
  itemStatuses.has(value.status as ItemStatus) &&
  optionalString(value.subject) &&
  optionalString(value.description) &&
  optionalString(value.chapterNumber) &&
  optionalString(value.chapterName) &&
  optionalString(value.revisionNumber) &&
  optionalString(value.revisionWork) &&
  optionalString(value.homework) &&
  optionalString(value.pages) &&
  (value.prepStatus === undefined || prepStatuses.has(String(value.prepStatus))) &&
  optionalString(value.sourceDocumentId) &&
  (value.sourceDocumentIds === undefined || stringArray(value.sourceDocumentIds)) &&
  optionalNumber(value.sourcePage) &&
  optionalString(value.sourceText) &&
  optionalString(value.completedAt) &&
  optionalString(value.updatedAt);

const isBackupDocument = (value: unknown) =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.title) &&
  documentTypes.has(value.type as DocumentType) &&
  stringArray(value.childIds) &&
  isString(value.uploadedAt) &&
  optionalString(value.fileName) &&
  optionalNumber(value.fileSize) &&
  optionalString(value.fileHash) &&
  optionalString(value.relativePath) &&
  optionalString(value.modifiedAt) &&
  optionalString(value.extractedMonth) &&
  optionalString(value.updatedAt);

const isPlannerBackup = (value: unknown): value is PlannerBackup => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    isString(value.exportedAt) &&
    Array.isArray(value.children) &&
    value.children.every(isBackupChild) &&
    Array.isArray(value.items) &&
    value.items.every(isBackupItem) &&
    Array.isArray(value.documents) &&
    value.documents.every(isBackupDocument) &&
    stringArray(value.selectedChildIds)
  );
};

export function DataBackupPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const documents = useAppStore((state) => state.documents);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);
  const importBackupData = useAppStore((state) => state.importBackupData);
  const [message, setMessage] = useState<string>();
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics>();

  const exportData = () => {
    const backup: PlannerBackup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      children,
      items,
      documents,
      selectedChildIds,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parent-companion-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(
      `Exported ${children.length} child profile${children.length === 1 ? '' : 's'} and ${items.length} item${items.length === 1 ? '' : 's'}.`
    );
  };

  const importData = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isPlannerBackup(parsed)) {
        setMessage('This file is not a Parent Companion backup.');
        return;
      }

      await importBackupData(parsed);
      setMessage(
        `Imported ${parsed.children.length} child profile${parsed.children.length === 1 ? '' : 's'} and ${parsed.items.length} item${parsed.items.length === 1 ? '' : 's'}.`
      );
    } catch {
      setMessage('Backup import failed. Choose a valid JSON backup file.');
    }
  };

  const checkStorage = async () => {
    const localStorageBytes = localStorage.getItem('parent-companion-store')?.length ?? 0;

    if (!('indexedDB' in window)) {
      setDiagnostics({
        indexedDb: 'unavailable',
        localStorageBytes,
        message: 'IndexedDB is not available in this browser.',
      });
      return;
    }

    try {
      const request = indexedDB.open('parentCompanionDB');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
        request.onsuccess = () => resolve(request.result);
      });
      const storeNames = Array.from(database.objectStoreNames);
      const counts: Record<string, number> = {};

      await Promise.all(
        storeNames.map(
          (storeName) =>
            new Promise<void>((resolve, reject) => {
              const transaction = database.transaction(storeName, 'readonly');
              const countRequest = transaction.objectStore(storeName).count();
              countRequest.onerror = () =>
                reject(countRequest.error ?? new Error(`Could not count ${storeName}.`));
              countRequest.onsuccess = () => {
                counts[storeName] = countRequest.result;
                resolve();
              };
            })
        )
      );

      database.close();
      setDiagnostics({ indexedDb: 'available', localStorageBytes, counts });
    } catch (error) {
      setDiagnostics({
        indexedDb: 'unavailable',
        localStorageBytes,
        message: error instanceof Error ? error.message : 'IndexedDB check failed.',
      });
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Data & Backup</h3>
          <p className="text-sm text-slate-600">
            Export, import, and check planner data for this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportData}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export Data
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Import Data
          </button>
          <button
            type="button"
            onClick={() => void checkStorage()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Check Storage
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          void importData(input.files?.[0]).finally(() => {
            input.value = '';
          });
        }}
      />
      <p className="mt-3 text-sm text-slate-600">
        Current browser: {children.length} child profile{children.length === 1 ? '' : 's'},{' '}
        {items.length} item{items.length === 1 ? '' : 's'}, {documents.length} document
        {documents.length === 1 ? '' : 's'}.
      </p>
      {diagnostics ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">IndexedDB: {diagnostics.indexedDb}</p>
          {diagnostics.counts ? (
            <p className="mt-1">
              Saved records:{' '}
              {Object.entries(diagnostics.counts)
                .map(([name, count]) => `${name}: ${count}`)
                .join(' • ')}
            </p>
          ) : null}
          <p className="mt-1">Local settings: {diagnostics.localStorageBytes} bytes</p>
          {diagnostics.message ? (
            <p className="mt-1 text-amber-800">{diagnostics.message}</p>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p> : null}
    </section>
  );
}
