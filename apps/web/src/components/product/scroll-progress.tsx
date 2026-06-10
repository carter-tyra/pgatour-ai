"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ScrollProgressItem = { id: string; title: string; level?: number };

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const overflowY = getComputedStyle(current).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export const ScrollProgress = ({
  items,
  className = "",
  scrollAreaRef,
}: {
  items: ScrollProgressItem[];
  className?: string;
  scrollAreaRef?: React.RefObject<HTMLDivElement>;
}) => {
  const [activeLength, setActiveLength] = useState(0);
  const [pathD, setPathD] = useState("");
  const [totalLength, setTotalLength] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const textRefs = useMemo(() => items.map(() => React.createRef<HTMLButtonElement>()), [items]);

  const INDENT_SIZE = 12;
  const BASE_OFFSET = 6;
  const DOT_TEXT_GAP = 16;

  const calculatePath = useCallback(() => {
    if (!containerRef.current || items.length === 0) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    const newPoints = textRefs.map((ref, index) => {
      const el = ref.current;
      if (!el) {
        return { x: 0, y: 0, level: 1 };
      }
      const rect = el.getBoundingClientRect();
      const level = items[index]?.level || 1;
      const x = BASE_OFFSET + (level - 1) * INDENT_SIZE;
      const y = rect.top - containerRect.top + rect.height / 2;
      return { x, y, level };
    });

    if (newPoints.length === 0 || !newPoints[0]) {
      return;
    }

    let d = `M ${newPoints[0].x} ${newPoints[0].y}`;

    for (let i = 1; i < newPoints.length; i++) {
      const prev = newPoints[i - 1];
      const curr = newPoints[i];
      if (!prev || !curr) {
        continue;
      }
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;

      if (Math.abs(dx) < 0.5) {
        d += ` L ${curr.x} ${curr.y}`;
      } else {
        const midY = prev.y + dy / 2;
        const curveRadius = Math.min(Math.abs(dy) * 0.3, 20);
        d += ` L ${prev.x} ${midY - curveRadius}`;
        d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${midY + curveRadius}`;
        d += ` L ${curr.x} ${curr.y}`;
      }
    }

    setPathD(d);
  }, [items, textRefs]);

  useEffect(() => {
    const timer = setTimeout(calculatePath, 50);
    const observer = new ResizeObserver(calculatePath);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", calculatePath);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculatePath);
      observer.disconnect();
    };
  }, [calculatePath]);

  useEffect(() => {
    if (pathRef.current && pathD) {
      setTotalLength(pathRef.current.getTotalLength());
    }
  }, [pathD]);

  useEffect(() => {
    if (items.length === 0 || !pathD || totalLength === 0) {
      return;
    }

    const scroller = scrollAreaRef?.current ?? findScrollParent(containerRef.current);

    const handleScroll = () => {
      const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
      const viewHeight = scroller ? scroller.clientHeight : window.innerHeight;
      const triggerLine = viewTop + viewHeight * 0.3;

      const sectionTops = items.map((item) => {
        const el = document.getElementById(item.id);
        return el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      });

      let activeIndex = -1;
      let progressInSection = 0;

      for (let i = 0; i < sectionTops.length; i++) {
        if ((sectionTops[i] ?? Number.POSITIVE_INFINITY) <= triggerLine) {
          activeIndex = i;
        }
      }

      if (activeIndex >= 0) {
        const currentTop = sectionTops[activeIndex] ?? 0;
        const nextTop = sectionTops[activeIndex + 1] ?? currentTop + 500;

        if (activeIndex === 0) {
          const currentScroll = scroller ? scroller.scrollTop : window.scrollY;
          const distToEnd = nextTop - triggerLine;
          const totalDist = currentScroll + distToEnd;
          progressInSection =
            totalDist > 0 ? Math.min(Math.max(currentScroll / totalDist, 0), 1) : 1;
        } else {
          const sectionHeight = nextTop - currentTop;
          progressInSection =
            sectionHeight > 0
              ? Math.min(Math.max((triggerLine - currentTop) / sectionHeight, 0), 1)
              : 1;
        }
      }

      if (activeIndex >= 0 && pathRef.current) {
        const segmentLength = totalLength / Math.max(items.length - 1, 1);
        const targetLength = segmentLength * (activeIndex + progressInSection);
        setActiveLength(Math.min(targetLength, totalLength));
      } else {
        setActiveLength(0);
      }
    };

    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => target.removeEventListener("scroll", handleScroll);
  }, [items, pathD, totalLength, scrollAreaRef]);

  const tipPosition = useMemo(() => {
    if (!pathRef.current) {
      return null;
    }
    try {
      return pathRef.current.getPointAtLength(Math.max(0, activeLength));
    } catch {
      return null;
    }
  }, [activeLength]);

  const scrollToItem = useCallback(
    (itemId: string) => {
      const el = document.getElementById(itemId);
      if (!el) {
        return;
      }
      const scroller = scrollAreaRef?.current ?? findScrollParent(containerRef.current);
      if (scroller) {
        const elRect = el.getBoundingClientRect();
        const containerRect = scroller.getBoundingClientRect();
        const triggerOffset = scroller.clientHeight * 0.3;
        const scrollTop =
          scroller.scrollTop + (elRect.top - containerRect.top) - triggerOffset + 10;
        scroller.scrollTo({ top: scrollTop, behavior: "smooth" });
      } else {
        const elRect = el.getBoundingClientRect();
        const triggerOffset = window.innerHeight * 0.3;
        const scrollTop = window.scrollY + elRect.top - triggerOffset + 10;
        window.scrollTo({ top: scrollTop, behavior: "smooth" });
      }
    },
    [scrollAreaRef],
  );

  return (
    <div className={`relative w-fit ${className}`} ref={containerRef}>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <path
          d={pathD}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          style={{ stroke: "var(--border)" }}
        />
        <path
          className="transition-[stroke-dashoffset] duration-100 ease-out"
          d={pathD}
          fill="none"
          ref={pathRef}
          strokeDasharray={totalLength || 1}
          strokeDashoffset={Math.max(0, (totalLength || 1) - activeLength)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          style={{ stroke: totalLength > 0 ? "var(--foreground)" : "transparent" }}
        />
        {tipPosition ? (
          <circle
            cx={tipPosition.x}
            cy={tipPosition.y}
            r="3"
            style={{
              fill: "var(--foreground)",
              filter:
                "drop-shadow(0 0 4px color-mix(in oklch, var(--foreground) 45%, transparent))",
            }}
          />
        ) : null}
      </svg>

      <div className="relative z-10 flex w-fit flex-col gap-3">
        {items.map((item, index) => {
          const level = item.level || 1;
          const paddingLeft = BASE_OFFSET + (level - 1) * INDENT_SIZE + DOT_TEXT_GAP + 5;

          return (
            <button
              className="cursor-pointer whitespace-nowrap text-left text-[13px] leading-snug text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground"
              key={item.id}
              onClick={() => scrollToItem(item.id)}
              ref={textRefs[index]}
              style={{ paddingLeft: `${paddingLeft}px` }}
              type="button"
            >
              {item.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};
