"use client";

import type { ComponentProps } from "react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { IconRail } from "./icon-rail";
import { SidebarPanel } from "./sidebar-panel";

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar();

  function handleNavigate() {
    if (isMobile) {
      window.setTimeout(() => setOpenMobile(false), 0);
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent className="flex-row p-0">
        <IconRail onNavigate={handleNavigate} />
        <SidebarPanel onNavigate={handleNavigate} />
      </SidebarContent>
    </Sidebar>
  );
}
