import { SmartFolderImport } from "@/features/documents/components/smart-folder-import";
import { NavShell } from "@/components/nav-shell";

export function DocumentsRepositoryView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">School Files</h2>
          <p className="text-sm text-slate-600">
            Add school PDFs once. Parent Companion should build the plan
            automatically and ask for review only when something is genuinely
            unclear.
          </p>
        </div>

        <SmartFolderImport simple />
      </section>
    </NavShell>
  );
}
