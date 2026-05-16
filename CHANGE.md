# Change log — Partial Block Model Foundation

## Branch

`milestone/generator-expansion`

## Files changed

| Area | Files |
|------|--------|
| Types | `src/lib/voxel/types.ts` — `VoxelBlockShapeKind`, `VoxelBlockState`, optional `shapeKind` / `state` on `VoxelBlock` |
| Shape helpers | `src/lib/voxel/voxelBlockShape.ts` — **new** normalization, validation, render variant, batch bucket key |
| Renderer | `src/components/voxel/VoxelViewer.tsx` — batch by `blockTypeId` + shape/state bucket; matrix scale/position per `VoxelRenderVariant` |
| Fixture | `src/lib/voxel/sampleStructure.ts` — **new** `SAMPLE_PARTIAL_BLOCK_FOUNDATION` |
| Analysis docs | `src/lib/voxel/structureAnalysis.ts` — comment that shape/state do not affect occupancy |
| Tests | `src/lib/voxel/__tests__/voxelBlockShape.test.ts` — **new** |

## Type / model summary

- **`blockTypeId`** remains the stable registry handle.
- **`shapeKind?: "cube" \| "slab" \| "pane" \| "post"`** — omitted ⇒ **cube** (legacy).
- **`state?: { half?: "top"|"bottom"; axis?: "x"|"z" }`** — **slab** requires **`half`**; **pane** requires **`axis`** (not `facing`); **cube** / **post** must not set conflicting fields.
- Occupancy, **`mergePlacements`**, and **`analyzeVoxelStructure`** remain keyed by **`(x,y,z)`** only.

## Renderer summary

- **`InstancedMesh`** still uses shared **`UNIT_BOX`**; **position + scale** encode slab/pane/post.
- **Batching key:** `getVoxelBlockRenderBucketKey` (`blockTypeId|cube`, `…|slab|bottom`, etc.).
- Invalid shape/state: dev **`console.warn`** and block skipped (no silent cube fallback).
- **No** new textures; materials still from existing **`BlockTypeDefinition`** per **`blockTypeId`**.

## Tests added

- **`voxelBlockShape.test.ts`:** normalization, validation rules, bucket keys, unknown `shapeKind`, **`analyzeVoxelStructure`** duplicate detection with differing **`shapeKind`/state** at same coordinates.

## Explicit confirmations

- **`generateMedievalTower`** and curated presets were **not** modified; tower output remains cube-only rows.
- **No** new texture files; **no** registry metadata expansion beyond existing definitions.
- Blueprint **v1** JSON exchange unchanged (still blueprint-only, no voxel dump).

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | **Passed** (28 tests, 5 files) |
| `pnpm exec tsc --noEmit` | **Passed** |
| `pnpm run build` | **Passed** (Next.js 16.2.6) |

## Follow-up (not this slice)

- Registry defaults / allowed shapes; doors, stairs, fences; generator adoption; optional structure serialization for shape/state.
