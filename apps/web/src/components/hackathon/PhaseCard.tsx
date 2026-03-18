import { PHASE_NAMES } from "../../hooks/use-hackathons";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";

interface PhaseCardProps {
  number: number;
  status: "done" | "current" | "pending";
  onClick?: () => void;
}

export function PhaseCard({ number, status, onClick }: PhaseCardProps) {
  const StatusIcon = {
    done: CheckCircle2,
    current: CircleDot,
    pending: Circle,
  }[status];

  const statusStyles = {
    done: "border-green-500/50 bg-green-500/10",
    current: "border-blue-500 bg-blue-500/20 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20",
    pending: "border-zinc-600 bg-zinc-800/50",
  };

  const iconStyles = {
    done: "text-green-400",
    current: "text-blue-400",
    pending: "text-zinc-500",
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
        hover:scale-105 
        ${statusStyles[status]}
      `}
    >
      <StatusIcon className={`w-6 h-6 mb-2 stroke-[1.5] ${iconStyles[status]}`} />
      <span className={`text-sm font-medium ${textStyles[status]}`}>
        Fase {number}
      </span>
      <span className={`text-xs mt-1 ${status === "pending" ? "text-zinc-500" : "text-zinc-300"}`}>
        {PHASE_NAMES[number]}
      </span>
    </button>
  );
}
