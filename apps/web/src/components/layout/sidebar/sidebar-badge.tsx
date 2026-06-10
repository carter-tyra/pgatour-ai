import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SidebarBadgeType } from "./nav.config";

const LABELS: Record<SidebarBadgeType, string> = {
  new: "NEW",
  updated: "UPD",
  internal: "INT",
};

export function SidebarBadge({ type, className }: { type: SidebarBadgeType; className?: string }) {
  return (
    <Badge
      variant={type === "internal" ? "outline" : "secondary"}
      className={cn("h-4 px-1.5 font-mono text-[10px] tracking-wide", className)}
    >
      {LABELS[type]}
    </Badge>
  );
}
