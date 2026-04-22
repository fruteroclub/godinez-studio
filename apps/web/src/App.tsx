import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PageLayout from "./components/layout/PageLayout";
import Shell from "./components/layout/Shell";
import { BillingGate } from "./components/billing/BillingGate";

// Lazy load pages for code splitting
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const WorkspaceSelector = lazy(() => import("./pages/WorkspaceSelector"));
const OnboardingWizard = lazy(() => import("./pages/OnboardingWizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatConversation = lazy(() => import("./pages/ChatConversation"));
const ChatNew = lazy(() => import("./pages/ChatNew"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Files = lazy(() => import("./pages/Files"));
const Agents = lazy(() => import("./pages/Agents"));
const Activity = lazy(() => import("./pages/Activity"));
const Team = lazy(() => import("./pages/Team"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Hackathon = lazy(() => import("./pages/Hackathon").then(m => ({ default: m.Hackathon })));
const BillingCheckout = lazy(() => import("./pages/BillingCheckout"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingCancel = lazy(() => import("./pages/BillingCancel"));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magenta" />
    </div>
  );
}

// Wrap lazy component with Suspense
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PageLayout />,
    children: [
      {
        path: "/sign-in/*",
        element: <LazyPage><SignIn /></LazyPage>,
      },
      {
        path: "/sign-up/*",
        element: <LazyPage><SignUp /></LazyPage>,
      },
      {
        path: "/billing/checkout",
        element: <LazyPage><BillingCheckout /></LazyPage>,
      },
      {
        path: "/billing/success",
        element: <LazyPage><BillingSuccess /></LazyPage>,
      },
      {
        path: "/billing/cancel",
        element: <LazyPage><BillingCancel /></LazyPage>,
      },
      {
        path: "/studio",
        element: (
          <ProtectedRoute>
            <BillingGate>
              <LazyPage><WorkspaceSelector /></LazyPage>
            </BillingGate>
          </ProtectedRoute>
        ),
      },
      {
        path: "/studio/new",
        element: (
          <ProtectedRoute>
            <BillingGate>
              <LazyPage><OnboardingWizard /></LazyPage>
            </BillingGate>
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
      { index: true, element: <LazyPage><Dashboard /></LazyPage> },
      { path: "chat", element: <LazyPage><Chat /></LazyPage> },
      { path: "chat/new", element: <LazyPage><ChatNew /></LazyPage> },
      { path: "chat/:conversationId", element: <LazyPage><ChatConversation /></LazyPage> },
      { path: "projects", element: <LazyPage><Projects /></LazyPage> },
      { path: "projects/:projectId", element: <LazyPage><ProjectDetail /></LazyPage> },
      { path: "tasks", element: <LazyPage><Tasks /></LazyPage> },
      { path: "files", element: <LazyPage><Files /></LazyPage> },
      { path: "agents", element: <LazyPage><Agents /></LazyPage> },
      { path: "hackathon", element: <LazyPage><Hackathon /></LazyPage> },
      { path: "activity", element: <LazyPage><Activity /></LazyPage> },
      { path: "team", element: <LazyPage><Team /></LazyPage> },
      { path: "settings", element: <LazyPage><Settings /></LazyPage> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <LazyPage><Admin /></LazyPage>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/studio" replace />,
  },
]);
