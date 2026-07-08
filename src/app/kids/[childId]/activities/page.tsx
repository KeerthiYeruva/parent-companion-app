import { ChildCategoryView } from "@/features/children/components/child-category-view";

export default async function ChildActivitiesPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <ChildCategoryView childId={decodeURIComponent(childId)} title="Activities" categories={["Activity"]} />;
}