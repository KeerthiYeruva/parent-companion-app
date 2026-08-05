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
  void performLocal()
    .then(
      () =>
        void performCloud()
          .then(() => {
            onCloudSuccess?.();
          })
          .catch(() => {
            onCloudFailure();
          })
    )
    .catch(() => {
      onLocalFailure();
    });
};
