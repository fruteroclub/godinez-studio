import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PageLayout from "./components/layout/PageLayout";
import Shell from "./components/layout/Shell";
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

export const router = createBrowserRouter([
  {
    element: <PageLayout />,
    children: [
      {
        path: "/sign-in/*",
        element: <SignIn />,
      },
      {
        path: "/sign-up/*",
        element: <SignUp />,
      },
      {
        path: "/studio",
        element: (
          <ProtectedRoute>
            <WorkspaceSelector />
          </ProtectedRoute>
        ),
      },
      {
        path: "/studio/new",
        element: (
          <ProtectedRoute>
            <OnboardingWizard />
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
      { index: true, element: <Dashboard /> },
      { path: "chat", element: <Chat /> },
      { path: "chat/:conversationId", element: <ChatConversation /> },
      { path: "projects", element: <Projects /> },
      { path: "projects/:projectId", element: <ProjectDetail /> },
      { path: "tasks", element: <Tasks /> },
      { path: "files", element: <Files /> },
      { path: "agents", element: <Agents /> },
      { path: "activity", element: <Activity /> },
      { path: "team", element: <Team /> },
      { path: "settings", element: <Settings /> },
      { path: "admin", element: <Admin /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/studio" replace />,
  },
]);
