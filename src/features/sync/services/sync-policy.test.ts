import { describe, expect, it } from 'vitest';
import {
  itemSyncRetryPolicy,
  pendingSyncWarning,
  syncWarning,
} from '@/features/sync/services/sync-policy';

describe('sync policy', () => {
  it('returns mapped warnings for known operations', () => {
    expect(syncWarning('item', 'create', 'local')).toBe(
      'New item could not be saved to local database.'
    );
    expect(syncWarning('document', 'delete', 'either')).toBe(
      'Document could not be fully deleted.'
    );
  });

  it('falls back to generic warning for unknown combinations', () => {
    expect(syncWarning('item', 'delete', 'local')).toBe('A data sync operation failed.');
  });

  it('formats pending sync warnings', () => {
    expect(pendingSyncWarning(1)).toBe('1 change still could not be synced to cloud.');
    expect(pendingSyncWarning(3)).toBe('3 changes still could not be synced to cloud.');
  });

  it('defines a bounded retry policy', () => {
    expect(itemSyncRetryPolicy.maxAttempts).toBeGreaterThan(0);
    expect(itemSyncRetryPolicy.backoffMs.length).toBe(itemSyncRetryPolicy.maxAttempts);
  });
});
