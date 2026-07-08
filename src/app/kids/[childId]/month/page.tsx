import { ChildMonthView } from "@/features/children/components/child-category-view";

export default async function ChildMonthPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <ChildMonthView childId={decodeURIComponent(childId)} />;
}