import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { identifyUser } from "@/lib/posthog";

export function usePostHogIdentify() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    identifyUser(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName,
    });
  }, [isLoaded, user]);
}
