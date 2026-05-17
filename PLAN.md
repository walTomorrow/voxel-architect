# Plan — Generic Building Component Vertical Slice

**Scoping only — waiting for review before implementation.**

---

## 1. Purpose

This plan covers **slice 2** on branch `milestone/generator-expansion`, immediately after **slice 1** (blacksmith removal — see [`CHANGE.md`](CHANGE.md)).

| Slice | Goal |
|-------|------|
| **1 (done)** | Remove `blacksmith_workshop` from the active product/generator path. |
| **2 (this plan)** | Introduce **`generic_building`** as the first **component-based** generator path. |

**Slice 2 should prove the new architecture** with a minimal but **visible** low-rise building: semantic blueprint → validation → internal `ComponentPlan` → component generators → `VoxelBlock[]`, without refactoring `medieval_tower` through components.

Clarifications:

- **`generic_building`** is the new component-based low-rise building path (not a resurrection of `blacksmith_workshop` as `structureType`).
- **`medieval_tower`** remains **legacy/specialized** — same monolithic generator, unchanged in this slice.
- **`ComponentPlan`** is **internal compiler IR**; developers and future AI author **`GenericBuildingBlueprint`**, not raw plans or voxel coordinates.
- This slice is **deterministic geometry only** — no AI, images, interiors, or region selection.

Aligned with [`docs/VISION.md`](docs/VISION.md): AI interprets intent → semantic blueprint → internal plan → deterministic builders → validated `VoxelBlock[]`.

---

## 2. Current baseline after slice 1

Expected repository state after slice 1:

### Structure types and dispatch

| Item | State |
|------|--------|
| `StructureType` | `"medieval_tower"` only |
| `StructureBlueprint` / `ResolvedStructure` | Tower-only unions |
| `validateBlueprint()` | Dispatches `medieval_tower` only |
| `generateStructureFromResolved()` | Tower-only `switch` (no `default` while union had one member) |
| `BUILDING_FAMILY_IDS` / `BUILDING_FAMILIES` | `medieval_tower` only, `shipped` |

### UI and exchange

| Surface | State |
|---------|--------|
| **`/preview`** | **Towers \| Partials**; default **Towers / `northwatch`** |
| **Partials** | Static `PARTIAL_BLOCK_SHOWCASE_STRUCTURE` (no generator) |
| **`/visualizer`** | Tower-oriented; **unchanged** in slice 1 |
| **`blueprintExchange`** | v1, **tower-only** (`MedievalTowerBlueprint` envelope) |

### Removed / absent

- No `blacksmith_workshop` in active `src/` (optional intentional negative test in `buildingFamilies.test.ts`).
- No `GenericBuildingBlueprint`, `ComponentPlan`, `generic_building` generator, or component modules.
- No `cottage_house`, import/export v2, new textures, or block definitions.

### Shared infrastructure (retain and reuse)

| Module | Role |
|--------|------|
| `src/lib/generation/placement/placementUtils.ts` | `GeneratorPlacement`, `centerOrigin`, `mergePlacements`, `filterGrounded` |
| `src/lib/generation/facade/paneAxis.ts` | `paneAxisForWindowCell` for window panes |
| Material metadata | `isShapeAllowedForBlockType` — pane vs cube fallback for windows |
| Partial block support | cube / slab / pane / post; placement semantics tests |
| `src/lib/generation/__tests__/testUtils.ts` | `assertGeneratedStructureHardInvariants`, `assertGeneratedStructurePlacementSemantics` |
| Tower tests | `generatorPresetInvariants`, `generatorEdgeCaseInvariants`, `generatorWindowPanes`, `placementUtils` — **71** tests at last slice 1 run |

### Tower pattern to mirror (not refactor)

- **Authoring:** `MedievalTowerBlueprint` in `types.ts`
- **Validation:** `validateMedievalTowerBlueprint` in `validateBlueprint.ts` — clamp grid, resolve materials to `BlockTypeId`, estimate block budget, return `ResolvedMedievalTower` with `grid: { width, depth, bodyLayers, roofLayers, overhang }`
- **Generation:** `generateMedievalTower(resolved)` — staged `GeneratorPlacement[]`, per-family `PRI` constants, `mergePlacements` + `filterGrounded`
- **Presets:** `sampleBlueprints.ts` — frozen snapshots + invariant tests

Docs ([`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md), [`docs/generation/GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md)) still mention blacksmith in places; **do not update docs in slice 2 implementation** except [`CHANGE.md`](CHANGE.md) at the end.

---

## 3. Target architecture for slice 2

Vertical pipeline for `generic_building`:

