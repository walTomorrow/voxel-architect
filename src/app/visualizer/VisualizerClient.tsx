"use client";

import { useMemo } from "react";
import { SAMPLE_MEDIEVAL_TOWER_BLUEPRINT } from "@/src/lib/blueprints/sampleBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";
import type { VoxelStructure } from "@/src/lib/voxel/types";

export function VisualizerClient() {
  const validation = useMemo(
    () => validateBlueprint(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT),
    [],
  );

  const structure: VoxelStructure = useMemo(() => {
    if (!validation.ok || !validation.resolved) {
      return { blocks: [] };
    }
    return {
      blocks: generateStructureFromResolved(validation.resolved),
    };
  }, [validation]);

  const bp = SAMPLE_MEDIEVAL_TOWER_BLUEPRINT;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100 md:flex-row">
      <aside className="max-h-[40vh] shrink-0 overflow-y-auto border-b border-zinc-800/90 p-5 md:max-h-none md:w-[min(100%,22rem)] md:border-b-0 md:border-r md:p-6">
        <h1 className="text-lg font-semibold text-white">Blueprint visualizer</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Deterministic pipeline: validate → generate → render.
        </p>

        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Name
            </dt>
            <dd className="mt-0.5 text-zinc-200">{bp.metadata.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Structure type
            </dt>
            <dd className="mt-0.5 font-mono text-zinc-200">{bp.structureType}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Dimensions (W × L × H)
            </dt>
            <dd className="mt-0.5 font-mono text-zinc-200">
              {bp.dimensions.width} × {bp.dimensions.length} ×{" "}
              {bp.dimensions.height}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Materials (classic pack keys)
            </dt>
            <dd className="mt-0.5 space-y-1 font-mono text-[11px] leading-relaxed text-zinc-300">
              <div>wall: {bp.materials.wall}</div>
              <div>floor: {bp.materials.floor}</div>
              <div>roof: {bp.materials.roof}</div>
              <div>window: {bp.materials.window}</div>
              <div>door: {bp.materials.door}</div>
              <div>accent: {bp.materials.accent}</div>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Features
            </dt>
            <dd className="mt-0.5 text-zinc-300">
              crenellations: {bp.features.crenellations ? "on" : "off"}
              <br />
              corner pillars: {bp.features.cornerPillars ? "on" : "off"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Block count
            </dt>
            <dd className="mt-0.5 font-mono text-zinc-200">
              {validation.ok ? structure.blocks.length : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-zinc-800/80 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Validation
          </h2>
          {validation.ok ? (
            <p className="mt-2 text-xs text-emerald-400/90">Blueprint OK.</p>
          ) : (
            <ul className="mt-2 list-inside list-disc text-xs text-red-400/90">
              {validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {validation.notes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Notes / simplifications
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-200/80">
                {validation.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="min-h-0 min-w-0 flex-1">
        {validation.ok ? (
          <VoxelViewer className="h-full w-full" structure={structure} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-zinc-500">
            Fix blueprint validation errors to preview voxels.
          </div>
        )}
      </div>
    </div>
  );
}
