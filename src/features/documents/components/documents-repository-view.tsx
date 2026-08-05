import { SmartFolderImport } from '@/features/documents/components/smart-folder-import';
import { NavShell } from '@/components/nav-shell';
import { HeaderCard } from '@/components/ui/card';

export function DocumentsRepositoryView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <HeaderCard
          title="School Files"
          subtitle={
            <>
              Add school PDFs once. Parent Companion should build the plan automatically and ask for
              review only when something is genuinely unclear.
            </>
          }
        />

        <SmartFolderImport simple />
      </section>
    </NavShell>
  );
}
