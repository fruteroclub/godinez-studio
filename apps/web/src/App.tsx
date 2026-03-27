import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PageLayout from "./components/layout/PageLayout";
import Shell from "./components/layout/Shell";
<<<<<<< Updated upstream

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
=======
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import WorkspaceSelector from "./pages/WorkspaceSelector";
import OnboardingWizard from "./pages/OnboardingWizard";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import ChatConversation from "./pages/ChatConversation";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Tasks from "./pages/Tasks";
import Files from "./pages/Files";
import Agents from "./pages/Agents";
import Activity from "./pages/Activity";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import { Hackathon } from "./pages/Hackathon";
>>>>>>> Stashed changes

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
        path: "/studio",
        element: (
          <ProtectedRoute>
            <LazyPage><WorkspaceSelector /></LazyPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "/studio/new",
        element: (
          <ProtectedRoute>
            <LazyPage><OnboardingWizard /></LazyPage>
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
<<<<<<< Updated upstream
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
=======
      { index: true, element: <Dashboard /> },
      { path: "chat", element: <Chat /> },
      { path: "chat/:conversationId", element: <ChatConversation /> },
      { path: "projects", element: <Projects /> },
      { path: "projects/:projectId", element: <ProjectDetail /> },
      { path: "tasks", element: <Tasks /> },
      { path: "files", element: <Files /> },
      { path: "agents", element: <Agents /> },
      { path: "hackathon", element: <Hackathon /> },
      { path: "activity", element: <Activity /> },
      { path: "team", element: <Team /> },
      { path: "settings", element: <Settings /> },
>>>>>>> Stashed changes
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
