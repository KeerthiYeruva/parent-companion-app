import type { Unsubscribe } from 'firebase/firestore';
import { cloudSyncStatusForError } from '@/features/sync/services/sync-errors';
import type { AuthenticatedUser } from '@/features/auth/services/firebase-auth';
import type { ChildProfile, SchoolItem, UploadedDocument } from '@/types/domain';

interface CloudSyncControllerOptions {
  startListeners: (
    onMergedSnapshot: (snapshot: {
      children: ChildProfile[];
      items: SchoolItem[];
      documents: UploadedDocument[];
    }) => void,
    onError?: (error: Error) => void
  ) => Unsubscribe | undefined;
  retryQueued: () => Promise<unknown>;
  refreshSyncState: () => Promise<void>;
  applySnapshot: (snapshot: {
    children: ChildProfile[];
    items: SchoolItem[];
    documents: UploadedDocument[];
  }) => void;
  setSyncStatus: (
    status:
      'synced' | 'syncing' | 'offline' | 'error' | 'signedOut' | 'permissionDenied' | 'unavailable'
  ) => void;
  addEventListener?: Window['addEventListener'];
  removeEventListener?: Window['removeEventListener'];
  addDocumentEventListener?: Document['addEventListener'];
  removeDocumentEventListener?: Document['removeEventListener'];
  isDocumentHidden?: () => boolean;
  isOnline?: () => boolean;
  logError?: (message: string, error: unknown) => void;
}

export const createCloudSyncController = ({
  startListeners,
  retryQueued,
  refreshSyncState,
  applySnapshot,
  setSyncStatus,
  addEventListener,
  removeEventListener,
  addDocumentEventListener,
  removeDocumentEventListener,
  isDocumentHidden = () => false,
  isOnline = () => true,
  logError = console.error,
}: CloudSyncControllerOptions) => {
  let activeUser: AuthenticatedUser | null = null;
  let unsubscribeListeners: Unsubscribe | undefined;
  let lifecycleEventsRegistered = false;
  let listenerErrorStatus: ReturnType<typeof cloudSyncStatusForError> | undefined;
  let authGeneration = 0;

  const detachSnapshotListeners = () => {
    unsubscribeListeners?.();
    unsubscribeListeners = undefined;
  };

  const retryPendingCloudData = async () => {
    if (!activeUser) {
      return;
    }

    if (listenerErrorStatus === 'permissionDenied') {
      return;
    }

    if (!unsubscribeListeners && isOnline()) {
      listenerErrorStatus = undefined;
      start(false);

      if (!unsubscribeListeners) {
        setSyncStatus('unavailable');
        return;
      }
    }

    const retryGeneration = authGeneration;

    try {
      setSyncStatus(isOnline() ? 'syncing' : 'offline');
      await retryQueued();

      if (!activeUser || retryGeneration !== authGeneration || listenerErrorStatus) {
        return;
      }

      await refreshSyncState();
    } catch (error: unknown) {
      if (!activeUser || retryGeneration !== authGeneration) {
        return;
      }

      logError('Pending cloud sync retry failed', error);
      setSyncStatus(cloudSyncStatusForError(error));
    }
  };

  const retry = () => {
    void retryPendingCloudData();
  };

  const markOffline = () => {
    if (!activeUser || listenerErrorStatus === 'permissionDenied') {
      return;
    }

    setSyncStatus('offline');
  };

  const retryWhenVisible = () => {
    if (!isDocumentHidden()) {
      retry();
    }
  };

  const stop = () => {
    detachSnapshotListeners();

    if (lifecycleEventsRegistered) {
      removeEventListener?.('online', retry);
      removeEventListener?.('offline', markOffline);
      removeEventListener?.('focus', retry);
      removeDocumentEventListener?.('visibilitychange', retryWhenVisible);
      lifecycleEventsRegistered = false;
    }
  };

  const ensureLifecycleEvents = () => {
    if (lifecycleEventsRegistered) {
      return;
    }

    addEventListener?.('online', retry);
    addEventListener?.('offline', markOffline);
    addEventListener?.('focus', retry);
    addDocumentEventListener?.('visibilitychange', retryWhenVisible);
    lifecycleEventsRegistered = true;
  };

  const start = (triggerRetry = true) => {
    if (!activeUser || unsubscribeListeners) {
      return;
    }

    ensureLifecycleEvents();

    unsubscribeListeners = startListeners(
      (snapshot) => {
        applySnapshot(snapshot);
        listenerErrorStatus = undefined;
        void refreshSyncState();
      },
      (error) => {
        logError('Cloud listener failed', error);
        listenerErrorStatus = cloudSyncStatusForError(error);
        setSyncStatus(listenerErrorStatus);

        if (listenerErrorStatus === 'permissionDenied') {
          stop();
          return;
        }

        detachSnapshotListeners();
      }
    );

    if (!unsubscribeListeners) {
      setSyncStatus(isOnline() ? 'unavailable' : 'offline');
      if (triggerRetry) {
        retry();
      }
      return;
    }

    if (triggerRetry) {
      retry();
    }
  };

  return {
    handleAuthUserChange: (user: AuthenticatedUser | null) => {
      authGeneration += 1;
      activeUser = user;
      listenerErrorStatus = undefined;

      if (!user) {
        stop();
        setSyncStatus('signedOut');
        return;
      }

      start();
    },
    stop,
  };
};
