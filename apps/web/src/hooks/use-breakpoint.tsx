"use client";

import * as React from "react";

function getServerSnapshot() {
  return false;
}

export function useBreakpoint(breakpoint: number) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mediaQuery.addEventListener("change", onStoreChange);

      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [breakpoint],
  );

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth < breakpoint;
  }, [breakpoint]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
