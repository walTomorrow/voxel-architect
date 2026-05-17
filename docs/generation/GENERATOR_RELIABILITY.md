# Generator reliability (automated tests)

Developer-facing overview of **what generator reliability means today**, **what Vitest enforces**, and **what is out of scope**. This is **maintainer infrastructure**, not an end-user feature.

Passing these checks means outputs are **mechanically sane** for the current **`generic_building`** component pipeline—they do **not** prove beauty, architectural taste, or design correctness in an aesthetic sense (see also [`GENERATION_DESIGN_PRINCIPLES.md`](./GENERATION_DESIGN_PRINCIPLES.md), §2.2).

Preset and edge-case suites also assert **`validateVoxelStructurePlacements`** (structural shape/state **plus** material/shape semantics for partial blocks — e.g. window **panes** — where the generator emits them) via **`assertGeneratedStructurePlacementSemantics`**—orthogonal to 26-connectivity but required for safe partial-block emission.

---

## Purpose

- Catch **structural regressions** early (empty output, bad IDs, duplicate lattice cells, disconnected mass, over budget).
- Document **objective rules** the suite relies on so contributors know how to extend or split tests when generators evolve.
- Enforce that **visual fixes are solved through generator semantics**, not by weakening invariants.

---

## Current deterministic pipeline

### Generic building (component plan)

```text
GenericBuildingBlueprint
  → validateBlueprint()  →  validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()  →  ComponentPlan (internal IR)
  → generateFromComponentPlan()
  → VoxelBlock[]
```

Production UI flows may call `generateStructure()` (validate + generate); tests often validate once then call `generateStructureFromResolved` to mirror the post-validation path without double validation.

**Retired:** **`medieval_tower`** generator and tower presets (historical — see [`../project-history/DEVELOPMENT_TIMELINE.md`](../project-history/DEVELOPMENT_TIMELINE.md)). **`blacksmith_workshop`** was never shipped; `buildingFamilies.test.ts` expects no family entry.

---

## What the automated tests cover

| Area | Location |
|------|----------|
| **Generator smoke** | `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts` — default sample blueprint validates and yields non-empty blocks |
| **Structure analysis helpers** | `src/lib/voxel/structureAnalysis.ts`, `src/lib/voxel/__tests__/structureAnalysis.test.ts` — coordinate keys, duplicates, invalid IDs, 26-connectivity, grounding |
| **Generic preset invariants** | `src/lib/generation/__tests__/generatorGenericPresetInvariants.test.ts` — `GENERIC_BUILDING_PRESETS` |
| **Generic blueprint validation** | `src/lib/blueprints/__tests__/validateGenericBuilding.test.ts` |
| **Component generators** | `src/lib/generation/components/__tests__/componentGenerators.test.ts` — foundation, shell behavior |
| **Opening masks / doorway** | `src/lib/generation/components/__tests__/openingMask.test.ts`, `entranceDoorway.test.ts` |
| **Compile plan** | `src/lib/generation/components/__tests__/compileGenericBuildingPlan.test.ts` |
| **Shed roof** | `src/lib/generation/components/__tests__/shedRoof.test.ts` |
| **Shared assertions** | `src/lib/generation/__tests__/testUtils.ts` — `assertGeneratedStructureHardInvariants`, `assertGeneratedStructurePlacementSemantics` |
| **Window pane axis** | `src/lib/generation/__tests__/generatorWindowPanes.test.ts` — `paneAxisForWindowCell` (shared by generic windows) |
| **Building family catalog** | `src/lib/generation/__tests__/buildingFamilies.test.ts` — active families only |
| **Placement utils** | `src/lib/generation/__tests__/placementUtils.test.ts` — merge + `filterGroundedConnected26` |

**Vitest** is configured in `vitest.config.ts` to include:

- `src/lib/blueprints/__tests__/**/*.test.ts`
- `src/lib/generation/__tests__/**/*.test.ts`
- `src/lib/generation/components/__tests__/**/*.test.ts`
- `src/lib/voxel/__tests__/**/*.test.ts`

**Script:** `pnpm test:generator` runs `vitest run` (see `package.json`).

**Merged slice verification (reference):** 76 tests passed across 15 files; `pnpm exec tsc --noEmit` and `pnpm run build` pass.

---

## Hard invariants (preset + edge-case suites)

