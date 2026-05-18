"use client";

import type { ReactNode } from "react";
import type { ComponentTreeNode } from "@/src/app/generic-lab/v2/genericLabV2Utils";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import type {
  GenericBuildingComponentV2,
  GenericBuildingComponentTypeV2,
  RoomFace,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import type { ComponentPlanV2Summary } from "@/src/app/generic-lab/v2/genericLabV2Utils";
import type { VoxelStructure } from "@/src/lib/voxel/types";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";
import {
  attachedFaceRef,
  componentDisplayName,
  faceDisplayLabel,
  faceFromComponent,
  horizontalPlacement,
  inspectorRows,
  issuesForComponent,
  materialChipsForComponent,
  type IssueTone,
  typeMeta,
  worstTone,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchModel";

const FACADE_FACES: readonly RoomFace[] = ["front", "back", "left", "right"];

export function panel(extra = ""): string {
  return `rounded-xl border border-zinc-700/70 bg-zinc-900/55 shadow-sm shadow-black/20 ${extra}`.trim();
}

function toneDot(tone: IssueTone): string {
  if (tone === "error") return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]";
  if (tone === "warn") return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]";
  return "bg-emerald-500/70";
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
  const m = typeMeta(type);
  return (
    <span
      className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold ring-1 ${ACCENT_RING[m.accent]}`}
    >
      {m.badge}
    </span>
  );
}

export function ValidationDot({ tone }: { readonly tone: IssueTone }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${toneDot(tone)}`}
      aria-hidden
    />
  );
}

