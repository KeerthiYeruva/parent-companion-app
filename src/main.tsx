import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { appRepository } from "@/db/repositories/app-repository";
import {
  downloadCloudDataToLocal,
  retryQueuedCloudOperations,
  startCloudSnapshotListeners,
  uploadLocalDataToCloud,
} from "@/features/import/services/cloud-sync";
import { buildHydratedSnapshot } from "@/store/hydration";
import { useAppStore } from "@/store/use-app-store";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

const root = createRoot(rootElement);

const renderApp = () => {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
};

const hydrateLocalData = async () => {
  const [children, items, documents] = await Promise.all([
    appRepository.listChildren(),
    appRepository.listItems(),
    appRepository.listDocuments(),
  ]);

  const hasLocalData =
    children.length > 0 ||
    items.length > 0 ||
    documents.length > 0;

  if (hasLocalData) {
    useAppStore.setState(
      buildHydratedSnapshot({
        children,
        items,
        documents,
        selectedChildIds:
          useAppStore.getState().selectedChildIds,
      }),
    );
  }

  return hasLocalData;
};

const applySnapshot = (snapshot: Awaited<ReturnType<typeof downloadCloudDataToLocal>>) => {
  const hasData =
    snapshot.children.length > 0 ||
    snapshot.items.length > 0 ||
    snapshot.documents.length > 0;

  if (hasData) {
    useAppStore.setState(
      buildHydratedSnapshot({
        ...snapshot,
        selectedChildIds: useAppStore.getState().selectedChildIds,
      }),
    );
  }
};

const loadCloudData = async () => {
  try {
    useAppStore.setState({ syncStatus: "syncing" });
    await retryQueuedCloudOperations();
    applySnapshot(await downloadCloudDataToLocal());
    await uploadLocalDataToCloud();
    await useAppStore.getState().refreshSyncState();
  } catch (error: unknown) {
    console.error("Cloud download failed", error);
    useAppStore.setState({ syncStatus: "error" });
  }
};

const startBackgroundSync = () => {
  void loadCloudData();

  const unsubscribe = startCloudSnapshotListeners(
    (snapshot) => {
      applySnapshot(snapshot);
      void useAppStore.getState().refreshSyncState();
    },
    (error) => {
      console.error("Cloud listener failed", error);
      useAppStore.setState({ syncStatus: "error" });
    },
  );

  const retry = () => {
    void loadCloudData();
  };

  window.addEventListener("online", retry);
  window.addEventListener("focus", retry);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      retry();
    }
  });

  return unsubscribe;
};

const startApp = async () => {
  let hasLocalData = false;

  try {
    hasLocalData = await hydrateLocalData();
  } catch (error: unknown) {
    console.error("Local data hydration failed", error);
  }

  renderApp();

  void hasLocalData;
  void useAppStore.getState().refreshSyncState();
  startBackgroundSync();
};

void startApp();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
