import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { appRepository } from "@/db/repositories/app-repository";
import { downloadCloudDataToLocal } from "@/features/import/services/cloud-sync";
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

const loadCloudData = async () => {
  try {
    const { children, items, documents } =
      await downloadCloudDataToLocal();

    const hasCloudData =
      children.length > 0 ||
      items.length > 0 ||
      documents.length > 0;

    if (hasCloudData) {
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
  } catch (error: unknown) {
    console.error("Cloud download failed", error);
  }
};

const startApp = async () => {
  let hasLocalData = false;

  try {
    hasLocalData = await hydrateLocalData();
  } catch (error: unknown) {
    console.error("Local data hydration failed", error);
  }

  renderApp();

  if (!hasLocalData) {
    void loadCloudData();
  }
};

void startApp();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}