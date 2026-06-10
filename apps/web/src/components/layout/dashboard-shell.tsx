"use client";

import type { CSSProperties, ReactNode } from "react";
import DecorativeBorder from "@/components/layout/decorative-border";
import { Header } from "@/components/layout/header";
import { AppSidebar } from "@/components/layout/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { DashboardShellData } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function DashboardShell({
  shell: _shell,
  children,
}: {
  shell: DashboardShellData;
  children: ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "calc(var(--aside-width) + var(--sidebar-panel-width))",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <div className={cn("w-full bg-sidebar", "p-0 sm:p-2")}>
        <DecorativeBorder />
        <div
          className={cn(
            "no-scrollbar overflow-scroll bg-background sm:h-[calc(100vh-1rem)] sm:overscroll-none sm:border",
            "sm:rounded-tl-md sm:rounded-br-xl sm:rounded-bl-md",
          )}
        >
          <SidebarInset>
            <div className="flex min-h-[calc(100svh-3rem)] flex-col">
              <Header />
              <div className="px-5 pt-4 pb-10 lg:px-8">{children}</div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
