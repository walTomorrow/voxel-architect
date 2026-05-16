# Plan — Internal Architectural Component Plan

**Scoping only — waiting for review before implementation.**

---

## 1. Purpose

Generator Expansion has two shipped families (`medieval_tower`, `blacksmith_workshop`) behind a stable pipeline: **family blueprint → validator → monolithic family generator → merged placements → `VoxelBlock[]` → invariants**. Neutral shared helpers (`placementUtils`, `paneAxis`) now exist; cottage one-off WIP was reverted.

The **next step** is an **internal architectural component plan** layer — not a new public schema, not a wave of new families, and not AI runtime.

| We are doing | We are not doing |
|--------------|------------------|
| Defining **reusable deterministic components** (foundation, shell, roof, openings, zones) | Abandoning **building families** as the product/AI vocabulary |
| Compiling **family recipes** into an internal **`ComponentPlan`** | Exposing **component graphs** in blueprint JSON or `/visualizer` |
| Centralizing **merge/grounding** via existing `placementUtils` | Letting AI or users author **raw voxel** or unconstrained component DAGs |
| Reducing duplication before the next family ships | Rewriting **medieval_tower** in the same slice |

**Why now**

- `blacksmith_workshop` and the aborted `cottage_house` path share the same rectangular grammar (foundation → hollow shell → openings → roof → chimney → y=1 zones). A third copy would repeat bugs and PRI constants.
- Validators and presets already express **semantic intent**; generators should compile that intent into **components**, not re-encode it as nested loops per family.
- Strong validation stays at the **blueprint/resolver** boundary; the component plan is a **deterministic IR** between resolved blueprint and geometry.

**Core principle (unchanged)**

AI reasons about **intent, constraints, style, and components**. Deterministic code generates geometry. AI must not place individual blocks.

---

## 2. Current baseline

### Shipped families and pipeline

| Family | Blueprint | Validator | Generator | Presets | Preview |
|--------|-----------|-----------|-----------|---------|---------|
| `medieval_tower` | `MedievalTowerBlueprint` | `validateMedievalTowerBlueprint` in `validateBlueprint.ts` | `generateMedievalTower.ts` | 6 in `sampleBlueprints.ts` | **Towers** tab |
| `blacksmith_workshop` | `BlacksmithWorkshopBlueprint` | `validateBlacksmithWorkshop.ts` | `generateBlacksmithWorkshop.ts` | 2 in `sampleBlacksmithBlueprints.ts` | **Blacksmith** tab |

- **Dispatch:** `generateStructure.ts` → `generateStructureFromResolved` switches on `structureType` (two cases only).
- **Unions:** `StructureBlueprint`, `ResolvedStructure` — tower \| blacksmith only.
- **Catalog:** `BUILDING_FAMILIES` — two entries, both `shipped`.

### Preview and tooling

| Surface | State |
|---------|--------|
| `/preview` | **Towers \| Blacksmith \| Partials**; default Towers / `northwatch`; validate → generate → `VoxelViewer`; partial showcase = static `PARTIAL_BLOCK_SHOWCASE_STRUCTURE` |
| `/visualizer` | **Tower-only** authoring (unchanged) |
| `blueprintExchange` | **v1, tower-only** envelope (`MedievalTowerBlueprint`) |
| Import/export v2 | **Not implemented** |

### Style catalog

- `buildingStyles.ts` — metadata for `medieval_tower` presets (`styleId` on preset wrapper only).
- **No style resolver**; generators do not read styles.

### Helper extraction (landed)

| Module | Role |
|--------|------|
| `src/lib/generation/placement/placementUtils.ts` | `GeneratorPlacement`, `centerOrigin`, `mergePlacements`, `filterGrounded` |
| `src/lib/generation/facade/paneAxis.ts` | `paneAxisForWindowCell` (non–connection-aware) |
| `src/lib/generation/__tests__/placementUtils.test.ts` | 6 unit tests |

Tower and blacksmith generators **import** these modules; output intended **unchanged** (verified in slice B: 79 generator tests, `tsc`, `build`).

### Tests and invariants

- Shared: `testUtils.ts` — `assertGeneratedStructureHardInvariants`, `assertGeneratedStructurePlacementSemantics`.
- Per family: preset suites, edge fixtures, blacksmith panes; tower window panes.
- Hard invariants: single 26-component, grounded, no duplicate coords, `maxBlockCount`, valid block IDs.

