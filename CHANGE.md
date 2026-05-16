# CHANGE.md — Revert medieval tower window trim slabs (full cube trim)

## Files changed

- `src/lib/generation/generators/generateMedievalTower.ts` — Removed **`accentTrimSlabPartial`**. Window-adjacent **`PRI.FACADE_TRIM`** (cells **`yy ± 1`** relative to glass) always uses legacy **cube** placements (**no** `shapeKind` / **no** `state`). Short comment documents visual rationale (half slabs next to thin pane glass showed awkward gaps). **Pane** windows unchanged (`shapeKind: "pane"`, axis logic unchanged).
- `src/lib/generation/__tests__/generatorWindowPanes.test.ts` — Trim tests now assert **no** `shapeKind === "slab"` on default preset + **`oak_log`** accent clone; removed helper/unit tests for deleted **`accentTrimSlabPartial`**.
- `src/lib/voxel/__tests__/materialMetaHelpers.test.ts` — Renamed **andesite** test label so it describes metadata only (generator no longer emits trim slabs).
- `docs/generation/GENERATOR_RELIABILITY.md` — Placement-semantics wording no longer claims façade-trim slabs from medieval tower; table row updated.

## Visual issue fixed

Half **slab** trim immediately above/below **pane** windows looked wrong (visible gaps); trim is **full cube** again at the same lattice coordinates.

## Material metadata

**Kept** prior **`classicMaterialMeta.ts`** extensions (**limestone**, **mudstone**, **andesite**, **schist** with **`allowedShapeKinds`** including **`slab`**). Harmless for generators that do not emit slabs; **`materialMetaHelpers`** tests still valid.

## Generator slab emission

Medieval tower generator **does not** emit **`shapeKind: "slab"`** from window-adjacent façade trim (or elsewhere in this generator path after this change).

## Confirmations

- **Pane windows:** unchanged (axis + metadata gating).
- **Posts:** not adopted.
- **New slab locations:** none added.
- **UI:** **`/preview`**, **`/visualizer`** untouched.
- **Blueprint schema / import-export / curated presets:** unchanged.
- **Textures / assets:** none added or generated.
- **`structureAnalysis`:** semantics unchanged.

## Tests

- **`generatorWindowPanes.test.ts`**: default preset — **`validateVoxelStructurePlacements`** via **`assertGeneratedStructurePlacementSemantics`**, **no slabs**, panes present, no duplicate coords; **`oak_log`** accent — no slabs; pane Phase A tests unchanged.
- Preset + edge-case invariant suites exercised by **`pnpm test:generator`**.

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — **8** files, **54** tests |
| `pnpm exec tsc --noEmit` | Pass (exit **0**) |
| `pnpm run build` | Pass — Next.js **16.2.6** |
