# Change log — voxel structure analysis helpers

## Title of this issue

**Add reusable voxel structure analysis helpers** (Generator Reliability Testing — Issue 2)

## Branch name

`milestone/generator-reliability-testing`

## Files changed

| File | Change |
|------|--------|
| `src/lib/voxel/structureAnalysis.ts` | **New:** Pure analysis helpers (`voxelPositionKey`, `analyzeVoxelStructure`). |
| `src/lib/voxel/__tests__/structureAnalysis.test.ts` | **New:** Tiny Vitest specs for helpers (hand-crafted `VoxelBlock[]`). |
| `vitest.config.ts` | `test.include` now covers generator smoke tests and voxel helper tests only. |
| `package.json` | `test:generator` runs `vitest run` (uses configured include patterns). |

## Helper module added

**`src/lib/voxel/structureAnalysis.ts`** — depends only on `./types`, `./blocks/registry`; no React / Three.js / viewer / visualizer.

## Analysis fields (`analyzeVoxelStructure`)

Returned **`VoxelStructureAnalysis`** includes:

| Field | Description |
|-------|--------------|
| `blockCount` | Length of input list (counts duplicate-coordinate rows twice). |
| `uniqueBlockCount` | Distinct lattice cells occupied. |
| `bounds` | Axis-aligned extents from unique coordinates, or **`null`** if empty. |
| `duplicateCoordinateCount` | Extra blocks beyond the first per `(x,y,z)` (`sum(count - 1)`). |
| `duplicateCoordinates` | Sorted occupied keys with duplicates, **capped at 20** for diagnostics. |
| `blockTypeCounts` | Tallies **per block row** in the input (`blockTypeId` → count). |
| `invalidBlockTypeIds` | Distinct `blockTypeId` values failing **`getBlockDefinition()`**, sorted alphabetically. |
| `groundTouchingBlockCount` | Unique cells with **`y === minY`** (`minY` from unique coordinates). |
| `connectedComponentCount26` | 26-neighbor components over **unique** occupied cells. |
| `largestComponentSize26` | Largest component size. |
| `groundedReachableBlockCount26` | Unique cells 26-reachable from any **`y === minY`** seed. |
| `ungroundedBlockCount26` | `uniqueBlockCount - groundedReachableBlockCount26`. |
| `allBlocksGroundedConnected26` | `uniqueBlockCount > 0` and zero ungrounded cells and exactly one 26-component. |

Exported **`voxelPositionKey(x, y, z)`** builds the coordinate key **`${x},${y},${z}`** (matches generator lattice string usage).

## Coordinate key strategy

- Keys are **`"${x},${y},${z}"`** for counting and occupancy maps.
- **Connectivity** unions only **unique** occupied coordinates; duplicate list positions do not multiply graph nodes.

## Connectivity rule

- **26-neighbor adjacency:** all offsets `(dx, dy, dz)` with each coordinate in **`{-1, 0, 1}`**, excluding **`(0, 0, 0)`**.
- Cells are adjacent iff both are occupied **uniquely** at that neighbor offset.

## Ground-touching rule

- **`groundTouchingBlockCount`** counts unique cells whose **`y` equals structure `minY`** (computed from unique coordinates — structure-relative floor).
- **Grounded/reachable:** BFS/seeding from **all** **`y === minY`** occupied cells via the **same** 26-neighbor graph.
- **No change** to generator **`filterGrounded`** semantics in this issue (that logic remains orthogonal).

## Valid block IDs

- **`getBlockDefinition(blockTypeId)`** from **`src/lib/voxel/blocks/registry.ts`** determines validity; IDs are **not** hard-coded in the analyzer.

## Helper tests added

**`src/lib/voxel/__tests__/structureAnalysis.test.ts`** — scenarios:

- Empty input → **`bounds === null`** and zero connectivity summaries.
- Face-adjacent blocks → single component and fully grounded flag.
- Diagonal/contact (`(0,0,0)` and `(1,1,0)`) → one 26-connected component.
- Far-separated voxel → disconnected components and **`ungroundedBlockCount26`**
- Duplicate coordinates → counts and capped sorted **`duplicateCoordinates`**
- Invalid block types → sorted **`invalidBlockTypeIds`**

**`pnpm test:generator`** still targets this milestone via **`vitest.config.ts`** **`include`** (generation + voxel `__tests__` only).

## Intentionally deferred

- Full generator invariant suite over all presets and edge-case blueprints.
- **`maxBlockCount`** enforcement vs blueprint constraints (needs blueprint context in callers/tests).
- Snapshots, visual/screenshot tests, Playwright, RTL.
- `/visualizer` or viewer diagnostics UI.
- Changes to **`filterGrounded`**, blueprint schema, or generator output rules.
- Aesthetic / roof / entrance / window semantic assertions.

## Test / build / typecheck results

| Check | Result |
|-------|--------|
| `pnpm test:generator` | **Passed** (8 tests, 2 files: smoke + structure analysis helpers) |
| `pnpm exec tsc --noEmit` | **Passed** (exit 0) |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## Remaining weaknesses / follow-up ideas

- **`duplicateCoordinates`** cap hides keys beyond the first 20 callers may want a **`maxDuplicateDiagnostics`** option later.
- **Ground-touching:** `minY` is purely structure-relative — world “world floor” semantics (always `y === 0`) would be a caller policy if stacking ever shifts **`minY` > 0** without intending that layer as “sole ground.”
- Invariant presets: **`allBlocksGroundedConnected26`**, **`invalidBlockTypeIds`**, **`duplicateCoordinateCount === 0`**, plus **`resolved.constraints.maxBlockCount`** checked in tests (not inside this module).
- Optional **`exceedsMaxBlockCount(a, max)`** trivial helper alongside blueprint-aware tests later.
