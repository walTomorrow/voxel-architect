"use client";

import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type {
  HorizontalPlacementV2,
  RoomFace,
  RoomSurfaceRef,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { GenericBuildingComponentTypeV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  TYPE_META,
  type IssueTone,
} from "@/src/app/generic-lab/v2/genericLabV2Display";
import { facadeSurfaceRef, faceDisplayLabel } from "@/src/app/generic-lab/v2/genericLabV2Display";
import { FACADE_FACES } from "@/src/app/generic-lab/v2/genericLabV2Utils";

export function v2Panel(extra = ""): string {
  return `rounded-xl border border-zinc-700/70 bg-zinc-900/55 ${extra}`.trim();
}

const ACCENT_RING: Record<string, string> = {
  violet: "ring-violet-500/35 bg-violet-500/15 text-violet-100",
  slate: "ring-slate-500/35 bg-slate-500/15 text-slate-100",
  amber: "ring-amber-500/35 bg-amber-500/15 text-amber-100",
  sky: "ring-sky-500/35 bg-sky-500/15 text-sky-100",
  emerald: "ring-emerald-500/35 bg-emerald-500/15 text-emerald-100",
  orange: "ring-orange-500/35 bg-orange-500/15 text-orange-100",
  zinc: "ring-zinc-500/35 bg-zinc-500/15 text-zinc-100",
};

export function TypeBadge({ type }: { readonly type: GenericBuildingComponentTypeV2 }) {
  const m = TYPE_META[type];
  return (
    <span
      className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold ring-1 ${ACCENT_RING[m.accent]}`}
    >
      {m.badge}
    </span>
  );
}

export function ValidationDot({ tone }: { readonly tone: IssueTone }) {
  const cls =
    tone === "error"
      ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.45)]"
      : tone === "warn"
        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.35)]"
        : "bg-emerald-500/60";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

export function MaterialChips({ chips }: { readonly chips: readonly string[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full border border-zinc-600/60 bg-zinc-800/90 px-2 py-0.5 text-[9px] text-zinc-400"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function SegmentedHorizontal({
  value,
  onChange,
}: {
  readonly value: HorizontalPlacementV2["horizontal"];
  readonly onChange: (h: HorizontalPlacementV2["horizontal"]) => void;
}) {
  const opts = ["left", "center", "right"] as const;
  return (
    <div
      className="inline-flex rounded-lg border border-zinc-600/80 bg-zinc-950/60 p-0.5"
      role="group"
      aria-label="Horizontal placement"
    >
      {opts.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={[
            "min-w-[3.25rem] rounded-md px-3 py-1.5 text-[11px] font-medium capitalize transition",
            value === o
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-200",
          ].join(" ")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function SurfaceTargetPicker({
  draft,
  selectedRef,
  onChange,
}: {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedRef: RoomSurfaceRef;
  readonly onChange: (ref: RoomSurfaceRef) => void;
}) {
  const selectedParsed = selectedRef.split(".")[1] as RoomFace | undefined;

  return (
    <div className="grid grid-cols-2 gap-2">
      {FACADE_FACES.map((face) => {
        const ref = facadeSurfaceRef(draft, face);
        if (!ref) return null;
        const active = selectedParsed === face;
        return (
          <button
            key={face}
            type="button"
            onClick={() => onChange(ref)}
            className={[
              "rounded-lg border px-3 py-2.5 text-left transition",
              active
                ? "border-emerald-500/50 bg-emerald-950/35 ring-1 ring-emerald-500/30"
                : "border-zinc-600/70 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/70",
            ].join(" ")}
          >
            <span
              className={[
                "block text-xs font-semibold",
                active ? "text-emerald-100" : "text-zinc-300",
              ].join(" ")}
            >
              {faceDisplayLabel(face)}
            </span>
            <span className="mt-0.5 block font-mono text-[9px] text-zinc-600">{ref}</span>
          </button>
        );
      })}
    </div>
  );
}
