"use client";

import { useState } from "react";
import { AddChildForm } from "@/components/forms/add-child-form";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";
import type { ChildProfile } from "@/types/domain";

export function ChildrenManagementView() {
  const children = useAppStore((state) => state.children);
  const updateChild = useAppStore((state) => state.updateChild);
  const [editingChildId, setEditingChildId] = useState<string | undefined>();

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold">Child Profiles</h2>
          <p className="text-sm text-slate-600">Store name, grade, section, and academic year.</p>
        </div>

        <AddChildForm />

        <div className="grid gap-3 md:grid-cols-2">
          {children.map((child) => (
            <article key={child.id} className="rounded-xl border border-slate-200 bg-white p-4">
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
                    <button
                      type="button"
                      onClick={() => setEditingChildId(child.id)}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">Grade {child.grade} • Section {child.section}</p>
                  <p className="text-sm text-slate-600">Academic Year: {child.academicYear}</p>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </NavShell>
  );
}

function EditChildProfileForm({
  child,
  onCancel,
  onSave,
}: {
  child: ChildProfile;
  onCancel: () => void;
  onSave: (updates: Omit<ChildProfile, "id" | "colorTag">) => void;
}) {
  const [name, setName] = useState(child.name);
  const [grade, setGrade] = useState(child.grade);
  const [section, setSection] = useState(child.section);
  const [academicYear, setAcademicYear] = useState(child.academicYear);

  const canSave = name.trim().length >= 2 && grade.trim().length > 0 && section.trim().length > 0 && academicYear.trim().length >= 4;

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
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Child name" />
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="Grade" />
        <input className="rounded-lg border border-slate-300 px-3 py-2" value={section} onChange={(event) => setSection(event.target.value)} placeholder="Section" />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)}
          placeholder="Academic year"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!canSave} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Save Profile
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
