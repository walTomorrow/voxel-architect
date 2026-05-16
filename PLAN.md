# Plan — Partial Block Showcase Preview

## 1. Purpose

The next incremental step should be a **small visual preview**, not a new texture set or building family. Adding textures or generators before we have confidence in partial geometry would obscure whether problems come from assets, metadata, or rendering.

This preview exists to **prove**, with existing classic textures only:

- Registered materials still read well when scaled and positioned as **slabs, panes, and posts** (not only full cubes).
- **`shapeKind` / `state`** produce **correct, inspectable** variants (top vs bottom slab, pane **x** vs **z**).
- Companion **material metadata** lines up with what we actually place (annotated materials only use allowed shapes).
- **`VoxelViewer`** batching via **`getVoxelBlockRenderBucketKey`** remains sound when multiple shape/state buckets exist for the same **`blockTypeId`**.

Once this is trustworthy, follow-on work (more textures, generators emitting partials, export) can proceed with a clearer signal.

## 2. Current foundations available

The codebase already provides:

- **`VoxelBlock`** optional **`shapeKind`** and **`state`** (`src/lib/voxel/types.ts`): **`cube` | `slab` | `pane` | `post`**, with slab **`half`** and pane **`axis`**.
- **Structural validation**: **`validateVoxelBlockShapeState`** (`src/lib/voxel/voxelBlockShape.ts`) — required fields per shape, rejects nonsense **`state`** on cubes/posts.
- **Rendering**: **`VoxelViewer`** (`src/components/voxel/VoxelViewer.tsx`) resolves **`getVoxelBlockRenderVariant`**, applies scale/offset per variant, buckets instances by **`getVoxelBlockRenderBucketKey`**, skips invalid blocks in dev with a console warning (acceptable safety net, **not** a substitute for upstream validation).
- **Material metadata**: **`CLASSIC_MATERIAL_META`** (`src/lib/voxel/blocks/packs/classicMaterialMeta.ts`) partial map by classic **local** keys; **`getMaterialMetaForBlockTypeId`**, **`isShapeAllowedForBlockType`**, **`validateVoxelBlockMaterialShape`** (`src/lib/voxel/blocks/materialMetaHelpers.ts`). Unannotated classic blocks: **non-cube disallowed** by helpers; **cube** allowed if registered.
- **Sample data**: **`SAMPLE_STRUCTURE`** — procedural **cube-only** tower (`src/lib/voxel/sampleStructure.ts`). **`SAMPLE_PARTIAL_BLOCK_FOUNDATION`** — minimal inline row of cube / slab(bottom) / pane(**x**) / post on **cobblestone** only; comment states it is **not wired to the default viewer** (manual/tests).
- **Generators**: **`generateMedievalTower`** and pipeline output remain **cube-shaped placements**; **no** requirement to change them for this slice.
- **Tests**: **`pnpm test:generator`** runs **`vitest run`** (`package.json`) — generator reliability tests plus voxel unit tests; must stay green after implementation.

## 3. Preview scope

**Audience:** internal developer inspection — prove rendering + metadata alignment, not a product feature.

**Content:** one hand-authored **`VoxelBlock[]`** (exported as a **`VoxelStructure`** constant) using **only**:

- Registered **`classic/...`** **`blockTypeId`** values from the existing pack.
- Supported shapes/states: **cube**, **slab bottom**, **slab top**, **pane axis x**, **pane axis z**, **post**.

**Material usage** should stick to **annotated** companion-metadata combinations (adjust names if the codebase differs — today these locals exist in **`classic.ts`**):

| Material (`classic/...`) | Allowed shapes for this preview |
|-------------------------|----------------------------------|
| `oak_planks` | cube, slab, post |
| `oak_log` | cube, post |
| `cobblestone` | cube, slab, post |
| `limestone_bricks` | cube, slab, post |
| `glass` | cube, pane |
| `slate_tiles` | cube, slab |

**Out of scope for the structure itself:** decorative block types without metadata rows used as non-cube placements (would fail material validation), arbitrary unsupported shapes, or generator-produced layouts.

## 4. Proposed preview composition

Prefer one **compact, readable vignette** (dozens of blocks, not hundreds), not an isolated unit-test row and not a full building.

