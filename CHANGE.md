# Change log — generator edge-case blueprint fixtures

## Title of this issue

**Add generator edge-case blueprint fixtures** (Generator Reliability Testing — Issue 4)

## Branch name

`milestone/generator-reliability-testing`

## Files changed

| File | Change |
|------|--------|
| `src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts` | **New:** Six hand-authored valid `MedievalTowerBlueprint` edge fixtures + `EDGE_CASE_BLUEPRINT_FIXTURES`. |
| `src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts` | **New:** Same pipeline + hard invariants as preset tests, parameterized over fixtures. |
| `src/lib/generation/__tests__/testUtils.ts` | **New:** `formatGeneratorInvariantDiagnostics`, `assertGeneratedStructureHardInvariants`. |
| `src/lib/generation/__tests__/generatorPresetInvariants.test.ts` | Refactored to use `assertGeneratedStructureHardInvariants` (no behavior change). |

## Fixtures added (ids and intent)

| `id` | Short description |
|------|-------------------|
| `height_budget_body_clamp` | `dimensions.height: 8` with tall emphasis + multi-layer stepped roof — validator **clamps body layers** so foundation + body + roof fits. |
| `wide_entrance_max` | **11×11**, **T=2**, **`entranceWidth: 5`** (= `max(1, W−2T−2)`). |
| `authoring_overhang_clamp` | **`roof.overhang: 5`** — validator **clamps to 2** with note. |
| `thick_shell_narrow_void` | **9×9**, **`wallThickness: 3`** (3×3 interior void). |
| `window_density_wide` | **13×13**, **`windowsCountPerSide: 6`**, **`windowsFloors: "all"`**. |
| `tight_max_block_count_roof_trim` | Stepped roof **author height 10** with **`maxBlockCount: 18_000`** — validator may **reduce roof layers** until estimate fits. |

All use **classic-pack material keys** only (`BASE_MATERIALS`). **No** `allowFloatingBlocks` / floating intent. **Not** copies of `MEDIEVAL_TOWER_PRESETS`.

## Invariants enforced

Same as curated presets:

- `blocks.length > 0`
- `analysis.blockCount === blocks.length`
- `analysis.uniqueBlockCount > 0`
- `analysis.invalidBlockTypeIds.length === 0`
- `analysis.duplicateCoordinateCount === 0`
- `analysis.connectedComponentCount26 === 1` (**single-building towers only**)
- `analysis.ungroundedBlockCount26 === 0`
- `analysis.allBlocksGroundedConnected26 === true`
- `blocks.length <= resolved.constraints.maxBlockCount`

## Shared test helper

**`testUtils.ts`:**

- **`formatGeneratorInvariantDiagnostics`** — pipe-separated string (id, label, counts, bounds, invalid IDs, duplicate coord keys, component + ungrounded counts, `maxBlockCount`).
- **`assertGeneratedStructureHardInvariants`** — Vitest `expect` bundle for the list above.

Preset and edge-case suites both call the helper after **real** `validateBlueprint` → `generateStructureFromResolved` → `analyzeVoxelStructure` (no mocks).

## Diagnostics approach

- Validation failure: **`errors`** and **`notes`** in the first `expect` message (edge-case test includes notes for clamp debugging).
- Invariant failure: diagnostics string from **`formatGeneratorInvariantDiagnostics`** attached to each assertion (unchanged from Issue 3 style).
- No custom Vitest reporters.

## Intentionally deferred

- Invalid-blueprint / import-json tests, regression corpora, snapshots, Playwright, RTL
- UI diagnostics, generator / `filterGrounded` / schema changes
- Aesthetic or strict roof/door/window semantics
- Multi-building / town fixtures
- Fixtures that would require weakening invariants or changing generator behavior

## Test / build / typecheck results

| Check | Result |
|-------|--------|
| `pnpm test:generator` | **Passed** (20 tests: 7 voxel helpers + 1 smoke + 6 presets + **6** edge fixtures) |
| `pnpm exec tsc --noEmit` | **Passed** (exit 0) |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## Remaining weaknesses / follow-up ideas

- **`connectedComponentCount26 === 1`** should be **scoped** to generators that emit a single mass; future multi-component outputs need gating or different suites.
- Edge list can grow (e.g. **`symmetry: "radial"`** note path, **`windowsPlacement: "front_only"`** with **`enforceSymmetry`**) if worth the CI time.
- If **`tight_max_block_count_roof_trim`** becomes brittle under estimator tweaks, raise **`maxBlockCount`** or drop that fixture.
