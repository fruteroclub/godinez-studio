import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { RouterProvider } from "react-router-dom";
import QueryProvider from "./providers/QueryProvider";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { router } from "./App";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkKey} appearance={{ baseTheme: dark }}>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
);
