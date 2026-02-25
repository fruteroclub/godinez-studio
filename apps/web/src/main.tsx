import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { RouterProvider } from "react-router-dom";
import QueryProvider from "./providers/QueryProvider";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { router } from "./App";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkKey}>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
);
