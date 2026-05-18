"use client";

import { useState } from "react";
import { GenericLabClient } from "@/src/app/generic-lab/GenericLabClient";
import { GenericLabV2Client } from "@/src/app/generic-lab/v2/GenericLabV2Client";

export type GenericLabMode = "v1" | "v2";

function modeButtonClass(active: boolean): string {
  return [
    "rounded-md px-3 py-1.5 text-xs font-medium transition",
    active
      ? "bg-emerald-600/90 text-white ring-1 ring-emerald-400/40"
      : "border border-zinc-600/80 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/90",
  ].join(" ");
}

export function GenericLabShell() {
  const [mode, setMode] = useState<GenericLabMode>("v1");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800/90 bg-zinc-950/98 px-4 py-2 sm:px-6">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Lab mode
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={mode === "v1"}
            className={modeButtonClass(mode === "v1")}
            onClick={() => setMode("v1")}
          >
            Generic v1
          </button>
          <button
            type="button"
            aria-pressed={mode === "v2"}
            className={modeButtonClass(mode === "v2")}
            onClick={() => setMode("v2")}
          >
            Generic v2
          </button>
        </div>
        <span className="text-[10px] text-zinc-600">
          {mode === "v1"
            ? "Classic flat blueprint editor"
            : "Component tree + inspector (schema v2)"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === "v1" ? <GenericLabClient /> : <GenericLabV2Client />}
      </div>
    </div>
  );
}
