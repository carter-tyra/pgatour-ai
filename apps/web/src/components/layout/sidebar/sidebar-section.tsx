"use client";

import { Add, Subtract } from "@carbon/icons-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isGroupActive } from "./helpers";
import type { SidebarGroup } from "./nav.config";
import { SidebarLink } from "./sidebar-link";

export function SidebarSection({
  group,
  onNavigate,
}: {
  group: SidebarGroup;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);
  const pathname = usePathname();
  const active = isGroupActive(pathname ?? "", group);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex min-h-(--aside-width) items-center gap-2 px-4 py-5 text-left transition-colors hover:bg-sidebar-accent",
          active && "text-sidebar-foreground/80",
        )}
      >
        <group.icon className="size-4" aria-hidden="true" />
        <span className="font-mono text-sm font-medium tracking-wide uppercase">{group.label}</span>
        <span className="ml-auto text-sidebar-foreground/50">
          {open ? <Subtract className="size-3" /> : <Add className="size-3" />}
        </span>
      </button>

      {open && (
        <>
          <div className="ml-4 flex flex-col border-sidebar-border border-l-2">
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} {...(onNavigate ? { onNavigate } : {})} />
            ))}
          </div>
          <div className="ml-4 h-3 border-sidebar-border border-l-2" />
        </>
      )}
    </div>
  );
}
