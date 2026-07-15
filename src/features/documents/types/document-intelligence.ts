import type { DocumentType, UploadedDocument } from '@/types/domain';
import type { ImportPipelineResult } from '@/features/import';

export interface FolderScanFile {
  name: string;
  relativePath: string;
  size: number;
  modifiedAt: string;
  contentText?: string;
}

export interface FolderScanResult {
  title: string;
  fileName: string;
  relativePath: string;
  fileHash: string;
  modifiedAt: string;
  fileSize: number;
  detectedType: DocumentType | 'Unknown';
  monthLabel?: string;
  childHints: string[];
  status: 'new' | 'changed' | 'duplicate';
  importPreview?: ImportPipelineResult;
  extractionStatus?: 'success' | 'empty' | 'failed';
  extractionError?: string;
  extractedTextPreview?: string;
}

export interface PlannerExtractionSummary {
  monthLabel?: string;
  detectedType: DocumentType | 'Unknown';
  childHints: string[];
  title: string;
}

export interface StoredDocumentFingerprint extends UploadedDocument {
  fileHash?: string;
  relativePath?: string;
  modifiedAt?: string;
  extractedMonth?: string;
}
