"use client";

import { useMemo, useState } from "react";
import type { MedievalTowerBlueprint } from "@/src/lib/blueprints/types";
import { SAMPLE_MEDIEVAL_TOWER_BLUEPRINT } from "@/src/lib/blueprints/sampleBlueprints";
import { validateBlueprint } from "@/src/lib/blueprints/validateBlueprint";
import { generateStructureFromResolved } from "@/src/lib/generation/generateStructure";
import { VoxelViewer } from "@/src/components/voxel/VoxelViewer";
import type { VoxelStructure } from "@/src/lib/voxel/types";
import { CLASSIC_BLOCK_PACK } from "@/src/lib/voxel/blocks/packs/classic";

/** UI / perf caps (stricter than schema minimums where applicable). */
const FOOTPRINT_MIN = 5;
const FOOTPRINT_MAX = 32;
const HEIGHT_MIN = 8;
const HEIGHT_MAX = 48;
const ROOF_HEIGHT_MIN = 1;
const ROOF_HEIGHT_MAX = 12;
const ROOF_OVERHANG_UI_MAX = 4;
const FLOOR_COUNT_MIN = 1;
const FLOOR_COUNT_MAX = 30;
const MAX_BLOCK_COUNT_MIN = 1_000;
const MAX_BLOCK_COUNT_MAX = 500_000;

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function cloneSampleBlueprint(): MedievalTowerBlueprint {
  return structuredClone(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT) as MedievalTowerBlueprint;
}

const CLASSIC_KEYS = Object.keys(CLASSIC_BLOCK_PACK).sort((a, b) =>
  a.localeCompare(b),
);

