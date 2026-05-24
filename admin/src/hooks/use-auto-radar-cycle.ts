"use client";

import { useEffect, useState } from "react";
import type { RainViewerFrame } from "@/lib/rainviewer-radar";

/** Continuous radar frame cycling — no manual play control. */
export function useAutoRadarCycle(
  frames: RainViewerFrame[],
  intervalMs = 480,
): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length === 0) {
      setIndex(0);
      return;
    }
    setIndex(Math.max(0, frames.length - 1));
    if (frames.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [frames, intervalMs]);

  return frames.length === 0 ? 0 : Math.min(index, frames.length - 1);
}
