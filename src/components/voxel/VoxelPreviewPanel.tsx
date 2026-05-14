"use client";

import { useEffect, useState } from "react";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";

const canvasAreaClasses = {
  compact: "aspect-[4/3] min-h-[280px] w-full md:min-h-0",
  expanded:
    "min-h-[min(72vh,820px)] w-full sm:min-h-[68vh] lg:aspect-[16/10] lg:min-h-[min(78vh,880px)]",
} as const;

export function VoxelPreviewPanel({
  size = "compact",
  mode = "panel",
}: {
  /** `expanded` — larger framed viewport (legacy layout) */
  size?: keyof typeof canvasAreaClasses;
  /** `immersive` — borderless canvas filling the parent (use with h-full flex-1) */
  mode?: "panel" | "immersive";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const areaClass = canvasAreaClasses[size];

  const canvas = mounted ? (
    <VoxelViewer className="absolute inset-0 h-full w-full" />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-500">
      Initializing 3D preview…
    </div>
  );

  if (mode === "immersive") {
    return (
      <div className="relative h-full min-h-0 w-full bg-[#0c0c0e]">
        {canvas}
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-6 text-[10px] font-mono text-zinc-500 sm:bottom-4">
          <span>drag to orbit</span>
          <span className="hidden text-zinc-600 sm:inline">sample structure</span>
          <span>scroll to zoom</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-700" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Preview · R3F + OrbitControls
        </span>
        <div className="w-14" aria-hidden />
      </div>
      <div className={`relative w-full ${areaClass}`}>
        {canvas}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex justify-between text-[10px] font-mono text-zinc-600 sm:bottom-4 sm:left-6 sm:right-6">
        <span>drag to orbit</span>
        <span className="text-zinc-700">sample structure</span>
        <span>scroll to zoom</span>
      </div>
    </div>
  );
}
