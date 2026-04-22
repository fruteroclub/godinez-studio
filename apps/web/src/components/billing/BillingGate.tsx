import { Navigate, useLocation } from "react-router-dom";
import { useBillingStatus } from "@/hooks/use-billing";

/**
 * Wraps protected routes to enforce billing state.
 *
 * Routing rules:
 * - Loading → spinner
 * - No active subscription (billing enabled) → redirect to /billing/checkout
 * - Active subscription, no workspace, on /studio → redirect to /studio/new
 * - Otherwise → render children
 */
export function BillingGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { data, isLoading, isError } = useBillingStatus();

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magenta" />
      </div>
    );
  }

  // On error, let the user through — the backend billing gate is the source of truth
  if (isError || !data) {
    return <>{children}</>;
  }

  // Billing enforcement only when flag is on
  if (data.billingEnabled && !data.hasActiveSubscription) {
    // Avoid loop if already on billing pages
    if (!location.pathname.startsWith("/billing/")) {
      return <Navigate to="/billing/checkout" replace />;
    }
  }

  // If user has subscription and no workspace, push to onboarding
  if (
    data.hasActiveSubscription &&
    !data.hasWorkspace &&
    location.pathname === "/studio"
  ) {
    return <Navigate to="/studio/new" replace />;
  }

  return <>{children}</>;
}