```text
GenericBuildingBlueprint (authoring / lab / future AI)
  → validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()
  → ComponentPlan (internal IR)
  → generateFromComponentPlan()
  → VoxelBlock[]
  → existing hard invariants + placement semantics tests
```

### Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **GenericBuildingBlueprint** | Semantic authoring: footprint, body, roof, openings, features, materials, constraints. Human/AI-editable JSON-shaped fields. |
| **validateGenericBuildingBlueprint()** | Range checks, material resolution, clamping, feasibility notes, `ResolvedGenericBuilding` with normalized grid and aperture intent. |
| **compileGenericBuildingToComponentPlan()** | Deterministic lowering: blueprint → ordered `PlannedComponent[]`, opening mask derivation, compile notes. No voxels. |
| **ComponentPlan** | Internal IR: materials, constraints, components, targets. Not exported in blueprint exchange v1. |
| **Component generators** | Each emits `GeneratorPlacement[]` for one component kind. |
| **emitFromComponentPlan()** | Canonical component order, accumulate placements, **single** `mergePlacements`, then `filterGrounded` if required. |
| **Output** | Plain `VoxelBlock[]` consumed by `VoxelViewer`, `analyzeVoxelStructure`, and existing test helpers — same as tower. |

Entry points (mirror tower):

- `generateStructure(blueprint)` — validate + dispatch
- `generateStructureFromResolved(resolved)` — add `case "generic_building": return generateGenericBuilding(resolved)`
- `generateGenericBuilding(resolved)` — thin wrapper: compile → `generateFromComponentPlan(plan)`

---

## 4. Public vs internal boundary

| Artifact | Visibility |
|----------|------------|
| **GenericBuildingBlueprint** | Public — add to `StructureBlueprint` union; presets in `sampleGenericBuildingBlueprints.ts`; optional `/preview` preset selector. |
| **ResolvedGenericBuilding** | Public — output of validation; input to `generateGenericBuilding`. |
| **ComponentPlan** | **Internal only** — under `src/lib/generation/components/`; not in `blueprintExchange`, not in `/visualizer` JSON editor v1, not a user-facing schema. |
| **PlannedComponent / ComponentKind** | Internal — compiler and generator contract. |
| **Opening mask / PlanContext** | Internal — shared geometry between compiler and shell generator. |

**Future AI:** may receive a **summary** of compiled components for explanation/debug; must **not** author raw `ComponentPlan` in v1. Edits go to `GenericBuildingBlueprint` fields (or preset deltas).

**`/preview`:** expose blueprint presets only — no raw ComponentPlan display, no per-component form controls in slice 2.

**`blueprintExchange`:** remains **tower-only v1** — do not extend envelope to `generic_building` in this slice.

---

## 5. GenericBuildingBlueprint v1 schema

### Top-level shape (TypeScript)

```ts
export interface GenericBuildingBlueprint {
  readonly structureType: "generic_building";
  readonly schemaVersion: 1;
  readonly metadata: BlueprintMetadata; // reuse existing { name, description?, notes? }
  readonly body: GenericBuildingBody;
  readonly roof: GenericBuildingRoof;
  readonly openings: GenericBuildingOpenings;
  readonly features: GenericBuildingFeatures;
  readonly materials: BlueprintMaterials; // reuse wall/floor/roof/window/door/accent classic keys
  readonly constraints: BlueprintConstraints; // reuse tower constraints shape
}
```

### `body`

```ts
export interface GenericBuildingBody {
  readonly width: number;       // footprint X, voxels
  readonly depth: number;       // footprint Z, voxels
  readonly height: number;      // wall/body layers ONLY — see height convention below
  readonly wallThickness: number;
  readonly hollowInterior: boolean;
}
```

### `roof`

```ts
export type GenericRoofKind = "pitched_gable" | "shed" | "none";

export interface GenericBuildingRoof {
  readonly kind: GenericRoofKind;
  /** Vertical roof layers (ignored or 0 when kind === "none"). Resolved/clamped in validation. */
  readonly layers?: number;
  /** Eave extension in voxels (0–1 in v1). */
  readonly overhang?: number;
}
```

### `openings`

```ts
export type GenericEntranceSide = "front" | "back" | "left" | "right";

export interface GenericBuildingEntrance {
  readonly side: GenericEntranceSide;
  readonly width: number;
  readonly height: number;
}

export type GenericWindowMode = "none" | "front_only" | "front_and_sides" | "all_sides";
export type GenericWindowHeightBand = "auto" | "mid" | "upper";

export interface GenericBuildingWindows {
  readonly mode: GenericWindowMode;
  readonly count: number; // total budget across enabled façades (deterministic spacing)
  readonly heightBand?: GenericWindowHeightBand;
}

export interface GenericBuildingOpenings {
  readonly entrance: GenericBuildingEntrance;
  readonly windows: GenericBuildingWindows;
}
```

