# CHANGE.md — Blacksmith workshop family (library / generator / tests)

## Files changed

- `src/lib/blueprints/types.ts` — `BlacksmithWorkshopBlueprint`, `ResolvedBlacksmithWorkshop`, `StructureBlueprint` / `ResolvedStructure` unions; `StructureType` includes `blacksmith_workshop`.
- `src/lib/blueprints/validateBlueprint.ts` — dispatches by `structureType`; tower logic unchanged in `validateMedievalTowerBlueprint`.
- `src/lib/blueprints/validateBlacksmithWorkshop.ts` — **new** blacksmith validation, clamps, material resolution, `maxBlockCount` estimate.
- `src/lib/generation/generators/generateBlacksmithWorkshop.ts` — **new** deterministic generator.
- `src/lib/generation/generateStructure.ts` — `generateStructureFromResolved` dispatches `blacksmith_workshop`.
- `src/lib/blueprints/sampleBlacksmithBlueprints.ts` — **new** `BLACKSMITH_PRESETS` (2 curated).
- `src/lib/generation/families/buildingFamilies.ts` — **new** lightweight family catalog.
- `src/lib/generation/styles/buildingStyles.ts` — `BuildingFamilyId` re-exported from family catalog.
- `src/lib/generation/__tests__/generatorBlacksmithPresetInvariants.test.ts` — **new**
- `src/lib/generation/__tests__/generatorBlacksmithEdgeCaseInvariants.test.ts` — **new**
- `src/lib/generation/__tests__/fixtures/blacksmithEdgeCaseBlueprints.ts` — **new**
- `src/lib/generation/__tests__/generatorBlacksmithPanes.test.ts` — **new**
- `src/lib/generation/__tests__/buildingFamilies.test.ts` — **new**
- `docs/generation/GENERATOR_RELIABILITY.md` — blacksmith test matrix + pipeline wording.
- `docs/generation/GENERATION_DESIGN_PRINCIPLES.md` — §1.5 notes second shipped family.
- `src/lib/blueprints/blueprintExchange.ts` — import parse narrows to `MedievalTowerBlueprint` after `structureType` check (no v2 exchange).

## Blacksmith blueprint / resolved types

- **Dimensions:** `width` (7–15), `depth` (5–11), `height` (4–8); **non-square** allowed.
- **Materials:** same six classic slots as tower.
- **Massing:** `wallThickness` (1–2), `hollowInterior`.
- **Roof:** `pitched_gable` | `shed`, `height`, `overhang`.
- **Openings:** entrance side/width/height; `windowsPlacement` (`none` | `front_only` | `front_and_sides`); `windowsCount`.
- **Features:** `chimney` (enabled + `left` | `right`), `forge`, `workbench`, `storage` booleans.
- **Constraints:** `maxBlockCount`, `allowFloatingBlocks`, `requireGroundedStructure`.
- **No** `floorPlan` / rooms / circulation.

## Validation

- `validateBlueprint()` routes `blacksmith_workshop` → `validateBlacksmithWorkshopBlueprint`.
- Tower path unchanged.
- Unknown `structureType` fails with clear error.

## Generator dispatch

- `generateStructureFromResolved`: `medieval_tower` → `generateMedievalTower`; `blacksmith_workshop` → `generateBlacksmithWorkshop`.

## `generateBlacksmithWorkshop` behavior

- Foundation + hollow shell walls (y = 1…`bodyLayers`).
- Front (or configured) entrance aperture + door row.
- Sparse windows; **pane** when `isShapeAllowedForBlockType(window, "pane")` (reuses `paneAxisForWindowCell` from tower module).
- **Pitched gable** or **shed** shrinking roof layers above body.
- **Chimney:** accent column on left/right exterior wall through roof (+1 above).
- **Forge:** accent “hearth” at rear interior + accent extension (uses blueprint **`accent`**, not new furnace block).
- **Workbench / storage:** `door` material placeholder cubes in interior (connected to floor).
- Merge-by-priority; `filterGrounded` when required.
- **No** slabs/posts; **no** window-adjacent slab trim.

## Presets

| id | Label |
|----|--------|
| `rustic_village_forge` | Rustic Village Forge (11×7, pitched gable) |
| `dark_ironworks` | Dark Ironworks (9×8, shed roof, obsidian/schist) |

No `styleId` on blacksmith presets (blacksmith styles deferred).

## Building family catalog

- `BUILDING_FAMILIES`: `medieval_tower`, `blacksmith_workshop` (both `shipped`).
- Helpers: `getBuildingFamily`, `getAllBuildingFamilies`.

## Tests

- **73** generator-related tests pass (13 files).
- Blacksmith: preset invariants, 3 edge fixtures (min footprint, non-square, tight budget), pane + oak_planks fallback smoke.
- Tower suites unchanged in behavior.

## Confirmations

- **Medieval tower:** generator, presets, validation path **not** changed in behavior.
- **UI:** `/preview`, `/visualizer` **not** modified.
- **Import/export v2:** **not** added (`blueprintExchange` still tower-only v1).
- **Style resolver:** **not** added.
- **Blacksmith styles:** **not** added.
- **Textures / block definitions:** **none** added.
- **Floor plan / interior schema:** **not** implemented.
- **AI / photo input:** **not** implemented.

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — **13** files, **73** tests |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass — Next.js **16.2.6** |
