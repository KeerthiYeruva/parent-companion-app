import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { appRepository } from '@/db/repositories/app-repository';
import {
  retryQueuedCloudOperations,
  startCloudSnapshotListeners,
  withUpdatedAt,
} from '@/features/sync/services/cloud-sync';
import { createCloudSyncController } from '@/features/sync/services/cloud-sync-controller';
import { isCloudSyncEnabled, isFirebaseConfigured } from '@/lib/firebase';
import { buildHydratedSnapshot } from '@/store/hydration';
import { useAppStore } from '@/store/use-app-store';
import type { ChildProfile } from '@/types/domain';
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

const localSeedChildren: ChildProfile[] = [
  withUpdatedAt<ChildProfile>({
    id: 'child-local-ruthvish',
    name: 'Ruthvish Reddy Annapareddy',
    grade: '1',
    section: 'A',
    academicYear: '2026-2027',
    colorTag: 'bg-blue-500',
  }),
  withUpdatedAt<ChildProfile>({
    id: 'child-local-luhas',
    name: 'Luhas Reddy',
    grade: '5',
    section: 'A',
    academicYear: '2026-2027',
    colorTag: 'bg-emerald-500',
  }),
];

const seedLocalProfilesIfNeeded = async () => {
  const [children, items, documents] = await Promise.all([
    appRepository.listChildren(),
    appRepository.listItems(),
    appRepository.listDocuments(),
  ]);

  if (children.length > 0 || items.length > 0 || documents.length > 0) {
    return false;
  }

  await appRepository.upsertChildren(localSeedChildren);
  useAppStore.setState(
    buildHydratedSnapshot({
      children: localSeedChildren,
      items: [],
      documents: [],
      selectedChildIds: [localSeedChildren[0].id],
    })
  );
  return true;
};

const startApp = async () => {
  if (import.meta.env.PROD && (!isCloudSyncEnabled || !isFirebaseConfigured)) {
    throw new Error('Firebase cloud sync is required in production and must be fully configured.');
  }

  let hasLocalData = false;

  try {
    hasLocalData = await hydrateLocalData();
  } catch (error: unknown) {
    console.error('Local data hydration failed', error);
  }

  if (!isCloudSyncEnabled) {
    if (!hasLocalData) {
      await seedLocalProfilesIfNeeded().catch((error: unknown) => {
        console.error('Local profile seed failed', error);
      });
    }

    useAppStore.setState({
      pendingItemSyncIds: [],
      pendingSyncCount: 0,
      syncStatus: 'synced',
    });
    renderApp();
    void hasLocalData;
    return;
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
