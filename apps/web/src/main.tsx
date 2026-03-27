import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";
import { initClarity } from "./lib/clarity";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { RouterProvider } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import QueryProvider from "./providers/QueryProvider";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { router } from "./App";
import "./index.css";

// Initialize tracking & monitoring
initSentry();
initPostHog();
initClarity();
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL;

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <ClerkProvider publishableKey={clerkKey} appearance={{ baseTheme: dark }}>
          <QueryProvider>
            <RouterProvider router={router} />
          </QueryProvider>
        </ClerkProvider>
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>,
);
