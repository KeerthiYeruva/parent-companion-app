"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/use-app-store";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  grade: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
  academicYear: z.string().min(4, "Academic year is required"),
});

type FormData = z.infer<typeof schema>;

export function AddChildForm() {
  const addChild = useAppStore((state) => state.addChild);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      academicYear: "2026-2027",
    },
  });

  return (
    <form
      className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
      onSubmit={handleSubmit((values) => {
        addChild(values);
        reset({ academicYear: values.academicYear, grade: "", name: "", section: "" });
      })}
    >
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Child name" {...register("name")} />
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Grade" {...register("grade")} />
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Section" {...register("section")} />
      <div className="flex gap-2">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Academic year"
          {...register("academicYear")}
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          Add
        </button>
      </div>
      {(errors.name || errors.grade || errors.section || errors.academicYear) && (
        <p className="text-sm text-rose-600 md:col-span-4">
          {errors.name?.message || errors.grade?.message || errors.section?.message || errors.academicYear?.message}
        </p>
      )}
    </form>
  );
}
