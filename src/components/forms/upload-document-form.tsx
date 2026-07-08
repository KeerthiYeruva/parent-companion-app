"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/use-app-store";
import type { DocumentType } from "@/types/domain";

const documentTypes: DocumentType[] = [
  "ScholasticPlanner",
  "CoScholasticPlanner",
  "UnitTestPortion",
  "ClassTestPortion",
  "ExamCircular",
  "HomeworkSchedule",
  "ActivitySchedule",
  "Circular",
];

const schema = z.object({
  title: z.string().min(3, "Title is required"),
  type: z.enum(documentTypes),
  childIds: z.array(z.string()).min(1, "Select at least one child"),
});

type FormData = z.infer<typeof schema>;

export function UploadDocumentForm() {
  const children = useAppStore((state) => state.children);
  const addDocument = useAppStore((state) => state.addDocument);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { childIds: [] },
  });

  const childIds = watch("childIds");

  return (
    <form
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={handleSubmit((values) => {
        addDocument(values);
        reset({ childIds: [] });
      })}
    >
      <p className="text-sm text-slate-700">Documents are references only. Extracted items power the dashboard.</p>
      <div className="grid gap-2 md:grid-cols-3">
        <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Document title" {...register("title")} />
        <select className="rounded-lg border border-slate-300 px-3 py-2" {...register("type")}>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          Save Document
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {children.map((child) => {
          const checked = childIds.includes(child.id);
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => {
                const next = checked ? childIds.filter((id) => id !== child.id) : [...childIds, child.id];
                setValue("childIds", next, { shouldValidate: true });
              }}
              className={`rounded-full border px-3 py-1 text-sm ${
                checked ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300"
              }`}
            >
              {child.name}
            </button>
          );
        })}
      </div>

      {(errors.title || errors.childIds) && (
        <p className="text-sm text-rose-600">{errors.title?.message || errors.childIds?.message}</p>
      )}
    </form>
  );
}
