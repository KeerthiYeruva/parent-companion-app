import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { downloadCloudDataToLocal } from "@/features/import/services/cloud-sync";
import { useAppStore } from "@/store/use-app-store";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}
const startApp = async () => {
  try {
    const { children, items, documents } = await downloadCloudDataToLocal();
    if (children.length > 0 || items.length > 0 || documents.length > 0) {
      useAppStore.setState({
        children,
        items,
        documents,
      });
    }
  } catch (error: unknown) {
    console.error("Cloud download failed", error);
  }
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
};
void startApp();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