Illustrative layout (coordinates flexible at implementation time):

- **Base:** a few **`cobblestone`** cubes forming a small footprint pad.
- **Corner / vertical accents:** **`oak_log`** **posts** at corners or short columns.
- **Trim:** **`oak_planks`** **slabs** (mix **top** and **bottom**) along an edge or sill height.
- **Wall sample:** **`limestone_bricks`** **cubes** plus one **slab** course to show masonry + partial thickness together.
- **Openings:** **`glass`** **panes** with both **`axis: "x"`** and **`axis: "z"`** so thin-wall direction is obvious.
- **Roof / cap:** **`slate_tiles`** **slabs** (e.g. **top** half) as a small cap or shallow pitch hint — **cubes** optional for contrast.

Goal: orbit once and see **every supported variant** and **multiple materials**, without mistaking the scene for **`generateMedievalTower`** output.

## 5. Where to expose it

**Inspect findings:**

- **`/visualizer`** (`VisualizerClient.tsx`): blueprint edit → **`validateBlueprint`** → **`generateStructureFromResolved`**. The viewer always reflects **generated** output from the current blueprint. Adding a showcase mode here risks **confusing or disrupting** the primary lab workflow unless carefully isolated.
- **`/preview`** (`PreviewInspectionClient.tsx`): **read-only** medieval **preset** inspection — same **`VoxelViewer`** + layer tools, **no** blueprint JSON/editor. Already positioned as inspection, not authoring.
- **Home / marketing preview:** **`VoxelPreviewPanel`** uses **`VoxelViewer`** with **default `SAMPLE_STRUCTURE`** only (`page` composition). Swapping that to partial blocks would change **public-facing** landing behavior — avoid without an explicit product decision.
- **Package scripts:** no separate **`test:visual`** or E2E; verification remains **`pnpm test:generator`**, **`tsc`**, **`pnpm run build`**.

**Recommendation (single approach):** expose the showcase through **`/preview`**, not **`/visualizer`**.

- Add a **minimal source switch** on the preview page (e.g. segmented control or secondary select): **“Preset towers”** (current behavior) vs **“Partial block showcase”** (static exported constant).
- When showcase is selected, pass the static **`VoxelStructure`** into **`VoxelViewer`** (and **`boundsStructure`**), bypassing **`generateStructureFromResolved`** for that mode only.
- Label the showcase option clearly as **developer / partial-shape inspection** so it is not mistaken for a curated medieval preset.

This preserves **`/visualizer`** as the uninterrupted blueprint → generator path, avoids replacing **`MEDIEVAL_TOWER_PRESETS`**, and reuses an existing inspection shell (**`StructureInspectionPanel`** may need a slim branch for “no preset” when showcasing static data — implementation detail).

**Fallback** if product owners want **`/preview`** strictly preset-only: add a sibling route (e.g. **`/preview/partial-showcase`**) that renders only the showcase + viewer, with no preset selector — still avoids touching **`/visualizer`**.

## 6. Validation behavior for preview blocks

The preview must **not** depend on the renderer skipping bad blocks for correctness.

For **every** block in the exported showcase structure:

1. **`validateVoxelBlockShapeState(block)`** — structural validity (**half** / **axis** rules).
2. **`validateVoxelBlockMaterialShape(block)`** — semantic validity (material allows normalized shape).

There is **no** combined helper yet; **`materialMetaHelpers`** explicitly notes combining both for generators later.

**Implementation recommendation:** add a small pure helper, e.g. **`validateVoxelBlockPlacement(block)`** (name TBD), returning **`{ ok: true } | { ok: false; errors: string[] }`** that:

- Runs **`validateVoxelBlockShapeState`**; if not ok, return those errors (optionally prefixed).
- If shape ok, runs **`validateVoxelBlockMaterialShape`**; merge failures.

Optionally add **`validateVoxelStructurePlacements(structure)`** that maps over **`blocks`** and aggregates errors with coordinates for clearer test failures. Keep **orthogonal** responsibilities inside existing functions; the combined helper is **convenience only**.

At runtime (preview client), optionally **`console.assert`** or dev-only guard in development — product requirement is **tests** proving the constant is valid (see §7).

## 7. Tests to add during implementation

