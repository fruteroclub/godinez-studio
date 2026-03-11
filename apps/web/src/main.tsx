import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import QueryProvider from "./providers/QueryProvider";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { router } from "./App";
import { initSentry } from "@/lib/sentry";
import { initPostHog } from "@/lib/posthog";
import { initClarity } from "@/lib/clarity";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

initSentry();
initPostHog();
initClarity();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkKey} appearance={{ baseTheme: dark }}>
        <QueryProvider>
          <RouterProvider router={router} />
          <Toaster
            theme="dark"
            position="bottom-right"
            duration={5000}
            closeButton
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
        </QueryProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
);
