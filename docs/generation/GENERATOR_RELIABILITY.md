# Generator reliability (automated tests)

Developer-facing overview of **what generator reliability means today**, **what Vitest enforces**, and **what is out of scope**. This is **maintainer infrastructure**, not an end-user feature.

Passing these checks means outputs are **mechanically sane** for the current **deterministic generator** paths (**`medieval_tower`** and **`blacksmith_workshop`**)—they do **not** prove beauty, architectural taste, or design correctness in an aesthetic sense (see also [`GENERATION_DESIGN_PRINCIPLES.md`](./GENERATION_DESIGN_PRINCIPLES.md), §2.2).

Preset and edge-case suites also assert **`validateVoxelStructurePlacements`** (structural shape/state **plus** material/shape semantics for partial blocks — e.g. window **panes** — where the generator emits them) via **`assertGeneratedStructurePlacementSemantics`**—orthogonal to 26-connectivity but required for safe partial-block emission.

---

## Purpose

- Catch **structural regressions** early (empty output, bad IDs, duplicate lattice cells, disconnected mass, over budget).
- Document **objective rules** the suite relies on so contributors know how to extend or split tests when generators evolve.

---

## Current deterministic pipeline

```text
StructureBlueprint (medieval_tower | blacksmith_workshop)
  → validateBlueprint()
  → generateStructureFromResolved(resolved)
  → VoxelBlock[]
  → analyzeVoxelStructure(blocks)
```

Production UI flows may call `generateStructure()` (validate + generate); tests often validate once then call `generateStructureFromResolved` to mirror the post-validation path without double validation.

---

## What the automated tests cover

| Area | Location |
|------|----------|
| **Generator smoke** | `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts` — default sample blueprint validates and yields non-empty blocks |
| **Structure analysis helpers** | `src/lib/voxel/structureAnalysis.ts`, `src/lib/voxel/__tests__/structureAnalysis.test.ts` — coordinate keys, duplicates, invalid IDs, 26-connectivity, grounding |
| **Curated preset invariants** | `src/lib/generation/__tests__/generatorPresetInvariants.test.ts` — every entry in `MEDIEVAL_TOWER_PRESETS` |
| **Edge-case blueprint invariants** | `src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts`, fixtures in `src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts` |
| **Shared assertions** | `src/lib/generation/__tests__/testUtils.ts` — `formatGeneratorInvariantDiagnostics`, `assertGeneratedStructureHardInvariants`, `assertGeneratedStructurePlacementSemantics` (`validateVoxelStructurePlacements`) |
| **Window pane regression** | `src/lib/generation/__tests__/generatorWindowPanes.test.ts` — medieval tower panes; façade trim stays **cube** |
| **Blacksmith preset invariants** | `src/lib/generation/__tests__/generatorBlacksmithPresetInvariants.test.ts` — `BLACKSMITH_PRESETS` |
| **Blacksmith edge-case invariants** | `src/lib/generation/__tests__/generatorBlacksmithEdgeCaseInvariants.test.ts`, `fixtures/blacksmithEdgeCaseBlueprints.ts` |
| **Blacksmith pane / smoke** | `src/lib/generation/__tests__/generatorBlacksmithPanes.test.ts` |
| **Building family catalog** | `src/lib/generation/__tests__/buildingFamilies.test.ts` |

**Vitest** is configured in `vitest.config.ts` to include:

- `src/lib/generation/__tests__/**/*.test.ts`
- `src/lib/voxel/__tests__/**/*.test.ts`

**Script:** `pnpm test:generator` runs `vitest run` (see `package.json`).

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
| `analysis.connectedComponentCount26 === 1` | **Single** 26-neighbor component on unique cells — **only asserted for current single-building tower presets/fixtures** |
| `analysis.ungroundedBlockCount26 === 0` | Every unique cell is 26-reachable from structure-relative ground (below) |
| `analysis.allBlocksGroundedConnected26 === true` | Convenience flag aligning with non-empty + one component + no ungrounded cells |
| `blocks.length <= resolved.constraints.maxBlockCount` | Budget from validated blueprint |

If you add generators that intentionally emit **multiple disconnected masses** or **floating** volumes, **do not** reuse these invariants unchanged—gate them per generator or introduce blueprint-aware policies.

---

## Connectivity (26-neighbor)

Structural connectivity uses **26-neighbor** voxel adjacency: offsets `(dx, dy, dz)` with each coordinate in `{-1, 0, 1}`, excluding `(0, 0, 0)`. Two occupied cells are adjacent if the neighbor offset exists and that cell is occupied.

So connections count across **faces, edges, and corners**. Analysis operates on **unique** lattice coordinates; duplicate rows in `blocks` are reported separately (`duplicateCoordinateCount`).

---

## Grounding (structure-relative)

**Ground-touching seeds:** unique occupied cells with **`y === minY`**, where **`minY`** is the minimum `y` over **unique** coordinates (structure-relative “floor layer”). Reachability uses the **same** 26-neighbor graph.

That matches typical medieval tower output (foundation at the bottom layer). **Future work** might need different policies for **world-space** grounding, **towns / multi-building** layouts, **stacked structures**, or **intentionally floating** builds (`allowFloatingBlocks`, etc.).

---

## Fixture coverage

- **Curated:** all presets in `MEDIEVAL_TOWER_PRESETS` (`src/lib/blueprints/sampleBlueprints.ts`).
- **Edge-case IDs** (valid blueprints stressing validator clamps / extremes):  
  `height_budget_body_clamp`, `wide_entrance_max`, `authoring_overhang_clamp`, `thick_shell_narrow_void`, `window_density_wide`, `tight_max_block_count_roof_trim` — see `src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts`.

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

---

## Future directions

- Run `pnpm test:generator` in **CI** on pull requests  
- **Invalid blueprint** tests (expected validation failures)  
- **Regression fixtures** tied to real bugs  
- Optional **`/visualizer` diagnostics** surfacing `analyzeVoxelStructure` fields  
- **Blueprint-aware invariant policies** for multi-component or floating structures when product scope expands

Keep this document aligned when invariant lists or suites change.
