import { Link } from "react-router-dom";
import { content } from "@/lib/content";

const { billing } = content.studio;

export default function BillingSuccess() {
  return (
    <div className="flex items-center justify-center flex-1 p-8">
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))] mb-3">
          {billing.successTitle}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {billing.successMessage}
        </p>
        <Link
          to="/sign-in"
          className="inline-block rounded-md bg-magenta px-6 py-2.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
        >
          {billing.successCta}
        </Link>
      </div>
    </div>
  );
}
