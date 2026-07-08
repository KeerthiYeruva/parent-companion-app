import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { ChildrenManagementView } from "@/features/children/components/children-management-view";
import { ChildCategoryView, ChildMonthView } from "@/features/children/components/child-category-view";
import { ChildDocumentsView } from "@/features/children/components/child-documents-view";
import { ChildOverviewView } from "@/features/children/components/child-overview-view";
import { KidsOverviewView } from "@/features/children/components/kids-overview-view";
import { DocumentsRepositoryView } from "@/features/documents/components/documents-repository-view";
import { PlanningView } from "@/features/planning/components/planning-view";
import { FileReviewView } from "@/features/scan/components/file-review-view";
import { ReviewQueueView } from "@/features/scan/components/review-queue-view";
import { ScanHistoryView } from "@/features/scan/components/scan-history-view";
import { ScanInboxView } from "@/features/scan/components/scan-inbox-view";
import { MoreView } from "@/features/planning/components/more-view";

const useRequiredParam = (name: string) => {
  const params = useParams();
  const value = params[name];

  if (!value) {
    throw new Error(`Missing route parameter: ${name}`);
  }

  return decodeURIComponent(value);
};

function ChildOverviewRoute() {
  return <ChildOverviewView childId={useRequiredParam("childId")} />;
}

function ChildMonthRoute() {
  return <ChildMonthView childId={useRequiredParam("childId")} />;
}

function ChildTestsRoute() {
  return <ChildCategoryView childId={useRequiredParam("childId")} title="Tests" categories={["ClassTest", "UnitTest", "Exam"]} />;
}

function ChildHomeworkRoute() {
  return <ChildCategoryView childId={useRequiredParam("childId")} title="Homework" categories={["Homework", "HomeStudy", "Project"]} />;
}

function ChildActivitiesRoute() {
  return <ChildCategoryView childId={useRequiredParam("childId")} title="Activities" categories={["Activity"]} />;
}

function ChildDocumentsRoute() {
  return <ChildDocumentsView childId={useRequiredParam("childId")} />;
}

function FileReviewRoute() {
  return <FileReviewView documentId={useRequiredParam("documentId")} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PlanningView mode="day" />} />
      <Route path="/day" element={<PlanningView mode="day" />} />
      <Route path="/week" element={<PlanningView mode="week" />} />
      <Route path="/month" element={<PlanningView mode="month" />} />
      <Route path="/tasks" element={<PlanningView mode="tasks" />} />
      <Route path="/tests" element={<PlanningView mode="tests" />} />
      <Route path="/homework" element={<PlanningView mode="homework" />} />
      <Route path="/activities" element={<PlanningView mode="activities" />} />
      <Route path="/children" element={<ChildrenManagementView />} />
      <Route path="/documents" element={<DocumentsRepositoryView />} />
      <Route path="/more" element={<MoreView />} />
      <Route path="/kids" element={<KidsOverviewView />} />
      <Route path="/kids/:childId" element={<ChildOverviewRoute />} />
      <Route path="/kids/:childId/month" element={<ChildMonthRoute />} />
      <Route path="/kids/:childId/tests" element={<ChildTestsRoute />} />
      <Route path="/kids/:childId/homework" element={<ChildHomeworkRoute />} />
      <Route path="/kids/:childId/activities" element={<ChildActivitiesRoute />} />
      <Route path="/kids/:childId/documents" element={<ChildDocumentsRoute />} />
      <Route path="/scan" element={<ScanInboxView />} />
      <Route path="/scan/history" element={<ScanHistoryView />} />
      <Route path="/scan/review" element={<ReviewQueueView />} />
      <Route path="/scan/file/:documentId" element={<FileReviewRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}