export type ItemCategory =
  | "Homework"
  | "HomeStudy"
  | "Activity"
  | "ClassTest"
  | "UnitTest"
  | "Exam"
  | "Project"
  | "Circular";

export type ItemStatus =
  | "Pending"
  | "Completed"
  | "Overdue"
  | "Upcoming"
  | "Past";

export type DocumentType =
  | "ScholasticPlanner"
  | "CoScholasticPlanner"
  | "UnitTestPortion"
  | "ClassTestPortion"
  | "ExamCircular"
  | "HomeworkSchedule"
  | "ActivitySchedule"
  | "Circular";

export interface ChildProfile {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  colorTag: string;
}

export interface SchoolItem {
  id: string;
  childId: string;
  category: ItemCategory;
  subject?: string;
  title: string;
  description?: string;
  chapterNumber?: string;
  chapterName?: string;
  revisionNumber?: string;
  revisionWork?: string;
  homework?: string;
  pages?: string;
  dueDate: string;
  status: ItemStatus;
  prepStatus?: "NotStarted" | "InProgress" | "Ready";
  sourceDocumentId?: string;
  sourceDocumentIds?: string[];
  sourcePage?: number;
  sourceText?: string;
  completedAt?: string;
}

export interface UploadedDocument {
  id: string;
  title: string;
  type: DocumentType;
  childIds: string[];
  uploadedAt: string;
  fileName?: string;
  fileSize?: number;
  fileHash?: string;
  relativePath?: string;
  modifiedAt?: string;
  extractedMonth?: string;
}

export interface ImportIssue {
  id: string;
  documentId: string;
  rowIndex?: number;
  fieldName: string;
  issue: string;
  resolved: boolean;
  severity?: "blocking" | "warning" | "info";
}

export interface PlannerBackup {
  schemaVersion: 1;
  exportedAt: string;
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  selectedChildIds: string[];
}

export interface ScanSessionFileRecord {
  documentId: string;
  title: string;
  fileName: string;
  relativePath: string;
  fileHash: string;
  modifiedAt: string;
  fileSize: number;
  detectedType: DocumentType | "Unknown";
  monthLabel?: string;
  childHints: string[];
  status: "ready" | "partiallyReady" | "needsReview" | "changed" | "duplicate";
  scannedAt: string;
  scanRunId: string;

  rawRows?: ReviewDraftRecord[];
  importPreviewItems?: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>;
  importPreviewIssues?: ImportIssue[];
  importPreviewCategoryCounts?: Partial<Record<ItemCategory, number>>;
  skippedImportCount?: number;
  skippedImportReason?: string;
  confidence?: "high" | "review" | "low";
  importPreviewSummary?: {
    totalRecords: number;
    normalizedRecords: number;
    validRecords: number;
    issuesCount: number;
  };
  extractionStatus?: "success" | "empty" | "failed";
  extractionError?: string;
  extractedTextPreview?: string;
}

export interface ScanRunRecord {
  id: string;
  scannedAt: string;
  fileCount: number;
  newCount: number;
  changedCount: number;
  duplicateCount: number;
  reviewCount: number;
}

export interface ReviewDraftRecord {
  documentId: string;
  rowIndex: number;
  childName?: string;
  category?: string;
  subject?: string;
  title?: string;
  dueDate?: string;
  description?: string;
  sourceDocumentId?: string;
  sourceDocumentIds?: string[];
  parserIssue?: string;
}

export interface AppState {
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  importIssues: ImportIssue[];
  persistenceWarnings: string[];
  pendingItemSyncIds: string[];
  selectedChildIds: string[];
  connectedFolderName?: string;
  lastScanAt?: string;
  scanQueue: ScanSessionFileRecord[];
  scanHistory: ScanRunRecord[];
  reviewDrafts: ReviewDraftRecord[];
  reviewedDocumentIds: string[];
  pushPersistenceWarning: (message: string) => void;
  clearPersistenceWarnings: () => void;
  queueItemSync: (itemId: string) => void;
  clearItemSync: (itemId: string) => void;
  retryPendingItemSync: () => Promise<void>;
  importBackupData: (backup: PlannerBackup) => Promise<void>;
  setConnectedFolderName: (folderName: string) => void;
  setScanQueue: (files: ScanSessionFileRecord[], scannedAt: string) => void;
  updateScanFile: (
    documentId: string,
    updater: (file: ScanSessionFileRecord) => ScanSessionFileRecord,
  ) => void;
  hydrateScanFile: (
    documentId: string,
  ) => Promise<ScanSessionFileRecord | undefined>;
  clearScanQueue: () => void;
  hydrateScanHistory: () => Promise<void>;
  upsertReviewDraft: (draft: ReviewDraftRecord) => void;
  clearReviewDraftsForDocument: (documentId: string) => void;
  markDocumentReviewed: (documentId: string) => void;
  addChild: (child: Omit<ChildProfile, "id" | "colorTag">) => void;
  updateChild: (
    id: string,
    updates: Omit<ChildProfile, "id" | "colorTag">,
  ) => void;
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => void;
  replaceItemsForSourceDocuments: (
    sourceDocumentIds: string[],
    items: Array<Omit<SchoolItem, "id" | "status" | "completedAt">>,
    scope?: ImportedItemReplacementScope,
  ) => void;
  toggleItemComplete: (id: string) => void;
  setItemPrepStatus: (
    id: string,
    prepStatus: NonNullable<SchoolItem["prepStatus"]>,
  ) => void;
  addDocument: (document: Omit<UploadedDocument, "id" | "uploadedAt">) => void;
  deleteDocument: (documentId: string) => void;
  setSelectedChildIds: (childIds: string[]) => void;
  hydrateLocalData: () => void;
}

export interface ImportedItemReplacementScope {
  childIds: string[];
  categories: ItemCategory[];
  fromDate: string;
  toDate: string;
}
