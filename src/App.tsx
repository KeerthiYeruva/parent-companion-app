import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { ChildrenManagementView } from "@/features/children/components/children-management-view";
import { BackupView } from "@/features/backup/components/backup-view";
import {
  ChildCategoryView,
  ChildMonthView,
} from "@/features/children/components/child-category-view";
import { ChildDocumentsView } from "@/features/children/components/child-documents-view";
import { ChildOverviewView } from "@/features/children/components/child-overview-view";
import { DocumentsRepositoryView } from "@/features/documents/components/documents-repository-view";
import { PlanningView } from "@/features/planning/components/planning-view";
import { MoreView } from "@/features/planning/components/more-view";
import { FileReviewView } from "@/features/scan/components/file-review-view";
import { ReviewQueueView } from "@/features/scan/components/review-queue-view";
import { ScanHistoryView } from "@/features/scan/components/scan-history-view";
import { ScanInboxView } from "@/features/scan/components/scan-inbox-view";
import { TestsView } from "./components/tests-view";

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
  return (
    <ChildCategoryView
      childId={useRequiredParam("childId")}
      title="Tests"
      categories={["ClassTest", "UnitTest", "Exam"]}
    />
  );
}

function ChildHomeworkRoute() {
  return (
    <ChildCategoryView
      childId={useRequiredParam("childId")}
      title="Homework"
      categories={["Homework", "HomeStudy", "Project"]}
    />
  );
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
      {/* Main planner */}
      <Route
        path="/"
        element={<PlanningView mode="day" showKidsTabs />}
      />

      <Route
        path="/week"
        element={<PlanningView mode="week" showKidsTabs />}
      />

      <Route
        path="/month"
        element={<PlanningView mode="month" showKidsTabs />}
      />

      {/* Old planner route */}
      <Route path="/day" element={<Navigate to="/" replace />} />

      {/* Main navigation */}
      <Route path="/tests" element={<TestsView />} />
      <Route path="/more" element={<MoreView />} />

      {/* More */}
      <Route
        path="/more/profiles"
        element={<ChildrenManagementView />}
      />

      <Route
        path="/documents"
        element={<DocumentsRepositoryView />}
      />

      <Route path="/backup" element={<BackupView />} />

      {/* Old Kids planner routes */}
      <Route path="/kids" element={<Navigate to="/more/profiles" replace />} />
      <Route path="/kids/day" element={<Navigate to="/" replace />} />
      <Route
        path="/kids/week"
        element={<Navigate to="/week" replace />}
      />
      <Route
        path="/kids/month"
        element={<Navigate to="/month" replace />}
      />

      {/* Existing child-specific routes */}
      <Route
        path="/kids/:childId"
        element={<ChildOverviewRoute />}
      />

      <Route
        path="/kids/:childId/month"
        element={<ChildMonthRoute />}
      />

      <Route
        path="/kids/:childId/tests"
        element={<ChildTestsRoute />}
      />

      <Route
        path="/kids/:childId/homework"
        element={<ChildHomeworkRoute />}
      />

      <Route
        path="/kids/:childId/documents"
        element={<ChildDocumentsRoute />}
      />

      {/* Scan and review */}
      <Route path="/scan" element={<ScanInboxView />} />

      <Route
        path="/scan/history"
        element={<ScanHistoryView />}
      />

      <Route
        path="/scan/review"
        element={<ReviewQueueView />}
      />

      <Route
        path="/scan/file/:documentId"
        element={<FileReviewRoute />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
