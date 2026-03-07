import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PageLayout from "./components/layout/PageLayout";
import Shell from "./components/layout/Shell";
import { PageSkeleton } from "./components/ui/Skeleton";

// Lazy-loaded pages
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const WorkspaceSelector = lazy(() => import("./pages/WorkspaceSelector"));
const OnboardingWizard = lazy(() => import("./pages/OnboardingWizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatConversation = lazy(() => import("./pages/ChatConversation"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Files = lazy(() => import("./pages/Files"));
const Agents = lazy(() => import("./pages/Agents"));
const Activity = lazy(() => import("./pages/Activity"));
const Team = lazy(() => import("./pages/Team"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <PageLayout />,
    children: [
      {
        path: "/sign-in/*",
        element: <SuspenseWrapper><SignIn /></SuspenseWrapper>,
      },
      {
        path: "/sign-up/*",
        element: <SuspenseWrapper><SignUp /></SuspenseWrapper>,
      },
      {
        path: "/studio",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><WorkspaceSelector /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: "/studio/new",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><OnboardingWizard /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/studio/:slug",
    element: (
      <ProtectedRoute>
        <Shell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><Dashboard /></SuspenseWrapper> },
      { path: "chat", element: <SuspenseWrapper><Chat /></SuspenseWrapper> },
      { path: "chat/:conversationId", element: <SuspenseWrapper><ChatConversation /></SuspenseWrapper> },
      { path: "projects", element: <SuspenseWrapper><Projects /></SuspenseWrapper> },
      { path: "projects/:projectId", element: <SuspenseWrapper><ProjectDetail /></SuspenseWrapper> },
      { path: "tasks", element: <SuspenseWrapper><Tasks /></SuspenseWrapper> },
      { path: "files", element: <SuspenseWrapper><Files /></SuspenseWrapper> },
      { path: "agents", element: <SuspenseWrapper><Agents /></SuspenseWrapper> },
      { path: "activity", element: <SuspenseWrapper><Activity /></SuspenseWrapper> },
      { path: "team", element: <SuspenseWrapper><Team /></SuspenseWrapper> },
      { path: "settings", element: <SuspenseWrapper><Settings /></SuspenseWrapper> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <SuspenseWrapper><Admin /></SuspenseWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/studio" replace />,
  },
]);