### Ready vs not ready for component plan

| Ready | Not ready |
|-------|-----------|
| Resolved blueprints with `grid` (W, D, bodyLayers, roofLayers) | `ComponentPlan` / component types |
| Shared merge + grounding | Family → plan compilers |
| Blacksmith as rectilinear reference implementation | Component generator modules |
| Pane axis helper for façade windows | Public component schema |
| PRI bands proven in blacksmith | Cross-family priority registry |
| Validator-estimated `maxBlockCount` | Per-component budget accounting |

### Cottage residue

No `cottage_house` in `src/` except `buildingFamilies.test.ts` expecting `getBuildingFamily("cottage")` undefined.

---

## 3. Target mental model

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Blueprint       │────▶│ Resolved         │────▶│ Family recipe   │
│ (authoring)     │     │ blueprint        │     │ (compile step)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ VoxelBlock[]    │◀────│ mergePlacements  │◀────│ Component plan  │
│ + invariants    │     │ filterGrounded   │     │ (internal IR)   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┴─────────────────────────────────┐
                        ▼                 ▼                 ▼                 ▼                 ▼
                   foundation      hollow_wall_shell   openings/roof    chimney/zones    (ordered)
                        │                 │                 │                 │
                        └─────────────────┴─────────────────┴─────────────────┘
                                              │
                                    Component generators
                                    (deterministic → Placement[])
```

| Layer | Responsibility |
|-------|----------------|
| **Blueprint** | Authoring-time family-specific JSON-shaped fields (material keys, dimensions, features). |
| **Resolved blueprint** | Validated, normalized: registry `BlockTypeId`s, integer `grid`, clamped enums. **Authority for presets and future AI targets.** |
| **Family recipe** | Curated mapping: “for `blacksmith_workshop`, emit these components with these params.” Code-first in v1; not user-editable. |
| **Component plan** | Internal ordered list of **component instances** + shared **footprint context** (W, D, H, origins, materials, constraints). |
| **Architectural component** | Discriminated union entry: `kind` + typed params (e.g. `sparse_windows: { count, placement, yPolicy }`). |
| **Component generator** | Pure function: `(plan context, component instance) → GeneratorPlacement[]`. No merge inside component. |
| **Placement merge** | Single `mergePlacements` at end; optional `filterGrounded` per constraints. |
| **VoxelBlock output** | What preview and analysis consume today. |
| **Validation / invariants** | Blueprint validation (pre-plan); placement semantics + structure analysis (post-merge). |

**Style (later)** overlays material/param hints on compile; not in first slice.

---

## 4. Non-goals for the first component-plan slice

- Public **component blueprint JSON** schema or import/export fields
- User-authored **arbitrary component graphs**
- **AI / photo runtime**
- **Image input**
- **`floorPlan` / rooms / circulation** schema
- **`/visualizer` rewrite**
- **Import/export v2**
- **New building family** (including `cottage_house`)
- **All Wave 2** families
- **Style resolver** or new style IDs
- **New textures / block definitions**
- **Connection-aware** blocks or panes
- **New partial shape kinds**
- **Minecraft export**
- **Medieval tower refactor** to component generators (unless explicitly scoped later)
- **Runtime AI-invented** families or components

---

## 5. ComponentPlan type design

### Design principles (v1)

- **Small** discriminated union; no generic graph executor.
- **Footprint on plan**, not as a “component” that emits blocks (see below).
- **Instance id** on each component for tests/debug (`"foundation"`, `"shell"`, `"roof-0"`).
- **Materials and constraints** on plan context, referenced by generators.
- **No voxels in plan** — only semantic params.

### Proposed types (illustrative)

```ts
/** Stable id for ordering tests and debug summaries. */
export type ComponentInstanceId = string;

export type ComponentFootprint = {
  readonly width: number;
  readonly depth: number;
  readonly bodyLayers: number;
  readonly roofLayers: number;
  readonly wallThickness: number;
  readonly hollowInterior: boolean;
};

