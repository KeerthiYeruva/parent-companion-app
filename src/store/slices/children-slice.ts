import type { StateCreator } from "zustand";
import type { AppState, ChildProfile } from "@/types/domain";

const childColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];

type ChildrenSlice = Pick<AppState, "children" | "addChild">;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createChildrenSlice: StateCreator<AppState, [], [], ChildrenSlice> = (set, get) => ({
  children: [],
  addChild: (child: Omit<ChildProfile, "id" | "colorTag">) => {
    const colorTag = childColors[get().children.length % childColors.length];
    set((state) => ({
      children: [...state.children, { ...child, id: createId("child"), colorTag }],
    }));
  },
});
