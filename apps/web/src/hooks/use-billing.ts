import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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
