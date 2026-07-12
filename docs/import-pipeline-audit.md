# Import Pipeline Audit

Current flow:

1. PDF text is extracted in `src/features/documents/components/smart-folder-import.tsx` via `extractPdfText`.
2. Document type and child hints are detected in `src/features/documents/services/document-detector.ts`.
3. Source rows are extracted in `src/features/documents/services/planner-text-extractor.ts`.
4. Child assignment and grade expansion happen in `smart-folder-import.tsx` with `normalizeRowChildNames` and `classifyRowsByChildProfile`.
5. Subject normalization happens in `src/features/import/services/normalize-import.ts` and `src/features/import/services/import-content.ts`.
6. Related rows are resolved in `src/features/import/services/resolve-import.ts` before validation.
7. Final validation happens in `src/features/import/services/validate-import.ts`.
8. Final `SchoolItem` records are built in `src/features/import/services/build-items.ts`.
9. Imported items are merged by semantic key in `src/store/slices/items-slice.ts`.
10. User-facing scan status is derived from final blocking issues only, not parser warnings.

Row stages:

- Source rows: raw parser output from the PDF extractor.
- Resolved rows: normalized rows after subject canonicalization and schedule/portion merging.
- Final imported items: validated planner records persisted to the store and planner views.

Notes:

- Parser warnings are diagnostic only.
- Unit Test schedule + portion rows resolve by child, canonical subject, and item type.
- Duplicate imported items are merged by semantic key instead of title text.
- Import preview should use resolved items, not raw parser rows, except in diagnostics.
