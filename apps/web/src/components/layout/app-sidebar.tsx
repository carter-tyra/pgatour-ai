"use client";

import { Activity, Bot, CurrencyDollar, Radio, Search, Trophy, Wallet } from "@carbon/icons-react";
import type { IconProps } from "@carbon/icons-react/lib/Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { EventReadinessStatus, ModelQualityStatus } from "@/lib/intelligence-types";
import { cn } from "@/lib/utils";

export type AppSectionId = "research" | "betting" | "fantasy" | "live" | "portfolio" | "ai";

export const appSections: Array<{
  id: AppSectionId;
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
}> = [
  {
    id: "research",
    label: "Research",
    href: "/dashboard/research",
    icon: Search as React.ComponentType<IconProps>,
  },
  {
    id: "betting",
    label: "Betting",
    href: "/dashboard/betting",
    icon: CurrencyDollar as React.ComponentType<IconProps>,
  },
  {
    id: "fantasy",
    label: "Fantasy",
    href: "/dashboard/fantasy",
    icon: Trophy as React.ComponentType<IconProps>,
  },
  {
    id: "live",
    label: "Live",
    href: "/dashboard/live",
    icon: Radio as React.ComponentType<IconProps>,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/dashboard/portfolio",
    icon: Wallet as React.ComponentType<IconProps>,
  },
  {
    id: "ai",
    label: "Brandel",
    href: "/dashboard/ai",
    icon: Bot as React.ComponentType<IconProps>,
  },
];

export function AppSidebar({
  eventName,
  courseName,
  modelVersion,
  dataFreshness,
  bestEdge,
  exposure,
  modelQualityHelper,
  modelQualityLabel,
  modelQualityStatus,
  readinessHelper,
  readinessLabel,
  readinessScore,
  readinessStatus,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  eventName: string;
  courseName: string;
  modelVersion: string;
  dataFreshness: string;
  bestEdge: string;
  exposure: string;
  modelQualityHelper: string;
  modelQualityLabel: string;
  modelQualityStatus: ModelQualityStatus;
  readinessHelper: string;
  readinessLabel: string;
  readinessScore: number;
  readinessStatus: EventReadinessStatus;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const readinessClassName = {
    missing: "border-amber-200 bg-amber-50 text-amber-900",
    partial: "border-amber-200 bg-amber-50 text-amber-900",
    pending: "border-amber-200 bg-amber-50 text-amber-900",
    ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
    unavailable: "border-red-200 bg-red-50 text-red-900",
  } satisfies Record<EventReadinessStatus, string>;
  const qualityTitle = `${modelQualityLabel}: ${modelQualityHelper}`;

  function closeOnMobile() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader className="items-center gap-0 border-sidebar-border/70 border-b px-0 py-4">
        <SidebarMenuButton
          aria-label="PGA Tour AI"
          className="grid size-12 place-items-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_14px_32px_oklch(0.2_0.006_95/0.14)]"
          render={<Link href="/dashboard/betting" />}
          tooltip="PGA Tour AI"
        >
          <Activity className="size-5" />
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent className={cn("right-sidebar-top-fade select-none", "pt-2")}>
        <SidebarMenu className="items-center gap-3">
          {appSections.map((section) => {
            const isActive = pathname?.startsWith(section.href) ?? false;

            return (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton
                  aria-current={isActive ? "page" : undefined}
                  aria-label={section.label}
                  className={cn(
                    "size-12! justify-center rounded-[1rem] border border-transparent p-0 text-sidebar-foreground/52 transition duration-200 hover:-translate-y-0.5 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                    "data-active:border-sidebar-border data-active:bg-card data-active:text-primary data-active:shadow-[0_1px_0_oklch(1_0_0/0.8),0_12px_30px_oklch(0.2_0.006_95/0.08)]",
                  )}
                  isActive={isActive}
                  render={<Link href={section.href} onClick={closeOnMobile} />}
                  tooltip={section.label}
                >
                  <section.icon className="size-5" aria-hidden="true" aria-label={section.label} />
                  <span className="sr-only">{section.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="items-center border-sidebar-border/70 border-t px-0 py-4">
        <div
          className={cn(
            "grid size-11 place-items-center rounded-full border text-xs font-semibold tabular-nums",
            readinessClassName[readinessStatus],
          )}
          title={`${eventName} / ${readinessLabel} / ${readinessHelper} / ${qualityTitle}`}
        >
          <span aria-hidden="true">{readinessScore}</span>
          <span className="sr-only">
            {eventName}, {courseName}. {dataFreshness}. {modelVersion}. Model quality{" "}
            {modelQualityStatus}. {qualityTitle} Best edge {bestEdge}. Exposure {exposure}.{" "}
            {readinessLabel}. {readinessScore} percent ready. {readinessHelper}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