### `features`

```ts
export interface GenericBuildingChimney {
  readonly enabled: boolean;
  readonly side: "left" | "right"; // relative to front-facing convention
}

export interface GenericBuildingFrontStep {
  readonly enabled: boolean;
}

export interface GenericBuildingFeatures {
  readonly chimney?: GenericBuildingChimney;
  readonly frontStep?: GenericBuildingFrontStep;
}
```

### Validation ranges (v1)

| Field | Range / rule |
|-------|----------------|
| `body.width` | integer **5–17** |
| `body.depth` | integer **5–13** |
| `body.height` | integer **4–9** (wall layers above foundation, **excluding roof**) |
| `body.wallThickness` | integer **1–2** |
| `body.hollowInterior` | requires inner void feasible: `width, depth ≥ 2·T + 2` when true |
| `openings.entrance.width` | integer **1–3** |
| `openings.entrance.height` | integer **2–4**, ≤ `body.height` |
| `openings.entrance` | must fit on chosen side: width ≤ face width − 2·T − 2 |
| `openings.windows.count` | integer **0–12**; ignored when `mode === "none"` |
| `roof.layers` | optional; default by kind: gable **2**, shed **1**, none **0**; clamp **1–3** when kind ≠ none |
| `roof.overhang` | **0–1** (clamp authoring values above 1) |
| `constraints.maxBlockCount` | default **80_000** if omitted in presets; reject estimates above cap |
| `constraints.allowFloatingBlocks` | default false |
| `constraints.requireGroundedStructure` | default true (drives `filterGrounded`) |

Materials: same classic-key resolution as tower (`resolveMaterial` pattern in `validateGenericBuildingBlueprint.ts`).

### Height convention (recommended — use consistently)

**`body.height` = wall/body layers above foundation, excluding roof.**

| Y level | Content |
|---------|---------|
| **y = 0** | Foundation slab (full footprint) |
| **y = 1 … body.height** | Perimeter shell (+ optional interior floor at y=1 when hollow) |
| **y = body.height + 1 …** | Roof stack (layers depend on `roof.kind`) |

Rationale: matches mental model “2-story cabin” without double-counting roof in body; validator computes `roofLayers` separately on `ResolvedGenericBuilding.grid`.

---

## 6. ResolvedGenericBuilding

Mirror `ResolvedMedievalTower`: validated, normalized, registry-resolved input for generation.

```ts
export interface ResolvedGenericBuilding {
  readonly structureType: "generic_building";
  readonly metadata: BlueprintMetadata;
  readonly materials: {
    readonly wall: BlockTypeId;
    readonly floor: BlockTypeId;
    readonly roof: BlockTypeId;
    readonly window: BlockTypeId;
    readonly door: BlockTypeId;
    readonly accent: BlockTypeId;
  };
  readonly body: {
    readonly width: number;
    readonly depth: number;
    readonly height: number;        // clamped wall layers
    readonly wallThickness: number;
    readonly hollowInterior: boolean;
  };
  readonly roof: {
    readonly kind: GenericRoofKind;
    readonly layers: number;
    readonly overhang: number;
  };
  readonly openings: {
    readonly entrance: GenericBuildingEntrance;
    readonly windows: GenericBuildingWindows;
  };
  readonly features: {
    readonly chimney: { readonly enabled: boolean; readonly side: "left" | "right" };
    readonly frontStep: { readonly enabled: boolean };
  };
  readonly constraints: BlueprintConstraints;
  readonly grid: {
    readonly width: number;
    readonly depth: number;
    readonly bodyLayers: number;   // === body.height after clamp
    readonly roofLayers: number;
    readonly overhang: number;
  };
  /** Derived aperture cells in local (lx, y, lz) — consumed by shell compiler path. */
  readonly apertureMask: ReadonlySet<string>; // keys `${lx},${y},${lz}`
}
```

**Validation notes:** return `BlueprintValidationResult` with `notes[]` for clamps (overhang, roof layers trimmed for `maxBlockCount`, window count reduced, etc.) — same UX pattern as tower validator notes in `/preview`.

**Block budget:** add `estimateGenericBuildingBlocks(resolved)` analogous to `estimateTowerBlocks`; trim roof layers before hard error.

**Feature defaults:** `chimney.enabled = false`, `frontStep.enabled = false` when omitted.

---

