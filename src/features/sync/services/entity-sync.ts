import { isCloudSyncEnabled } from '@/lib/firebase';

interface LocalThenCloudOptions {
  performLocal: () => Promise<void>;
  performCloud: () => Promise<void>;
  onLocalFailure: () => void;
  onCloudFailure: () => void;
  onCloudSuccess?: () => void;
}

export const warningHandlers = (pushWarning: (message: string) => void, message: string) => ({
  onCloudFailure: () => {
    pushWarning(message);
  },
  onLocalFailure: () => {
    pushWarning(message);
  },
});

export const runLocalThenCloud = ({
  performLocal,
  performCloud,
  onLocalFailure,
  onCloudFailure,
  onCloudSuccess,
}: LocalThenCloudOptions) => {
  if (!isCloudSyncEnabled) {
    void performLocal().catch(() => {
      onLocalFailure();
    });
    return;
  }

  void performCloud()
    .then(() => {
      onCloudSuccess?.();
      void performLocal().catch(() => {
        onLocalFailure();
      });
    })
    .catch(() => {
      onCloudFailure();
      void performLocal().catch(() => {
        onLocalFailure();
      });
    });
};
