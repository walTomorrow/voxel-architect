# ADR Plan — Partial Block Model Foundation

**Branch:** `milestone/generator-expansion`  
**Status:** Planning only — no code, tests, textures, or registry entries in this step.

---

## 1. Decision summary

**Decision:** Voxel Architect keeps **`blockTypeId`** as the **stable material / block-definition handle** (unchanged addressing model). **Optional** **`shapeKind`** and **`state`** are added on **placed `VoxelBlock` instances** to describe how that definition is realized geometrically in the cell.

**Backward compatibility:** Instances that omit **`shapeKind`** / **`state`** remain valid and **behave as full unit cubes** (today’s behavior). No migration is required for existing generator output or any future structure lists that only carry **`x, y, z, blockTypeId`**.

---

## 2. Why this decision comes first

Partial blocks are **not** a texture-only problem. Slabs, panes, posts (and later doors, stairs, fences) require:

1. **Placed-instance geometry** — something the renderer must interpret beyond a single **`BoxGeometry(1,1,1)`**.
2. **Consistent occupancy rules** — one logical cell vs multi-cell doors/fences must be modeled deliberately.
3. **Batching / materials** — different shapes or orientations break “one **`InstancedMesh`** per **`blockTypeId`**” unless grouping accounts for shape/state.

Without locking **`VoxelBlock`** + validation rules **first**, parallel work diverges:

- **New Minecraft-inspired families** would accumulate ad-hoc **`blockTypeId`** explosions (`*_slab_north`, …) or ambiguous cubes-with-textures.
- **New building families** (cottages, blacksmiths, …) would duplicate hacks instead of sharing one placement model.
- **Minecraft export metadata** needs a stable internal primitive (shape + state + material handle), not raw MC IDs only.

So: **data model + renderer contract** precedes content and generators.

---

## 3. Current constraints from the repo

| Area | Path / behavior |
|------|------------------|
| **`VoxelBlock`** | `src/lib/voxel/types.ts` — **`x, y, z, blockTypeId`** only; comments assume unit cubes on integer lattice. |
| **Registry** | `src/lib/voxel/blocks/registry-types.ts` — **`BlockTypeDefinition`** = **`faces`** (uniform / topSideBottom) + optional material flags; **`registry.ts`** resolves **`pack/localKey`**. No shape/family/role. |
| **Classic pack** | `src/lib/voxel/blocks/packs/classic.ts` — flat **`localKey → definition`**; PNG names under **`/textures/{packId}/`** via `textureUrls.ts`. |
| **Renderer** | `src/components/voxel/VoxelViewer.tsx` — shared **`UNIT_BOX`**, **`InstancedMesh`** per **`blockTypeId`**, identity rotation, scale **`(1,1,1)`**; **`groupBlocksByType`** batches by **`blockTypeId`** only. Missing texture → throw when building materials (dev logs). |
| **Generator** | `src/lib/generation/generators/generateMedievalTower.ts` — **`mergePlacements`** dedupes by **`${x},${y},${z}`**; emits **`{ x, y, z, blockTypeId }`**. **`filterGrounded`** uses downward face adjacency. |
| **`generateStructure`** | `src/lib/generation/generateStructure.ts` — validate → **`generateMedievalTower`** only for current type. |
| **Structure analysis** | `src/lib/voxel/structureAnalysis.ts` — occupancy / connectivity / duplicates keyed by **`voxelPositionKey(x,y,z)`**; **`duplicateCoordinateCount`** is extra rows sharing **`(x,y,z)`**. |
| **Reliability tests** | `src/lib/generation/__tests__/testUtils.ts` — expects **`analysis.blockCount === blocks.length`**, **`duplicateCoordinateCount === 0`**, **`connectedComponentCount26 === 1`**, etc., on **unique lattice coordinates**. |
| **Blueprint v1 exchange** | `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` — envelope wraps **authoring blueprint only**; **`VoxelBlock[]` is explicitly not** part of v1. **`validateBlueprint`** / types under `src/lib/blueprints/` do not serialize placed voxels today. |

---

## 4. Proposed `VoxelBlock` extension (types only — not implemented here)

```ts
// Conceptual — do not paste into codebase until approved.

export type VoxelBlockShapeKind =
  | "cube"
  | "slab"
  | "pane"
  | "post";

export interface VoxelBlockState {
  /** Primary horizontal facing for asymmetric shapes (pane normal in XZ). */
  readonly facing?: "north" | "south" | "east" | "west";
  /** Slab vertical half; omit implies full cube behavior when shape is slab only if validated elsewhere. */
  readonly half?: "top" | "bottom";
  /** Pane: thin plane orientation — extruded along Y, thin along one horizontal axis. */
  readonly axis?: "x" | "z";
  // Reserved for later: open, hinge, connections, variant, …
}

export interface VoxelBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly blockTypeId: BlockTypeId;
  /** Omit or `"cube"` → full unit cube (legacy). */
  readonly shapeKind?: VoxelBlockShapeKind;
  /** Geometry/orientation; omit when shapeKind is cube or post (post uses fixed centered geometry). */
  readonly state?: VoxelBlockState;
}
```

