import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";

const FALLBACK_TIMEOUT_MS = 10000;

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyFired = useRef(false);
  const fallbackFired = useRef(false);

  useEffect(() => {
    if (verifyFired.current) return;
    verifyFired.current = true;

    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      // No session_id — fallback handled by timeout below
      return;
    }

    const verify = async () => {
      try {
        const data = await apiFetch<{ verified: boolean; reason?: string }>(
          `/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (data.verified) {
          navigate("/studio", { replace: true });
        }
        // If not verified yet (payment_pending), the fallback timeout will handle it
      } catch {
        // Network/server error — fallback timeout will handle it
      }
    };

    verify();
  }, [searchParams, navigate]);

  // Fallback: navigate anyway after timeout so user isn't stuck
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