function MaterialChips({ chips }: { readonly chips: readonly string[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full border border-zinc-600/60 bg-zinc-800/90 px-2 py-0.5 text-[10px] text-zinc-400"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function SegmentedHorizontal({
  value,
}: {
  readonly value: "left" | "center" | "right";
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

export function SurfaceTargetCards({
  selectedFace,
}: {
  readonly selectedFace: RoomFace;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FACADE_FACES.map((face) => {
        const active = selectedFace === face;
        return (
          <button
            key={face}
            type="button"
            className={[
              "group rounded-lg border px-3 py-2.5 text-left transition",
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
            <span className="mt-0.5 block font-mono text-[9px] text-zinc-600 group-hover:text-zinc-500">
              main-room.{face}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FaceSectionHeader({
  face,
  childCount,
  issueCount,
  rich,
}: {
  readonly face: RoomFace;
  readonly childCount: number;
  readonly issueCount: number;
  readonly rich: boolean;
}) {
  const compass =
    face === "front"
      ? "↓"
      : face === "back"
        ? "↑"
        : face === "left"
          ? "←"
          : face === "right"
            ? "→"
            : "⌂";

  if (rich) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-gradient-to-r from-zinc-800/80 to-zinc-900/40 px-2.5 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950/80 text-sm text-zinc-400">
          {compass}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-zinc-200">
            {faceDisplayLabel(face)}
          </div>
          <div className="text-[10px] text-zinc-500">
            {childCount} component{childCount === 1 ? "" : "s"}
            {issueCount > 0 ? ` · ${issueCount} issue${issueCount === 1 ? "" : "s"}` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {faceDisplayLabel(face)}
    </div>
  );
}

function ComponentTreeButton({
  comp,
  draft,
  allIssues,
  selectedId,
  onSelect,
  depth,
  rich,
}: {
  readonly comp: GenericBuildingComponentV2;
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly allIssues: readonly ValidationIssue[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly depth: number;
  readonly rich: boolean;
}) {
  const compIssues = issuesForComponent(allIssues, comp.id);
  const tone = compIssues.length > 0 ? worstTone(compIssues) : "ok";
  const selected = selectedId === comp.id;
  const chips = materialChipsForComponent(draft, comp);

  return (
    <button
      type="button"
      onClick={() => onSelect(comp.id)}
      style={{ marginLeft: depth * (rich ? 10 : 8) }}
      className={[
        "mb-1 flex w-[calc(100%-0.5rem)] flex-col gap-1 rounded-lg border px-2 py-2 text-left transition",
        selected
          ? "border-emerald-500/45 bg-emerald-950/40 ring-1 ring-emerald-500/25"
          : "border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/55",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <TypeBadge type={comp.type} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-zinc-100">
            {componentDisplayName(comp)}
          </div>
          <div className="truncate font-mono text-[9px] text-zinc-600">{comp.id}</div>
        </div>
        <ValidationDot tone={tone} />
      </div>
      {rich && chips.length > 0 ? <MaterialChips chips={chips} /> : null}
    </button>
  );
}

function renderTreeNode(
  node: ComponentTreeNode,
  draft: GenericBuildingBlueprintV2Draft,
  allIssues: readonly ValidationIssue[],
  selectedId: string,
  onSelect: (id: string) => void,
  rich: boolean,
  depth: number,
): ReactNode {
  if (node.kind === "room" && node.componentId) {
    const room = draft.components.find((c) => c.id === node.componentId);
    if (!room || room.type !== "room") return null;
    return (
      <div key={node.key} className="space-y-2">
        <button
          type="button"
          onClick={() => onSelect(room.id)}
          className={[
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left",
            selectedId === room.id
              ? "border-violet-500/40 bg-violet-950/35 ring-1 ring-violet-500/25"
              : "border-zinc-700/60 bg-zinc-800/50 hover:bg-zinc-800/80",
          ].join(" ")}
        >
          <TypeBadge type="room" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-zinc-100">
              {componentDisplayName(room)}
            </div>
            <div className="font-mono text-[10px] text-zinc-600">{room.id}</div>
          </div>
        </button>
        <div className="space-y-3 pl-1">
          {node.children.map((child) =>
            renderTreeNode(child, draft, allIssues, selectedId, onSelect, rich, depth + 1),
          )}
        </div>
      </div>
    );
  }

  if (node.kind === "surface" && node.face) {
    const faceIssues = allIssues.filter((i) => {
      if (i.surface?.endsWith(`.${node.face}`)) return true;
      return false;
    });
    return (
      <div key={node.key} className="space-y-1.5">
        <FaceSectionHeader
          face={node.face}
          childCount={node.children.length}
          issueCount={faceIssues.length}
          rich={rich}
        />
        {node.children.length === 0 ? (
          <p
            className="py-1 text-[10px] italic text-zinc-600"
            style={{ marginLeft: depth * 8 + 8 }}
          >
            No attachments
          </p>
        ) : (
          node.children.map((child) => {
            if (child.kind === "component" && child.componentId) {
              const comp = draft.components.find((c) => c.id === child.componentId);
              if (!comp) return null;
              return (
                <div key={child.key}>
                  <ComponentTreeButton
                    comp={comp}
                    draft={draft}
                    allIssues={allIssues}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    depth={depth + 1}
                    rich={rich}
                  />
                  {child.children.map((stepNode) => {
                    if (stepNode.kind !== "component" || !stepNode.componentId) return null;
                    const step = draft.components.find((c) => c.id === stepNode.componentId);
                    if (!step) return null;
                    return (
                      <ComponentTreeButton
                        key={stepNode.key}
                        comp={step}
                        draft={draft}
                        allIssues={allIssues}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        depth={depth + 2}
                        rich={rich}
                      />
                    );
                  })}
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    );
  }

  if (node.kind === "roof_group") {
    return (
      <div key={node.key} className="space-y-1.5">
        <FaceSectionHeader
          face="roof"
          childCount={node.children.length}
          issueCount={0}
          rich={rich}
        />
        {node.children.map((child) => {
          if (child.kind !== "component" || !child.componentId) return null;
          const comp = draft.components.find((c) => c.id === child.componentId);
          if (!comp) return null;
          return (
            <ComponentTreeButton
              key={child.key}
              comp={comp}
              draft={draft}
              allIssues={allIssues}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
              rich={rich}
            />
          );
        })}
      </div>
    );
  }

  return null;
}

export function SemanticTreePanel({
  tree,
  draft,
  allIssues,
  selectedId,
  onSelect,
  rich,
}: {
  readonly tree: ComponentTreeNode | null;
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly allIssues: readonly ValidationIssue[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly rich: boolean;
}) {
  if (!tree) {
    return (
      <p className="p-4 text-xs text-amber-300/90">No root room in sample blueprint.</p>
    );
  }

  return (
    <div className={`${panel()} flex h-full min-h-0 flex-col`}>
      <div className="border-b border-zinc-700/60 px-3 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {rich ? "Semantic component tree" : "Semantic map"}
        </h2>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          Architectural surfaces · porch_house_v2
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {renderTreeNode(tree, draft, allIssues, selectedId, onSelect, rich, 0)}
      </div>
    </div>
  );
}

export function BuildingPreviewPanel({
  structure,
  blockCount,
  presetLabel,
  overlay,
  compactHeader,
}: {
  readonly structure: VoxelStructure;
  readonly blockCount: number;
  readonly presetLabel: string;
  readonly overlay?: ReactNode;
  readonly compactHeader?: boolean;
}) {
  return (
    <div className={`${panel()} relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
      <div
        className={[
          "flex shrink-0 items-center justify-between gap-2 border-b border-zinc-700/60 px-3",
          compactHeader ? "py-1.5" : "py-2",
        ].join(" ")}
      >
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Building preview
          </h2>
          <p className="text-[10px] text-zinc-600">
            Live · {presetLabel} · {blockCount.toLocaleString()} blocks
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-medium text-emerald-300/90">
          VoxelViewer
        </span>
      </div>
      <div
        className={[
          "relative flex-1 bg-zinc-950",
          compactHeader ? "min-h-[10rem]" : "min-h-[14rem]",
        ].join(" ")}
      >
        {blockCount > 0 ? (
          <VoxelViewer className="absolute inset-0 h-full w-full" structure={structure} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            Preview unavailable
          </div>
        )}
        {overlay ? (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10">{overlay}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ComponentInspectorPanel({
  draft,
  selectedId,
  allIssues,
}: {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedId: string;
  readonly allIssues: readonly ValidationIssue[];
}) {
  const comp = draft.components.find((c) => c.id === selectedId);
  if (!comp) {
    return (
      <div className={`${panel()} p-4 text-xs text-zinc-500`}>Select a component.</div>
    );
  }

  const face = faceFromComponent(comp);
  const h = horizontalPlacement(comp);
  const rows = inspectorRows(comp);
  const compIssues = issuesForComponent(allIssues, comp.id);
  const chips = materialChipsForComponent(draft, comp);

  return (
    <div className={`${panel()} flex h-full min-h-0 flex-col`}>
      <div className="border-b border-zinc-700/60 px-4 py-3">
        <div className="flex items-start gap-3">
          <TypeBadge type={comp.type} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">
              {componentDisplayName(comp)}
            </h2>
            <p className="font-mono text-[11px] text-zinc-600">id: {comp.id}</p>
          </div>
        </div>
        <MaterialChips chips={chips} />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {face && face !== "roof" ? (
          <div>
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Attached to
            </span>
            <SurfaceTargetCards selectedFace={face} />
          </div>
        ) : null}

        {h ? (
          <div>
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Horizontal placement
            </span>
            <SegmentedHorizontal value={h} />
          </div>
        ) : null}

        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2"
            >
              <span className="text-xs text-zinc-500">{row.label}</span>
              <span className="text-xs font-medium text-zinc-200">{row.value}</span>
            </div>
          ))}
        </div>

        {attachedFaceRef(comp) ? (
          <p className="font-mono text-[9px] text-zinc-700">
            ref: {attachedFaceRef(comp)}
          </p>
        ) : null}

        {compIssues.length > 0 ? (
          <ul className="space-y-1">
            {compIssues.map((issue, idx) => (
              <li
                key={`${issue.code}-${idx}`}
                className="rounded border border-amber-500/30 bg-amber-950/25 px-2 py-1 text-[10px] text-amber-200/90"
              >
                [{issue.code}] {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        {comp.id === "front-porch" ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-200/90">
            Concept focus: editing porch depth and width mode without leaving the
            workbench.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ValidationDebugStrip({
  errors,
  warnings,
  notes,
  planSummary,
  blockCount,
  collapsedDefault,
}: {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly notes: readonly ValidationIssue[];
  readonly planSummary: ComponentPlanV2Summary | null;
  readonly blockCount: number;
  readonly collapsedDefault?: boolean;
}) {
  const all = [...errors, ...warnings, ...notes];
  const open = collapsedDefault ? undefined : true;

  return (
    <div className={`${panel()} grid gap-0 lg:grid-cols-2`}>
      <details className="border-b border-zinc-700/50 lg:border-b-0 lg:border-r" open={open}>
        <summary className="cursor-pointer px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Validation ({all.length} items)
        </summary>
        <div className="max-h-32 overflow-y-auto px-4 pb-3 text-[11px]">
          {all.length === 0 ? (
            <p className="text-emerald-400/90">Blueprint valid — no issues.</p>
          ) : (
            <ul className="space-y-1.5">
              {all.map((i, idx) => (
                <li
                  key={`${i.code}-${idx}`}
                  className={
                    i.severity === "error"
                      ? "text-red-300/90"
                      : i.severity === "warning"
                        ? "text-amber-200/90"
                        : "text-zinc-500"
                  }
                >
                  [{i.code}] {i.message}
                  {i.componentId ? (
                    <span className="text-zinc-600"> · {i.componentId}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Debug summary (read-only)
        </summary>
        <div className="px-4 pb-3 font-mono text-[10px] leading-relaxed text-zinc-500">
          blocks: {blockCount}
          {planSummary ? (
            <>
              {" · "}
              plan v{planSummary.planVersion} · root {planSummary.rootRoomId} ·{" "}
              {planSummary.components.length} plan components · masks shell/
              {planSummary.maskCounts.shellSkip} win/
              {planSummary.maskCounts.window} door/
              {planSummary.maskCounts.door}
            </>
          ) : null}
          <p className="mt-1 text-zinc-600">
            Full authoring JSON and ComponentPlan remain collapsed in production lab
            — not editable here.
          </p>
        </div>
      </details>
    </div>
  );
}
