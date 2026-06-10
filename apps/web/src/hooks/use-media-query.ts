"use client";

import * as React from "react";

export function useMediaQuery(query: string, serverSnapshot = false) {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = React.useCallback(() => serverSnapshot, [serverSnapshot]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