**First union (`VoxelBlockShapeKind`):** **`cube`**, **`slab`**, **`pane`**, **`post`** only.

**Deferred explicit union members** (documented for roadmap, **not** in first slice): **`door`**, **`stair`**, **`fence`**, **`wall`**, **`trapdoor`**, **`cross_plant`**, **`lantern`**, **`sign`**, **`bars`**.

**Defaulting rule:** **`shapeKind` omitted** or **`"cube"`** → renderer uses current cube path. **`state` omitted** where allowed → defined per-shape defaults in validation/renderer docs (e.g. pane default **`axis`** if ever needed — preferably require explicit state for **`pane`** to avoid ambiguity).

---

## 5. Proposed `VoxelBlockState` model

**Goal:** One optional **`state`** bag that grows (facing, hinge, connections, …) **without** new **`blockTypeId`** strings per variant.

**First-slice field usage:**

| `shapeKind` | Required / optional state | Notes |
|-------------|---------------------------|--------|
| **`cube`** | none | Legacy; ignore **`state`** if present (validation may strip or warn). |
| **`slab`** | **`half`** required (`top` / `bottom`) | Half-height cuboid inside cell. |
| **`pane`** | **`facing`** **or** **`axis`** — pick **one** convention in implementation (recommend **`axis`** **`x` \| `z`** for vertical glass sheets aligned to grid; **`facing`** if matching Minecraft cardinal semantics later). | Thin vertical slab; document chosen rule in code comments. |
| **`post`** | none | Centered narrow cuboid; optional **`variant`** later for thickness. |

**Hard rule:** **`state` must not participate in coordinate identity.** Uniqueness = **`(x, y, z)`** only (see §6).

---

## 6. Coordinate and occupancy rule

**Rule:** **Exactly one `VoxelBlock` row per occupied lattice cell `(x, y, z)`** for structures that participate in **`mergePlacements`** and **`analyzeVoxelStructure`**.

**Optional `shapeKind` / `state`** only change **rendered geometry inside the cell**, not **whether the cell is occupied** or **which integer coordinates** belong to the structure.

**Duplicate detection & generator merge:** Continue keying by **`x, y, z`** (e.g. **`${x},${y},${z}`**). Two rows at the same coordinates remain invalid / merged-away behavior unchanged.

**Why this preserves reliability semantics:** **`structureAnalysis`** duplicate and connectivity graphs stay on **unique keys**; **`connectedComponentCount26 === 1`** and **`ungroundedBlockCount26 === 0`** remain defined on **occupied cells**, independent of whether a cell renders as a slab or pane. Generator tests that assume **`duplicateCoordinateCount === 0`** keep meaning **no double rows per cell**.

*(Future multi-cell features — e.g. tall doors spanning Y — would need a separate ADR; out of scope for this foundation slice.)*

---

## 7. Registry metadata direction

**Longer term**, definitions should support:

- material **family**, texture **role**, **default shape**, **allowed shapes**, **tags**, **Minecraft compatibility** metadata.

**First implementation — smallest registry change:**

- **Prefer no mandatory registry schema change** for slice 1: **`blockTypeId`** still resolves to **textures + PBR flags** as today.
- **Recommendation (approach C — both):**
  - **A (placement):** **`shapeKind` / `state`** live on **`VoxelBlock`** — author/generator chooses placement shape.
  - **B (defaults / policy):** **`BlockTypeDefinition`** later gains optional **`allowedShapes?: VoxelBlockShapeKind[]`**, **`defaultShapeKind?: …`**, **`mcCompat?: …`** — **optional** in a follow-on PR so slice 1 stays thin.
  - **Resolution order:** placement **`shapeKind`** if present → else registry **`defaultShapeKind`** → else **`cube`**.

This avoids **`classic/oak_planks_slab`** ID proliferation while keeping **one handle** per material definition.

---

## 8. Renderer implications

**Minimum changes implied:**

1. **`cube`** — keep **`UNIT_BOX`** + current **`InstancedMesh`** path (**fast path**).
2. **`slab`** — **scaled **`BoxGeometry`**** (e.g. height **0.5**), **translated** so **`half`** sits correctly in the cell; still batchable via **`InstancedMesh`** if geometry + material set match.
3. **`pane`** — **thin **`BoxGeometry`**** along one horizontal axis; orientation from **`axis`** or **`facing`** per §5.
4. **`post`** — **narrow cuboid** centered in cell (fixed proportions v1).

