"use client";

import type { ReactElement } from "react";
import { Pause, Play } from "lucide-react";
import { formatRadarFrameTime, type RainViewerFrame } from "@/lib/rainviewer-radar";

type Props = {
  frames: RainViewerFrame[];
  frameIndex: number;
  playing: boolean;
  onFrameIndex: (index: number) => void;
  onTogglePlay: () => void;
  label?: string;
};

/** Windy-style radar timeline — scrub past frames or auto-play. */
export function RainViewerTimeline(props: Props): ReactElement | null {
  const { frames, frameIndex, playing, onFrameIndex, onTogglePlay, label = "Radar" } = props;
  if (frames.length < 2) return null;

  const idx = Math.min(Math.max(frameIndex, 0), frames.length - 1);
  const frame = frames[idx];

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[650] flex flex-col gap-1.5 rounded-xl border border-orange-500/35 bg-black/88 px-3 py-2 backdrop-blur-md shadow-lg sm:left-4 sm:right-auto sm:min-w-[min(100%,420px)]"
      role="group"
      aria-label={`${label} animation timeline`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
          {label} · {idx + 1}/{frames.length}
        </span>
        <span className="text-[10px] font-medium text-zinc-200 tabular-nums">
          {formatRadarFrameTime(frame.time)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-950/60 text-orange-100 hover:bg-orange-900/70"
          aria-label={playing ? "Pause radar animation" : "Play radar animation"}
        >
          {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={idx}
          onChange={(e) => onFrameIndex(Number(e.target.value))}
          className="min-w-0 flex-1 accent-orange-500 h-1.5 cursor-pointer"
          aria-valuetext={formatRadarFrameTime(frame.time)}
        />
      </div>
      <p className="text-[9px] text-zinc-500 leading-snug">
        Drag or press play to animate precipitation · ICDRRMO live radar
      </p>
    </div>
  );
}
