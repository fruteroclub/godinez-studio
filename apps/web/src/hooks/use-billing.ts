import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface BillingStatus {
  authenticated: boolean;
  hasAccount: boolean;
  subscriptionStatus: string;
  hasActiveSubscription: boolean;
  hasWorkspace: boolean;
  workspaceSlug: string | null;
  billingEnabled: boolean;
}

export function useBillingStatus() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<BillingStatus>("/api/billing/status", { token });
    },
    enabled: !!isSignedIn,
    staleTime: 30_000,
  });
}

export function useBillingPortal() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiFetch<{ url: string }>("/api/billing/portal", { token });
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
