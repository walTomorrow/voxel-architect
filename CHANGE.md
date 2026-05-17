# CHANGE.md — Add generic building component pipeline

## Summary

Slice 2 adds `generic_building` as the first component-based generator path on `milestone/generator-expansion`. Authoring flows through `GenericBuildingBlueprint` → validation → internal `ComponentPlan` → component generators → `VoxelBlock[]`. `medieval_tower` is unchanged. `blacksmith_workshop` was not resurrected.

## Files added

### Blueprints

- `src/lib/blueprints/validateGenericBuilding.ts`
- `src/lib/blueprints/sampleGenericBuildingBlueprints.ts`
- `src/lib/blueprints/__tests__/validateGenericBuilding.test.ts`

### Component pipeline (internal)

- `src/lib/generation/components/types.ts`
- `src/lib/generation/components/priorities.ts`
- `src/lib/generation/components/planContext.ts`
- `src/lib/generation/components/compileGenericBuildingPlan.ts`
- `src/lib/generation/components/emitFromComponentPlan.ts`
- `src/lib/generation/components/geometry/localKeys.ts`
- `src/lib/generation/components/geometry/facadeSides.ts`
- `src/lib/generation/components/geometry/openingMask.ts`
- `src/lib/generation/components/generators/rectangularBody.ts`
- `src/lib/generation/components/generators/foundation.ts`
- `src/lib/generation/components/generators/hollowWallShell.ts`
- `src/lib/generation/components/generators/entranceOnSide.ts`
- `src/lib/generation/components/generators/sparseWindows.ts`
- `src/lib/generation/components/generators/roofs.ts`
- `src/lib/generation/components/generators/chimney.ts`
- `src/lib/generation/components/generators/frontStep.ts`
- `src/lib/generation/components/__tests__/compileGenericBuildingPlan.test.ts`
- `src/lib/generation/components/__tests__/openingMask.test.ts`
- `src/lib/generation/components/__tests__/componentGenerators.test.ts`

### Generation

- `src/lib/generation/generators/generateGenericBuilding.ts`
- `src/lib/generation/__tests__/generatorGenericPresetInvariants.test.ts`

## Files edited

- `src/lib/blueprints/types.ts` — `generic_building` types; union extensions
- `src/lib/blueprints/validateBlueprint.ts` — generic dispatch
- `src/lib/generation/generateStructure.ts` — generic dispatch + exhaustive `default`
- `src/lib/generation/families/buildingFamilies.ts` — `generic_building` shipped
- `src/lib/generation/__tests__/buildingFamilies.test.ts` — two families
- `src/app/preview/PreviewInspectionClient.tsx` — Towers | Generic | Partials
- `src/components/voxel/StructureInspectionPanel.tsx` — `preset_generic` source
- `vitest.config.ts` — include blueprint + component test paths

## GenericBuildingBlueprint (v1)

- `structureType: "generic_building"`, `schemaVersion: 1`
- `body`: width 5–17, depth 5–13, height 4–9 (walls only, excludes roof), `wallThickness` 1–2, `hollowInterior`
- `roof`: `pitched_gable` | `shed` | `none`, optional layers/overhang (overhang clamped 0–1)
- `openings`: entrance side + width 1–3 + height 2–4; windows mode + count 0–12 + optional height band
- `features`: optional chimney, optional front step
- `materials` / `constraints`: same classic-key pattern as tower

## Internal ComponentPlan (v1)

- Lives under `src/lib/generation/components/` only
- Discriminated `PlannedComponent` unions (no loose `Record` params)
- `openings` on plan: `shellSkipMask`, `windowMask`, `entranceMask` (derived at compile time, not on authoring blueprint)
- Exactly one `rectangular_body` (`body_main`, zero placements in v1)
- Canonical emit order: body → foundation → shell → entrance → windows → roof → chimney → front_step

## Aperture mask / shell-skip

No air block type. Compiler derives entrance and window cells; `hollow_wall_shell` skips them; `sparse_windows` fills window cells with pane/cube; `entrance_on_side` places sparse door/accent trim only (open void in doorway).

## Generic presets

| Id | Purpose |
|----|---------|
| `simple_rustic_cabin` | Gable cabin, chimney, front step, front windows (default generic) |
| `shed_roof_workshop` | Wide shed roof, side windows, no chimney/step |

Materials use only existing classic keys: `cobblestone`, `oak_planks`, `limestone_bricks`, `limestone`, `glass`, `slate_tiles`.

## Preview

- **Towers | Generic | Partials**; default remains **Towers / northwatch**
- Generic: preset dropdown only; no ComponentPlan UI

