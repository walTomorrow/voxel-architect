# CHANGE.md — Revert cottage WIP + neutral helper extraction (slice B)

## Interrupted cottage WIP removed

**Deleted (untracked):**

- `src/lib/blueprints/validateCottageHouse.ts`
- `src/lib/blueprints/sampleCottageBlueprints.ts`
- `src/lib/generation/generators/generateCottageHouse.ts`
- `src/app/preview/previewGeneratorFamilies.ts`
- `src/lib/generation/__tests__/generatorCottagePresetInvariants.test.ts`
- `src/lib/generation/__tests__/generatorCottageEdgeCaseInvariants.test.ts`
- `src/lib/generation/__tests__/generatorCottagePanes.test.ts`
- `src/lib/generation/__tests__/fixtures/cottageEdgeCaseBlueprints.ts`

**Restored to last known good (`git checkout HEAD`):**

- `src/lib/blueprints/types.ts`
- `src/lib/blueprints/validateBlueprint.ts`
- `src/lib/generation/generateStructure.ts`
- `src/lib/generation/families/buildingFamilies.ts`
- `src/app/preview/PreviewInspectionClient.tsx`
- `src/components/voxel/StructureInspectionPanel.tsx`

## Neutral helper extraction (behavior-neutral)

**Added:**

- `src/lib/generation/placement/placementUtils.ts` — `GeneratorPlacement`, `centerOrigin`, `mergePlacements`, `filterGrounded`, `placementCoordKey`
- `src/lib/generation/facade/paneAxis.ts` — `paneAxisForWindowCell`
- `src/lib/generation/__tests__/placementUtils.test.ts` — merge priority/tie, shapeKind/state, duplicate collapse, grounding

**Updated (imports only; generator output intended unchanged):**

- `src/lib/generation/generators/generateMedievalTower.ts`
- `src/lib/generation/generators/generateBlacksmithWorkshop.ts`
- `src/lib/generation/__tests__/generatorWindowPanes.test.ts` — `paneAxis` import from `facade/paneAxis`

### `placementUtils`

- **Merge:** descending `p`, then descending `i`; one block per `(x,y,z)`; optional `shapeKind` / `state` preserved.
- **Grounding:** structure-relative; blocks at `y ≤ 0` or with grounded cell below kept when `allowFloatingBlocks` is false.

### `paneAxis`

- Front/back façades (`lz === 0` or `lz === D - 1`, not corner): axis `"x"`.
- Left/right façades (`lx === 0` or `lx === W - 1`, not corner): axis `"z"`.
- Corners: `undefined`. Not connection-aware.

## Confirmations

| Item | Status |
|------|--------|
| `medieval_tower` output | Intended unchanged (shared helpers only) |
| `blacksmith_workshop` output | Intended unchanged (shared helpers only) |
| `cottage_house` | **Not** added (no types, validator, generator, presets, tests, catalog, preview) |
| `BUILDING_FAMILIES` | `medieval_tower`, `blacksmith_workshop` only |
| `/preview` | Restored: **Towers \| Blacksmith \| Partials**; default **Towers / northwatch** |
| Partial showcase | Static `PARTIAL_BLOCK_SHOWCASE_STRUCTURE` (no generator path) |
| `/visualizer` | Not modified |
| `blueprintExchange` / import-export v2 | Not modified / not added |
| Component grammar / `ComponentPlan` | Not implemented |
| New textures / block definitions | None |

## Tests

- **Added:** `placementUtils.test.ts` (6 cases)
- **Updated:** `generatorWindowPanes.test.ts` (import path)
- **Removed:** all cottage generator tests/fixtures

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | **79 passed** (14 files) |
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm run build` | **Pass** |

## Residue check

`git grep cottage_house / CottageHouse / validateCottage / generateCottage` under `src/` — only `buildingFamilies.test.ts` expects `getBuildingFamily("cottage")` to be undefined (intentional).
