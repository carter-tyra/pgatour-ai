"use client";

import { CaretSort, CheckmarkFilled } from "@carbon/icons-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type FilterDisclosureOption = {
  /** Stable id used for selection + the `value` match. */
  id: string;
  /** Primary label shown on the row + collapsed trigger. */
  title: string;
  /** Optional secondary line (e.g. game type / season). */
  subtitle?: string;
};

/**
 * A single-select picker: a labeled trigger showing the active option that
 * opens a content-sized menu with a springy reveal + staggered rows. Generic
 * over `options`; selecting one calls `onSelect` and closes. Themed with app
 * tokens, anchored to the right so it never clips, and keyboard/screen-reader
 * accessible.
 */
export default function FilterDisclosure({
  options,
  value,
  onSelect,
  ariaLabel = "Select",
}: {
  options: FilterDisclosureOption[];
  value?: string;
  onSelect?: (option: FilterDisclosureOption) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeIndex = options.findIndex((option) => option.id === value);
  const active = activeIndex >= 0 ? options[activeIndex] : options[0];

  // Dismiss on outside pointer + Escape, returning focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Move focus to the active option when the menu opens.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${Math.max(0, activeIndex)}"]`,
    );
    node?.focus();
  }, [open, activeIndex]);

  if (options.length === 0 || !active) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-11 max-w-56 items-center gap-2 rounded-full border border-border bg-card/80 py-1.5 pr-2.5 pl-4 text-left shadow-xs transition-all ease-out",
          "hover:bg-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "ring-2 ring-ring",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {active.title}
        </span>
        <CaretSort size={20} className="shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-72 origin-top-right overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-glass"
          style={{ animation: "fd-open 200ms var(--ease-wiggle) both" }}
        >
          {options.map((option, index) => {
            const checked = option.id === active.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={checked}
                data-index={index}
                tabIndex={checked ? 0 : -1}
                onClick={() => {
                  onSelect?.(option);
                  setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    (event.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  checked ? "bg-muted" : "hover:bg-muted/60",
                )}
                style={
                  {
                    animation: `fd-row 220ms ease-out ${index * 35}ms both`,
                  } as React.CSSProperties
                }
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {option.title}
                  </span>
                  {option.subtitle ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {option.subtitle}
                    </span>
                  ) : null}
                </span>
                {checked ? (
                  <CheckmarkFilled size={18} className="shrink-0 text-primary" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border-2 border-border" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
