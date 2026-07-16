import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { appRepository } from '@/db/repositories/app-repository';
import {
  retryQueuedCloudOperations,
  startCloudSnapshotListeners,
} from '@/features/sync/services/cloud-sync';
import { createCloudSyncController } from '@/features/sync/services/cloud-sync-controller';
import { buildHydratedSnapshot } from '@/store/hydration';
import { useAppStore } from '@/store/use-app-store';
import '@/styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

const root = createRoot(rootElement);

let cloudSyncController: ReturnType<typeof createCloudSyncController> | undefined;

const renderApp = () => {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App onAuthUserChange={(user) => cloudSyncController?.handleAuthUserChange(user)} />
      </BrowserRouter>
    </StrictMode>
  );
};

const hydrateLocalData = async () => {
  const [children, items, documents] = await Promise.all([
    appRepository.listChildren(),
    appRepository.listItems(),
    appRepository.listDocuments(),
  ]);

  const hasLocalData = children.length > 0 || items.length > 0 || documents.length > 0;

  if (hasLocalData) {
    useAppStore.setState(
      buildHydratedSnapshot({
        children,
        items,
        documents,
        selectedChildIds: useAppStore.getState().selectedChildIds,
      })
    );
  }

  return hasLocalData;
};

const applySnapshot = (snapshot: {
  children: ReturnType<typeof useAppStore.getState>['children'];
  items: ReturnType<typeof useAppStore.getState>['items'];
  documents: ReturnType<typeof useAppStore.getState>['documents'];
}) => {
  useAppStore.setState(
    buildHydratedSnapshot({
      ...snapshot,
      selectedChildIds: useAppStore.getState().selectedChildIds,
    })
  );
};

const startApp = async () => {
  let hasLocalData = false;

  try {
    hasLocalData = await hydrateLocalData();
  } catch (error: unknown) {
    console.error('Local data hydration failed', error);
  }

  cloudSyncController = createCloudSyncController({
    startListeners: startCloudSnapshotListeners,
    retryQueued: retryQueuedCloudOperations,
    refreshSyncState: () => useAppStore.getState().refreshSyncState(),
    applySnapshot,
    setSyncStatus: (syncStatus) => useAppStore.setState({ syncStatus }),
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    addDocumentEventListener: document.addEventListener.bind(document),
    removeDocumentEventListener: document.removeEventListener.bind(document),
    isDocumentHidden: () => document.hidden,
    isOnline: () => navigator.onLine,
  });

  renderApp();

  void hasLocalData;
  void useAppStore.getState().refreshSyncState();
};

void startApp();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
