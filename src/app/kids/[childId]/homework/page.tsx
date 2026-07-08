import { ChildCategoryView } from "@/features/children/components/child-category-view";

export default async function ChildHomeworkPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <ChildCategoryView childId={decodeURIComponent(childId)} title="Homework" categories={["Homework", "HomeStudy", "Project"]} />;
}