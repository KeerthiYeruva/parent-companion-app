import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/use-app-store";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  grade: z.string().regex(/^(?:1[0-2]|[1-9])$/, "Choose a grade from 1 to 12"),
  section: z.string().min(1, "Section is required"),
  academicYear: z.string().min(4, "Academic year is required"),
});

const gradeOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

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
      <select className="rounded-lg border border-slate-300 px-3 py-2" {...register("grade")}> 
        <option value="">Grade</option>
        {gradeOptions.map((grade) => (
          <option key={grade} value={grade}>Grade {grade}</option>
        ))}
      </select>
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
