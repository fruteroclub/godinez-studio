import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { RouterProvider } from "react-router-dom";
import QueryProvider from "./providers/QueryProvider";
import { router } from "./App";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ClerkProvider>
  </StrictMode>,
);
