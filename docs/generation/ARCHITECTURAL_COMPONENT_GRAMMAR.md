# Architectural component grammar (generic buildings)

This document describes the **component-based compilation model** used by **`generic_building`**—the first low-rise path that scales without adding another monolithic generator family.

**Audience:** implementers, doc maintainers, and future AI agents that edit **blueprints**, not voxels.

**Related:**

- [`GENERATION_DESIGN_PRINCIPLES.md`](./GENERATION_DESIGN_PRINCIPLES.md) — composition and readability rules
- [`GENERATOR_RELIABILITY.md`](./GENERATOR_RELIABILITY.md) — automated invariants
- [`../blueprints/BLUEPRINT_FEATURE_CATALOG.md`](../blueprints/BLUEPRINT_FEATURE_CATALOG.md) — authoring fields
- [`../project-history/DEVELOPMENT_TIMELINE.md`](../project-history/DEVELOPMENT_TIMELINE.md) — why blacksmith was removed

---

## Why components exist

Voxel Architect is a **semantic architecture compiler**:

```text
authoring intent (blueprint)
  → validation / normalization
  → internal plan (compiler IR)
  → deterministic component generators
  → merge + grounding policy
  → VoxelBlock[]
  → preview / analysis
```

**One-off family generators** (e.g. a dedicated `blacksmith_workshop` module) duplicated shell, roof, opening, and merge logic. Each new building type threatened another fork. **Components** let many low-rise buildings share:

- one footprint / foundation convention
- one hollow-wall shell with aperture masks
- shared entrance trim and window emitters
- shared roof emitters and merge priorities

**`medieval_tower`** was a **retired** vertical family generator (tower era). The active product uses **`generic_building`** components only; see [`../project-history/DEVELOPMENT_TIMELINE.md`](../project-history/DEVELOPMENT_TIMELINE.md).

---

## Public vs internal vs output

| Artifact | Role | Public? |
|----------|------|---------|
| **`GenericBuildingBlueprint`** | Authoring / app-library semantic schema (`structureType: "generic_building"`) | **Yes** — edit via presets, tests, future UI |
| **`ResolvedGenericBuilding`** | Validated, normalized snapshot (registry block ids, clamped grid) | **Internal** — output of `validateGenericBuildingBlueprint()` / `validateBlueprint()` |
| **`ComponentPlan`** | Compiler IR: ordered components + derived opening masks | **Internal only — never expose as JSON API or import format** |
| **`VoxelBlock[]`** | Generated lattice output | **Output** — inspectable, not authoritative authoring input |

Types live under `src/lib/blueprints/types.ts` and `src/lib/generation/components/types.ts`.

---

## End-to-end pipeline

```text
GenericBuildingBlueprint
  → validateBlueprint()  →  validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()
  → ComponentPlan  (+ openings: shellSkipMask, windowMask, entranceMask)
  → generateFromComponentPlan()
      → per-component emit* functions
      → mergePlacements()  (priority + insertion order)
      → filterGroundedConnected26()  (unless allowFloatingBlocks)
  → VoxelBlock[]
  → /preview (Generic tab)
```

Entry points:

- `src/lib/generation/generators/generateGenericBuilding.ts`
- `src/lib/generation/generateStructure.ts` (`structureType === "generic_building"`)

---

## v1 component vocabulary

| `kind` | Emits placements? | Purpose |
|--------|-------------------|---------|
| `rectangular_body` | No (anchor only) | Massing metadata anchor for compile targets |
| `foundation` | Yes | Full footprint floor slab at **y = 0** (`materials.floor`) |
| `hollow_wall_shell` | Yes | Exterior shell **y = 1 … bodyLayers**; skips aperture cells |
| `entrance_on_side` | Yes | Sparse accent trim: lintel above opening, optional jambs for tall doors |
| `sparse_windows` | Yes | Fills **windowMask** cells (pane or cube per material metadata) |
| `pitched_gable_roof` | Yes | Stepped gable layers above body |
| `shed_roof` | Yes | Back-to-front shed slope; supports overhang |
| `chimney` | Yes | Accent stack on left or right perimeter |
| `front_step` | Yes | Single exterior floor block outside façade (optional feature) |

Implementations: `src/lib/generation/components/generators/`.

---

## Canonical component order

`compileGenericBuildingToComponentPlan()` builds **`plan.components`** in this order (conditional steps omitted when not applicable):

1. `rectangular_body` (`body_main`)
2. `foundation` (`foundation_main`)
3. `hollow_wall_shell` (`shell_main`)
4. `entrance_on_side` (`entrance_main`)
5. `sparse_windows` (`windows_main`) — if window mode ≠ `none` and count > 0
6. `pitched_gable_roof` or `shed_roof` (`roof_main`) — from `roof.kind`
7. `chimney` (`chimney_main`) — if enabled
8. `front_step` (`front_step_main`) — if enabled; targets `entrance_main`

Emit order in `generateFromComponentPlan()` follows this array order. **Merge resolution** is separate (priorities below).

---

## Merge and conflict behavior

All components stage **`GeneratorPlacement`** rows. Final voxels come from **`mergePlacements()`** in `src/lib/generation/placement/placementUtils.ts`:

- Sort by **descending priority `p`**, then **descending insertion index `i`**.
- **First placement wins** per `(x, y, z)` coordinate.

Priorities (`src/lib/generation/components/priorities.ts`):

