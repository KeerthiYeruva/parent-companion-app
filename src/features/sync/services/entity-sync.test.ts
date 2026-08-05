import { describe, expect, it, vi } from 'vitest';
import { runLocalThenCloud, warningHandlers } from '@/features/sync/services/entity-sync';

describe('runLocalThenCloud', () => {
  it('runs local first and then cloud', async () => {
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
    expect(performLocal).toHaveBeenCalledTimes(1);
    expect(onCloudSuccess).toHaveBeenCalledTimes(1);
    expect(onLocalFailure).not.toHaveBeenCalled();
    expect(onCloudFailure).not.toHaveBeenCalled();
  });

  it('does not run cloud when local fails', async () => {
    const performLocal = vi.fn(async () => {
      throw new Error('local failed');
    });
    const performCloud = vi.fn(async () => undefined);
    const onLocalFailure = vi.fn();
    const onCloudFailure = vi.fn();

    runLocalThenCloud({
      performLocal,
      performCloud,
      onLocalFailure,
      onCloudFailure,
    });

    await vi.waitFor(() => expect(onLocalFailure).toHaveBeenCalledTimes(1));
    expect(performCloud).not.toHaveBeenCalled();
    expect(onCloudFailure).not.toHaveBeenCalled();
  });

  it('reports cloud failure after local success', async () => {
    const performLocal = vi.fn(async () => undefined);
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
    expect(performLocal).toHaveBeenCalledTimes(1);
    expect(onLocalFailure).not.toHaveBeenCalled();
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
