# Change log — generator preset invariant tests

## Title of this issue

**Add generator invariant tests for curated presets** (Generator Reliability Testing — Issue 3)

## Branch name

`milestone/generator-reliability-testing`

## Files changed

| File | Change |
|------|--------|
| `src/lib/generation/__tests__/generatorPresetInvariants.test.ts` | **New:** Loop over `MEDIEVAL_TOWER_PRESETS`; validate → generate → `analyzeVoxelStructure`; assert geometric invariants. |

**Unchanged (kept per plan):** `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts`

## Presets covered

All entries from **`MEDIEVAL_TOWER_PRESETS`** in `src/lib/blueprints/sampleBlueprints.ts` (single source; **`structuredClone(preset.blueprint)`** — no duplicated JSON):

| `id` | `label` |
|------|---------|
| `northwatch` | Northwatch Spire (default) |
| `tall_watchtower` | Tall Watchtower |
| `fortified_gate` | Fortified Gate Tower |
| `gothic_stone` | Gothic Stone Tower |
| `compact_guard` | Compact Guard Tower |
| `dark_wizard` | Dark Wizard Tower |

## Invariants enforced (per preset)

- `blocks.length > 0`
- `analysis.blockCount === blocks.length`
- `analysis.uniqueBlockCount > 0`
- `analysis.invalidBlockTypeIds` empty (registry via `getBlockDefinition` inside analysis)
- `analysis.duplicateCoordinateCount === 0`
- `analysis.connectedComponentCount26 === 1` (**curated tower presets only** — not a universal rule for future multi-mass generators)
- `analysis.ungroundedBlockCount26 === 0`
- `analysis.allBlocksGroundedConnected26 === true`
- `blocks.length <= validation.resolved.constraints.maxBlockCount`

No mocks for validation, generation, registry, or analysis.

## Diagnostics / failure messages

**`invariantContext(...)`** builds one pipe-separated string appended to **`expect`** messages, including:

- preset **`id`** and **`label`**
- block count and unique block count
- `bounds` (JSON)
- `invalidBlockTypeIds`, `duplicateCoordinates` (from analysis; duplicates list already capped in `structureAnalysis`)
- `connectedComponentCount26`, `ungroundedBlockCount26`
- `maxBlockCount` from **`resolved.constraints`**

Validation failures surface **`validation.errors`** in the assertion message.

No custom Vitest reporters.

## Intentionally deferred

- Extra blueprint fixtures, regression corpora, snapshotting
- Visual / Playwright / RTL suites
- UI diagnostics panel
- Generator, `filterGrounded`, or blueprint schema changes
- Aesthetic or strict roof/door/window requirements
- Golden block counts, bounds, or material distribution assertions
- Full `VoxelBlock[]` snapshots

## Test / build / typecheck results

| Check | Result |
|-------|--------|
| `pnpm test:generator` | **Passed** (14 tests: 7 structure-analysis helpers + 1 smoke + **6** preset invariants) |
| `pnpm exec tsc --noEmit` | **Passed** (exit 0) |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## Remaining weaknesses / follow-up ideas

- **Smoke overlap:** the smoke test exercises **`SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`**, same blueprint object as **`northwatch`** — redundant but kept as a minimal pipeline sanity check.
- **`connectedComponentCount26 === 1`:** if the product adds towns, compounds, or intentionally disconnected structures, split tests or gate this invariant per generator/preset kind.
- **CI:** run `pnpm test:generator` on PRs if not already wired.
- Optional **budget helper** if tests need shared `maxBlockCount` messaging across more suites.
