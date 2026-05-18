"use client";

import { useState } from "react";
import { ComparisonFooter } from "@/src/app/generic-lab-concepts/conceptShared";
import { ConceptEngineIde } from "@/src/app/generic-lab-concepts/concepts/ConceptEngineIde";
import { ConceptOperationBlocks } from "@/src/app/generic-lab-concepts/concepts/ConceptOperationBlocks";
import { ConceptRecommendedHybrid } from "@/src/app/generic-lab-concepts/concepts/ConceptRecommendedHybrid";
import { ConceptSurfaceBuild } from "@/src/app/generic-lab-concepts/concepts/ConceptSurfaceBuild";
import { ConceptWorldBuilder } from "@/src/app/generic-lab-concepts/concepts/ConceptWorldBuilder";
import { useConceptSample } from "@/src/app/generic-lab-concepts/useConceptSample";

const CONCEPT_TABS = [
  {
    id: "engine",
    label: "1 · Engine IDE",
    description: "Hierarchy + viewport + inspector + console",
    inspiredBy: "Unity · Godot · Unreal · Roblox Studio",
  },
  {
    id: "surface",
    label: "2 · Surface build",
    description: "Sims-style face cards + live preview",
    inspiredBy: "The Sims build mode",
  },
  {
    id: "world",
    label: "3 · World builder",
    description: "Tool modes + world-first viewport",
    inspiredBy: "Axiom · Minecraft tools · city builders",
  },
  {
    id: "ops",
    label: "4 · Operation blocks",
    description: "Scratch-style semantic ops (future)",
    inspiredBy: "Scratch · visual operations",
  },
  {
    id: "hybrid",
    label: "5 · Recommended hybrid",
    description: "Most shippable direction",
    inspiredBy: "Hybrid of 1 + 2",
  },
] as const;

type ConceptTabId = (typeof CONCEPT_TABS)[number]["id"];

const DEFAULT_SELECTION = "front-windows";

export function GenericLabConceptsClient() {
  const [tab, setTab] = useState<ConceptTabId>("hybrid");
  const [selectedId, setSelectedId] = useState(DEFAULT_SELECTION);
  const sample = useConceptSample();

  const activeTab = CONCEPT_TABS.find((t) => t.id === tab)!;

  const layoutProps = {
    sample,
    selectedId,
    onSelect: setSelectedId,
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-800/90 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-white">
          Generic v2 lab — UI concepts (pass 3)
        </h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">
          Five semantic architecture IDE directions. Each tab mounts one live{" "}
          <span className="text-emerald-400/90">VoxelViewer</span> (
          <span className="text-zinc-400">porch_house_v2</span>). Illustrative controls
          only — editing lives on{" "}
          <a
            href="/generic-lab"
            className="text-emerald-400/90 underline-offset-2 hover:underline"
          >
            /generic-lab
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CONCEPT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "rounded-lg border px-3 py-2 text-left transition",
                tab === t.id
                  ? "border-emerald-500/50 bg-emerald-950/35 ring-1 ring-emerald-500/25"
                  : "border-zinc-600/80 bg-zinc-800/50 hover:border-zinc-500",
              ].join(" ")}
            >
              <span className="block text-xs font-semibold text-zinc-100">{t.label}</span>
              <span className="mt-0.5 block text-[10px] text-zinc-500">{t.description}</span>
              <span className="mt-0.5 block text-[9px] text-zinc-600">{t.inspiredBy}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-zinc-600">
          Active: <span className="text-zinc-400">{activeTab.inspiredBy}</span>
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        {tab === "engine" ? <ConceptEngineIde {...layoutProps} /> : null}
        {tab === "surface" ? <ConceptSurfaceBuild {...layoutProps} /> : null}
        {tab === "world" ? <ConceptWorldBuilder {...layoutProps} /> : null}
        {tab === "ops" ? <ConceptOperationBlocks {...layoutProps} /> : null}
        {tab === "hybrid" ? <ConceptRecommendedHybrid {...layoutProps} /> : null}
        <ComparisonFooter />
      </div>
    </div>
  );
}
