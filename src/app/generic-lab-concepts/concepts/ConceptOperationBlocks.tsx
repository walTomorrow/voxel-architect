"use client";

import {
  InspiredByNote,
  type ConceptLayoutProps,
} from "@/src/app/generic-lab-concepts/conceptShared";
import {
  componentDisplayName,
  findComponent,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchModel";
import {
  BuildingPreviewPanel,
  TypeBadge,
  ValidationDebugStrip,
  panel,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";

const BLOCKS = [
  {
    color: "border-sky-500/40 bg-sky-950/30",
    label: "Update front porch depth to 3",
    op: { action: "updateComponent", componentId: "front-porch", field: "depth", value: 3 },
  },
  {
    color: "border-violet-500/40 bg-violet-950/30",
    label: "Move chimney to right face",
    op: {
      action: "updateComponent",
      componentId: "chimney",
      field: "attach.targetSurface",
      value: "main-room.right",
    },
  },
  {
    color: "border-amber-500/40 bg-amber-950/30",
    label: "Set front windows count to 3",
    op: {
      action: "updateComponent",
      componentId: "front-windows",
      field: "count",
      value: 3,
    },
  },
  {
    color: "border-emerald-500/40 bg-emerald-950/30",
    label: "Add window group to back face",
    op: {
      action: "addComponent",
      type: "window_group",
      id: "back-windows",
      attach: { targetSurface: "main-room.back" },
    },
  },
] as const;

export function ConceptOperationBlocks({
  sample,
  selectedId,
}: ConceptLayoutProps) {
  const comp = findComponent(sample.blueprint, selectedId);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-lg border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100/90">
        <strong>Future operation workflow</strong> — not the current editor. Scratch-inspired
        semantic blocks for Phase 7+ / AI operations exploration.
      </div>
      <InspiredByNote>
        Scratch — visual operation stacks targeting stable component ids (concept only).
      </InspiredByNote>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(16rem,20rem)]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className={`${panel()} p-3`}>
            <h3 className="text-[10px] font-semibold uppercase text-zinc-500">
              Operation palette
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["updateComponent", "addComponent", "removeComponent"] as const).map(
                (a) => (
                  <span
                    key={a}
                    className="rounded-md border border-zinc-600/70 bg-zinc-800/50 px-2 py-1 text-[10px] text-zinc-400"
                  >
                    {a}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className={`${panel()} min-h-0 flex-1 overflow-y-auto p-4`}>
            <h3 className="text-[10px] font-semibold uppercase text-zinc-500">
              Semantic operation workspace
            </h3>
            <div className="mt-3 space-y-2">
              {BLOCKS.map((b) => (
                <div
                  key={b.label}
                  className={`rounded-lg border-l-4 px-3 py-2 ${b.color}`}
                >
                  <p className="text-xs font-medium text-zinc-200">{b.label}</p>
                  <p className="mt-1 font-mono text-[9px] text-zinc-600">
                    targets stable id:{" "}
                    {"componentId" in b.op ? b.op.componentId : b.op.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <details className={`${panel()} p-3`}>
            <summary className="cursor-pointer text-[10px] font-semibold uppercase text-zinc-500">
              Operation JSON preview (read-only)
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto font-mono text-[9px] text-zinc-500">
              {JSON.stringify(
                { operations: BLOCKS.map((b) => b.op), note: "illustrative — not executed" },
                null,
                2,
              )}
            </pre>
          </details>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className={`${panel()} shrink-0 p-3`}>
            <h3 className="text-[10px] font-semibold uppercase text-zinc-500">
              Selected result
            </h3>
            {comp ? (
              <div className="mt-2 flex items-center gap-2">
                <TypeBadge type={comp.type} />
                <div>
                  <p className="text-sm text-zinc-200">{componentDisplayName(comp)}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{comp.id}</p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">—</p>
            )}
          </div>
          <BuildingPreviewPanel
            structure={sample.structure}
            blockCount={sample.blockCount}
            presetLabel={sample.presetLabel}
          />
        </div>
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
  );
}