export type ComponentPlanContext = {
  readonly familyId: "blacksmith_workshop"; // widen later
  readonly origin: { readonly ox: number; readonly oz: number };
  readonly materials: ResolvedBlacksmithWorkshop["materials"]; // family-specific resolved materials in v1
  readonly constraints: ResolvedBlacksmithWorkshop["constraints"];
  readonly footprint: ComponentFootprint;
};

export type ArchitecturalComponent =
  | { readonly id: ComponentInstanceId; readonly kind: "foundation" }
  | {
      readonly id: ComponentInstanceId;
      readonly kind: "hollow_wall_shell";
      readonly aperture: WallApertureMask; // see §7 — shared mask from openings compile
    }
  | {
      readonly id: ComponentInstanceId;
      readonly kind: "front_entrance"; // generalized: entrance on EntranceSide
      readonly side: EntranceSide;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly id: ComponentInstanceId;
      readonly kind: "sparse_windows";
      readonly placement: "none" | "front_only" | "front_and_sides";
      readonly count: number;
      readonly bodyY: number; // resolved window band y
    }
  | {
      readonly id: ComponentInstanceId;
      readonly kind: "pitched_gable_roof";
      readonly layers: number;
    }
  | {
      readonly id: ComponentInstanceId;
      readonly kind: "shed_roof";
      readonly layers: number;
    }
  | {
      readonly id: ComponentInstanceId;
      readonly kind: "chimney";
      readonly side: "left" | "right";
    }
  | { readonly id: ComponentInstanceId; readonly kind: "forge_zone" }
  | { readonly id: ComponentInstanceId; readonly kind: "workbench_zone" }
  | { readonly id: ComponentInstanceId; readonly kind: "storage_zone" };

