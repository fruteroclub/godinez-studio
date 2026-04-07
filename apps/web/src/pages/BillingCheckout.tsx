import { useEffect, useState } from "react";
import { content } from "@/lib/content";

const { billing } = content.studio;

export default function BillingCheckout() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    fetch(`${apiUrl}/api/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then(({ url }) => {
        if (url) window.location.href = url;
        else setError(billing.checkoutErrorNoUrl);
      })
      .catch(() => setError(billing.checkoutError));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
        >
          {billing.cancelCta}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-magenta border-t-transparent" />
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {billing.checkoutLoading}
      </p>
    </div>
  );
}
