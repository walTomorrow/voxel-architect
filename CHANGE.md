# CHANGE.md — Building style catalog (metadata only)

## Files changed

- `src/lib/generation/styles/buildingStyles.ts` — **new** style catalog: types, six `BUILDING_STYLES` entries, helpers.
- `src/lib/blueprints/sampleBlueprints.ts` — `MedievalTowerPreset.styleId` on wrapper; six preset → style mappings (blueprint bodies unchanged).
- `src/lib/generation/__tests__/buildingStyles.test.ts` — **new** catalog tests (8 cases).
- `docs/generation/GENERATION_DESIGN_PRINCIPLES.md` — §1.6 note: catalog is metadata-only, not consumed by generators.

## Style catalog module

- **Location:** `src/lib/generation/styles/buildingStyles.ts`
- **Types:** `BuildingFamilyId`, `BuildingStyleId`, `BuildingStyleDefinition`, plus mood/ornamentation/color helpers and `EncouragedPartialShape`.
- **Record:** `BUILDING_STYLES` keyed by approved `styleId`.
- **Fields per style:** `displayName`, `description`, `applicableFamilies`, `tags`, `defaultPalette`, `massingHints`, `openingsHints`, `roofHints`, `featuresHints`, `mood`, `ornamentation`, `colorMood`, `encouragedPartialShapes` (pane only; non-binding).
- **No** voxel coordinates, texture paths, resolver, or generator wiring.

## Six style IDs

1. `rustic_stone_watchtower`
2. `tall_military_watchtower`
3. `fortified_gatehouse`
4. `gothic_stone`
5. `compact_guard_post`
6. `dark_wizard`

## Preset → style mapping

| Preset id | `styleId` |
|-----------|-----------|
| `northwatch` | `rustic_stone_watchtower` |
| `tall_watchtower` | `tall_military_watchtower` |
| `fortified_gate` | `fortified_gatehouse` |
| `gothic_stone` | `gothic_stone` |
| `compact_guard` | `compact_guard_post` |
| `dark_wizard` | `dark_wizard` |

## Helper functions

- `getBuildingStyle(styleId)` — defined style or `undefined` (unknown ids do not throw).
- `stylesForFamily(familyId)` — all styles for `medieval_tower` (six entries).
- `getAllBuildingStyles()` — readonly list of all catalog entries.
- `BUILDING_STYLE_IDS` — const tuple of approved ids.

## Tests added

`buildingStyles.test.ts`: exact six ids, uniqueness, lookup per id, unknown id → `undefined`, `stylesForFamily`, `applicableFamilies`, palette keys in `CLASSIC_BLOCK_PACK`, every `MEDIEVAL_TOWER_PRESETS[].styleId` resolves. Existing generator invariant suites unchanged (62 tests total).

## Confirmations

- **Blueprint schema / import-export:** unchanged (`MedievalTowerBlueprint` has no `styleId`).
- **Preset blueprint bodies:** unchanged (only wrapper `styleId` added).
- **Generator behavior/output:** unchanged (`generateMedievalTower`, `generateStructure` untouched).
- **Style resolver:** not added; catalog not consumed at generation time.
- **UI:** `/preview`, `/visualizer` not modified.
- **Textures / assets / block definitions:** none added or generated.

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — **9** files, **62** tests |
| `pnpm exec tsc --noEmit` | Pass (also runs inside `pnpm run build`) |
| `pnpm run build` | Pass — Next.js **16.2.6** |
