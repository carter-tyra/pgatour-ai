"use client";

import { Rotate } from "@carbon/icons-react";
import * as React from "react";

import { TabsListV2, TabsPanelV2, TabsTabV2, TabsV2 } from "@/components/ui/tabs-v2";
import { LazyMount } from "@/components/utils/lazy-mount";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

export type CardContainerTab = {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
};

export function CardContainer({
  className,
  containerClassName,
  align = "center",
  defaultValue,
  title,
  tabs,
  ...props
}: React.ComponentProps<"div"> & {
  containerClassName?: string;
  align?: "center" | "start" | "end";
  defaultValue?: string;
  title?: string;
  tabs: readonly CardContainerTab[];
}) {
  const isMobile = useBreakpoint(768);
  const displayTitle = title?.includes("=") && isMobile ? title.split("=")[0] : title;
  const [reloadKey, setReloadKey] = React.useState(0);

  if (tabs.length === 0) {
    throw new Error("CardContainer requires at least one tab.");
  }

  const initialValue = defaultValue ?? tabs[0]?.value;

  if (!tabs.some((tab) => tab.value === initialValue)) {
    throw new Error(`CardContainer default tab "${initialValue}" does not exist.`);
  }

  return (
    <div className={cn("group relative mt-4 mb-12", className)} {...props}>
      <TabsV2 defaultValue={initialValue} className="relative w-full">
        <div
          className={cn(
            "dark:bg-primary-foreground flex flex-col rounded-[8px] bg-[#F5F5F5] p-1",
            containerClassName,
          )}
        >
          <div className="flex flex-row items-center justify-between px-2">
            <span className="text-muted-foreground dark:text-muted-foreground/80 flex items-center gap-1.5 font-mono text-xs [&_svg]:size-3.5">
              <span className="line-clamp-1">{displayTitle}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                aria-label="Reload preview"
                className="text-muted-foreground hover:text-foreground flex size-3 shrink-0 translate-x-1 cursor-pointer items-center justify-center opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              >
                <Rotate
                  aria-hidden="true"
                  role="presentation"
                  className="size-4! transition-transform duration-500 ease-out"
                  style={{ transform: `rotate(${reloadKey * 360}deg)` }}
                />
              </button>
              <TabsListV2 variant="underline">
                {tabs.map((tab) => (
                  <TabsTabV2
                    key={tab.value}
                    className="h-5! px-1.5 hover:bg-transparent!"
                    value={tab.value}
                  >
                    {tab.label}
                  </TabsTabV2>
                ))}
              </TabsListV2>
            </div>
          </div>

          <div className="bg-background overflow-hidden rounded-[5px] border">
            {tabs.map((tab) => (
              <TabsPanelV2 key={tab.value} value={tab.value}>
                <div
                  className={cn(
                    "flex h-64 w-full justify-center overflow-y-auto data-[align=center]:items-center data-[align=end]:items-end data-[align=start]:items-start sm:h-90",
                  )}
                  data-align={align}
                >
                  <div
                    className="no-scrollbar h-full w-full [&>svg]:select-none"
                    data-slot="preview"
                  >
                    <LazyMount
                      fallback={<div className="flex size-full items-center justify-center" />}
                    >
                      <React.Fragment key={`${tab.value}-${reloadKey}`}>
                        {tab.content}
                      </React.Fragment>
                    </LazyMount>
                  </div>
                </div>
              </TabsPanelV2>
            ))}
          </div>
        </div>
      </TabsV2>
    </div>
  );
}