## 7. Internal ComponentPlan v1 schema

### Files (new)

| File | Purpose |
|------|---------|
| `src/lib/generation/components/types.ts` | `ComponentPlan`, `PlannedComponent`, `ComponentKind`, `PlanContext` |
| `src/lib/generation/components/priorities.ts` | Shared `COMPONENT_PRI` constants |
| `src/lib/generation/components/compileGenericBuildingPlan.ts` | `compileGenericBuildingToComponentPlan(resolved)` |
| `src/lib/generation/components/emitFromComponentPlan.ts` | `generateFromComponentPlan(plan)` |
| `src/lib/generation/components/geometry/` | `openingMask.ts`, `facadeSides.ts`, `localToWorld.ts` helpers |
| `src/lib/generation/components/generators/*.ts` | One file per component kind (or grouped roofs) |

### ComponentPlan

```ts
export interface ComponentPlan {
  readonly planVersion: 1;
  readonly sourceStructureType: "generic_building";
  readonly materials: ResolvedGenericBuilding["materials"];
  readonly constraints: BlueprintConstraints;
  readonly grid: ResolvedGenericBuilding["grid"];
  readonly apertureMask: ReadonlySet<string>;
  readonly components: readonly PlannedComponent[];
  readonly compileNotes?: readonly string[];
}
```

### PlannedComponent

```ts
export type ComponentKind =
  | "rectangular_body"
  | "foundation"
  | "hollow_wall_shell"
  | "entrance_on_side"
  | "sparse_windows"
  | "pitched_gable_roof"
  | "shed_roof"
  | "chimney"
  | "front_step";

export interface PlannedComponent {
  readonly id: string;
  readonly kind: ComponentKind;
  readonly target: string; // component id this attaches to
  readonly params: Record<string, unknown>; // narrowed per kind in implementation
}
```

### v1 invariants (compiler-enforced)

| Rule | Detail |
|------|--------|
| Exactly one `rectangular_body` | `id: "body_main"` |
| At most one roof component | `pitched_gable_roof` **or** `shed_roof` **or** neither when `roof.kind === "none"` |
| Entrance | `entrance_on_side` with `id: "entrance_main"` when blueprint has entrance (always in v1) |
| `front_step` | Only if `features.frontStep.enabled`; `target: "entrance_main"` |
| Chimney | Optional; `target: "body_main"` |
| All other components | `target: "body_main"` |
| Single primary body | No secondary bodies in v1 |

### `rectangular_body` in v1

Real component in the plan (massing context, params: width, depth, height, wallThickness, hollowInterior) but **emits zero placements** in v1. Establishes addressable volume for future interior/multi-body work. Compiler uses `body_main` params + `grid` for all other generators.

### Canonical component order (emit order)

1. `rectangular_body` (no-op emit)
2. `foundation`
3. `hollow_wall_shell` (respects `apertureMask`)
4. `entrance_on_side` (door blocks + lintel optional)
5. `sparse_windows` (glass/pane in aperture cells)
6. roof (`pitched_gable_roof` or `shed_roof`)
7. `chimney` (if enabled)
8. `front_step` (if enabled)

---

## 8. Component generator contract

### Signature pattern

```ts
export type PlanContext = {
  readonly plan: ComponentPlan;
  readonly originX: number;
  readonly originZ: number;
  readonly W: number;
  readonly D: number;
  readonly bodyLayers: number;
  readonly roofLayers: number;
  readonly apertureMask: ReadonlySet<string>;
};

export function emitFoundation(
  component: PlannedComponent,
  ctx: PlanContext,
  push: (p: GeneratorPlacement) => void,
): void;
```

Alternative: `return GeneratorPlacement[]` per generator; `emitFromComponentPlan` concatenates then merges once. **Recommend return-array** for easier unit tests.

### Pipeline in `emitFromComponentPlan`

1. Compute `originX/originZ` via `centerOrigin(W, D)`.
2. For each component in canonical order, call generator.
3. `mergePlacements(all)` once.
4. If `!constraints.allowFloatingBlocks`, `filterGrounded(blocks, false)`.
5. Return `VoxelBlock[]`.

### Priorities (`COMPONENT_PRI` — initial proposal)

| Constant | Value | Notes |
|----------|-------|-------|
| `FOUNDATION` | 10 | |
| `INTERIOR_FLOOR` | 20 | y=1 hollow floor |
| `WALL` | 30 | shell |
| `ROOF` | 40 | |
| `WINDOW` | 50 | overwrites wall at same cell |
| `DOOR` | 55 | entrance fill |
| `CHIMNEY` | 45 | above wall, below roof trim if conflict — tune in impl |
| `FRONT_STEP` | 15 | exterior ground contact |

