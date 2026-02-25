import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useProvision } from "@/hooks/use-provision";
import { Button } from "@/components/ui/button";
import { content } from "@/lib/content";

const { hatching } = content.studio;

export default function AgentHatching() {
  const navigate = useNavigate();
  const { workspace, slug } = useWorkspace();
  const provision = useProvision(slug);

  const handleProvision = () => {
    if (!workspace) return;
    provision.mutate(workspace.id, {
      onSuccess: (data) => {
        navigate(`/studio/${slug}/chat/${data.conversationId}`);
      },
    });
  };

  const errorMessage = provision.error
    ? provision.error.message.includes("CAPACITY_FULL")
      ? hatching.capacityFull
      : provision.error.message.includes("GATEWAY_OFFLINE")
        ? hatching.gatewayOffline
        : hatching.genericError
    : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse
              cx="24"
              cy="28"
              rx="16"
              ry="18"
              fill="hsl(var(--primary))"
              opacity="0.15"
            />
            <ellipse
              cx="24"
              cy="28"
              rx="14"
              ry="16"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M16 22 C20 16, 28 16, 32 22"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
            <circle cx="20" cy="28" r="2" fill="hsl(var(--primary))" />
            <circle cx="28" cy="28" r="2" fill="hsl(var(--primary))" />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-[hsl(var(--foreground))]">
          {hatching.title}
        </h2>
        <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
          {hatching.description}
        </p>

        <Button
          size="lg"
          onClick={handleProvision}
          disabled={provision.isPending}
        >
          {provision.isPending ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {hatching.creating}
            </>
          ) : (
            hatching.cta
          )}
        </Button>

        {errorMessage && (
          <p className="mt-4 text-sm text-[hsl(var(--destructive))]">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