export type ComponentPlan = {
  readonly context: ComponentPlanContext;
  /** Canonical emission order (see §7). */
  readonly components: readonly ArchitecturalComponent[];
};
```

### `rectangular_body` — plan metadata, not a v1 component

**Decision:** Footprint and body budget live on **`ComponentPlan.context.footprint`** (from `resolved.grid` + `massing`). Generators read `W, D, H, T, ox, oz` from context.

**Rationale:** No blocks are emitted by “being rectangular”; foundation/shell/roof components consume the footprint.

### v1 component kinds — include vs defer

| Kind | v1 | Notes |
|------|----|-------|
| `foundation` | **Yes** | y=0 floor grid |
| `hollow_wall_shell` | **Yes** | Perimeter + interior floor y=1; respects aperture mask |
| `front_entrance` | **Yes** | Generalize to any `EntranceSide` (blacksmith already supports all sides) |
| `sparse_windows` | **Yes** | Pane-aware via `paneAxis` + material meta |
| `pitched_gable_roof` | **Yes** | Blacksmith pitched path |
| `shed_roof` | **Yes** | Blacksmith shed path |
| `chimney` | **Yes** | Wall stack |
| `forge_zone` / `workbench_zone` / `storage_zone` | **Yes** | Blacksmith interior placeholders |
| `rectangular_body` | **No** (metadata) | On `context.footprint` |
| `hearth_zone`, `porch` | **Defer** | Next family (cottage) after grammar proven |
| `window_band`, `tall_feature_window` | **Defer** | Tavern/chapel |
| `tower_volume`, `crenellation_crown` | **Defer** | Tower-specific |
| `stairs`, `floorPlan`, connected panes | **Defer** | Backlog |

---

## 6. Component generator contract

### Recommendations

| Question | Answer |
|----------|--------|
| Return type | **`GeneratorPlacement[]`** per component (not `VoxelBlock[]`). |
| Shared buffer | Orchestrator appends to one array; assigns monotonic **`i`** via shared `push` helper. |
| Priority | Each placement sets **`p`** from a **shared `ComponentPriority` enum** (mirror blacksmith `PRI` bands). Components do not sort. |
| Plan context | **`ComponentPlanContext`** passed to every generator (footprint, materials, constraints, origin). |
| Purity | **Deterministic** pure functions of `(context, component, pushState)`; no I/O, no randomness. |
| Validation | Components **assume validated plan**; no duplicate blueprint validation inside generators. |
| Merge | **Once** at end: `mergePlacements(pl)` then `filterGrounded` if required. |
| `shapeKind` / `state` | Allowed on placements from `sparse_windows` (pane) only in v1; same rules as today. |

### Orchestrator sketch (blacksmith)

```ts
function generateBlacksmithFromPlan(plan: ComponentPlan): VoxelBlock[] {
  const pl: GeneratorPlacement[] = [];
  let i = 0;
  const push = createPlanPush(plan.context, pl, () => i++);
  for (const comp of plan.components) {
    emitComponent(plan.context, comp, push);
  }
  let blocks = mergePlacements(pl);
  if (needsGrounding(plan.context.constraints)) {
    blocks = filterGrounded(blocks, plan.context.constraints.allowFloatingBlocks);
  }
  return blocks;
}
```

### `createPlanPush`

- Converts local `(lx, y, lz)` → world `(ox+lx, y, oz+lz)`.
- Centralizes coordinate transform so components stay footprint-local.

---

## 7. Component ordering and conflict resolution

### Canonical emission order (blacksmith v1)

1. `foundation`
2. `hollow_wall_shell` (includes interior y=1 floor in void)
3. `sparse_windows` (may overlap shell cells — higher PRI)
4. `front_entrance` / door placements
5. `pitched_gable_roof` **or** `shed_roof`
6. `chimney`
7. `forge_zone` → `workbench_zone` → `storage_zone`

**Note:** Today blacksmith interleaves shell/windows in one loop; refactor can either (a) keep shell emitting walls only and let windows/doors override, or (b) precompute aperture mask for shell. **Recommend (b):** compile openings into a mask used by `hollow_wall_shell` to skip door/window cells, then emit windows/doors with higher PRI.

### Priority bands (align with current blacksmith)

| Band | Value (existing) | Typical kinds |
|------|------------------|---------------|
| Foundation | 10 | `foundation` |
| Interior floor | 20 | shell (void floor) |
| Wall | 30 | shell |
| Zones | 42–44 | forge, workbench, storage |
| Roof | 50 | roof components |
| Window | 52 | `sparse_windows` |
| Door | 55 | entrance |
| Chimney | 60 | `chimney` |

**Merge semantics (unchanged):** sort `desc p`, then `desc i`; first wins per `(x,y,z)`; preserve `shapeKind`/`state`.

### Responsibilities

| Concern | Owner |
|---------|--------|
| One block per coordinate | `mergePlacements` |
| Door/window vs wall | PRI + aperture skip in shell |
| Roof vs chimney | Chimney PRI 60 > roof 50 |
| Zones vs floor | Zones 42–44 > interior floor 20 |
| `maxBlockCount` | **Validator** (pre-generation estimate); plan does not trim in v1 |
| Grounding | `filterGrounded` post-merge when `requireGroundedStructure` |

---

## 8. First component vocabulary and scope

| Component | Purpose | Key params | Families | Blocks | Tests |
|-----------|---------|------------|----------|--------|-------|
| `foundation` | y=0 slab | — | rect low-rise | floor material | unit: footprint size |
| `hollow_wall_shell` | Perimeter walls + void interior floor | `wallThickness`, mask | blacksmith, future cottage | wall, floor | unit + integration |
| `front_entrance` | Door row | `side`, `width`, `height` | most rect | door | unit |
| `sparse_windows` | Façade panes/cubes | `placement`, `count`, `bodyY` | blacksmith, cottage later | window, pane | unit + pane axis |
| `pitched_gable_roof` | Perimeter-ring layers | `layers` | blacksmith, cottage | roof | unit |
| `shed_roof` | Shed layers | `layers` | blacksmith, cottage | roof | unit |
| `chimney` | Wall-adjacent stack | `side` | blacksmith, cottage | accent | unit |
| `forge_zone` | Hearth placeholder | — | blacksmith | accent, wall | unit |
| `workbench_zone` | Bench placeholder | — | blacksmith | door | unit |
| `storage_zone` | Corner stacks | — | blacksmith | door | unit |

### Explicitly deferred

`floorPlan`, rooms, stairs, partial doors, fences, connection-aware panes, awnings, signs, steeples, buttresses, barn doors, window bands, attached bays, tower crown/crenellation modules.

---

## 9. How blacksmith maps to the v1 plan

### Compile recipe (`compileBlacksmithComponentPlan(resolved)`)

| Step | Source field | Component(s) |
|------|--------------|----------------|
| Footprint | `grid`, `massing` | `context.footprint` |
| Base | always | `foundation` |
| Shell | `massing.hollowInterior`, openings | `hollow_wall_shell` + mask from entrance/windows |
| Opening | `openings.*` | `front_entrance` (any side), `sparse_windows` |
| Roof | `roof.style`, `grid.roofLayers` | `pitched_gable_roof` **or** `shed_roof` |
| Detail | `features.chimney` | `chimney` if enabled |
| Zones | `features.forge/workbench/storage` | respective zone components if enabled |

### Logic that does not fit cleanly

| Logic | Handling |
|-------|----------|
| `entranceSpanRange`, `onFace`, `inDoorAperture` | Shared **openings compile** helper → mask + `front_entrance` params |
| `windowPositionsAlong` | Inside `sparse_windows` generator |
| Side windows on left/right walls | `sparse_windows` with `front_and_sides` |
| Shed vs gable inset math | Stay inside roof component generators (copy from current loops) |

### First implementation strategy — **recommend B, then C**

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** | Types only, generators unchanged | Too thin |
| **B** | Types + `compileBlacksmithComponentPlan` + tests; **output still from monolithic generator** | **First slice ✓** |
| **C** | B + refactor `generateBlacksmithWorkshop` to plan path with **parity checks** | **Second slice ✓** |
| **D** | Cottage as first plan-native family | **Too early** |
| **E** | One-off cottage | **Rejected** |

**Why B then C**

- Blacksmith is **preview-stable** and structurally similar to the aborted cottage generator; regression cost is real.
- **B** proves the IR and compile mapping without touching placement output.
- **C** is feasible: ~290-line generator, clear phases, **79 existing tests** + optional **parity** (multiset of `(x,y,z, blockTypeId, shapeKind, state)` per preset).
- **D** waits until C passes and contract stabilizes (hearth/porch become new components later).

**Do not recommend D** until v1 components and blacksmith parity are done.

---

## 10. How medieval_tower maps, or does not map

### Can share (utilities / future components)

| Piece | Share how |
|-------|-----------|
| `mergePlacements`, `filterGrounded`, `centerOrigin` | Already shared |
| `paneAxisForWindowCell` | Already shared for pane windows |
| Foundation / single floor layer | Possible future `foundation` variant |
| Window pane emission | Partial overlap with `sparse_windows`; tower uses **columns** and `windowsFloors` — **different component** later |

### Stay family-specific (v1)

| Piece | Reason |
|-------|--------|
| Level stack (`levels`, square footprint) | Not rect `grid` recipe |
| Corner pillars, capstones, facade trim | Tower identity |
| Crenellations, merlons, parapet | Defensive crown grammar |
| Stepped/pyramid roof crown | Not gable/shed |
| Window column seeds, `windowsFloors` | Vertical rhythm |

### Recommendation

**Leave tower monolithic for component-plan v1.** Optionally add `compileMedievalTowerComponentPlan` stub that throws or returns `null` — **not required**. Revisit after blacksmith plan path ships.

---

## 11. File/module layout

Keep v1 compact — **one folder**, split only where files exceed ~200 lines.

```text
src/lib/generation/components/
  types.ts                 # ComponentPlan, ArchitecturalComponent, context, priority enum
  priorities.ts            # ComponentPriority constants (from blacksmith PRI)
  compileBlacksmithPlan.ts # ResolvedBlacksmithWorkshop → ComponentPlan
  emitPlacements.ts        # orchestrator: plan → merge → filter
  openingsMask.ts          # shared mask helpers for shell + windows + door
  generators/
    foundation.ts
    hollowWallShell.ts
    sparseWindows.ts
    entrance.ts
    roofs.ts
    chimney.ts
    interiorZones.ts
  index.ts                 # re-exports for generators/tests