### Opening strategy (v1 — recommended)

**Problem:** There is no air block type. “Cutting” an entrance by overwriting wall with air is invalid.

**Approach: compiler-derived aperture mask + shell skip (A), with window/entrance generators filling masked cells.**

1. **`compileGenericBuildingToComponentPlan`** (or a dedicated `deriveApertureMask(resolved)`) computes `apertureMask: Set<"${lx},${y},${lz}">` for:
   - entrance opening column(s) on the chosen side (full height × width),
   - window cells from `sparse_windows` rules (deterministic spacing per façade).
2. **`hollow_wall_shell`** iterates perimeter cells; **skips** any cell in `apertureMask` (no wall block).
3. **`entrance_on_side`** places **door** material (cube) in bottom row of entrance + optional accent lintel; does not rely on deleting walls.
4. **`sparse_windows`** places **pane** (or cube fallback via `isShapeAllowedForBlockType`) in window aperture cells at `COMPONENT_PRI.WINDOW` — overwrites would be redundant if shell skipped, but priority protects against ordering mistakes.

**Do not** use “overwrite wall with higher priority air” in v1.

**Windows vs shell:** prefer **mask skip** for shell; windows still emit at WINDOW priority for clarity and pane axis metadata.

### Pane axis

Use existing `paneAxisForWindowCell(lx, lz, W, D)` for window apertures on façades; corners return `undefined` → cube fallback.

---

## 9. Geometry conventions

### Coordinate system

- **Local footprint:** `lx ∈ [0, W-1]`, `lz ∈ [0, D-1]`, origin corner at **back-left** (min X, min Z in local space).
- **World placement:** `x = originX + lx`, `z = originZ + lz` with `originX = centerOrigin(W)`, `originZ = centerOrigin(D)`.
- **Y:** structure-relative; **y = 0** is foundation top / ground contact layer.

### Façade mapping (local)

| Side | Condition | Notes |
|------|-----------|-------|
| **front** | `lz === D - 1` | Default entrance side; “faces” +Z in local space |
| **back** | `lz === 0` | |
| **left** | `lx === 0` | |
| **right** | `lx === W - 1` | |

Matches `paneAxis` and tower `onFace` conventions.

### Vertical bands

| Y | Role |
|---|------|
| 0 | Foundation (full footprint) |
| 1 | Interior floor slab when `hollowInterior` (optional thin floor) |
| 1 … `bodyLayers` | Wall shell (perimeter); aperture cells skipped |
| `bodyLayers + 1` … `bodyLayers + roofLayers` | Roof geometry |

### Entrance placement

- Centered on chosen side: compute `entranceLx` or `entranceLz` so opening is symmetric on that face.
- Width `Ew`, height `Eh`: mask cells from `y = 1` through `y = Eh` (or `y = 0` for foundation — **exclude** foundation from aperture; entrance starts above slab).
- `entrance_on_side` fills lowest `min(Eh, 2)` rows with door material; upper aperture rows remain empty (void visible).

### Sparse windows

- **`none`:** no window apertures.
- **`front_only`:** distribute `count` on front face only.
- **`front_and_sides`:** front + left + right (not back in v1 unless count remainder).
- **`all_sides`:** all four façades.
- **Spacing:** deterministic: divide available bays excluding entrance margin and corners; prefer odd counts centered.
- **`heightBand`:** `auto` → `mid` (y ≈ `floor(bodyLayers/2)`); `upper` → `bodyLayers - 1`; `mid` → `max(2, floor(bodyLayers/2))`.

### Roof

- **pitched_gable:** ridge along X or Z depending on `W >= D`; symmetric gable steps from `y = bodyLayers + 1`.
- **shed:** single slope toward back (`lz` decreasing).
- **none:** no roof component; optional note in validation if exposed to weather.

### Chimney

- When enabled: rectangular stack on `features.chimney.side` exterior wall, starting at `y = 1`, extending through roof with +1 cap; must remain 26-connected to shell (place against wall cells).

### Front step

- When enabled: 1–2 blocks **outside** entrance on front side (`lz === D` in world — one step beyond front face); requires `entrance_main`; uses accent or floor material at low priority, grounded at y=0 or y=1 as appropriate.

---

## 10. V1 component details

### `rectangular_body`

| | |
|-|-|
| **Purpose** | Massing anchor / future interior host |
| **Params** | width, depth, height, wallThickness, hollowInterior |
| **Geometry** | None (zero placements v1) |
| **Priority** | N/A |
| **Edge cases** | Compiler must still emit exactly one |
| **Tests** | Compile test: present, single, correct params |