**Batching:** **`groupBlocksByType`** becomes insufficient. Buckets should be something like **`blockTypeId + shapeKind + normalizedStateKey`** (e.g. hash or string key for **`half`**, **`axis`**) so each **`InstancedMesh`** shares **same geometry + six-face material assignment**.

**Non-goals in renderer for slice 1:** connection meshes, multi-pass transparency sorting beyond current transparent sort, skeletal animation.

---

## 9. Import/export and schema compatibility

**Blueprint v1 (`BLUEPRINT_JSON_FORMAT.md`):** Describes **authoring blueprint**, **not** **`VoxelBlock[]`**. **No breaking change** to v1 envelopes when **`VoxelBlock`** grows optional fields **if** exchange format stays blueprint-only.

**If later** a separate **structure JSON** or **preview snapshot** serializes blocks:

- **Non-breaking:** Omitting **`shapeKind`/`state`** means **cube**.
- **Forward-compatible:** Unknown **`shapeKind`** values → validation error or **preserve-as-unknown** JSON field policy (decide when that format exists).

**TypeScript / runtime:** `JSON.parse` of plain objects into **`VoxelBlock[]`** will need **narrowing/validation** when optional fields appear — **later**, when such IO exists.

---

## 10. Tests that should eventually be added (not written in this step)

- **Regression:** All **current generator reliability** tests pass **unchanged** on medieval tower output (still cubes only).
- **Defaults:** **`VoxelBlock`** without **`shapeKind`** renders / analyzes as **cube**.
- **Validation:** Invalid **`shapeKind`/`state`** combos rejected or dev-warning (policy TBD).
- **Duplicates:** **`analyzeVoxelStructure`** still flags duplicate rows by **`x,y,z`** only.
- **Renderer contract:** Grouping key includes **shape/state bucket** (unit or integration smoke).
- **Registry:** Existing **`getBlockDefinition`** entries remain valid; optional metadata tests when added.
- **Round-trip:** When structure serialization exists, optional **`shapeKind`/`state`** survives parse/stringify.

---

## 11. Explicit non-goals for the first implementation

- Full Minecraft block coverage or material-family taxonomy in registry.
- Minecraft schematic / datapack export.
- Connection-aware **fence** / **wall** meshes.
- Full **door** / **stair** / **trapdoor** behavior.
- New PNG generation or large asset pipeline rework.
- New **building families** or major **medieval tower** refactors.
- Rewriting **`filterGrounded`** or reliability **26-neighbor** rules (unless proven incompatible — unlikely for cube/slab/pane/post within one cell).

---

## 12. Recommended first implementation slice

1. **Types:** Extend **`VoxelBlock`** with optional **`shapeKind`** and **`state`** (`src/lib/voxel/types.ts`); add **`VoxelBlockShapeKind`** + **`VoxelBlockState`** types (or dedicated `voxelBlockShape.ts` if preferred).
2. **Validation helpers:** Small pure functions: **`normalizeVoxelBlock`**, **`assertValidShapeState`**, or validate inside viewer only for slice 1 — keep scope minimal.
3. **Renderer:** Refactor **`groupBlocksByType`** → **bucket by `(blockTypeId, shapeKind, stateKey)`**; implement **slab/pane/post** geometries; preserve **cube** path bit-identical where possible.
4. **Generator:** **Do not** change **`generateMedievalTower`** output in slice 1 (still cubes) so tests stay green without edits.
5. **Manual / tiny fixture:** **`sampleStructure.ts`** or a dev-only constant with **one slab, one pane, one post** beside cubes — verify visually + typecheck.
6. **Verification:** **`pnpm test:generator`**, **`pnpm exec tsc --noEmit`**, **`pnpm run build`** all pass.

---

## 13. Open questions

- **Optional vs resolved `shapeKind`:** Should omission mean **`cube`** always, or **`cube`** only when registry has no **`defaultShapeKind`**? (Recommendation: omission = **cube** for predictable migration.)
- **Pane convention:** Standardize on **`axis: x | z`** vs **`facing`** first to reduce renderer branches.
- **Validation ownership:** **`structureAnalysis`** stays dumb about shape; should **`validateVoxelStructure`** exist beside **`analyzeVoxelStructure`**?
- **Instancing:** One mesh per bucket vs dynamic geometry merging — performance vs simplicity for **`/visualizer`** large structures.
- **Import/export:** When structure JSON appears, **strict validate** vs **tolerant preserve unknown fields**?
- **Layer view / breakdown:** `layerView.ts`, **`fullStructureBlockBreakdown`** — slab/pane still occupy one **Y** layer; confirm UI assumes cell occupancy, not cube height only.

---

Scoping only — waiting for review before implementation.