```

**Tests:** `src/lib/generation/__tests__/components/` (or `components/__tests__/` co-located).

**Do not** create per-component files for one-liners initially; **group** `forge_zone`/`workbench_zone`/`storage_zone` in `interiorZones.ts`.

**Existing** `placement/placementUtils.ts` and `facade/paneAxis.ts` stay as-is.

---

## 12. Test strategy

| Layer | What to test |
|-------|----------------|
| **Types** | TypeScript compile; optional `satisfies` fixtures for plan shape |
| **Compile** | Each blacksmith preset + edge fixture → plan: component kinds, order, enabled flags match blueprint |
| **Component unit** | Each generator: small footprint fixture → placement count bounds, no duplicate local coords before merge, valid PRI |
| **Merge** | Reuse `placementUtils.test.ts`; integration test plan → emit → merge |
| **Parity (slice C)** | For each blacksmith preset/edge: `multiset(monolithic)` === `multiset(plan path)` |
| **Regression** | Existing `generatorBlacksmithPresetInvariants`, edge, panes — must pass unchanged in B; unchanged output in C |
| **Tower** | No new tower tests in v1 |

**Avoid** exact total block-count snapshots.

**Parity feasibility:** Yes — compare stable serialized keys per block:  
`"${x},${y},${z}|${blockTypeId}|${shapeKind ?? ""}|${JSON.stringify(state)}"`  
Multiset equality is insensitive to merge order.

---

## 13. Preview/debug strategy

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** | No preview changes | **Default for slice B** |
| **B** | Read-only component list for blacksmith | **Optional slice C+** |
| **C** | Dev-only debug panel | Defer |

**Recommend A** for B and C unless parity debugging needs visibility — then **B** as dev-only text under inspection panel (component ids + kinds, no editing).

**No `/visualizer` changes.**

---

## 14. Documentation strategy

**Not in this planning task.** After implementation:

| Doc | Update |
|-----|--------|
| **New** `docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md` | Component list, merge rules, recipe examples |
| `GENERATION_DESIGN_PRINCIPLES.md` | Families as recipes; AI targets semantics |
| `GENERATOR_RELIABILITY.md` | Component unit + parity coverage |
| `BLUEPRINT_FEATURE_CATALOG.md` | Map features → components |

---

## 15. Recommended first implementation slice

| Option | Summary |
|--------|---------|
| A | Types only |
| B | Types + blacksmith compile-to-plan; monolithic output |
| C | B + component generators + blacksmith refactor + parity |
| D | Cottage first on plan |
| E | One-off cottage |

### **Recommendation: B (this implementation prompt)**

Deliver:

1. `components/types.ts`, `priorities.ts`, `compileBlacksmithPlan.ts`
2. Compile tests for all `BLACKSMITH_PRESETS` + `BLACKSMITH_EDGE_CASE_FIXTURES`
3. **No change** to `generateBlacksmithWorkshop` output path
4. No preview/docs changes

### **Follow-up: C (separate prompt after B review)**

Deliver:

1. Component generators + `emitPlacements`
2. `generateBlacksmithWorkshop` delegates to plan path
3. Parity tests per preset/edge
4. Existing invariant suites green

**Not recommended now:** D (cottage), E, A alone, tower refactor.

---

## 16. Risks and open questions

| Risk | Mitigation |
|------|------------|
| **Over-abstraction** | v1 union ≤ 10 kinds; blacksmith-only compile |
| **Under-abstraction** | Shared `openingsMask`; one rect shell component |
| **Ordering conflicts** | Documented canonical order + PRI table |
| **Hidden PRI behavior** | `priorities.ts` named constants; tests assert door beats wall |
| **`maxBlockCount`** | Keep validator estimate; no plan-time trim v1 |
| **Blacksmith output drift** | Parity multiset in slice C |
| **Parity cost** | One test helper; 5 presets + 3 edges |
| **`rectangular_body` as component** | Rejected — footprint on context |
| **Styles later** | Compile step applies material overrides before plan |
| **AI targeting components** | Future: AI fills blueprint fields; compiler builds plan — not raw components JSON |
| **Plans becoming voxel dumps** | Lint/review: no `VoxelBlock` in plan types |
| **Shell/window interleaving** | Aperture mask vs dual emission — decide in C refactor |

**Open questions**

1. Should `hollow_wall_shell` own interior y=1 floor, or should `foundation` + a tiny `interior_floor` component split it?
2. Is one `entrance` component enough for all sides, or rename to `entrance_on_side`?
3. Should compile tests snapshot plan JSON or structural assertions only? (**Prefer structural assertions.**)
4. When to add preview component list — only if parity debugging is slow?
5. After C, is **cottage** the first new family via recipe, or next rect variant (warehouse)?

---

**Scoping only — waiting for review before implementation.**