### `foundation`

| | |
|-|-|
| **Purpose** | Grounded footprint slab |
| **Params** | `{}` (uses grid) |
| **Geometry** | All cells `lx,lz` at `y=0`, wall or floor material |
| **Priority** | `FOUNDATION` (10) |
| **Edge cases** | Full rectangle even when hollow |
| **Tests** | Unit: count = W×D; all y=0 |

### `hollow_wall_shell`

| | |
|-|-|
| **Purpose** | Perimeter walls + optional y=1 interior floor |
| **Params** | T, hollowInterior |
| **Geometry** | Perimeter loops for `y=1..bodyLayers`; skip `apertureMask`; interior floor at y=1 if hollow |
| **Priority** | `WALL` / `INTERIOR_FLOOR` |
| **Edge cases** | T=2 on small footprints; corners single-thick |
| **Tests** | Unit: no blocks inside mask; hollow void empty |

### `entrance_on_side`

| | |
|-|-|
| **Purpose** | Readable doorway on chosen side |
| **Params** | side, width, height |
| **Geometry** | Door cubes in bottom rows of masked entrance column |
| **Priority** | `DOOR` (55) |
| **Edge cases** | Wide entrance on narrow face → validation error |
| **Tests** | Unit: door IDs at entrance cells; aperture not walled |

### `sparse_windows`

| | |
|-|-|
| **Purpose** | Façade windows per mode/count |
| **Params** | mode, count, heightBand |
| **Geometry** | Pane (or cube) in window mask cells |
| **Priority** | `WINDOW` (50) |
| **Edge cases** | count=0; material without pane → cube |
| **Tests** | Unit + reuse pane axis cases; preset invariant semantics |

### `pitched_gable_roof`

| | |
|-|-|
| **Purpose** | Symmetric gable cap |
| **Params** | layers, overhang |
| **Geometry** | Stepped volumes from `y=bodyLayers+1` |
| **Priority** | `ROOF` (40) |
| **Edge cases** | layers=1 → flat cap; overhang extends footprint |
| **Tests** | Unit: non-empty; connected to walls |

### `shed_roof`

| | |
|-|-|
| **Purpose** | Single-slope roof |
| **Params** | layers, overhang |
| **Geometry** | Rising toward front or back per convention |
| **Priority** | `ROOF` (40) |
| **Tests** | Same as gable |

### `chimney`

| | |
|-|-|
| **Purpose** | Vertical accent stack |
| **Params** | side |
| **Geometry** | 2×2 or 1×2 column on wall, through roof |
| **Priority** | `CHIMNEY` (~45) |
| **Edge cases** | Disabled → component omitted |
| **Tests** | Unit: connected; preset with chimney on |

### `front_step`

| | |
|-|-|
| **Purpose** | Exterior step at entrance |
| **Params** | none (targets entrance_main) |
| **Geometry** | 1–2 blocks outside front door center |
| **Priority** | `FRONT_STEP` (15) |
| **Edge cases** | Requires entrance; disabled → omitted |
| **Tests** | Unit: blocks outside front face at ground |

---

## 11. Generic presets

Add `src/lib/blueprints/sampleGenericBuildingBlueprints.ts` with **2 shipped presets** for tests and optional preview.

### `simple_rustic_cabin` (default generic)

| Field | Value |
|-------|-------|
| Body | 9×7, height 5, T=1, hollow |
| Roof | pitched_gable, layers 2, overhang 0 |
| Entrance | front, 2×3 |
| Windows | front_only, count 2, heightBand auto |
| Features | chimney enabled right; frontStep enabled |
| Materials | wall cobblestone, floor oak_planks, roof oak_planks, window glass, door oak_planks, accent limestone |
| Purpose | Cozy readable cabin — replaces blacksmith as low-rise demo |

### `shed_roof_workshop`

| Field | Value |
|-------|-------|
| Body | 11×9, height 4, T=1, hollow |
| Roof | shed, layers 1, overhang 1 |
| Entrance | front, 3×3 |
| Windows | front_and_sides, count 4 |
| Features | chimney disabled; frontStep false |
| Materials | wall stone_bricks, floor stone, roof slate_tiles, window glass, door oak_planks, accent iron |
| Purpose | Wide shallow workshop silhouette — exercises shed roof + side windows |

### Optional third (stretch / edge tests only)

**`compact_stone_hall`:** 7×5, height 4, gable, windows none, no chimney — minimal block count stress.

**Do not** name presets `blacksmith_*` or reference removed `structureType`.

---

