import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/use-app-store";
import type { ItemCategory } from "@/types/domain";

const categoryOptions: Array<{ label: string; value: ItemCategory }> = [
  { label: "Homework", value: "Homework" },
  { label: "Tests", value: "UnitTest" },
  { label: "Activities", value: "Activity" },
  { label: "Projects", value: "Project" },
  { label: "Study tasks", value: "HomeStudy" },
];

const categories = categoryOptions.map((option) => option.value) as [ItemCategory, ...ItemCategory[]];

const schema = z.object({
  childId: z.string().min(1, "Select a child"),
  category: z.enum(categories),
  title: z.string().min(3, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AddItemForm() {
  const children = useAppStore((state) => state.children);
  const addItem = useAppStore((state) => state.addItem);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form
      className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5"
      onSubmit={handleSubmit((values) => {
        addItem(values);
        reset();
      })}
    >
      <select className="rounded-lg border border-slate-300 px-3 py-2" {...register("childId")}>
        <option value="">Select child</option>
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </select>
      <select className="rounded-lg border border-slate-300 px-3 py-2" {...register("category")}>
        {categoryOptions.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Title" {...register("title")} />
      <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" {...register("dueDate")} />
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
        Add Item
      </button>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-5"
        placeholder="Optional description"
        {...register("description")}
      />
      {(errors.childId || errors.title || errors.dueDate) && (
        <p className="text-sm text-rose-600 md:col-span-5">
          {errors.childId?.message || errors.title?.message || errors.dueDate?.message}
        </p>
      )}
    </form>
  );
}
