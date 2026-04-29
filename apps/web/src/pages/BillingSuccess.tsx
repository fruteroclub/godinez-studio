import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { BillingStatus } from "@/hooks/use-billing";

const FALLBACK_TIMEOUT_MS = 5000;

export default function BillingSuccess() {
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const fallbackFired = useRef(false);

  const { data } = useQuery({
    queryKey: ["billing-status-success"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<BillingStatus>("/api/billing/status", { token });
    },
    enabled: !!isSignedIn,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.hasActiveSubscription ? false : 2000,
  });

  // Navigate as soon as subscription is confirmed active
  useEffect(() => {
    if (data?.hasActiveSubscription) {
      navigate("/studio", { replace: true });
    }
  }, [data, navigate]);

  // Fallback: if Clerk cookies are rejected or query stalls, go to /studio
  // after a timeout — BillingGate there will handle the auth check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fallbackFired.current) {
        fallbackFired.current = true;
        navigate("/studio", { replace: true });
      }
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center flex-1 p-8">
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 max-w-md text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-magenta border-t-transparent mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
          Activando tu suscripción...
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Esto tarda unos segundos.
        </p>
      </div>
    </div>
  );
}
