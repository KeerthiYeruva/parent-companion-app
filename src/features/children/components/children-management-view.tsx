import { useState } from 'react';
import { AddChildForm } from '@/components/forms/add-child-form';
import { NavShell } from '@/components/nav-shell';
import { DangerButton, MutedButton, OutlineButton, PrimaryButton } from '@/components/ui/button';
import { ArticleCard, HeaderCard } from '@/components/ui/card';
import { useAppStore } from '@/store/use-app-store';
import type { ChildProfile } from '@/types/domain';

const gradeOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const isValidGrade = (grade: string) => /^(?:1[0-2]|[1-9])$/.test(grade.trim());

export function ChildrenManagementView() {
  return (
    <NavShell>
      <ChildrenManagementSection />
    </NavShell>
  );
}

export function ChildrenManagementSection({ showHeader = true }: { showHeader?: boolean }) {
  const children = useAppStore((state) => state.children);
  const updateChild = useAppStore((state) => state.updateChild);
  const deleteChild = useAppStore((state) => state.deleteChild);
  const [editingChildId, setEditingChildId] = useState<string | undefined>();

  return (
    <section className="space-y-3">
      {showHeader ? (
        <HeaderCard title="Manage Kids" subtitle="Add children and update their school details." />
      ) : null}

      <AddChildForm />

      <div className="grid gap-3 md:grid-cols-2">
        {children.map((child) => (
          <ArticleCard key={child.id} className="p-4">
            {editingChildId === child.id ? (
              <EditChildProfileForm
                child={child}
                onCancel={() => setEditingChildId(undefined)}
                onSave={(updates) => {
                  updateChild(child.id, updates);
                  setEditingChildId(undefined);
                }}
              />
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
                    <h3 className="font-semibold">{child.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MutedButton onClick={() => setEditingChildId(child.id)}>Edit</MutedButton>
                    <DangerButton
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Remove ${child.name}? This will also remove their planner items and child-specific documents.`
                        );

                        if (confirmed) {
                          deleteChild(child.id);
                        }
                      }}
                    >
                      Delete
                    </DangerButton>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Grade {child.grade} • Section {child.section}
                </p>
                {!isValidGrade(child.grade) ? (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800">
                    Choose the correct grade before scanning school files.
                  </p>
                ) : null}
                <p className="text-sm text-slate-600">Academic Year: {child.academicYear}</p>
              </>
            )}
          </ArticleCard>
        ))}
      </div>
    </section>
  );
}

function EditChildProfileForm({
  child,
  onCancel,
  onSave,
}: {
  child: ChildProfile;
  onCancel: () => void;
  onSave: (updates: Omit<ChildProfile, 'id' | 'colorTag'>) => void;
}) {
  const [name, setName] = useState(child.name);
  const [grade, setGrade] = useState(child.grade);
  const [section, setSection] = useState(child.section);
  const [academicYear, setAcademicYear] = useState(child.academicYear);

  const canSave =
    name.trim().length >= 2 &&
    isValidGrade(grade) &&
    section.trim().length > 0 &&
    academicYear.trim().length >= 4;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) {
          return;
        }

        onSave({
          name: name.trim(),
          grade: grade.trim(),
          section: section.trim(),
          academicYear: academicYear.trim(),
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Child name"
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
        >
          {!isValidGrade(grade) ? <option value={grade}>Fix grade</option> : null}
          {gradeOptions.map((option) => (
            <option key={option} value={option}>
              Grade {option}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={section}
          onChange={(event) => setSection(event.target.value)}
          placeholder="Section"
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)}
          placeholder="Academic year"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={!canSave}>
          Save Profile
        </PrimaryButton>
        <OutlineButton onClick={onCancel}>Cancel</OutlineButton>
      </div>
    </form>
  );
}
