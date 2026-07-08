"use client";

import type { ChildProfile, ItemCategory, ReviewDraftRecord } from "@/types/domain";

const categories: ItemCategory[] = ["Homework", "HomeStudy", "Activity", "ClassTest", "UnitTest", "Exam", "Project", "Circular"];

export function ReviewRowEditor({
  draft,
  children,
  issues,
  onChange,
}: {
  draft: ReviewDraftRecord;
  children: ChildProfile[];
  issues: string[];
  onChange: (updates: Partial<ReviewDraftRecord>) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="grid gap-2 md:grid-cols-5">
        <select value={draft.childName ?? ""} onChange={(event) => onChange({ childName: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">Select child</option>
          {children.map((child) => (
            <option key={child.id} value={child.name}>
              {child.name}
            </option>
          ))}
        </select>

        <select value={draft.category ?? ""} onChange={(event) => onChange({ category: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <input value={draft.subject ?? ""} onChange={(event) => onChange({ subject: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Subject" />
        <input value={draft.title ?? ""} onChange={(event) => onChange({ title: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Title" />
        <input value={draft.dueDate ?? ""} onChange={(event) => onChange({ dueDate: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" type="date" />
      </div>

      {issues.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {issues.map((issue) => (
            <li key={issue} className="rounded-md bg-rose-50 px-2 py-1 text-sm text-rose-700">
              {issue}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-emerald-700">Row valid.</p>
      )}
    </div>
  );
}