## 12. Integration with existing generation dispatch

### `types.ts`

- `StructureType = "medieval_tower" | "generic_building"`
- Add `GenericBuildingBlueprint`, `ResolvedGenericBuilding`
- `StructureBlueprint = MedievalTowerBlueprint | GenericBuildingBlueprint`
- `ResolvedStructure = ResolvedMedievalTower | ResolvedGenericBuilding`

### `validateBlueprint.ts`

```ts
case "generic_building":
  return validateGenericBuildingBlueprint(blueprint);
```

Keep `default` for unknown `structureType`.

### `generateStructure.ts`

```ts
switch (resolved.structureType) {
  case "medieval_tower":
    return generateMedievalTower(resolved);
  case "generic_building":
    return generateGenericBuilding(resolved);
  default: {
    const _exhaust: never = resolved;
    return _exhaust;
  }
}
```

Restore exhaustive `default: never` now that the union has two members.

### `generateGenericBuilding.ts` (new, thin)

```ts
export function generateGenericBuilding(resolved: ResolvedGenericBuilding): VoxelBlock[] {
  const plan = compileGenericBuildingToComponentPlan(resolved);
  return generateFromComponentPlan(plan);
}
```

### `buildingFamilies.ts`

After generator passes tests:

```ts
export const BUILDING_FAMILY_IDS = ["medieval_tower", "generic_building"] as const;
// generic_building: status "shipped", displayName "Generic building"
```

**Tower:** no edits to `generateMedievalTower.ts` logic.

### `blueprintExchange.ts`

**No change** — still `MedievalTowerBlueprint` only.

---

## 13. Preview strategy for slice 2

### Option A — Library-only

- `/preview` stays **Towers | Partials**.
- `generic_building` verified only via Vitest.
- Pros: smallest UI diff.
- Cons: no quick visual regression surface for low-rise component path (gap left by blacksmith removal).

### Option B — Minimal Generic tab (recommended)

- `/preview` sources: **Towers | Generic | Partials**.
- Default unchanged: **Towers / northwatch**.
- Generic: preset dropdown only (`simple_rustic_cabin`, `shed_roof_workshop`) — same inspection panel as towers (validation notes, layer view, breakdown).
- No ComponentPlan viewer, no per-component controls, no blueprint JSON editor.
- **`/visualizer` unchanged.**

**Recommendation: Option B** — minimal preset-only Generic source gives a visible verification surface without redesigning the lab. Matches product need for a low-rise demo after blacksmith removal.

### Files to touch (preview only)

- `StructureInspectionPanel.tsx` — `PreviewLabSource` add `preset_generic`; third toggle button.
- `PreviewInspectionClient.tsx` — import generic presets; branch like tower path.
- Copy: “Preset generic buildings (component pipeline)” vs tower copy.

---

## 14. Testing strategy

### New unit / compile tests

| Suite | File | Coverage |
|-------|------|----------|
| Validator | `validateGenericBuildingBlueprint.test.ts` | Valid presets; invalid ranges; material errors; entrance too wide; hollow infeasible |
| Compiler | `compileGenericBuildingPlan.test.ts` | `body_main` exists; exactly one `rectangular_body`; one roof branch; `entrance_main`; front_step → entrance target; chimney optional; component order |
| Component gens | `components/generators/*.test.ts` | Per §10 unit cases |
| Opening mask | `openingMask.test.ts` | Entrance + windows produce expected keys |

### Preset invariants (reuse helpers)

| Suite | File |
|-------|------|
| `generatorGenericPresetInvariants.test.ts` | `it.each(GENERIC_BUILDING_PRESETS)` → validate → generate → `assertGeneratedStructureHardInvariants` + `assertGeneratedStructurePlacementSemantics` |

Same hard rules as tower: non-empty, valid IDs, no duplicate coords, **one** 26-component, grounded, ≤ maxBlockCount.

### Edge cases (optional slice 2 or fast follow)

- `fixtures/genericEdgeCaseBlueprints.ts` — `roof_none`, `max_windows`, `tight_max_block_count`, `thick_shell_narrow_void`
- `generatorGenericEdgeCaseInvariants.test.ts`

### Updated existing tests

| File | Change |
|------|--------|
| `buildingFamilies.test.ts` | Expect 2 families; `generic_building` defined; `blacksmith_workshop` undefined |
| `generatorPipeline.smoke.test.ts` | Optionally smoke one generic preset |

### Unchanged

- All `MEDIEVAL_TOWER_PRESETS` invariant tests
- `generatorWindowPanes.test.ts` (tower)
- `placementUtils.test.ts`
- No browser E2E unless already present (none today)

