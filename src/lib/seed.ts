import dayjs from "dayjs";
import type { ChildProfile, SchoolItem, UploadedDocument } from "@/types/domain";

export const demoChildren: ChildProfile[] = [
  {
    id: "child-1",
    name: "Aarav",
    grade: "4",
    section: "A",
    academicYear: "2026-2027",
    colorTag: "bg-blue-500",
  },
  {
    id: "child-2",
    name: "Myra",
    grade: "8",
    section: "B",
    academicYear: "2026-2027",
    colorTag: "bg-emerald-500",
  },
];

export const demoItems: SchoolItem[] = [
  {
    id: "item-1",
    childId: "child-1",
    category: "Homework",
    title: "Math Worksheet Chapter 3",
    dueDate: dayjs().format("YYYY-MM-DD"),
    status: "Pending",
  },
  {
    id: "item-2",
    childId: "child-2",
    category: "UnitTest",
    title: "Science Unit Test: Human Body",
    dueDate: dayjs().add(2, "day").format("YYYY-MM-DD"),
    status: "Upcoming",
    prepStatus: "InProgress",
  },
  {
    id: "item-3",
    childId: "child-2",
    category: "Activity",
    title: "Dance Practice",
    dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    status: "Upcoming",
  },
];

export const demoDocuments: UploadedDocument[] = [
  {
    id: "doc-1",
    title: "July Scholastic Planner",
    type: "ScholasticPlanner",
    childIds: ["child-1", "child-2"],
    uploadedAt: dayjs().subtract(2, "day").toISOString(),
    fileName: "july-scholastic-planner.pdf",
    fileSize: 450000,
  },
];
