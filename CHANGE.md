# CHANGE.md — Material families & texture roles (companion metadata)

## Files changed

- `src/lib/voxel/blocks/materialMetaTypes.ts` — **new** (`MaterialMeta`, `MaterialGroup`, `TextureRole`, optional `minecraftCompatibility`)
- `src/lib/voxel/blocks/packs/classicMaterialMeta.ts` — **new** (`CLASSIC_MATERIAL_META` partial map by classic **local** keys)
- `src/lib/voxel/blocks/materialMetaHelpers.ts` — **new** (pure lookup / validation helpers)
- `src/lib/voxel/__tests__/materialMetaHelpers.test.ts` — **new** (Vitest coverage)
- `CHANGE.md` — this report (overwrite)

## Metadata types

- **`MaterialMeta`**: `materialFamily` (string), `materialGroup`, `textureRole`, `allowedShapeKinds`, optional `tags`, optional `minecraftCompatibility` (`exact` | `approximate` | `composed` | `unsupported` + optional notes).
- **No `defaultShapeKind`** in this slice; omitted `shapeKind` still defaults to **`cube`** only via existing **`normalizeVoxelBlockShapeKind`**.

## Curated classic locals annotated

Keys match `classic.ts` exactly:

| Local key | Allowed shapes |
|-----------|------------------|
| `oak_planks` | cube, slab, post |
| `oak_log` | cube, post |
| `cobblestone` | cube, slab, post |
| `limestone_bricks` | cube, slab, post |
| `glass` | cube, pane |
| `slate_tiles` | cube, slab |

All other classic blocks: **no row** → helpers use **cube-only** fallback for non-cube shapes.

## Helpers (`materialMetaHelpers.ts`)

- **`getClassicMaterialMeta(localKey)`** — row from companion map or `undefined`.
- **`getMaterialMetaForBlockTypeId(blockTypeId)`** — classic pack only; returns `undefined` elsewhere.
- **`isShapeAllowedForBlockType(blockTypeId, shapeKind)`** — **`cube`** iff registry definition exists; non-cube iff metadata lists the shape; unknown IDs never throw (non-cube false; cube false if no definition).
- **`validateVoxelBlockMaterialShape(block)`** — material × shape semantics only; does **not** replace **`validateVoxelBlockShapeState`** (axis/half etc.).

## Tests (`materialMetaHelpers.test.ts`)

Covers: oak_planks / oak_log / glass / slate_tiles shape allowances; unannotated **`andesite`** cube-only for partials; unknown **`classic/__nonexistent_block__`**; allowed vs disallowed **`validateVoxelBlockMaterialShape`**; glass pane **without** axis → material OK, **`validateVoxelBlockShapeState`** still fails.

## Explicit non-goals (confirmed)

- **`BlockTypeDefinition` / `CLASSIC_BLOCK_PACK`**: **not** modified.
- **Generators** (`generateMedievalTower`, presets, blueprint validation, structure dispatch): **not** modified; output unchanged.
- **Textures**: none added, removed, renamed, or generated.
- **Renderer (`VoxelViewer`)**: **not** modified.
- Metadata **not** wired into generation (helpers/tests only).

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — 6 files, 37 tests |
| `pnpm exec tsc --noEmit` | Pass — exit code 0 |
| `pnpm run build` | Pass — Next.js 16.2.6 production build |

## Follow-up

- Generator-side correctness should eventually combine **`validateVoxelBlockShapeState`** + **`validateVoxelBlockMaterialShape`** before emitting partial blocks.