### Commands

```bash
pnpm test:generator
pnpm exec tsc --noEmit
pnpm run build
```

---

## 15. Documentation strategy

**Slice 2 implementation:** update **`CHANGE.md` only** (plus code).

**Defer** (planned follow-up docs — not in slice 2):

| Document | Update when |
|----------|-------------|
| [`docs/generation/GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) | Remove blacksmith references; add component philosophy § |
| [`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) | Add generic preset suites; pipeline diagram |
| [`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md) | `generic_building` feature rows |
| [`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md) | Generic schema appendix |
| **New** `docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md` | Component kinds, compiler invariants, mask rules |

---

## 16. Recommended implementation sequence

### Recommendation: **one implementation slice (slice 2)** with ordered steps

Splitting 2A/2B/2C is possible but adds merge overhead for a first vertical proof. The codebase already has placement utilities and invariant harnesses; delivering compile + emit + presets + tests together is manageable if steps below are followed strictly.

**If risk reduction needed:**  
- **2A:** types + validator + compiler tests (no voxels)  
- **2B:** generators + `generateGenericBuilding` + invariant tests  
- **2C:** preview Generic tab  

Prefer **single slice 2** with this order:

| Step | Work |
|------|------|
| 1 | `GenericBuildingBlueprint` / `ResolvedGenericBuilding` in `types.ts`; extend unions |
| 2 | `validateGenericBuildingBlueprint.ts` + wire `validateBlueprint` |
| 3 | `components/types.ts`, `priorities.ts`, geometry helpers, `deriveApertureMask` |
| 4 | `compileGenericBuildingToComponentPlan.ts` + compile tests |
| 5 | Component generators (foundation → shell → entrance → windows → roof → chimney → step) |
| 6 | `emitFromComponentPlan.ts` + generator unit tests |
| 7 | `generateGenericBuilding.ts` + dispatch in `generateStructure.ts` |
| 8 | `sampleGenericBuildingBlueprints.ts` + preset invariant tests |
| 9 | `buildingFamilies.ts` + test update |
| 10 | Optional: generic edge-case fixtures |
| 11 | Preview Option B (minimal Generic source) |
| 12 | Residue grep; overwrite `CHANGE.md`; run verification |

**Do not** refactor `medieval_tower`. **Do not** extend `blueprintExchange`.

---

## 17. Non-goals

Slice 2 explicitly excludes:

- AI planner / LLM integration
- Image interpretation
- Public `ComponentPlan` JSON or user-authored arbitrary component graphs
- `InteriorPlan` / floor-plan schema / room graph
- Multi-view render pipeline
- Selected-region editing
- New building family taxonomy beyond `generic_building` (+ existing tower)
- `cottage_house` as `structureType`
- `medieval_tower` refactor through `ComponentPlan`
- `/visualizer` rewrite or generic JSON lab
- Import/export v2 / generic blueprint exchange
- `buildingStyles` style resolver consumption
- New textures, assets, or block definitions
- Connection-aware panes/fences
- Minecraft export
- **`blacksmith_workshop` resurrection** (as family, preset name, or compile target)
- Browser visual regression tests
- Component debug UI in preview

---

## 18. Open questions

| Question | Recommendation |
|----------|----------------|
| Expose `generic_building` in `/preview` immediately? | **Yes — Option B** (preset-only Generic tab). |
| Does `body.height` exclude roof? | **Yes** — foundation at y=0, walls 1…height, roof above. |
| Allow `roof.kind === "none"` in shipped presets? | **No** for shipped presets; allow in **edge tests** only. |
| Should entrance emit door blocks or only cut aperture? | **Emit door cubes** in lower rows; shell skips aperture (void above). |
| Window apertures: shell skip vs pane overwrite? | **Shell skip** via mask; windows still emit pane/cube at WINDOW priority. |
| Should `rectangular_body` emit blocks? | **No** in v1 (zero placements); massing metadata only. |
| Expose ComponentPlan in dev logs? | **Optional** `compileNotes` + debug log behind `NODE_ENV === "development"` only; not in UI. |
| When does `/visualizer` become GenericBuildingBlueprint lab? | **Later milestone** — after exchange v2 or dedicated lab route; not slice 2. |
| Single slice vs 2A/2B/2C? | **Single slice 2** unless review prefers split at step 4/6 boundary. |
| `constraints.enforceSymmetry` for generic? | **Ignore in v1** generator (field present for forward compat); window placement uses explicit deterministic rules. |
| Max block count default? | **80_000** for generic presets (lower than tower’s 120k). |

---

Scoping only — waiting for review before implementation.
