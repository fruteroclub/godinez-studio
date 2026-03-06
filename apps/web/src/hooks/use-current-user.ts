import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { CurrentUser } from "@godinez/types";
import { apiFetch } from "@/lib/api";

export function useCurrentUser() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<CurrentUser>("/api/users/me", { token });
    },
    staleTime: 5 * 60 * 1000,
  });
}
