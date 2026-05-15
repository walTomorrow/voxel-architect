# Plan: Generator Reliability Testing — Issue 2 (reusable voxel structure analysis helpers)

## 1. Current understanding

### Milestone

**Generator Reliability Testing** (`milestone/generator-reliability-testing`) adds automated checks on the deterministic pipeline:

**blueprint → `validateBlueprint()` → `generateStructureFromResolved()` → `VoxelBlock[]`**

The milestone targets **geometric / structural reliability** (non-empty output, valid IDs, no duplicate lattice cells, `maxBlockCount`, single grounded mass under a chosen adjacency rule) — **not** aesthetics, screenshots, or strict semantic rules (roof/door/window required).

### Issue 1 (done)

- **Vitest** + **`pnpm test:generator`** (`vitest run src/lib/generation/__tests__`).
- One **smoke test**: default sample blueprint → validate → generate → `blocks.length > 0`.

### This issue (Issue 2)

Add **pure TypeScript analysis helpers** that take a generated **`readonly VoxelBlock[]`** and return **objective metrics**. These helpers:

- Support **future invariant tests** (Issue 3+).
- May later feed **`/visualizer` diagnostics** (out of scope here).

**Do not** add the full preset invariant suite, edge-case blueprints, or UI in this issue.

### Why pure TypeScript (no React / Three.js)

- Analysis is **lattice math** on `VoxelBlock` data — same types the generator already emits.
- Tests run in **Node** via Vitest; no canvas, no R3F, no render order.
- Keeps helpers **reusable** from tests, CLI, or future lab UI without pulling in the viewer stack.

---

## 2. Proposed helper module

**Location:** **`src/lib/voxel/structureAnalysis.ts`**

**Rationale:** Sits beside **`types.ts`**, **`layerView.ts`**, and **`blockBreakdown.ts`** — all operate on `VoxelBlock[]` without generation or UI. Generation tests will **import** these helpers; the generator does not need to depend on them.

Optional tiny exports file only if needed — prefer a **single module** for Issue 2.

**Public surface (planned):**

| Export | Role |
|--------|------|
| `voxelPositionKey(x, y, z)` | Stable `"x,y,z"` key (matches `generateMedievalTower` `key()`) |
| `VoxelStructureBounds` | Axis-aligned min/max per axis |
| `VoxelStructureAnalysis` | Readonly result object (see §3) |
| `analyzeVoxelStructure(blocks)` | Main entry: compute all metrics |

Internal helpers (not necessarily exported): 26-neighbor iteration, union-find or BFS for components, grounded reachability from seeds.

---

## 3. Proposed analysis outputs

**`analyzeVoxelStructure(blocks: readonly VoxelBlock[]): VoxelStructureAnalysis`**

Computed from the **input list order** only where order matters for duplicate reporting; counts and connectivity are **order-independent**.

| Field | Meaning |
|-------|--------|
| `blockCount` | `blocks.length` (includes duplicates if present) |
| `uniqueBlockCount` | Distinct lattice positions |
| `bounds` | `{ minX, maxX, minY, maxY, minZ, maxZ }` — empty structure → all zeros or `null` bounds (pick one convention and document; recommend **`bounds: null`** when `blockCount === 0`) |
| `duplicateCoordinateCount` | Number of extra blocks sharing a lattice cell |
| `duplicateCoordinates` | Optional capped list of keys with count > 1 (e.g. first 20) for debugging |
| `blockTypeCounts` | `Readonly<Record<string, number>>` keyed by `blockTypeId` |
| `invalidBlockTypeIds` | Distinct IDs where **`getBlockDefinition(id)`** is `undefined` |
| `groundTouchingBlockCount` | Blocks with **`y === bounds.minY`** (see §6) |
| `connectedComponentCount26` | 26-neighbor connected components over **unique** positions |
| `largestComponentSize26` | Size of largest 26-neighbor component |
| `groundedReachableBlockCount26` | Unique positions 26-reachable from any ground-touching block |
| `ungroundedBlockCount26` | `uniqueBlockCount - groundedReachableBlockCount26` |
| `allBlocksGroundedConnected26` | Convenience: `uniqueBlockCount > 0 && ungroundedBlockCount26 === 0 && connectedComponentCount26 === 1` |

**Note:** `allBlocksGroundedConnected26` is derived data for ergonomics; **pass/fail policy** stays in tests (§7).

---

## 4. Coordinate key strategy

- **Key format:** `` `${x},${y},${z}` `` — same convention as **`generateMedievalTower.ts`** (`key()` at lines 34–36).
- **Map building:** First pass over `blocks` → `Map<string, VoxelBlock>` (or store block type per cell). Later blocks at the same key increment **`duplicateCoordinateCount`** (and optionally record the key).
- **Connectivity:** Operate on the **set of unique keys** (one node per lattice cell). If duplicates exist, connectivity metrics describe the **unique** occupancy; duplicate count is reported separately.

Deterministic: sort keys lexicographically when returning `duplicateCoordinates` or `invalidBlockTypeIds` for stable test assertions.

---

## 5. Valid block ID strategy

- Use existing **`getBlockDefinition(blockTypeId)`** from **`src/lib/voxel/blocks/registry.ts`** (same as **`blockBreakdown.ts`**).
- **Do not** hard-code classic pack keys.
- **`invalidBlockTypeIds`:** every distinct `blockTypeId` in the structure for which `getBlockDefinition` returns `undefined`.
- Malformed IDs (no `/` pack prefix) naturally fail registry lookup — treated as invalid.

