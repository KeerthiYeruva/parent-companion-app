import { FileReviewView } from "@/features/scan/components/file-review-view";

export default async function ScanFilePage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  return <FileReviewView documentId={decodeURIComponent(documentId)} />;
}