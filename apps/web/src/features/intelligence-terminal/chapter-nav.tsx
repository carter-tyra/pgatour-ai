"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScrollProgress } from "@/components/product/scroll-progress";
import { DataLabel } from "@/components/terminal-primitives";

/** Tracks which section is in view within the nearest scroll container. */
export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let node = rootRef.current?.parentElement ?? null;
    while (node) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        break;
      }
      node = node.parentElement;
    }
    scrollerRef.current = node;
    const scroller = node;
    const target: HTMLElement | Window = scroller ?? window;

    const topOf = (el: HTMLElement) => {
      if (scroller) {
        return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      }
      return el.getBoundingClientRect().top;
    };
    const viewHeight = () => (scroller ? scroller.clientHeight : window.innerHeight);

    const onScroll = () => {
      const trigger = viewHeight() * 0.3;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && topOf(el) <= trigger) {
          current = id;
        }
      }
      setActive(current);
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener("scroll", onScroll);
  }, [ids]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) {
      return;
    }
    const scroller = scrollerRef.current;
    if (scroller) {
      const top =
        el.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        20;
      scroller.scrollTo({ top, behavior: "smooth" });
    } else {
      window.scrollTo({
        top: window.scrollY + el.getBoundingClientRect().top - 20,
        behavior: "smooth",
      });
    }
  }, []);

  return { active, scrollTo, rootRef };
}

export function ChapterHeading({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-sm font-medium tabular-nums text-muted-foreground/50">{index}</span>
      <div>
        <h3 className="text-pretty text-lg font-medium leading-tight tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export function ChapterRail({
  chapters,
}: {
  chapters: ReadonlyArray<{ id: string; label: string }>;
}) {
  const items = useMemo(
    () => chapters.map((chapter) => ({ id: chapter.id, title: chapter.label })),
    [chapters],
  );

  return (
    <div className="relative">
      <DataLabel className="mb-3.5 pl-1.5">On this page</DataLabel>
      <ScrollProgress items={items} />
    </div>
  );
}