---

## 6. Connectivity / grounding strategy

### 26-neighbor adjacency (connectivity)

For each occupied cell `(x, y, z)`, neighbors are all offsets `(dx, dy, dz)` with each in **`{-1, 0, 1}`** and **not** all zero. Two cells are adjacent if the neighbor offset exists in the occupancy map.

This matches the milestone rule: **face, edge, and corner** contact count as connected (diagonal trim/accent pieces count).

**Implementation:** BFS/DFS or union-find on unique keys; 26 neighbor lookups per node.

### Ground-touching definition (seeds for grounded reachability)

**Inspected generator behavior:**

- **`generateMedievalTower`** places foundation at **`y = 0`** (`push(lx, 0, lz, PRI.FOUNDATION, …)`).
- Post-merge **`filterGrounded`** (when `allowFloatingBlocks` is false) seeds with **`b.y <= 0`** and propagates via **face-down only** (`y - 1`) — **not** 26-neighbor. That is **generator output filtering**, not the analysis rule for tests.

**Recommendation for analysis (project-consistent, future-proof):**

- **Ground-touching block:** any occupied cell with **`y === minY`**, where **`minY`** is the minimum `y` over **unique** positions in the structure.
- **Rationale:** Structure-relative “bottom layer” works if the generator ever shifts vertically; for current medieval tower output, **`minY` is `0`**, aligning with foundation placement and `filterGrounded` seeds.
- Document in module JSDoc: *“For current generator output, `minY` is typically `0`.”*

**Grounded-reachable (26-neighbor):**

- Start BFS from **every** ground-touching occupied cell.
- Mark all unique positions reachable via **26-neighbor** steps through occupied cells.
- **`groundedReachableBlockCount26`** = size of that set.
- **`ungroundedBlockCount26`** = unique cells not in that set (floating clusters, or cells only connected above the base without touching the bottom layer via 26-neighbors — rare).

**Relation to component count:**

- **`connectedComponentCount26`:** standard 26-neighbor components on all occupied cells.
- Future invariant: expect **`connectedComponentCount26 === 1`** and **`ungroundedBlockCount26 === 0`** for valid presets (all mass is one 26-connected piece anchored to the bottom layer).

---

## 7. Warnings vs hard failures

**This issue:** helpers **compute and return data** only (plus optional derived booleans like `allBlocksGroundedConnected26`).

**Likely hard failures in future invariant tests:**

| Signal | Future test use |
|--------|------------------|
| `blockCount === 0` | Fail |
| `invalidBlockTypeIds.length > 0` | Fail |
| `duplicateCoordinateCount > 0` | Fail |
| `ungroundedBlockCount26 > 0` or `connectedComponentCount26 !== 1` | Fail (floating / detached mass) |
| `blockCount > blueprint.constraints.maxBlockCount` | Fail — needs **blueprint context** in test, not inside `analyzeVoxelStructure` alone |

Helpers may expose **`exceedsMaxBlockCount(blockCount, maxBlockCount)`** in a later issue or keep that check in tests.

---

## 8. Optional helper tests

**File:** **`src/lib/voxel/__tests__/structureAnalysis.test.ts`**

**Vitest include:** Widen **`vitest.config.ts`** to:

```ts
include: ["src/lib/**/__tests__/**/*.test.ts"],
```

so **`pnpm test:generator`** runs generation smoke + voxel helper tests (script name stays generator-focused for the milestone).

**Tiny hand-built fixtures (no generator):**

1. **Two face-adjacent blocks** → one 26-component, grounded reachable.
2. **Two blocks touching only at a corner** (e.g. `(0,0,0)` and `(1,1,0)`) → still **one** 26-component, both grounded if on `minY`.
3. **Detached floating block** above base → `connectedComponentCount26 >= 2` or `ungroundedBlockCount26 > 0`.
4. **Duplicate coordinates** in input array → `duplicateCoordinateCount > 0`.
5. **Invalid block type id** → listed in `invalidBlockTypeIds`.

Use minimal `VoxelBlock[]` literals; no preset generation in this file.

---

## 9. Scope boundaries (non-goals)

**Do not add:**

- Full invariant suite over all presets / edge-case blueprints.
- `maxBlockCount` enforcement inside analysis (blueprint needed).
- Snapshot, visual, Playwright, RTL, UI diagnostics panel.
- Generator or blueprint schema changes (unless import path resolution blocks tests — unlikely).
- Aesthetic or roof/door/window semantic checks.
- Changing generator **`filterGrounded`** to 26-neighbor (separate product decision).

---

## 10. Verification (after implementation)

| Command | Purpose |
|---------|--------|
| **`pnpm test:generator`** | Smoke + structure analysis helper tests |
| **`pnpm exec tsc --noEmit`** | Types |
| **`pnpm run build`** | Next unaffected |

---

## 11. CHANGE.md (after implementation)

Overwrite with:

- **Title:** Add reusable voxel structure analysis helpers (Issue 2).
- **Branch:** `milestone/generator-reliability-testing`.
- **Files:** `structureAnalysis.ts`, optional `__tests__`, `vitest.config.ts` include tweak.
- **Fields** returned by `analyzeVoxelStructure`.
- **26-neighbor** and **`y === minY`** grounding decision.
- **`getBlockDefinition`** for validity.
- Helper tests added (if any).
- **Deferred:** full preset invariants, UI, `maxBlockCount` helper in module.
- **Results:** test / tsc / build.

---

## 12. Approval checkpoint

**Waiting for approval before implementation.**
