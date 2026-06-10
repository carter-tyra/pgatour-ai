"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/product/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isGroupActive } from "./helpers";
import { brand, sidebarNav } from "./nav.config";

export function IconRail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex w-(--aside-width) shrink-0 flex-col border-sidebar-border border-r">
      <Link
        href={brand.href}
        aria-label={brand.label}
        {...(onNavigate ? { onClick: onNavigate } : {})}
        className="flex size-(--aside-width) items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <brand.icon className="size-5" aria-hidden="true" />
      </Link>

      <div className="flex flex-1 flex-col">
        {sidebarNav.map((group) => {
          const active = isGroupActive(pathname ?? "", group);
          const href = group.items[0]?.href ?? brand.href;

          return (
            <Tooltip key={group.id}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    {...(onNavigate ? { onClick: onNavigate } : {})}
                    aria-label={group.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex size-(--aside-width) items-center justify-center transition-colors hover:bg-sidebar-accent",
                      active
                        ? "text-sidebar-foreground"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground",
                    )}
                  />
                }
              >
                <group.icon className="size-5" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {group.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="grid place-items-center border-sidebar-border border-t py-3">
        <ThemeToggle />
      </div>
    </div>
  );
}
