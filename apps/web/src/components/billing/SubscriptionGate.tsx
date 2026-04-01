import { useBillingPortal } from "@/hooks/use-billing";
import { content } from "@/lib/content";

const { billing } = content.studio;

export default function SubscriptionGate() {
  const portal = useBillingPortal();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 max-w-md">
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
          {billing.gateTitle}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {billing.gateMessage}
        </p>
        <button
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="rounded-md bg-magenta px-6 py-2.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          {portal.isPending ? billing.gateCtaLoading : billing.gateCta}
        </button>
      </div>
    </div>
  );
}
