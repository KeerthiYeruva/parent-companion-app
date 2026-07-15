export const cloudSyncStatusForError = (error: unknown) => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (code.includes('permission-denied') || message.includes('permission')) {
    return 'permissionDenied' as const;
  }

  if (code.includes('resource-exhausted') || message.includes('quota')) {
    return 'unavailable' as const;
  }

  return 'error' as const;
};
