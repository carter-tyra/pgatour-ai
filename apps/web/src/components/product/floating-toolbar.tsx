"use client";

import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FloatingToolbar({
  items = [],
  className = "",
  onSelect,
  activeId,
}: Readonly<{
  items: { id: string; label: string; icon: React.ReactNode; shortcut: string; hasDot: boolean }[];
  className?: string;
  onSelect?: (id: string) => void;
  /** Optional controlled active id — keeps the highlight in sync with external state (e.g. keyboard shortcuts). */
  activeId?: string;
}>) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [internalActive, setInternalActive] = useState<string | undefined>(items[0]?.id as string);
  const activeTab = activeId ?? internalActive;
  const [direction, setDirection] = useState(0);

  const handleHover = (id: string) => {
    if (hoveredTab !== null && id !== null) {
      const prevIndex = items.findIndex((item) => item.id === hoveredTab);
      const nextIndex = items.findIndex((item) => item.id === id);
      setDirection(nextIndex > prevIndex ? 1 : -1);
    }
    setHoveredTab(id);
  };

  const handleSelect = (id: string) => {
    setInternalActive(id);
    if (onSelect) {
      onSelect(id);
    }
  };

  const hoveredItem = items.find((item) => item.id === hoveredTab);
  const hoveredIndex = items.findIndex((item) => item.id === hoveredTab);

  const ITEM_WIDTH = 44;
  const GAP = 4;
  const PADDING = 6;

  const tooltipX = hoveredItem ? PADDING + hoveredIndex * (ITEM_WIDTH + GAP) + ITEM_WIDTH / 2 : 0;
  const bgX = hoveredItem ? PADDING + hoveredIndex * (ITEM_WIDTH + GAP) : 0;

  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
      <div
        aria-hidden="true"
        role="presentation"
        className="relative flex items-center gap-1 p-1.5 rounded-full bg-toolbar border border-border shadow-xl shadow-primary/10"
        onMouseLeave={() => setHoveredTab(null)}
      >
        <AnimatePresence>
          {hoveredTab && (
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-11 w-11 bg-zinc-900 rounded-full"
              initial={{ opacity: 0, x: bgX, scale: 0.95 }}
              animate={{ opacity: 1, x: bgX, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </AnimatePresence>

        {items.map((item) => (
          <ToolbarItem
            key={item.id}
            item={item}
            setHoveredTab={handleHover}
            isActive={activeTab === item.id}
            setActiveTab={handleSelect}
          />
        ))}

        <AnimatePresence>
          {hoveredItem && (
            <motion.div
              key="tooltip"
              className="absolute -top-12 left-0 flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none overflow-hidden"
              initial={{ opacity: 0, y: 10, scale: 0.95, x: tooltipX, translateX: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: tooltipX, translateX: "-50%" }}
              exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={hoveredItem.id}
                  className="flex items-center gap-2"
                  custom={direction}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <span className="text-xs font-medium text-zinc-100">{hoveredItem.label}</span>
                  <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    {hoveredItem.shortcut}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToolbarItem({
  item,
  setHoveredTab,
  isActive,
  setActiveTab,
}: Readonly<{
  item: { id: string; label: string; icon: React.ReactNode; shortcut: string; hasDot: boolean };
  setHoveredTab: (id: string) => void;
  isActive: boolean;
  setActiveTab: (id: string) => void;
}>) {
  return (
    <button
      type="button"
      aria-label={item.label}
      aria-pressed={isActive}
      onClick={() => setActiveTab(item.id)}
      onMouseEnter={() => setHoveredTab(item.id)}
      className={cn(
        "relative flex cursor-pointer items-center justify-center w-11 h-11 rounded-full transition-colors duration-200 outline-none",
        isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
      )}
    >
      <span className="relative z-10 text-xl">{item.icon}</span>

      {/* Notification Dot */}
      {item.hasDot && (
        <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-blue-500 rounded-full border border-zinc-800 z-20" />
      )}
    </button>
  );
}