After validation and generation, tests analyze blocks and assert:

| Check | Meaning |
|-------|---------|
| `blocks.length > 0` | Non-empty structure |
| `analysis.blockCount === blocks.length` | Analyzer agrees with input length |
| `analysis.uniqueBlockCount > 0` | At least one occupied lattice cell |
| `analysis.invalidBlockTypeIds.length === 0` | Every `blockTypeId` resolves via `getBlockDefinition()` |
| `analysis.duplicateCoordinateCount === 0` | No duplicate `(x, y, z)` rows |
| `analysis.connectedComponentCount26 === 1` | **Single** 26-neighbor component on unique cells — asserted for generic presets |
| `analysis.ungroundedBlockCount26 === 0` | Every unique cell is 26-reachable from structure-relative ground |
| `analysis.allBlocksGroundedConnected26 === true` | Convenience flag aligning with non-empty + one component + no ungrounded cells |
| `blocks.length <= resolved.constraints.maxBlockCount` | Budget from validated blueprint |
| Placement semantics (where used) | Valid `shapeKind` / `state` for partial blocks (e.g. panes) |

If you add generators that intentionally emit **multiple disconnected masses** or **floating** volumes, **do not** reuse these invariants unchanged—gate them per generator or introduce blueprint-aware policies.

---

## Connectivity (26-neighbor)

Structural connectivity uses **26-neighbor** voxel adjacency: offsets `(dx, dy, dz)` with each coordinate in `{-1, 0, 1}`, excluding `(0, 0, 0)`. Two occupied cells are adjacent if the neighbor offset exists and that cell is occupied.

Analysis operates on **unique** lattice coordinates; duplicate rows in `blocks` are reported separately (`duplicateCoordinateCount`).

**Generic buildings** use **`filterGroundedConnected26`** after component merge so roof decks over hollow interiors stay connected (see [`ARCHITECTURAL_COMPONENT_GRAMMAR.md`](./ARCHITECTURAL_COMPONENT_GRAMMAR.md)).

---

## Grounding (structure-relative)

**Ground-touching seeds:** unique occupied cells with **`y === minY`**, where **`minY`** is the minimum `y` over **unique** coordinates. Reachability uses the **same** 26-neighbor graph.

For **`generic_building`**, **y = 0** is the full footprint floor slab (including doorway threshold).

**Future work** might need different policies for **world-space** grounding, **towns / multi-building** layouts, or **intentionally floating** builds (`allowFloatingBlocks`).

---

## Fixture coverage

- **Generic buildings:** `simple_rustic_cabin`, `shed_roof_workshop` in `sampleGenericBuildingBlueprints.ts`.
- **Partial blocks:** `PARTIAL_BLOCK_SHOWCASE_STRUCTURE` in `src/lib/voxel/sampleStructure.ts` (preview Partials tab; validated in `partialBlockShowcase.test.ts`).

---

## Visual fixes vs tests

When preview shows a doorway void, missing roof, or floating trim:

1. **Fix generator semantics** (aperture masks, component emitters, merge priority, grounding filter)—see §2.3.1 in design principles for doorway floor bands.
2. **Add or tighten focused tests** (`openingMask.test.ts`, `entranceDoorway.test.ts`, preset invariants).
3. **Do not** relax `connectedComponentCount26`, duplicate-coordinate checks, or `maxBlockCount` assertions to greenwash a screenshot.

---

## What the tests do **not** prove

- Visual beauty or readability on screen  
- Architectural style quality  
- Exact block counts, bounds, or material distributions  
- Screenshot / visual regression  
- AI output quality  
- Strict semantics such as “must have a roof / door / windows”  
- Towns, maps, multi-building compounds, or intentionally floating structures (unless covered by separate, explicit suites later)

---

## How to run (local sanity)

```bash
pnpm test:generator
pnpm exec tsc --noEmit
pnpm run build
```

There is **no** dedicated docs lint script in `package.json` today.

---

## Future directions

- Run `pnpm test:generator` in **CI** on pull requests  
- **Invalid blueprint** tests (expected validation failures)  
- **Regression fixtures** tied to real bugs  
- Optional **`/generic-lab` diagnostics** surfacing `analyzeVoxelStructure` fields  
- **Blueprint-aware invariant policies** for multi-component or floating structures when product scope expands

Keep this document aligned when invariant lists or suites change.
