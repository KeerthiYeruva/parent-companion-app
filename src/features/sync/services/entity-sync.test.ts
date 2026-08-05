import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  isCloudSyncEnabled: true,
}));

import { runLocalThenCloud, warningHandlers } from '@/features/sync/services/entity-sync';

describe('runLocalThenCloud', () => {
  it('runs cloud first and then local', async () => {
    const performLocal = vi.fn(async () => undefined);
    const performCloud = vi.fn(async () => undefined);
    const onLocalFailure = vi.fn();
    const onCloudFailure = vi.fn();
    const onCloudSuccess = vi.fn();

    runLocalThenCloud({
      performLocal,
      performCloud,
      onLocalFailure,
      onCloudFailure,
      onCloudSuccess,
    });

    await vi.waitFor(() => expect(performCloud).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(performLocal).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(onCloudSuccess).toHaveBeenCalledTimes(1));
    expect(onLocalFailure).not.toHaveBeenCalled();
    expect(onCloudFailure).not.toHaveBeenCalled();
  });

  it('falls back to local persistence when cloud fails', async () => {
    const performLocal = vi.fn(async () => undefined);
    const performCloud = vi.fn(async () => {
      throw new Error('network failed');
    });
    const onLocalFailure = vi.fn();
    const onCloudFailure = vi.fn();

    runLocalThenCloud({
      performLocal,
      performCloud,
      onLocalFailure,
      onCloudFailure,
    });

    await vi.waitFor(() => expect(onCloudFailure).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(performLocal).toHaveBeenCalledTimes(1));
    expect(onLocalFailure).not.toHaveBeenCalled();
  });

  it('reports local failure when fallback local persistence fails', async () => {
    const performLocal = vi.fn(async () => {
      throw new Error('local failed');
    });
    const performCloud = vi.fn(async () => {
      throw new Error('cloud failed');
    });
    const onLocalFailure = vi.fn();
    const onCloudFailure = vi.fn();

    runLocalThenCloud({
      performLocal,
      performCloud,
      onLocalFailure,
      onCloudFailure,
    });

    await vi.waitFor(() => expect(onCloudFailure).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(onLocalFailure).toHaveBeenCalledTimes(1));
    expect(performLocal).toHaveBeenCalledTimes(1);
  });

  it('creates symmetric local/cloud warning handlers', () => {
    const pushWarning = vi.fn();
    const handlers = warningHandlers(pushWarning, 'sync warning');

    handlers.onLocalFailure();
    handlers.onCloudFailure();

    expect(pushWarning).toHaveBeenCalledTimes(2);
    expect(pushWarning).toHaveBeenNthCalledWith(1, 'sync warning');
    expect(pushWarning).toHaveBeenNthCalledWith(2, 'sync warning');
  });
});
