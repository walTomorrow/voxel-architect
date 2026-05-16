# CHANGE.md — Remove blacksmith active generator path

## Summary

Slice 1 of the Generic Component Building pivot removes `blacksmith_workshop` from the active product and generator path. The codebase now ships one generated structure family (`medieval_tower`) while keeping shared placement/façade helpers, partial-block support, and tower-only blueprint exchange. This clears the way for future `generic_building` / `ComponentPlan` work without maintaining a second bespoke building generator.

## Files deleted

- `src/lib/blueprints/validateBlacksmithWorkshop.ts`
- `src/lib/blueprints/sampleBlacksmithBlueprints.ts`
- `src/lib/generation/generators/generateBlacksmithWorkshop.ts`
- `src/lib/generation/__tests__/generatorBlacksmithPresetInvariants.test.ts`
- `src/lib/generation/__tests__/generatorBlacksmithEdgeCaseInvariants.test.ts`
- `src/lib/generation/__tests__/generatorBlacksmithPanes.test.ts`
- `src/lib/generation/__tests__/fixtures/blacksmithEdgeCaseBlueprints.ts`

## Files edited

- `src/lib/blueprints/types.ts` — `StructureType`, blueprint/resolved unions tower-only; blacksmith-specific types removed
- `src/lib/blueprints/validateBlueprint.ts` — blacksmith validation branch removed
- `src/lib/generation/generateStructure.ts` — tower-only dispatch; exhaustive `default` removed (single union member)
- `src/lib/generation/families/buildingFamilies.ts` — catalog lists `medieval_tower` only
- `src/lib/generation/__tests__/buildingFamilies.test.ts` — expects one shipped family; asserts `blacksmith_workshop` is undefined
- `src/app/preview/PreviewInspectionClient.tsx` — Towers and Partials only; default Towers / northwatch
- `src/components/voxel/StructureInspectionPanel.tsx` — `PreviewLabSource` is `preset_towers` | `partial_showcase`; Blacksmith tab removed

## Confirmations

| Item | Status |
|------|--------|
| `medieval_tower` remains active | Yes — only structure type in types, validation, dispatch, and family catalog |
| `/preview` | **Towers \| Partials** only; default **Towers / northwatch** |
| Partials | Static `PARTIAL_BLOCK_SHOWCASE_STRUCTURE` (unchanged showcase path) |
| `/visualizer` | Not modified |
| `blueprintExchange` | Tower-only v1 (not modified) |
| `placementUtils` | Retained |
| `paneAxis` | Retained |
| Material metadata / partial blocks | Retained |
| `ComponentPlan` / `GenericBuildingBlueprint` / `generic_building` | **Not** implemented |
| Component generators | **Not** added |
| `medieval_tower` refactor | **Not** done |
| AI / image / interior / region-selection | **Not** added |
| `cottage_house` | **Not** added |
| New textures / assets / block definitions | **Not** added |
| Import/export v2 | **Not** added |
| Other docs | **Not** updated (this file only) |

## Tests updated / deleted

**Deleted:** all blacksmith generator invariant, edge-case, pane, and fixture tests (7 files above).

**Updated:** `buildingFamilies.test.ts` — family count 1; `getBuildingFamily("blacksmith_workshop")` expected undefined.

**Retained:** tower preset/edge-case invariants, window pane tests, placementUtils tests, generator pipeline smoke, partial showcase, material meta, building styles.

## Residue grep (`src/`)

| Pattern | Matches |
|---------|---------|
| `blacksmith_workshop` | 1 — `buildingFamilies.test.ts` (intentional: unsupported family is undefined) |
| `BlacksmithWorkshop` | 0 |
| `validateBlacksmith` | 0 |
| `generateBlacksmith` | 0 |
| `BLACKSMITH` | 0 |
| `preset_blacksmith` | 0 |

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | **71 passed** (11 files) |
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm run build` | **Pass** |

## TypeScript note

With a single-member `ResolvedStructure` union, an exhaustive `switch` `default: never` branch caused `ResolvedMedievalTower` to be inferred as `never` in `default`. Removed the `default` branch from `generateStructureFromResolved`; unknown `structureType` values are still rejected at validation time via `validateBlueprint`.
