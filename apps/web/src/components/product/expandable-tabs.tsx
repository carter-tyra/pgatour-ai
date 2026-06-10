"use client";

import {
  Book,
  ChevronRight,
  Folder,
  Home,
  Logout,
  Notification,
  Security,
  Settings,
  Upgrade,
  User,
} from "@carbon/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import useMeasure from "react-use-measure";
import { cn } from "@/lib/utils";

const icons = {
  house: <Home className="size-4" />,
  bell: <Notification className="size-4" />,
  settings: <Settings className="size-4" />,
  book: <Book className="size-4" />,
  shield: <Security className="size-4" />,
  user: <User className="size-4" />,
  upgrade: <Upgrade className="size-4" />,
  folder: <Folder className="size-4" />,
  logout: <Logout className="size-4" />,
  chevron: <ChevronRight className="size-4" />,
};

export const StatusBar = ({
  filled,
  total = 29,
  color,
}: {
  filled: number;
  total?: number;
  color?: string;
}) => (
  <div className="flex h-10 w-full justify-between gap-1">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i.toString()}
        className={cn(
          "flex h-10 w-0.5 items-center justify-center rounded-full",
          i < filled ? `bg-${color}` : "bg-muted-foreground/10",
        )}
      />
    ))}
  </div>
);

export const MenuItem = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="hover:bg-primary-foreground/5 flex h-10 cursor-pointer items-center justify-between gap-2 rounded-xl px-2 text-sm font-medium transition-colors">
    <span className="flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className="text-muted-foreground/50">{icons.chevron}</span>
  </div>
);

export const ToggleRow = ({ label, on }: { label: string; on: boolean }) => (
  <div className="flex h-9 items-center justify-between px-2">
    <span className="text-sm font-medium">{label}</span>
    <div
      className="relative h-5 w-9 rounded-full transition-colors"
      style={{ backgroundColor: on ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.06)" }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full transition-all shadow-sm"
        style={{
          left: on ? "18px" : "2px",
          backgroundColor: on ? "#3b82f6" : "#fff",
        }}
      />
    </div>
  </div>
);

export const NotifRow = ({ dot, title, time }: { dot: string; title: string; time: string }) => (
  <div className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-primary-foreground/5 cursor-pointer transition-colors">
    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
      <span className="text-xs font-medium leading-tight text-primary/90">{title}</span>
      <span className="text-xs text-muted-foreground/70">{time}</span>
    </div>
  </div>
);

export const ChangelogRow = ({
  version,
  desc,
  badge,
  badgeColor,
}: {
  version: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
}) => (
  <div className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-primary-foreground/5 cursor-pointer transition-colors">
    <span className="mt-0.5 shrink-0 text-[10px] font-mono font-medium text-muted-foreground/70">
      {version}
    </span>
    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
      <span className="text-xs font-medium leading-tight text-primary">{desc}</span>
      <span
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: badgeColor }}
      >
        {badge}
      </span>
    </div>
  </div>
);

export type ExpandableTabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

const NAV_H = 50;
const DEFAULT_EXPANDED_W = 290;
const DEFAULT_COLLAPSED_W = 200;

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0, filter: "blur(4px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ x: dir * -32, opacity: 0, filter: "blur(4px)" }),
};

const SPRING = { type: "spring" as const, stiffness: 340, damping: 28 };
const EASE = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};
const SLIDE_T = {
  duration: 0.24,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

/**
 * A morphing multi-panel dock. Renders a row of icon tabs that spring open to
 * reveal the active tab's panel; clicking the active tab collapses it. Pass
 * your own `tabs` (id/label/icon/content). Renders just the card — wrap it in a
 * positioned element (e.g. `fixed bottom-6 right-6`) so it grows upward.
 */
export function ExpandableTab({
  tabs,
  defaultActiveId,
  expandedWidth = DEFAULT_EXPANDED_W,
  collapsedWidth = DEFAULT_COLLAPSED_W,
  className,
}: {
  tabs: ExpandableTabItem[];
  /** Tab open on mount. `null` starts collapsed. Defaults to the first tab. */
  defaultActiveId?: string | null;
  expandedWidth?: number;
  collapsedWidth?: number;
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(
    defaultActiveId === undefined ? (tabs[0]?.id ?? null) : defaultActiveId,
  );
  const [direction, setDirection] = useState(0);
  const prevIdxRef = useRef(0);

  const [ghostRef, { height: contentHeight }] = useMeasure({ debounce: 0 });

  const activeTab = tabs.find((t) => t.id === activeId);
  const isExpanded = activeId !== null;
  const cardHeight = isExpanded ? contentHeight + NAV_H : NAV_H;

  const handleNavClick = (id: string) => {
    const newIdx = tabs.findIndex((t) => t.id === id);
    if (id === activeId) {
      setActiveId(null);
      return;
    }
    setDirection(newIdx > prevIdxRef.current ? 1 : -1);
    prevIdxRef.current = newIdx;
    setActiveId(id);
  };

  return (
    <>
      {isExpanded && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            width: expandedWidth,
            pointerEvents: "none",
            visibility: "hidden",
          }}
        >
          <div ref={ghostRef} className="p-2">
            {activeTab?.content}
          </div>
        </div>
      )}
      <motion.div
        className={`bg-toolbar relative mx-auto rounded-3xl border border-primary-foreground/10 shadow-xl shadow-primary/10${className ? ` ${className}` : ""}`}
        style={{ overflow: "hidden" }}
        animate={{
          height: cardHeight,
          width: isExpanded ? expandedWidth : collapsedWidth,
        }}
        transition={SPRING}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: NAV_H,
            overflow: "hidden",
          }}
        >
          <AnimatePresence custom={direction} initial={false}>
            {isExpanded && (
              <motion.div
                key={activeId}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={SLIDE_T}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
                className="p-2"
              >
                {activeTab?.content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="bg-toolbar absolute bottom-0 left-0 right-0 p-2 border-t border-primary-foreground/10"
          style={{ height: NAV_H }}
        >
          <div className="flex h-9 w-full items-center justify-center gap-1">
            {tabs.map((tab) => {
              const isActive = activeId === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleNavClick(tab.id)}
                  className="relative flex h-full items-center justify-center rounded-2xl text-sm font-semibold"
                  animate={{
                    paddingLeft: isActive ? "1rem" : "0.5rem",
                    paddingRight: isActive ? "1rem" : "0.5rem",
                    gap: isActive ? "0.5rem" : "0rem",
                    backgroundColor: isActive ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0)",
                    color: isActive ? "#18181b" : "#a1a1aa",
                  }}
                  transition={EASE}
                  whileHover={{ color: isActive ? "#18181b" : "#71717a" }}
                >
                  {tab.icon}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key={`${tab.id}-lbl`}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{
                          opacity: { duration: 0.15, ease: "easeInOut" },
                          width: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
                        }}
                        className="overflow-hidden leading-4 whitespace-nowrap font-semibold tracking-tight"
                      >
                        {tab.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
