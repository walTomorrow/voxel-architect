"use client";

import {
  InspiredByNote,
  SelectedPreviewOverlay,
  type ConceptLayoutProps,
} from "@/src/app/generic-lab-concepts/conceptShared";
import { ConceptValidationConsole } from "@/src/app/generic-lab-concepts/conceptValidationConsole";
import {
  BuildingPreviewPanel,
  ComponentInspectorPanel,
  SemanticTreePanel,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";

export function ConceptEngineIde({ sample, selectedId, onSelect }: ConceptLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <InspiredByNote>
        Unity, Godot, Unreal Engine, Roblox Studio — hierarchy explorer, live viewport,
        properties inspector, output console.
      </InspiredByNote>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(15rem,18rem)_1fr_minmax(14rem,17rem)]">
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
      <ConceptValidationConsole
        errors={sample.v2?.errors ?? []}
        warnings={sample.v2?.warnings ?? []}
        notes={sample.v2?.notes ?? []}
        authoringJson={sample.authoringJson}
        normalizedJson={sample.normalizedJson}
        planSummary={sample.planSummary}
        blockCount={sample.blockCount}
      />
    </div>
  );
}

