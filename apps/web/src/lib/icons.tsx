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
  Pencil,
  // Project types
  GraduationCap,
  Building2,
  User,
  // Project subtypes - educacion
  BookOpen,
  Lightbulb,
  // Project subtypes - personal
  Trophy,
  Wrench,
  // Project subtypes - profesional
  PenTool,
  Cog,
  Code,
  Search,
  DollarSign,
  ClipboardList,
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

// Project type icons
export const PROJECT_TYPE_ICONS: Record<string, LucideIcon> = {
  educacion: GraduationCap,
  profesional: Building2,
  personal: User,
};

// Project subtype icons
export const PROJECT_SUBTYPE_ICONS: Record<string, LucideIcon> = {
  // educacion
  bootcamp: GraduationCap,
  aprender: BookOpen,
  // personal
  hackathon: Trophy,
  emprendimiento: Lightbulb,
  proyecto: Wrench,
  // profesional
  crear_contenido: PenTool,
  automatizar: Cog,
  construir: Code,
  investigar: Search,
  vender: DollarSign,
  organizar: ClipboardList,
};

// Helper components
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

export function ProjectTypeIcon({ typeId, className }: { typeId: string; className?: string }) {
  const Icon = PROJECT_TYPE_ICONS[typeId];
  if (!Icon) return null;
  return <Icon className={className || "w-6 h-6 stroke-[1.5]"} />;
}

export function ProjectSubtypeIcon({ subtypeId, className }: { subtypeId: string; className?: string }) {
  const Icon = PROJECT_SUBTYPE_ICONS[subtypeId];
  if (!Icon) return null;
  return <Icon className={className || "w-5 h-5 stroke-[1.5]"} />;
}
