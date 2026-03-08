import { PHASE_NAMES } from "../../hooks/use-hackathons";

interface PhaseCardProps {
  number: number;
  status: "done" | "current" | "pending";
  onClick?: () => void;
}

export function PhaseCard({ number, status, onClick }: PhaseCardProps) {
  const statusIcon = {
    done: "✅",
    current: "🔵",
    pending: "⚪",
  };

  const statusStyles = {
    done: "border-green-500/50 bg-green-500/10",
    current: "border-blue-500 bg-blue-500/20 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20",
    pending: "border-zinc-600 bg-zinc-800/50",
  };

  const textStyles = {
    done: "text-green-300",
    current: "text-blue-300",
    pending: "text-zinc-400",
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center
        p-4 rounded-lg border transition-all
        hover:scale-105 hover:border-pink-500/50
        ${statusStyles[status]}
      `}
    >
      <span className="text-2xl mb-2">{statusIcon[status]}</span>
      <span className={`text-sm font-medium ${textStyles[status]}`}>
        Fase {number}
      </span>
      <span className={`text-xs mt-1 ${status === "pending" ? "text-zinc-500" : "text-zinc-300"}`}>
        {PHASE_NAMES[number]}
      </span>
    </button>
  );
}
