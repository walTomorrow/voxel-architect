# CHANGE.md — Medieval tower window panes (Phase A)

## Files changed

- `src/lib/generation/generators/generateMedievalTower.ts` — extended **`Placement`**, **`mergePlacements`**, **`push`**, window branch emits **`pane`** when metadata allows; exported **`paneAxisForWindowCell`**.
- `src/lib/generation/__tests__/testUtils.ts` — **`assertGeneratedStructurePlacementSemantics`** (`validateVoxelStructurePlacements`).
- `src/lib/generation/__tests__/generatorPresetInvariants.test.ts` — placement semantics assertion after hard invariants.
- `src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts` — same.
- `src/lib/generation/__tests__/generatorPipeline.smoke.test.ts` — placement semantics on smoke output.
- `src/lib/generation/__tests__/generatorWindowPanes.test.ts` — **new**: axis helper tests, pane emission, **`oak_planks`** window fallback.

## Placement / merge

- **`Placement`** optionally carries **`shapeKind`** / **`state`**.
- **`mergePlacements`** still merges on **`(x,y,z)`** only (sort unchanged); outputs **`VoxelBlock`** with optional partial fields.
- Omitted partial fields ⇒ legacy cube behavior.

## Window pane behavior

- Where **`windowGlass`** forces **`PRI.WINDOW`** + **`m.window`**: if **`paneAxisForWindowCell(lx,lz,W,D)`** is defined **and** **`isShapeAllowedForBlockType(m.window, "pane")`**, emit **`shapeKind: "pane"`** + **`state: { axis }`**; else emit cube (**no** **`shapeKind`**).

## Pane axis rule (`paneAxisForWindowCell`)

- **`lz === 0`** or **`lz === D - 1`** (non-corner ⇒ **`lx`** strictly interior on that edge): **`axis: "x"`**.
- **`lx === 0`** or **`lx === W - 1`** (non-corner): **`axis: "z"`**.
- Corners / ambiguous: **`undefined`** → cube fallback.
- Comment in source: **not** connection-aware (see backlog for future work).

## Tests

- All curated presets + edge-case fixtures: **`assertGeneratedStructurePlacementSemantics`**.
- **`generatorWindowPanes.test.ts`**: axis unit tests; default preset (**`northwatch`**) has **≥1** pane, **`axis`** ∈ **`x|z`**, **`isShapeAllowedForBlockType(..., "pane")`** on pane rows; cloned **`height_budget_body_clamp`** with **`window: oak_planks`** ⇒ **no** panes, placement validation still passes.

## Confirmations

- **Fallback:** non-pane-compatible **`m.window`** (e.g. **`oak_planks`**) keeps **cube** windows — tested.
- **Slabs / posts:** not added in generator.
- **UI:** **`/preview`**, **`/visualizer`**, **`VoxelViewer`**, **`StructureInspectionPanel`** unchanged.
- **Generator output:** **`shapeKind === "pane"`** only for window cells when material allows pane + axis resolved.
- **Textures:** none added/generated.
- **Blueprints / presets:** curated data unchanged; test-only clone mutates materials for fallback case.

## Verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — 8 files, 51 tests |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass — Next.js 16.2.6 |
