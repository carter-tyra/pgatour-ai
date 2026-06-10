"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isItemActive } from "./helpers";
import type { SidebarItem } from "./nav.config";
import { SidebarBadge } from "./sidebar-badge";

const DOT_CLASS = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
} as const;

export function SidebarLink({ item, onNavigate }: { item: SidebarItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isItemActive(pathname ?? "", item.href);

  return (
    <Link
      href={item.href}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-ml-[2px] flex items-center gap-2 border-l-2 py-1.5 pr-4 pl-4 font-mono text-sm tracking-wide uppercase transition-colors",
        active
          ? "border-primary bg-sidebar-accent/60 font-medium text-sidebar-foreground"
          : "border-transparent text-sidebar-foreground/60 hover:border-sidebar-foreground/40 hover:text-sidebar-foreground",
      )}
    >
      {item.dot && <span className={cn("size-2 shrink-0 rounded-full", DOT_CLASS[item.dot])} />}
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {item.badge && <SidebarBadge type={item.badge} className="ml-auto" />}
    </Link>
  );
}
