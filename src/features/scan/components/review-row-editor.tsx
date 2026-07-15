import type { ChildProfile, ItemCategory, ReviewDraftRecord } from '@/types/domain';

const categories: ItemCategory[] = [
  'Homework',
  'HomeStudy',
  'Activity',
  'ClassTest',
  'UnitTest',
  'Exam',
  'Project',
  'Circular',
];

const formatIssueForParent = (issue: string) => {
  const withoutRow = issue.replace(/^Row\s+\d+:\s*/i, '');
  if (/child could not be matched/i.test(withoutRow)) {
    return 'Choose the child for this item.';
  }

  if (/due date is invalid or missing/i.test(withoutRow)) {
    return 'Add the date for this item.';
  }

  return withoutRow;
};

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
    <tr
      className="document-import__row border-t border-slate-200 align-top"
      data-row-stage="resolved"
      data-category={draft.category ?? ''}
      data-subject={draft.subject ?? ''}
      data-child={draft.childName ?? ''}
      data-due-date={draft.dueDate ?? ''}
    >
      <td className="document-import__row-child px-2 py-2">
        <select
          value={draft.childName ?? ''}
          onChange={(event) => onChange({ childName: event.target.value })}
          className="document-import__row-child-input w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="">Select child</option>
          {children.map((child) => (
            <option key={child.id} value={child.name}>
              {child.name}
            </option>
          ))}
        </select>
      </td>
      <td className="document-import__row-category px-2 py-2">
        <select
          value={draft.category ?? ''}
          onChange={(event) => onChange({ category: event.target.value })}
          className="document-import__row-category-input w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="">Select type</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </td>
      <td className="document-import__row-subject px-2 py-2">
        <input
          value={draft.subject ?? ''}
          onChange={(event) => onChange({ subject: event.target.value })}
          className="document-import__row-subject-input w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
          placeholder="Subject"
        />
      </td>
      <td className="document-import__row-title min-w-56 px-2 py-2">
        <input
          value={draft.title ?? ''}
          onChange={(event) => onChange({ title: event.target.value })}
          className="document-import__row-title-input w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
          placeholder="Extracted item"
        />
        {draft.description ? (
          <p className="document-import__row-description mt-1 line-clamp-2 text-xs text-slate-500">
            {draft.description}
          </p>
        ) : null}
      </td>
      <td className="document-import__row-date px-2 py-2">
        <input
          value={draft.dueDate ?? ''}
          onChange={(event) => onChange({ dueDate: event.target.value })}
          className="document-import__row-date-input w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
          type="date"
        />
      </td>
      <td className="document-import__row-issues min-w-48 px-2 py-2">
        {issues.length > 0 ? (
          <ul className="document-import__issue-list space-y-1">
            {issues.map((issue) => (
              <li
                key={issue}
                className="document-import__issue rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800"
              >
                {formatIssueForParent(issue)}
              </li>
            ))}
          </ul>
        ) : (
          <span className="document-import__row-status document-import__row-status--ready rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            Ready
          </span>
        )}
      </td>
    </tr>
  );
}