| Constant | Value | Typical emitter |
|----------|------:|-----------------|
| `FOUNDATION` | 10 | `foundation` |
| `FRONT_STEP` | 15 | `front_step` (exterior cell) |
| `INTERIOR_FLOOR` | 20 | Reserved; hollow shell no longer emits y=1 interior floor |
| `WALL` | 30 | `hollow_wall_shell` |
| `ROOF` | 40 | roof components |
| `CHIMNEY` | 42 | `chimney` |
| `WINDOW` | 50 | `sparse_windows` |
| `DOOR_OR_TRIM` | 55 | `entrance_on_side` |

Higher priority overwrites lower at the same cell. Insertion order breaks ties at equal priority.

---

## Aperture mask strategy

During compile, **`deriveOpeningsForGenericBuilding()`** (`openingMask.ts`) builds:

| Mask | Purpose |
|------|---------|
| **`entranceMask`** | Wall aperture cells for the entrance (local keys `lx,y,lz`) |
| **`windowMask`** | Window aperture cells |
| **`shellSkipMask`** | Union used by **`hollow_wall_shell`** to **skip** wall placement |

**Entrance aperture:** **y = 1 … `openings.entrance.height`** on the chosen façade. **y = 0 is not skipped** — foundation still floors the threshold.

**Windows:** placed on façade interior span with symmetric slot selection; entrance span is **forbidden** along that façade axis so windows do not crowd the door.

There is **no air block type**. An “opening” is the **absence** of shell (and absence of door fill in the walk band). Trim and windows **selectively fill** subset cells (lintel, jambs, glass).

Doorway policy (threshold + standard height 2): [`GENERATION_DESIGN_PRINCIPLES.md`](./GENERATION_DESIGN_PRINCIPLES.md) §2.3.1.

---

## Coordinate conventions

- **Local grid:** `lx ∈ [0, width-1]`, `lz ∈ [0, depth-1]`, integer **y** layers.
- **World placement:** `worldX = originX + lx`, `worldZ = originZ + lz` with `originX = centerOrigin(width)`, `originZ = centerOrigin(depth)` (`planContext.ts`).
- **Façades:** `front` → `lz = depth - 1`, `back` → `lz = 0`, `left` → `lx = 0`, `right` → `lx = width - 1`.
- **Exterior step:** `outsideCellOffset()` moves one cell beyond the façade plane.

---

## y-level conventions

| y | Meaning |
|---|---------|
| **0** | Single **foundation / floor** slab (`materials.floor`) across full footprint including doorway threshold |
| **1 … bodyLayers** | Hollow **wall shell** (exterior band per `wallThickness`) |
| **1 … entrance.height** | Walkable **door aperture** (no shell, no door fill) |
| **height + 1** | Lintel row (accent trim) when ≤ `bodyLayers` |
| **> bodyLayers** | **Roof** volumes (`body.height` is wall height **above** foundation, **excluding** roof) |

**`body.height`** in `GenericBuildingBlueprint` maps to validated **`grid.bodyLayers`**.

Standard preset **`openings.entrance.height`** is **2** (Minecraft door clearance above floor). Values **3–4** imply a **big door** (validator may emit a note).

---

## Grounding and filtering

After merge, `generateFromComponentPlan()` applies:

- **`filterGroundedConnected26()`** when `constraints.allowFloatingBlocks` is false (default).

This keeps one **26-neighbor-connected** component reachable from all seeds at **`y === minY`** (structure-relative floor). It allows roof decks over **hollow interiors** (unlike legacy strict `filterGrounded` “block directly below”).

**`generic_building`** uses the 26-connected rule in `emitFromComponentPlan.ts` (see [`GENERATOR_RELIABILITY.md`](./GENERATOR_RELIABILITY.md)).

Analysis parity: `analyzeVoxelStructure()` in tests (`pnpm test:generator`).

---

## Authoring schema summary (`GenericBuildingBlueprint`)

| Section | Role |
|---------|------|
| **`body`** | `width`, `depth`, `height`, `wallThickness`, `hollowInterior` |
| **`roof`** | `kind`: `pitched_gable` \| `shed` \| `none`; `layers`, `overhang` |
| **`openings.entrance`** | `side`, `width`, `height` |
| **`openings.windows`** | `mode`, `count`, `heightBand` |
| **`features`** | `chimney`, `frontStep` |
| **`materials`** | Semantic classic keys → resolved `BlockTypeId` |
| **`constraints`** | `maxBlockCount`, `allowFloatingBlocks`, `requireGroundedStructure`, `enforceSymmetry` |

Presets: `src/lib/blueprints/sampleGenericBuildingBlueprints.ts`.

---

## Explicitly deferred (not in v1 grammar)

Do **not** assume these exist in `ComponentPlan` or public blueprint JSON yet:

- **InteriorPlan** — rooms, zones, furniture
- **Circulation** — stairs, ladders, corridors
- **Multiple bodies / wings** — single rectangle only
- **Style resolver** — `buildingStyles.ts` is metadata-only today
- **Selected-region editing** — no spatial blueprint patches
- **AI image interpretation** — no vision → blueprint pipeline
- **import/export v2** — no generic building exchange envelope yet (tower `blueprintExchange` v1 retired)
- **blacksmith_workshop** — removed; not a target for revival as a family

---

## Extending the grammar safely

1. Add blueprint fields + validation in `validateGenericBuilding.ts`.
2. Extend `deriveOpeningsForGenericBuilding()` if new apertures are needed.
3. Add a `PlannedComponent` variant and emitter under `components/generators/`.
4. Register in `compileGenericBuildingToComponentPlan()` and `emitFromComponentPlan()`.
5. Assign **`COMPONENT_PRI`** relative to existing layers.
6. Add Vitest coverage (unit + preset invariants); **do not weaken** global hard invariants for visual hacks.

See also [`GENERATOR_RELIABILITY.md`](./GENERATOR_RELIABILITY.md).
