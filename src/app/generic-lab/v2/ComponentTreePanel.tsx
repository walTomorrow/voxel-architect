"use client";

import type { ComponentId } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  buildComponentTree,
  type ComponentTreeNode,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";

type Props = {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedComponentId: ComponentId | null;
  readonly onSelectComponent: (id: ComponentId) => void;
};

function nodeButtonClass(selected: boolean, selectable: boolean): string {
  const base =
    "w-full rounded px-2 py-1 text-left font-mono text-[11px] leading-snug transition";
  if (!selectable) {
    return `${base} cursor-default text-zinc-500`;
  }
  if (selected) {
    return `${base} bg-emerald-900/50 text-emerald-100 ring-1 ring-emerald-500/40`;
  }
  return `${base} text-zinc-300 hover:bg-zinc-800/80`;
}

function TreeNodeView({
  node,
  depth,
  selectedComponentId,
  onSelectComponent,
}: {
  readonly node: ComponentTreeNode;
  readonly depth: number;
  readonly selectedComponentId: ComponentId | null;
  readonly onSelectComponent: (id: ComponentId) => void;
}) {
  const selectable =
    (node.kind === "component" || node.kind === "room") && node.componentId != null;
  const selected =
    selectable && node.componentId === selectedComponentId;
  const paddingLeft = depth * 12;

  return (
    <li>
      {selectable && node.componentId ? (
        <button
          type="button"
          className={nodeButtonClass(selected, true)}
          style={{ paddingLeft: paddingLeft + 8 }}
          onClick={() => onSelectComponent(node.componentId!)}
        >
          {node.label}
        </button>
      ) : (
        <div
          className={nodeButtonClass(false, false)}
          style={{ paddingLeft: paddingLeft + 8 }}
        >
          {node.label}
        </div>
      )}
      {node.children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNodeView
              key={child.key}
              node={child}
              depth={depth + 1}
              selectedComponentId={selectedComponentId}
              onSelectComponent={onSelectComponent}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ComponentTreePanel({
  draft,
  selectedComponentId,
  onSelectComponent,
}: Props) {
  const tree = buildComponentTree(draft);

  return (
    <section className="space-y-2 border-t border-zinc-800/80 pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Component tree
      </h2>
      <p className="text-[10px] leading-snug text-zinc-600">
        Authoring components only — surface rows are group headers.
      </p>
      {!tree ? (
        <p className="text-xs text-amber-300/90">No root room component found.</p>
      ) : (
        <ul className="space-y-0.5">
          <TreeNodeView
            node={tree}
            depth={0}
            selectedComponentId={selectedComponentId}
            onSelectComponent={onSelectComponent}
          />
        </ul>
      )}
    </section>
  );
}
