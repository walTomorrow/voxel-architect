# Change log — Blueprint-driven medieval tower (deterministic)

This document summarizes work completed for **Voxel Architect’s first full blueprint pipeline**: a rich semantic blueprint type, validation, a deterministic procedural generator for a **medieval tower**, and a **visualizer** page. **No AI**, no LLM block placement, no new API routes, auth, database, or persistence.

---

## High-level architecture

```text
MedievalTowerBlueprint (authoring JSON shape)
  → validateBlueprint()  → BlueprintValidationResult + optional ResolvedMedievalTower
  → generateStructure() or generateStructureFromResolved()
  → generateMedievalTower()
  → VoxelBlock[]
  → VoxelViewer (existing R3F component)
```

Materials in authoring blueprints use **semantic classic-pack keys** (e.g. `cobblestone`). Validation resolves them to **`BlockTypeId`** strings (e.g. `classic/cobblestone`) via the existing block registry.

---

## Files touched

| Path | Role |
|------|------|
| `src/lib/blueprints/types.ts` | Authoring types (`MedievalTowerBlueprint`), `StructureBlueprint` alias, `ResolvedMedievalTower` with normalized `grid` and resolved materials. |
| `src/lib/blueprints/validateBlueprint.ts` | `validateBlueprint()`: footprint/dimension rules, material resolution, body/roof/overhang clamping to height budget, `maxBlockCount` estimate loop (may reduce roof layers), entrance/window sanity checks, returns `errors`, `notes`, and `resolved` when `ok`. |
| `src/lib/blueprints/sampleBlueprints.ts` | `SAMPLE_MEDIEVAL_TOWER_BLUEPRINT` — default demo tower for the visualizer. |
| `src/lib/generation/generateStructure.ts` | `generateStructure(blueprint)` validates then dispatches; `generateStructureFromResolved(resolved)` avoids double validation (used by UI). |
| `src/lib/generation/generators/generateMedievalTower.ts` | Deterministic tower: shell, hollow interior, interior floors, door carve + door voxels, windows, flat or stepped pyramid roof, crenellations, corner pillars, grounded / no-float filtering per constraints; voxel merge with **priority + stable ordering** to prevent duplicate coordinates. |
| `src/app/visualizer/page.tsx` | Next.js page + metadata for `/visualizer`. |
| `src/app/visualizer/VisualizerClient.tsx` | Client: load sample blueprint → validate → generate → `VoxelViewer`; side panel (metadata, dimensions, materials, features, block count, errors, notes). |

---

## Blueprint schema (authoring)

The tower blueprint includes, in one object:

1. **Identity** — `structureType: "medieval_tower"`, `metadata` (name, description, notes).
2. **Dimensions** — `width`, `length`, `height` (minimums enforced in validation).
3. **Materials** — slots: `wall`, `floor`, `roof`, `window`, `door`, `accent` (classic pack local ids as strings).
4. **Massing** — `footprint` (currently `square`), `verticalEmphasis`, `symmetry`, `wallThickness`, `hollowInterior`.
5. **Levels** — `floorCount`, `includeInteriorFloors`.
6. **Openings** — entrance side/style/width/height; windows style, placement, floors, `windowsCountPerSide`.
7. **Roof** — `style` (`flat` \| `stepped_pyramid`), `height`, `overhang` (clamped in validation).
8. **Features** — `crenellations`, `cornerPillars`.
9. **Constraints** — `maxBlockCount`, `allowFloatingBlocks`, `enforceSymmetry`, `requireGroundedStructure`.

Resolved output adds **`grid`** (`width`, `depth`, `bodyLayers`, `roofLayers`, `overhang`) after normalization.

---

## Generator behavior (summary)

- **Exterior shell** with configurable thickness; **hollow** interior when requested.
- **Interior floors** at story intervals when `includeInteriorFloors` is true.
- **Entrance** on the chosen face: aperture carved through the shell; **door** material on appropriate voxels; **arched** variant adds a deterministic lintel voxel where applicable.
- **Windows** placed deterministically from placement/floor/count rules (including symmetric modes).
- **Roof**: flat cap or **stepped pyramid** as stacked shrinking layers; overhang is bounded so generation stays consistent with grounded constraints.
- **Crenellations** and **corner pillars** (accent material) when enabled.
- **No duplicate voxels**: contributions collected then merged with explicit priority so the same `(x,y,z)` resolves once predictably.

---

## Visualizer

- **Route:** `/visualizer`
- **Flow:** `SAMPLE_MEDIEVAL_TOWER_BLUEPRINT` → `validateBlueprint` → `generateStructureFromResolved` → `{ blocks }` passed to **`VoxelViewer`**.
- **Panel:** structure name, type, dimensions, material keys, feature toggles, block count, validation errors, and validation/simplification **notes**.

---

## Build fixes (TypeScript)

During integration, the following issues were corrected:

1. **`validateBlueprint.ts`** — Removed assignment to **`resolvedDraft.grid.roofLayers`** after `ResolvedMedievalTower` was typed with a readonly `grid`; the `maxBlockCount` reduction loop now only mutates a local **`roofLayersEff`** and rebuilds objects for re-estimation.
2. **`generateStructure.ts`** — Restored **`import type { VoxelBlock }`** for public return types.
3. **`generateStructure.ts`** — Exhaustiveness in `generateStructureFromResolved` uses **`resolved.structureType`** in the `default` branch (single variant today) so TypeScript accepts the pattern without falsely assigning `resolved` to `never`.

**Verification:** `pnpm run build` completes successfully (Next.js 16.x).

---

## How to run (for humans or review bots)

```bash
pnpm install   # if needed
pnpm dev
# Open http://localhost:3000/visualizer
```

```bash
pnpm run build
```

---

## Intentionally out of scope (this milestone)

- LLM / Claude / OpenAI / prompt UI
- API routes for generation
- Persistence, auth, database, Cloudflare extras
- Additional structure types (e.g. cathedral) — only **`medieval_tower`** is implemented; `generateStructure` is structured to add more `structureType` branches later.

---

## Suggested next steps (product)

- Add a second **`structureType`** and generator module using the same validate → resolve → merge patterns.
- In-browser blueprint editor (JSON or form) still without LLM.
- Snapshot tests: fixed blueprints → expected block count ranges or hashed voxel sets for regression.
