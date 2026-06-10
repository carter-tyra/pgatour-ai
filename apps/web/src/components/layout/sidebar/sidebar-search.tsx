"use client";

import { Search } from "@carbon/icons-react";
import { CommandMenu } from "@/components/product/command-menu";
import { Kbd } from "@/components/ui/kbd";

export function SidebarSearch() {
  return (
    <CommandMenu
      shortcut
      trigger={
        <button
          type="button"
          className="flex h-(--aside-width) w-full items-center gap-3 px-4 text-left font-mono text-sm tracking-wide text-sidebar-foreground/60 uppercase transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Search</span>
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>
      }
    />
  );
}
