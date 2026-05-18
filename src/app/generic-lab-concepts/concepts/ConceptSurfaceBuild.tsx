"use client";

import type { RoomFace } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { GenericBuildingComponentV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  InspiredByNote,
  type ConceptLayoutProps,
} from "@/src/app/generic-lab-concepts/conceptShared";
import {
  componentDisplayName,
  componentsOnFacadeFace,
  faceDisplayLabel,
  faceFromComponent,
  issuesForComponent,
  stepsForDoor,
  worstTone,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchModel";
import {
  BuildingPreviewPanel,
  ComponentInspectorPanel,
  TypeBadge,
  ValidationDot,
  panel,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";

const FACES: readonly RoomFace[] = ["front", "back", "left", "right", "roof"];

function FaceBuildCard({
  face,
  draft,
  components,
  selectedId,
  onSelect,
  allIssues,
}: {
  readonly face: RoomFace;
  readonly draft: ConceptLayoutProps["sample"]["blueprint"];
  readonly components: readonly GenericBuildingComponentV2[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly allIssues: ConceptLayoutProps["sample"]["allIssues"];
}) {
  const selectedOnFace = components.some((c) => c.id === selectedId);

  return (
    <button
      type="button"
      onClick={() => components[0] && onSelect(components[0].id)}
      className={[
        "flex min-h-[8rem] flex-col rounded-xl border p-3 text-left transition",
        selectedOnFace
          ? "border-emerald-500/45 bg-emerald-950/25 ring-1 ring-emerald-500/30"
          : "border-zinc-700/70 bg-zinc-900/50 hover:border-zinc-600",
        face === "front" ? "lg:col-span-2" : "",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">{faceDisplayLabel(face)}</span>
        <span className="font-mono text-[9px] text-zinc-600">
          {face !== "roof" ? `main-room.${face}` : "roof"}
        </span>
      </div>
      {components.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-[11px] italic text-zinc-600">
          Empty — add components here (future)
        </p>
      ) : (
        <div className="flex flex-1 flex-col gap-1.5">
          {components.map((c) => {
            const tone = worstTone(issuesForComponent(allIssues, c.id));
            const selected = selectedId === c.id;
            return (
              <div key={c.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(c.id);
                  }}
                  className={[
                    "flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left",
                    selected
                      ? "border-emerald-500/40 bg-zinc-800"
                      : "border-zinc-700/50 bg-zinc-800/40 hover:bg-zinc-800/70",
                  ].join(" ")}
                >
                  <TypeBadge type={c.type} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-zinc-200">
                      {componentDisplayName(c)}
                    </div>
                    <div className="font-mono text-[9px] text-zinc-600">{c.id}</div>
                  </div>
                  <ValidationDot tone={tone} />
                </button>
                {c.type === "door"
                  ? stepsForDoor(draft, c.id).map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(step.id);
                        }}
                        className="ml-4 mt-1 flex w-[calc(100%-1rem)] items-center gap-2 rounded border border-zinc-700/40 px-2 py-1 text-left hover:bg-zinc-800/60"
                      >
                        <TypeBadge type="step" />
                        <span className="text-[10px] text-zinc-400">
                          {componentDisplayName(step)}
                        </span>
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

export function ConceptSurfaceBuild({ sample, selectedId, onSelect }: ConceptLayoutProps) {
  const comp = sample.blueprint.components.find((c) => c.id === selectedId);
  const face = comp ? faceFromComponent(comp) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <InspiredByNote>
        The Sims build mode — surface-first architectural editing; components live on faces,
        not in a code tree.
      </InspiredByNote>
      <div className={`${panel()} overflow-hidden`}>
        <BuildingPreviewPanel
          structure={sample.structure}
          blockCount={sample.blockCount}
          presetLabel={sample.presetLabel}
          compactHeader
        />
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_minmax(14rem,16rem)]">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FACES.map((f) => (
            <FaceBuildCard
              key={f}
              face={f}
              draft={sample.blueprint}
              components={componentsOnFacadeFace(sample.blueprint, f)}
              selectedId={selectedId}
              onSelect={onSelect}
              allIssues={sample.allIssues}
            />
          ))}
        </div>
        <div className="min-h-0">
          <div className="mb-2 rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-2 py-1.5 text-[10px] text-zinc-500">
            Editing selection on{" "}
            <span className="font-medium text-zinc-300">
              {face ? faceDisplayLabel(face) : "—"}
            </span>
          </div>
          <ComponentInspectorPanel
            draft={sample.blueprint}
            selectedId={selectedId}
            allIssues={sample.allIssues}
          />
        </div>
      </div>
    </div>
  );
}
