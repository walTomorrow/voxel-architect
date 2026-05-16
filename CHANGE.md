# CHANGE.md — Partial Block Showcase Preview

## Files changed

- `src/lib/voxel/sampleStructure.ts` — added **`PARTIAL_BLOCK_SHOWCASE_STRUCTURE`** (compact vignette); **`SAMPLE_PARTIAL_BLOCK_FOUNDATION`** comment updated to point at showcase.
- `src/lib/voxel/voxelBlockPlacement.ts` — **new** combined placement validators.
- `src/lib/voxel/__tests__/partialBlockShowcase.test.ts` — **new** Vitest coverage for showcase + placement failures.
- `src/components/voxel/StructureInspectionPanel.tsx` — optional **`previewSource`** toggle (**Preset towers** / **Partial block showcase**), **`panelDescription`**, preset placeholder in showcase mode, default title fallback.
- `src/app/preview/PreviewInspectionClient.tsx` — wires showcase vs generated presets; dev-only **`validateVoxelStructurePlacements`** guard in development.

## Showcase structure (`PARTIAL_BLOCK_SHOWCASE_STRUCTURE`)

Hand-authored **`VoxelBlock[]`** (~24 blocks): **`classic/cobblestone`** floor + slab/post; **`classic/oak_log`** corner posts + one cube column; **`classic/oak_planks`** slab trim (top + bottom halves); **`classic/limestone_bricks`** wall cube + slab; **`classic/glass`** panes (**x** and **z**) + cube; **`classic/slate_tiles`** top slab cap. Covers **cube**, **slab bottom/top**, **pane x/z**, **post** using only **annotated** material × shape pairs.

## Combined validation

- **`validateVoxelBlockPlacement(block)`** — runs **`validateVoxelBlockShapeState`** then **`validateVoxelBlockMaterialShape`**; errors prefixed with **`(x,y,z) pack/local`** and labeled **`shape/state`** vs **`material/shape`**.
- **`validateVoxelStructurePlacements(structure)`** — aggregates per-block failures. Does **not** replace underlying helpers or change **`analyzeVoxelStructure`**.

## Tests added (`partialBlockShowcase.test.ts`)

Non-empty showcase; presence of all shape variants; per-block **`validateVoxelBlockShapeState`**, **`validateVoxelBlockMaterialShape`**, **`validateVoxelBlockPlacement`**; full-structure placement ok; **`analyzeVoxelStructure`** duplicate count **0**; registry resolution for all ids; combined validator rejects **pane without axis** (structural) and **`oak_log` slab** (material).

## `/preview` UI

Small **Source** segmented control: **Preset towers** (unchanged — blueprint → **`generateStructureFromResolved`**) vs **Partial block showcase** (static **`PARTIAL_BLOCK_SHOWCASE_STRUCTURE`** → **`VoxelViewer`** with **`boundsStructure`**). Showcase mode replaces preset `<select>` with a short note; title/description clarify developer inspection. Layer modes + breakdown still apply to the visible structure.

## Explicit confirmations

- **`/visualizer`**: **not** modified.
- **Generator output / presets / blueprint validation / `generateStructure`**: **not** modified; towers remain cube-only.
- **Textures**: none added, removed, renamed, or generated.
- **Landing `VoxelPreviewPanel`**: unchanged (still default **`SAMPLE_STRUCTURE`**).

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — 7 files, 46 tests |
| `pnpm exec tsc --noEmit` | Pass — exit code 0 |
| `pnpm run build` | Pass — Next.js 16.2.6 |
