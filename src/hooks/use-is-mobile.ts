"use client";

import { useSyncExternalStore } from "react";

function getSnapshot(breakpoint: number) {
  return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
}

export function useIsMobile(breakpoint = 767) {
  const isMobile = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => getSnapshot(breakpoint),
    () => false,
  );
  return isMobile;
}
