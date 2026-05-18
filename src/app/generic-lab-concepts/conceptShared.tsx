"use client";

import type { ReactNode } from "react";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import {
  findComponent,
  selectedComponentSummaryLine,
} from "@/src/app/generic-lab-concepts/conceptWorkbenchModel";
import { panel } from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";
import type { ConceptSample } from "@/src/app/generic-lab-concepts/useConceptSample";

export function InspiredByNote({ children }: { readonly children: ReactNode }) {
  return (
    <p className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
      <span className="font-semibold text-zinc-400">Inspired by: </span>
      {children}
    </p>
  );
}

export function SelectedPreviewOverlay({
  draft,
  selectedId,
}: {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedId: string;
}) {
  const comp = findComponent(draft, selectedId);
  if (!comp) return null;
  return (
    <div className="rounded-lg border border-emerald-500/35 bg-zinc-950/90 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[11px] text-zinc-300">
        <span className="font-semibold text-emerald-300">Selected:</span>{" "}
        {selectedComponentSummaryLine(draft, selectedId)}
      </p>
      <p className="mt-0.5 font-mono text-[9px] text-zinc-600">{comp.id}</p>
    </div>
  );
}

export function ComparisonFooter() {
  const rows = [
    {
      name: "1 · Engine IDE",
      strength: "Familiar hierarchy + inspector + console; best for daily authoring",
      risk: "Can feel dense without surface-first affordances",
    },
    {
      name: "2 · Surface build",
      strength: "Architectural mental model; great for facade editing",
      risk: "Weaker for roof/global components and multi-surface overview",
    },
    {
      name: "3 · World builder",
      strength: "Live voxel anchor + tool modes for future add/remove",
      risk: "Tool palette adds mode complexity early",
    },
    {
      name: "4 · Operation blocks",
      strength: "Future Phase 7 / AI ops inspiration; stable component ids",
      risk: "Not a primary editor — labeled future-only",
    },
    {
      name: "5 · Recommended hybrid",
      strength: "Combines tree + surface cards + live preview; most shippable",
      risk: "Needs discipline to keep debug secondary",
    },
  ] as const;

  return (
    <footer className={`${panel()} mt-3 shrink-0 p-4`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Quick comparison
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-[11px]">
          <thead>
            <tr className="border-b border-zinc-700/60 text-zinc-500">
              <th className="py-1.5 pr-3 font-medium">Concept</th>
              <th className="py-1.5 pr-3 font-medium">Strength</th>
              <th className="py-1.5 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-zinc-800/60 text-zinc-400">
                <td className="py-2 pr-3 font-medium text-zinc-300">{r.name}</td>
                <td className="py-2 pr-3">{r.strength}</td>
                <td className="py-2">{r.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </footer>
  );
}

export type ConceptLayoutProps = {
  readonly sample: ConceptSample;
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
};