export function VisualizerClient() {
  const [blueprint, setBlueprint] = useState<MedievalTowerBlueprint>(
    cloneSampleBlueprint,
  );

  const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);

  const structure: VoxelStructure = useMemo(() => {
    if (!validation.ok || !validation.resolved) {
      return { blocks: [] };
    }
    return {
      blocks: generateStructureFromResolved(validation.resolved),
    };
  }, [validation]);

  const bp = blueprint;
  const isSquare = bp.massing.footprint === "square";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100 md:flex-row">
      <aside className="max-h-[45vh] shrink-0 overflow-y-auto border-b border-zinc-800/90 p-5 md:max-h-none md:w-[min(100%,32rem)] md:border-b-0 md:border-r md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Blueprint editor</h1>
            <p className="mt-1 max-w-prose text-xs text-zinc-500">
              Edit the medieval tower blueprint; validation and generation stay
              deterministic. No blocks are placed by hand in the UI.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
            onClick={() => setBlueprint(cloneSampleBlueprint())}
          >
            Reset to sample
          </button>
        </div>

        <dl className="mt-5 space-y-3 border-b border-zinc-800/80 pb-4 text-sm">
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
        </dl>

        <form
          className="mt-5 space-y-6 text-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Dimensions
            </h2>
            {isSquare && (
              <p className="mt-1 text-[11px] text-zinc-500">
                Square footprint: width and length stay in sync.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs text-zinc-400">
                Width ({FOOTPRINT_MIN}–{FOOTPRINT_MAX})
                <input
                  type="number"
                  min={FOOTPRINT_MIN}
                  max={FOOTPRINT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.dimensions.width}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      FOOTPRINT_MIN,
                      FOOTPRINT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      dimensions: isSquare
                        ? { ...b.dimensions, width: v, length: v }
                        : { ...b.dimensions, width: v },
                    }));
                  }}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Length ({FOOTPRINT_MIN}–{FOOTPRINT_MAX})
                <input
                  type="number"
                  min={FOOTPRINT_MIN}
                  max={FOOTPRINT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.dimensions.length}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      FOOTPRINT_MIN,
                      FOOTPRINT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      dimensions: isSquare
                        ? { ...b.dimensions, width: v, length: v }
                        : { ...b.dimensions, length: v },
                    }));
                  }}
                />
              </label>
              <label className="col-span-2 block text-xs text-zinc-400">
                Height ({HEIGHT_MIN}–{HEIGHT_MAX})
                <input
                  type="number"
                  min={HEIGHT_MIN}
                  max={HEIGHT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.dimensions.height}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      HEIGHT_MIN,
                      HEIGHT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      dimensions: { ...b.dimensions, height: v },
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Materials (classic pack)
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["wall", "Wall"],
                  ["floor", "Floor"],
                  ["roof", "Roof"],
                  ["window", "Window"],
                  ["door", "Door"],
                  ["accent", "Accent"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs text-zinc-400">
                  {label}
                  <select
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[11px] text-zinc-100"
                    value={bp.materials[key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBlueprint((b) => ({
                        ...b,
                        materials: { ...b.materials, [key]: value },
                      }));
                    }}
                  >
                    {CLASSIC_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Levels
            </h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-zinc-400">
                Floor count ({FLOOR_COUNT_MIN}–{FLOOR_COUNT_MAX})
                <input
                  type="number"
                  min={FLOOR_COUNT_MIN}
                  max={FLOOR_COUNT_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.levels.floorCount}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      FLOOR_COUNT_MIN,
                      FLOOR_COUNT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      levels: { ...b.levels, floorCount: v },
                    }));
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={bp.levels.includeInteriorFloors}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      levels: {
                        ...b.levels,
                        includeInteriorFloors: e.target.checked,
                      },
                    }))
                  }
                />
                Include interior floors
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Openings
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-zinc-400">
                Entrance side
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.entranceSide}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        entranceSide: e.target.value as MedievalTowerBlueprint["openings"]["entranceSide"],
                      },
                    }))
                  }
                >
                  <option value="front">front</option>
                  <option value="back">back</option>
                  <option value="left">left</option>
                  <option value="right">right</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Entrance style
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.entranceStyle}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        entranceStyle: e.target
                          .value as MedievalTowerBlueprint["openings"]["entranceStyle"],
                      },
                    }))
                  }
                >
                  <option value="simple">simple</option>
                  <option value="arched">arched</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Window style
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.windowsStyle}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        windowsStyle: e.target
                          .value as MedievalTowerBlueprint["openings"]["windowsStyle"],
                      },
                    }))
                  }
                >
                  <option value="small">small</option>
                  <option value="narrow">narrow</option>
                  <option value="arched">arched</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Window placement
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.openings.windowsPlacement}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      openings: {
                        ...b.openings,
                        windowsPlacement: e.target
                          .value as MedievalTowerBlueprint["openings"]["windowsPlacement"],
                      },
                    }))
                  }
                >
                  <option value="none">none</option>
                  <option value="front_only">front_only</option>
                  <option value="symmetric">symmetric</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Roof
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-zinc-400">
                Style
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                  value={bp.roof.style}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      roof: {
                        ...b.roof,
                        style: e.target.value as MedievalTowerBlueprint["roof"]["style"],
                      },
                    }))
                  }
                >
                  <option value="flat">flat</option>
                  <option value="stepped_pyramid">stepped_pyramid</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Roof height ({ROOF_HEIGHT_MIN}–{ROOF_HEIGHT_MAX})
                <input
                  type="number"
                  min={ROOF_HEIGHT_MIN}
                  max={ROOF_HEIGHT_MAX}
                  disabled={bp.roof.style === "flat"}
                  title={
                    bp.roof.style === "flat"
                      ? "Flat roof uses one layer; height is ignored."
                      : undefined
                  }
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
                  value={bp.roof.height}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      ROOF_HEIGHT_MIN,
                      ROOF_HEIGHT_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      roof: { ...b.roof, height: v },
                    }));
                  }}
                />
              </label>
              <label className="col-span-full block text-xs text-zinc-400">
                Overhang (0–{ROOF_OVERHANG_UI_MAX}; validator clamps to 0–2)
                <input
                  type="number"
                  min={0}
                  max={ROOF_OVERHANG_UI_MAX}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                  value={bp.roof.overhang}
                  onChange={(e) => {
                    const v = clampInt(
                      Number.parseInt(e.target.value, 10),
                      0,
                      ROOF_OVERHANG_UI_MAX,
                    );
                    setBlueprint((b) => ({
                      ...b,
                      roof: { ...b.roof, overhang: v },
                    }));
                  }}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Features
            </h2>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={bp.features.crenellations}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      features: {
                        ...b.features,
                        crenellations: e.target.checked,
                      },
                    }))
                  }
                />
                Crenellations
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={bp.features.cornerPillars}
                  onChange={(e) =>
                    setBlueprint((b) => ({
                      ...b,
                      features: {
                        ...b.features,
                        cornerPillars: e.target.checked,
                      },
                    }))
                  }
                />
                Corner pillars
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Constraints
            </h2>
            <label className="mt-3 block text-xs text-zinc-400">
              Max block count ({MAX_BLOCK_COUNT_MIN.toLocaleString()}–
              {MAX_BLOCK_COUNT_MAX.toLocaleString()})
              <input
                type="number"
                min={MAX_BLOCK_COUNT_MIN}
                max={MAX_BLOCK_COUNT_MAX}
                step={1000}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100"
                value={bp.constraints.maxBlockCount}
                onChange={(e) => {
                  const v = clampInt(
                    Number.parseInt(e.target.value, 10),
                    MAX_BLOCK_COUNT_MIN,
                    MAX_BLOCK_COUNT_MAX,
                  );
                  setBlueprint((b) => ({
                    ...b,
                    constraints: { ...b.constraints, maxBlockCount: v },
                  }));
                }}
              />
            </label>
          </section>
        </form>

        <div className="mt-6 border-t border-zinc-800/80 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Block count
          </h2>
          <p className="mt-1 font-mono text-sm text-zinc-200">
            {validation.ok ? structure.blocks.length : "— (invalid blueprint)"}
          </p>
        </div>

        <div className="mt-4 border-t border-zinc-800/80 pt-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Validation
          </h2>
          {validation.ok ? (
            <p className="mt-2 text-xs text-emerald-400/90">Blueprint OK.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-xs text-red-400/95">
              {validation.errors.map((err, i) => (
                <li key={`${i}-${err}`} className="rounded bg-red-950/40 px-2 py-1.5">
                  {err}
                </li>
              ))}
            </ul>
          )}
          {validation.notes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Notes / simplifications
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-200/85">
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
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Blueprint is invalid — geometry hidden
            </p>
            <p className="max-w-sm text-xs text-zinc-500">
              Adjust parameters or use Reset to sample. The previous valid model
              is not shown so you are not misled by stale voxels.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
