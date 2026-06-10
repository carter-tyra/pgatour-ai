"use client";

import { cn } from "@/lib/utils";
import { sidebarNav } from "./nav.config";
import { SidebarSearch } from "./sidebar-search";
import { SidebarSection } from "./sidebar-section";
import { SocialLinks } from "./social-links";

export function SidebarPanel({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div
      className={cn(
        "flex w-[calc(var(--sidebar-width)-var(--aside-width))] max-w-(--sidebar-panel-width) min-w-0 flex-1 flex-col bg-sidebar",
      )}
    >
      <div className="border-sidebar-border border-b">
        <SidebarSearch />
      </div>

      <nav className="no-scrollbar flex-1 divide-y divide-sidebar-border overflow-y-auto">
        {sidebarNav.map((group) => (
          <SidebarSection key={group.id} group={group} {...(onNavigate ? { onNavigate } : {})} />
        ))}
      </nav>

      <SocialLinks />
    </div>
  );
}