## Confirmations

| Item | Status |
|------|--------|
| `medieval_tower` | Unchanged |
| `blacksmith_workshop` | Not resurrected |
| `ComponentPlan` | Internal-only |
| `blueprintExchange` | Unchanged, tower-only v1 |
| `/visualizer` | Unchanged |
| AI / image / interior / region-selection | Not added |
| New textures / block definitions | None |
| `cottage_house` | Not added |

## Tests added/updated

- Validator, compiler, opening mask, component generator unit tests
- `generatorGenericPresetInvariants.test.ts` (hard + placement semantics)
- `buildingFamilies.test.ts` — 2 shipped families
- Tower tests unchanged

## Residue grep (`src/`)

| Pattern | Matches |
|---------|---------|
| `blacksmith_workshop` | 1 — `buildingFamilies.test.ts` (intentional negative) |
| `BlacksmithWorkshop` | 0 |
| `validateBlacksmith` | 0 |
| `generateBlacksmith` | 0 |
| `BLACKSMITH` | 0 |
| `preset_blacksmith` | 0 |

## Visual cleanup before commit

Preview feedback: generic bases looked two blocks thick; shed workshop roof read flat.

**Foundation / floor (single y=0 slab):**
- `foundation.ts` — full footprint at y=0 uses `materials.floor` (foundation/floor layer).
- `hollowWallShell.ts` — removed interior floor placements at y=1; hollow interior starts above the y=0 slab; walls remain y=1..body.height.

**Shed roof:**
- `sampleGenericBuildingBlueprints.ts` — `shed_roof_workshop` `roof.layers` 1 → 2.
- `roofs.ts` — `emitShedRoof` builds a back-to-front stepped slope (more layers toward front / `lz === D - 1`) instead of flat stacked slabs.

**Tests:** `componentGenerators.test.ts` — foundation uses floor material; shell does not emit `INTERIOR_FLOOR` at y=1.

## Addendum — shed roof workshop coverage fix

**Why the roof looked missing:** Two bugs stacked.

1. **Slope math:** `riseStartLz = D - layers` meant only the last two depth rows (front edge) got any roof blocks; the back ~7 rows had `rise < 1` and were skipped — matching the small corner cluster in preview.

2. **filterGrounded:** Roof blocks need a voxel directly below (`y-1`). Hollow interiors have no blocks under the inner ceiling, so almost all interior roof voxels were dropped after merge, leaving only a sliver still connected to perimeter walls.

**Fixes:**
- `roofs.ts` — `shedRiseForLocalLz`: every depth column gets at least one roof layer at `lz=0`, up to `layers` at `lz=D-1` (the old `riseStartLz = D - layers` formula skipped the back rows entirely).
- `placementUtils.ts` — `filterGroundedConnected26`: component pipeline now uses 26-neighbor grounding from `minY` seeds (same rule as `analyzeVoxelStructure` / generator invariants). The legacy `filterGrounded` (strict block directly below) remains for `medieval_tower`; it was deleting almost all roof voxels over hollow interiors.
- `emitFromComponentPlan.ts` — calls `filterGroundedConnected26` instead of `filterGrounded`.

**Tests:** `shedRoof.test.ts` — rise helper, back-row placements, workshop keeps ≥ footprint roof count after full generate + filterGrounded.

## Addendum — doorway threshold floor and standard door height

**What users saw:** Missing floor block in the doorway (black void at y=0) and/or a misplaced exterior step; openings taller than two blocks above the floor read as “big doors” instead of standard Minecraft clearance.

**Why it happened:** A prior fix carved the entrance through **y=0** in the shell skip mask and skipped foundation placement there, which removed the threshold floor while `front_step` could still place a block outside the footprint.

**Fix:**
- `openingMask.ts` — wall aperture only at **y=1..entrance.height**; y=0 stays floored.
- `foundation.ts` — full footprint floor at y=0, including doorway cells.
- `entranceOnSide.ts` — lintel at **y = height + 1**; trim never in the walk band y=1..height; jambs when height ≥ 3.
- Presets — `entrance.height: 2` on cabin and workshop (standard two-block clearance above floor).
- `validateGenericBuilding.ts` — note when height > 2 (big door).
- `docs/generation/GENERATION_DESIGN_PRINCIPLES.md` — §2.3.1 generic doorway bands.

**Tests:** `entranceDoorway.test.ts`, `openingMask.test.ts`, `componentGenerators.test.ts`.

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | **100 passed** (18 files) |
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm run build` | **Pass** |
