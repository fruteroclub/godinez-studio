import { 
  Rocket, 
  Megaphone, 
  Briefcase, 
  Settings, 
  Monitor, 
  Headphones, 
  Puzzle,
  Globe,
  Target,
  Brain,
  Users,
  Pencil
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Role icons
export const ROLE_ICONS: Record<string, LucideIcon> = {
  founder: Pencil,
  marketing: Megaphone,
  sales: Briefcase,
  operations: Settings,
  tech: Monitor,
  support: Headphones,
  other: Puzzle,
};

// Need icons  
export const NEED_ICONS: Record<string, LucideIcon> = {
  launch: Rocket,
  automate: Settings,
  social: Globe,
  sales: Briefcase,
  time: Target,
  research: Brain,
  support: Users,
  build: Monitor,
};

// Helper component
export function RoleIcon({ roleId, className }: { roleId: string; className?: string }) {
  const Icon = ROLE_ICONS[roleId];
  if (!Icon) return null;
  return <Icon className={className || "w-4 h-4 stroke-[1.5]"} />;
}

export function NeedIcon({ needId, className }: { needId: string; className?: string }) {
  const Icon = NEED_ICONS[needId];
  if (!Icon) return null;
  return <Icon className={className || "w-6 h-6 stroke-[1.5]"} />;
}
