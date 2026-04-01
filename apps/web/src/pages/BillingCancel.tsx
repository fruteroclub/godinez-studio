import { Link } from "react-router-dom";
import { content } from "@/lib/content";

const { billing } = content.studio;

export default function BillingCancel() {
  return (
    <div className="flex items-center justify-center flex-1 p-8">
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-3">
          {billing.cancelTitle}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {billing.cancelMessage}
        </p>
        <Link
          to="/billing/checkout"
          className="inline-block rounded-md bg-magenta px-6 py-2.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
        >
          {billing.cancelCta}
        </Link>
      </div>
    </div>
  );
}
