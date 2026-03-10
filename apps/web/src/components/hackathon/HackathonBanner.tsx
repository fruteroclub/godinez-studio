import { useNavigate } from "react-router-dom";
import { useHackathons } from "../../hooks/use-hackathons";

interface HackathonBannerProps {
  workspaceId: number | undefined;
}

export function HackathonBanner({ workspaceId }: HackathonBannerProps) {
  const navigate = useNavigate();
  const { hackathons, getTimeRemaining } = useHackathons(workspaceId);

  // Get first active hackathon
  const activeHackathon = hackathons.find(h => h.active);
  
  if (!activeHackathon) return null;

  const timeRemaining = getTimeRemaining(activeHackathon);

  return (
    <button
      onClick={() => navigate("/hackathon")}
      className="
        w-full px-4 py-2 mb-4
        bg-gradient-to-r from-pink-500/20 to-purple-500/20
        border border-pink-500/30 rounded-lg
        flex items-center justify-between
        hover:from-pink-500/30 hover:to-purple-500/30
        transition-all
      "
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <span className="font-medium text-zinc-200">
          {activeHackathon.name}
        </span>
        <span className="text-zinc-400">·</span>
        <span className="text-zinc-400">
          Fase {activeHackathon.currentPhase} de 8
        </span>
        {hackathons.filter(h => h.active).length > 1 && (
          <>
            <span className="text-zinc-400">·</span>
            <span className="text-pink-400 text-sm">
              +{hackathons.filter(h => h.active).length - 1} más
            </span>
          </>
        )}
      </div>
      {timeRemaining && (
        <div className="flex items-center gap-1 text-zinc-400">
          <span>⏰</span>
          <span className="text-sm">{timeRemaining}</span>
        </div>
      )}
    </button>
  );
}
