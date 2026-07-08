export type ItemCategory =
  | "Homework"
  | "HomeStudy"
  | "Activity"
  | "ClassTest"
  | "UnitTest"
  | "Exam"
  | "Project"
  | "Circular";

export type ItemStatus = "Pending" | "Completed" | "Overdue" | "Upcoming" | "Past";

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
  dueDate: string;
  status: ItemStatus;
  prepStatus?: "NotStarted" | "InProgress" | "Ready";
  sourceDocumentId?: string;
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
  status: "new" | "changed" | "duplicate" | "review";
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
  parserIssue?: string;
}

export interface AppState {
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  importIssues: ImportIssue[];
  persistenceWarnings: string[];
  selectedChildIds: string[];
  connectedFolderName?: string;
  lastScanAt?: string;
  scanQueue: ScanSessionFileRecord[];
  scanHistory: ScanRunRecord[];
  reviewDrafts: ReviewDraftRecord[];
  reviewedDocumentIds: string[];
  pushPersistenceWarning: (message: string) => void;
  clearPersistenceWarnings: () => void;
  setConnectedFolderName: (folderName: string) => void;
  setScanQueue: (files: ScanSessionFileRecord[], scannedAt: string) => void;
  updateScanFile: (documentId: string, updater: (file: ScanSessionFileRecord) => ScanSessionFileRecord) => void;
  hydrateScanFile: (documentId: string) => Promise<ScanSessionFileRecord | undefined>;
  clearScanQueue: () => void;
  hydrateScanHistory: () => Promise<void>;
  upsertReviewDraft: (draft: ReviewDraftRecord) => void;
  clearReviewDraftsForDocument: (documentId: string) => void;
  markDocumentReviewed: (documentId: string) => void;
  addChild: (child: Omit<ChildProfile, "id" | "colorTag">) => void;
  updateChild: (id: string, updates: Omit<ChildProfile, "id" | "colorTag">) => void;
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => void;
  toggleItemComplete: (id: string) => void;
  setItemPrepStatus: (id: string, prepStatus: NonNullable<SchoolItem["prepStatus"]>) => void;
  addDocument: (document: Omit<UploadedDocument, "id" | "uploadedAt">) => void;
  setSelectedChildIds: (childIds: string[]) => void;
  hydrateLocalData: () => void;
}
