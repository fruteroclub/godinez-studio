import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  url: string;
}

// Color del borde según servicio
function getBorderColor(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("github.com")) return "border-l-zinc-400";
    if (hostname.includes("figma.com")) return "border-l-purple-500";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "border-l-red-500";
    if (hostname.includes("loca.lt") || hostname.includes("ngrok") || hostname.includes("trycloudflare")) return "border-l-green-500";
    if (hostname.includes("vercel")) return "border-l-white";
  } catch {}
  return "border-l-zinc-500";
}

// Título corto
function getTitle(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");
    const path = parsed.pathname.split("/").filter(Boolean);
    
    if (hostname.includes("github.com") && path.length >= 2) {
      return `${path[0]}/${path[1]}`;
    }
    if (hostname.includes("loca.lt") || hostname.includes("ngrok") || hostname.includes("trycloudflare")) {
      return "Preview en vivo";
    }
    return path[path.length - 1] || hostname;
  } catch {
    return url;
  }
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const borderColor = getBorderColor(url);
  const title = getTitle(url);
  
  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace("www.", "");
  } catch {
    hostname = url;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-2 px-2 py-1 my-1
        text-sm rounded border-l-2 ${borderColor}
        bg-zinc-800/50 hover:bg-zinc-700/50
        transition-colors
      `}
    >
      <span className="text-zinc-200 truncate max-w-[200px]">{title}</span>
      <span className="text-zinc-500 text-xs hidden sm:inline">{hostname}</span>
      <ExternalLink className="w-3 h-3 text-zinc-500" />
    </a>
  );
}
