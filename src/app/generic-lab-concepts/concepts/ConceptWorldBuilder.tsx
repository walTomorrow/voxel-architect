"use client";

import { useState } from "react";
import {
  InspiredByNote,
  SelectedPreviewOverlay,
  type ConceptLayoutProps,
} from "@/src/app/generic-lab-concepts/conceptShared";
import {
  BuildingPreviewPanel,
  ComponentInspectorPanel,
  SemanticTreePanel,
  TypeBadge,
  ValidationDebugStrip,
  panel,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";
import type { GenericBuildingComponentTypeV2 } from "@/src/lib/blueprints/types/genericBuildingV2";

const TOOLS: readonly {
  id: string;
  type?: GenericBuildingComponentTypeV2;
  label: string;
}[] = [
  { id: "select", label: "Select" },
  { id: "door", type: "door", label: "Door" },
  { id: "window", type: "window_group", label: "Window group" },
  { id: "porch", type: "porch", label: "Porch" },
  { id: "chimney", type: "chimney", label: "Chimney" },
  { id: "step", type: "step", label: "Step" },
];

const FAKE_OPS = [
  "updateComponent · front-windows · count → 3",
  "addComponent · back · window_group · back-windows",
  "updateComponent · chimney · placement.horizontal → center",
] as const;

export function ConceptWorldBuilder({ sample, selectedId, onSelect }: ConceptLayoutProps) {
  const [activeTool, setActiveTool] = useState("select");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <InspiredByNote>
        Axiom / Minecraft editor tools, Cities: Skylines — world-first viewport, tool modes,
        live voxel feedback (tools are visual only).
      </InspiredByNote>

      <div className={`${panel()} flex flex-wrap gap-1 p-2`}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTool(t.id)}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
              activeTool === t.id
                ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-100"
                : "border-zinc-700/60 bg-zinc-800/40 text-zinc-400 hover:text-zinc-200",
            ].join(" ")}
          >
            {t.type ? <TypeBadge type={t.type} /> : <span className="text-zinc-500">◎</span>}
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(11rem,13rem)_1fr_minmax(12rem,14rem)]">
        <SemanticTreePanel
          tree={sample.tree}
          draft={sample.blueprint}
          allIssues={sample.allIssues}
          selectedId={selectedId}
          onSelect={onSelect}
          rich={false}
        />
        <BuildingPreviewPanel
          structure={sample.structure}
          blockCount={sample.blockCount}
          presetLabel={sample.presetLabel}
          overlay={
            <SelectedPreviewOverlay draft={sample.blueprint} selectedId={selectedId} />
          }
        />
        <ComponentInspectorPanel
          draft={sample.blueprint}
          selectedId={selectedId}
          allIssues={sample.allIssues}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className={`${panel()} p-3`}>
          <h3 className="text-[10px] font-semibold uppercase text-zinc-500">
            Pending operation preview (illustrative)
          </h3>
          <ul className="mt-2 space-y-1.5 font-mono text-[10px]">
            {FAKE_OPS.map((op) => (
              <li
                key={op}
                className="rounded border border-zinc-700/60 bg-zinc-950/50 px-2 py-1.5 text-zinc-400"
              >
                <span className="text-emerald-400/90">{op.split(" · ")[0]}</span>
                {" · "}
                {op.split(" · ").slice(1).join(" · ")}
              </li>
            ))}
          </ul>
        </div>
        <ValidationDebugStrip
          errors={sample.v2?.errors ?? []}
          warnings={sample.v2?.warnings ?? []}
          notes={sample.v2?.notes ?? []}
          planSummary={sample.planSummary}
          blockCount={sample.blockCount}
          collapsedDefault
        />
      </div>
    </div>
  );
}
