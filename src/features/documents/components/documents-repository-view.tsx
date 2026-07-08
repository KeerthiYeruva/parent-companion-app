import { SmartFolderImport } from "@/features/documents/components/smart-folder-import";
import { NavShell } from "@/components/nav-shell";

export function DocumentsRepositoryView() {
  const flowSteps = [
    "School sends PDFs",
    "Store in folder",
    "Extract content",
    "Show weekly targets",
    "Show monthly targets",
    "Track completion",
  ];

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">School Files</h2>
          <p className="text-sm text-slate-600">Add school PDFs once. Parent Companion should build the plan automatically and ask for review only when something is genuinely unclear.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-6">
            {flowSteps.map((step, index) => (
              <div key={step} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                <p className="mt-1 font-medium text-slate-900">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <SmartFolderImport simple />
      </section>
    </NavShell>
  );
}