(No tests written during planning; list for the implementation PR.)

- Showcase export defines **at least one** instance of each required variant: cube, slab bottom, slab top, pane x, pane z, post.
- Every showcase block passes **`validateVoxelBlockShapeState`**.
- Every showcase block passes **`validateVoxelBlockMaterialShape`**.
- **`analyzeVoxelStructure`** (or equivalent) reports **no duplicate coordinates** for the showcase list (same rule as generator occupancy).
- Every **`blockTypeId`** resolves via **`getBlockDefinition`** (only registered classic ids).
- Combined placement helper (if added): rejects deliberate fixtures where one of the two validators fails.
- **`pnpm test:generator`** (full Vitest suite) still passes — no regression to generator reliability tests.

**Explicitly out:** Playwright, screenshot baselines, browser-based regression.

## 8. Texture policy

- **Do not** add, delete, rename, or procedurally generate texture files.
- **Reuse** only existing **`classic`** pack textures already referenced by **`CLASSIC_BLOCK_PACK`**.
- The showcase is partly **diagnostic**: which surfaces look wrong on thin geometry informs **future** texture work — **after** this preview validates the pipeline.

## 9. Non-goals

- New building family or curated preset replacing medieval towers.
- Changes to **`generateMedievalTower`**, **`generateStructure`** dispatch, blueprint schema, or **`validateBlueprint`** behavior for production towers.
- Minecraft export or pack interchange.
- Expanding **`CLASSIC_MATERIAL_META`** beyond what the showcase needs (can stay minimal).
- Asset pipeline cleanup, normal maps, or texture variants.
- Screenshot / visual regression automation.
- Marketing polish, SEO copy, or treating the showcase as a flagship demo.
- New shapes (**doors, stairs, fences, walls, plants, lanterns**, …).

## 10. Recommended implementation slice

Concrete order of work:

1. **Author `PARTIAL_BLOCK_SHOWCASE_STRUCTURE`** (name TBD) in **`sampleStructure.ts`** (or a sibling module if file grows), replacing or superseding **`SAMPLE_PARTIAL_BLOCK_FOUNDATION`** as the canonical multi-material demo — keep the old constant only if tests still reference it, otherwise deprecate inline comment.
2. **Add `validateVoxelBlockPlacement`** (+ optional structure-level aggregator) in **`voxelBlockShape.ts`** or adjacent pure module, composing **`validateVoxelBlockShapeState`** and **`validateVoxelBlockMaterialShape`** without blurring their responsibilities.
3. **Add Vitest tests** that freeze showcase invariants (§7) and cover the combined validator on a tiny invalid fixture.
4. **Wire `/preview`** with the source toggle (§5) and pass the showcase **`VoxelStructure`** into **`VoxelViewer`**; avoid changing **`/visualizer`** blueprint flow.
5. **Do not** change generator outputs or presets for this slice.
6. **Verify:** `pnpm test:generator`, `pnpm exec tsc --noEmit`, `pnpm run build`.

## 11. Risks and open questions

- **`/visualizer` vs `/preview`:** Any showcase UI mistakenly added to **`/visualizer`** could confuse “generated vs static” — mitigate by keeping **`/visualizer`** strictly blueprint-driven.
- **Public vs internal:** **`/preview`** may still be reachable publicly; if that is undesirable, gate behind **`process.env.NODE_ENV === "development"`**, a query flag, or a dedicated low-traffic route — decide with maintainers.
- **Sample confusion:** Clear labeling (“Partial shapes · dev showcase”) reduces mistaking static geometry for **tower generator** output.
- **Transparency:** **`glass`** panes may show sorting/depth artifacts; note findings but do not expand scope to fix Three.js transparency in this slice unless blocking.
- **Slab readability:** top vs bottom halves may be subtle from certain angles; composition should include **adjacent cubes** or **height offsets** so the difference is visible.
- **Metadata enforcement scope:** preview validates aggressively in **tests**; generators remain unchanged until a later milestone intentionally combines validators **before emit**.
- **`StructureInspectionPanel`:** preset-centric UI may need empty/disabled preset state when showcase mode is active — avoid throwing away layout/debug value.

---

Scoping only — waiting for review before implementation.
