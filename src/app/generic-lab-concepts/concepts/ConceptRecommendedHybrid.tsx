"use client";

import {
  InspiredByNote,
  SelectedPreviewOverlay,
  type ConceptLayoutProps,
} from "@/src/app/generic-lab-concepts/conceptShared";
import {
  componentDisplayName,
  findComponent,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchModel";
import {
  BuildingPreviewPanel,
  ComponentInspectorPanel,
  SemanticTreePanel,
  TypeBadge,
  ValidationDebugStrip,
  panel,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";

export function ConceptRecommendedHybrid({
  sample,
  selectedId,
  onSelect,
}: ConceptLayoutProps) {
  const comp = findComponent(sample.blueprint, selectedId);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <InspiredByNote>
        Recommended hybrid — engine layout discipline + rich semantic map + surface-first
        inspector controls. Most likely direction for real /generic-lab.
      </InspiredByNote>

      <div className={`${panel()} grid gap-2 p-3 text-[11px] text-zinc-400 sm:grid-cols-2`}>
        <div>
          <span className="font-semibold text-emerald-400/90">Why this works</span>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px]">
            <li>Semantic tree = source of truth</li>
            <li>VoxelViewer = generated output</li>
            <li>Inspector = controlled edits</li>
            <li>Validation/debug = compiler feedback</li>
          </ul>
        </div>
        {comp ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-2 py-1.5">
            <TypeBadge type={comp.type} />
            <div>
              <p className="font-medium text-zinc-200">{componentDisplayName(comp)}</p>
              <p className="font-mono text-[9px] text-zinc-600">Selected in tree + inspector</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(15rem,17rem)_1fr_minmax(14rem,17rem)]">
        <SemanticTreePanel
          tree={sample.tree}
          draft={sample.blueprint}
          allIssues={sample.allIssues}
          selectedId={selectedId}
          onSelect={onSelect}
          rich
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
