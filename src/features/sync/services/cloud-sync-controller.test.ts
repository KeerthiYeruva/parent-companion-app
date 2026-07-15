import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCloudSyncController } from '@/features/sync/services/cloud-sync-controller';

const createHarness = () => {
  const unsubscribe = vi.fn();
  const listeners = {
    online: undefined as (() => void) | undefined,
    focus: undefined as (() => void) | undefined,
    visibilitychange: undefined as (() => void) | undefined,
  };
  let listenerError: ((error: Error) => void) | undefined;
  const startListeners = vi.fn(
    (
      _onSnapshot: Parameters<Parameters<typeof createCloudSyncController>[0]['startListeners']>[0],
      onError?: (error: Error) => void
    ) => {
      listenerError = onError;
      return unsubscribe;
    }
  );
  const retryQueued = vi.fn<() => Promise<void>>(async () => undefined);
  const refreshSyncState = vi.fn(async () => undefined);
  const applySnapshot = vi.fn();
  const setSyncStatus = vi.fn();
  const logError = vi.fn();
  const controller = createCloudSyncController({
    startListeners,
    retryQueued,
    refreshSyncState,
    applySnapshot,
    setSyncStatus,
    addEventListener: ((type: keyof typeof listeners, listener: () => void) => {
      listeners[type] = listener;
    }) as Window['addEventListener'],
    removeEventListener: ((type: keyof typeof listeners) => {
      listeners[type] = undefined;
    }) as Window['removeEventListener'],
    addDocumentEventListener: ((type: 'visibilitychange', listener: () => void) => {
      listeners[type] = listener;
    }) as Document['addEventListener'],
    removeDocumentEventListener: ((type: 'visibilitychange') => {
      listeners[type] = undefined;
    }) as Document['removeEventListener'],
    logError,
  });

  return {
    applySnapshot,
    controller,
    listeners,
    logError,
    refreshSyncState,
    retryQueued,
    setSyncStatus,
    startListeners,
    triggerListenerError: (error: Error) => listenerError?.(error),
    unsubscribe,
  };
};

describe('cloud sync controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not start Firestore listeners while signed out', () => {
    const harness = createHarness();

    harness.controller.handleAuthUserChange(null);

    expect(harness.startListeners).not.toHaveBeenCalled();
    expect(harness.retryQueued).not.toHaveBeenCalled();
    expect(harness.setSyncStatus).toHaveBeenCalledWith('signedOut');
  });

  it('starts Firestore listeners once after authentication', () => {
    const harness = createHarness();

    harness.controller.handleAuthUserChange({
      uid: 'uid-1',
      email: 'parent@example.com',
    });
    harness.controller.handleAuthUserChange({
      uid: 'uid-1',
      email: 'parent@example.com',
    });

    expect(harness.startListeners).toHaveBeenCalledTimes(1);
    expect(harness.retryQueued).toHaveBeenCalledTimes(1);
  });

  it('does not create duplicate listeners for repeated auth callbacks', () => {
    const harness = createHarness();

    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });
    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });
    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });

    expect(harness.startListeners).toHaveBeenCalledTimes(1);
  });

  it('sign-out unsubscribes listeners and lifecycle handlers', () => {
    const harness = createHarness();

    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });
    harness.controller.handleAuthUserChange(null);

    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);
    expect(harness.listeners.online).toBeUndefined();
    expect(harness.listeners.focus).toBeUndefined();
    expect(harness.listeners.visibilitychange).toBeUndefined();
  });

  it('signed-out state does not trigger retry loops', () => {
    const harness = createHarness();

    harness.controller.handleAuthUserChange(null);
    harness.listeners.online?.();
    harness.listeners.focus?.();

    expect(harness.retryQueued).not.toHaveBeenCalled();
  });

  it('maps permission-denied listener errors to a specific status', () => {
    const harness = createHarness();

    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });
    harness.triggerListenerError(
      Object.assign(new Error('permission denied'), { code: 'permission-denied' })
    );

    expect(harness.setSyncStatus).toHaveBeenCalledWith('permissionDenied');
  });

  it('does not overwrite a listener access error when a retry finishes', async () => {
    const harness = createHarness();
    let finishRetry: (() => void) | undefined;
    harness.retryQueued.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRetry = resolve;
        })
    );

    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });
    harness.triggerListenerError(
      Object.assign(new Error('permission denied'), { code: 'permission-denied' })
    );
    finishRetry?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.refreshSyncState).not.toHaveBeenCalled();
    expect(harness.setSyncStatus).toHaveBeenLastCalledWith('permissionDenied');
  });

  it('does not let an in-flight retry overwrite signed-out status', async () => {
    const harness = createHarness();
    let finishRetry: (() => void) | undefined;
    harness.retryQueued.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRetry = resolve;
        })
    );

    harness.controller.handleAuthUserChange({ uid: 'uid-1', email: null });
    harness.controller.handleAuthUserChange(null);
    finishRetry?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.refreshSyncState).not.toHaveBeenCalled();
    expect(harness.setSyncStatus).toHaveBeenLastCalledWith('signedOut');
  });
});
