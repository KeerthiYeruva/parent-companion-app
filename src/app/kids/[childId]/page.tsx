import { ChildOverviewView } from "@/features/children/components/child-overview-view";

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <ChildOverviewView childId={decodeURIComponent(childId)} />;
}