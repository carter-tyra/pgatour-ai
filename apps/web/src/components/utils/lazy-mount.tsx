"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface LazyMountProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /**
   * Distance from the viewport at which the children start mounting.
   * Same syntax as IntersectionObserver `rootMargin`. Defaults to a generous
   * 300px so charts are ready by the time the user scrolls to them.
   */
  rootMargin?: string;
  className?: string;
}

/**
 * Defers rendering of `children` until the wrapper element is near the viewport.
 *
 * Used to avoid mounting many heavy chart components (Recharts + ResizeObserver
 * + large SVG trees) on the same page at once, which caused noticeable jank on
 * the docs pages where 10–20+ chart previews can live next to each other.
 *
 * SSR safety: starts as not-visible on both server and client, so hydration
 * matches and the chart subtree never runs on the server.
 */
export function LazyMount({
  children,
  fallback = null,
  rootMargin = "300px 0px",
  className,
}: LazyMountProps) {
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  const setNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node || isVisible) {
        return;
      }

      if (typeof IntersectionObserver === "undefined") {
        queueMicrotask(() => setIsVisible(true));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setIsVisible(true);
            observer.disconnect();
            observerRef.current = null;
          }
        },
        { rootMargin },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [isVisible, rootMargin],
  );

  return (
    <div ref={setNode} className={cn("size-full", className)}>
      {isVisible ? <React.Suspense fallback={fallback}>{children}</React.Suspense> : fallback}
    </div>
  );
}
