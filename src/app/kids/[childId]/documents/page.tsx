import { ChildDocumentsView } from "@/features/children/components/child-documents-view";

export default async function ChildDocumentsPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <ChildDocumentsView childId={decodeURIComponent(childId)} />;
}