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
}

export interface ImportIssue {
  id: string;
  documentId: string;
  fieldName: string;
  issue: string;
  resolved: boolean;
}

export interface AppState {
  children: ChildProfile[];
  items: SchoolItem[];
  documents: UploadedDocument[];
  importIssues: ImportIssue[];
  selectedChildIds: string[];
  addChild: (child: Omit<ChildProfile, "id" | "colorTag">) => void;
  addItem: (item: Omit<SchoolItem, "id" | "status" | "completedAt">) => void;
  toggleItemComplete: (id: string) => void;
  addDocument: (document: Omit<UploadedDocument, "id" | "uploadedAt">) => void;
  setSelectedChildIds: (childIds: string[]) => void;
  seedDemoData: () => void;
}
