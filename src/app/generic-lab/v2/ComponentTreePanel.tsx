"use client";

import type { ReactNode } from "react";
import type { ComponentId } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { RoomFace } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import {
  buildComponentTree,
  type ComponentTreeNode,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";
import {
  componentDisplayName,
  countFaceIssues,
  faceDisplayLabel,
  issuesForComponent,
  materialChipsForComponent,
  worstIssueTone,
} from "@/src/app/generic-lab/v2/genericLabV2Display";
import {
  MaterialChips,
  TypeBadge,
  ValidationDot,
  v2Panel,
} from "@/src/app/generic-lab/v2/genericLabV2Ui";

type Props = {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedComponentId: ComponentId | null;
  readonly onSelectComponent: (id: ComponentId) => void;
  readonly allIssues: readonly ValidationIssue[];
};

function FaceSectionHeader({
  face,
  childCount,
  issueCount,
}: {
  readonly face: RoomFace;
  readonly childCount: number;
  readonly issueCount: number;
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

function ComponentCard({
  draft,
  compId,
  selectedComponentId,
  onSelectComponent,
  allIssues,
  depth,
}: {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly compId: ComponentId;
  readonly selectedComponentId: ComponentId | null;
  readonly onSelectComponent: (id: ComponentId) => void;
  readonly allIssues: readonly ValidationIssue[];
  readonly depth: number;
}) {
  const comp = draft.components.find((c) => c.id === compId);
  if (!comp) return null;

  const compIssues = issuesForComponent(allIssues, comp.id);
  const tone = compIssues.length > 0 ? worstIssueTone(compIssues) : "ok";
  const selected = selectedComponentId === comp.id;
  const chips = materialChipsForComponent(draft, comp);

  return (
    <button
      type="button"
      onClick={() => onSelectComponent(comp.id)}
      style={{ marginLeft: depth * 8 }}
      className={[
        "mb-1 flex w-[calc(100%-0.25rem)] flex-col gap-1 rounded-lg border px-2 py-2 text-left transition",
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
      <MaterialChips chips={chips} />
    </button>
  );
}

function renderTreeNode(
  node: ComponentTreeNode,
  draft: GenericBuildingBlueprintV2Draft,
  allIssues: readonly ValidationIssue[],
  selectedComponentId: ComponentId | null,
  onSelectComponent: (id: ComponentId) => void,
  depth: number,
): ReactNode {
  if (node.kind === "room" && node.componentId) {
    const room = draft.components.find((c) => c.id === node.componentId);
    if (!room || room.type !== "room") return null;
    const selected = selectedComponentId === room.id;
    return (
      <div key={node.key} className="space-y-2">
        <button
          type="button"
          onClick={() => onSelectComponent(room.id)}
          className={[
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition",
            selected
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
        <div className="space-y-3 pl-0.5">
          {node.children.map((child) =>
            renderTreeNode(
              child,
              draft,
              allIssues,
              selectedComponentId,
              onSelectComponent,
              depth + 1,
            ),
          )}
        </div>
      </div>
    );
  }

  if (node.kind === "surface" && node.face) {
    const issueCount = countFaceIssues(allIssues, node.face, draft);
    return (
      <div key={node.key} className="space-y-1.5">
        <FaceSectionHeader
          face={node.face}
          childCount={node.children.length}
          issueCount={issueCount}
        />
        {node.children.length === 0 ? (
          <p className="py-1 pl-2 text-[10px] italic text-zinc-600">No attachments</p>
        ) : (
          node.children.map((child) => {
            if (child.kind !== "component" || !child.componentId) return null;
            return (
              <div key={child.key}>
                <ComponentCard
                  draft={draft}
                  compId={child.componentId}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={onSelectComponent}
                  allIssues={allIssues}
                  depth={depth + 1}
                />
                {child.children.map((stepNode) => {
                  if (stepNode.kind !== "component" || !stepNode.componentId) return null;
                  return (
                    <ComponentCard
                      key={stepNode.key}
                      draft={draft}
                      compId={stepNode.componentId}
                      selectedComponentId={selectedComponentId}
                      onSelectComponent={onSelectComponent}
                      allIssues={allIssues}
                      depth={depth + 2}
                    />
                  );
                })}
              </div>
            );
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
        />
        {node.children.map((child) => {
          if (child.kind !== "component" || !child.componentId) return null;
          return (
            <ComponentCard
              key={child.key}
              draft={draft}
              compId={child.componentId}
              selectedComponentId={selectedComponentId}
              onSelectComponent={onSelectComponent}
              allIssues={allIssues}
              depth={depth + 1}
            />
          );
        })}
      </div>
    );
  }

  return null;
}

export function ComponentTreePanel({
  draft,
  selectedComponentId,
  onSelectComponent,
  allIssues,
}: Props) {
  const tree = buildComponentTree(draft);

  return (
    <div className={`${v2Panel()} flex h-full min-h-0 flex-col`}>
      <div className="shrink-0 border-b border-zinc-700/60 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Semantic map
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!tree ? (
          <p className="p-2 text-xs text-amber-300/90">No root room component found.</p>
        ) : (
          renderTreeNode(tree, draft, allIssues, selectedComponentId, onSelectComponent, 0)
        )}
      </div>
    </div>
  );
}
