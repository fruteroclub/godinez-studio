import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBillingStatus } from "@/hooks/use-billing";
import { content } from "@/lib/content";

const { billing } = content.studio;
const MAX_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

export default function BillingSuccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const attempts = useRef(0);
  const { data, refetch } = useBillingStatus();

  useEffect(() => {
    if (data?.hasActiveSubscription) {
      navigate("/studio", { replace: true });
      return;
    }

    const interval = setInterval(async () => {
      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      const result = await refetch();
      if (result.data?.hasActiveSubscription) {
        clearInterval(interval);
        navigate("/studio", { replace: true });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [data, navigate, queryClient, refetch]);

  const timedOut = attempts.current >= MAX_ATTEMPTS && !data?.hasActiveSubscription;

  return (
    <div className="flex items-center justify-center flex-1 p-8">
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 max-w-md text-center">
        {timedOut ? (
          <>
            <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))] mb-3">
              {billing.successTitle}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              {billing.successMessage}
            </p>
            <a
              href="/studio"
              className="inline-block rounded-md bg-magenta px-6 py-2.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
            >
              {billing.successCta}
            </a>
          </>
        ) : (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-magenta border-t-transparent mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
              Activando tu suscripción...
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Esto tarda unos segundos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
