export type SyncEntity = 'child' | 'item' | 'document' | 'backup' | 'import';
export type SyncAction = 'create' | 'update' | 'delete' | 'upsert';
export type SyncFailureStage = 'local' | 'cloud' | 'either';

interface SyncRetryPolicy {
  maxAttempts: number;
  backoffMs: number[];
}

export const itemSyncRetryPolicy: SyncRetryPolicy = {
  maxAttempts: 5,
  backoffMs: [0, 1000, 5000, 15000, 30000],
};

const warningByKey: Record<string, string> = {
  'child:create:either': 'New child could not be saved or synced.',
  'child:update:either': 'Child profile could not be saved or synced.',
  'child:delete:either': 'Child could not be fully deleted.',

  'document:upsert:either': 'Document could not be saved or synced.',
  'document:delete:either': 'Document could not be fully deleted.',

  'item:create:local': 'New item could not be saved to local database.',
  'item:create:cloud': 'New item could not be synced to cloud.',
  'item:update:local': 'Item update could not be saved to local database.',
  'item:update:cloud': 'Item update could not be synced to cloud.',

  'import:update:cloud': 'Imported items could not be fully synced.',
  'backup:update:cloud': 'Backup data could not be synced to cloud.',
};

export const syncWarning = (
  entity: SyncEntity,
  action: SyncAction,
  stage: SyncFailureStage
): string => {
  const exact = warningByKey[`${entity}:${action}:${stage}`];
  if (exact) {
    return exact;
  }

  const either = warningByKey[`${entity}:${action}:either`];
  if (either) {
    return either;
  }

  return 'A data sync operation failed.';
};

export const pendingSyncWarning = (count: number) =>
  `${count} change${count === 1 ? '' : 's'} still could not be synced to cloud.`;
