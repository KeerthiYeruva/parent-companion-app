import { useRef, useState } from "react";
import type { PlannerBackup } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isPlannerBackup = (value: unknown): value is PlannerBackup => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    Array.isArray(value.children) &&
    Array.isArray(value.items) &&
    Array.isArray(value.documents) &&
    Array.isArray(value.selectedChildIds)
  );
};

export function DataBackupPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const documents = useAppStore((state) => state.documents);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);
  const importBackupData = useAppStore((state) => state.importBackupData);
  const [message, setMessage] = useState<string>();

  const exportData = () => {
    const backup: PlannerBackup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      children,
      items,
      documents,
      selectedChildIds,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `parent-companion-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${children.length} child profile${children.length === 1 ? "" : "s"} and ${items.length} item${items.length === 1 ? "" : "s"}.`);
  };

  const importData = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isPlannerBackup(parsed)) {
        setMessage("This file is not a Parent Companion backup.");
        return;
      }

      await importBackupData(parsed);
      setMessage(`Imported ${parsed.children.length} child profile${parsed.children.length === 1 ? "" : "s"} and ${parsed.items.length} item${parsed.items.length === 1 ? "" : "s"}.`);
    } catch {
      setMessage("Backup import failed. Choose a valid JSON backup file.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Data Backup</h3>
          <p className="text-sm text-slate-600">Move imported planning data between localhost, Vercel, browsers, and devices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportData} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Export Data
          </button>
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            Import Data
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          void importData(input.files?.[0]).finally(() => {
            input.value = "";
          });
        }}
      />
      <p className="mt-3 text-sm text-slate-600">
        Current browser: {children.length} child profile{children.length === 1 ? "" : "s"}, {items.length} item{items.length === 1 ? "" : "s"}, {documents.length} document{documents.length === 1 ? "" : "s"}.
      </p>
      {message ? <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p> : null}
    </section>
  );
}