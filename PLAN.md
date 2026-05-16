# Plan — Safe Partial Block Adoption in Medieval Tower Generator

## 1. Purpose

The stack already has: partial **`shapeKind` / `state`** on **`VoxelBlock`**, renderer support for **cube / slab / pane / post**, companion **`CLASSIC_MATERIAL_META`**, **`validateVoxelBlockPlacement`**, **`/preview`** partial showcase, and tests that prove hand-authored placements are valid.

The **next** increment is to show that the **deterministic medieval tower generator** can emit a **small, controlled** set of partial shapes **without** blueprint churn, new assets, or new building families—so future work (more shapes, connection-aware blocks per **`docs/blocks/BLOCK_SYSTEM_BACKLOG.md`**, texture packs, export) builds on **generator-enforced** correctness, not only viewer fallbacks.

This slice is intentionally **narrow**: prove safe emission and keep **generator reliability tests** meaningful—not a full visual redesign.

**Reference context:** [`docs/blocks/BLOCK_SYSTEM_BACKLOG.md`](docs/blocks/BLOCK_SYSTEM_BACKLOG.md) records deferred items (connection-aware fences/walls/bars/panes, richer validation policy, texture expansion, Minecraft compatibility). This plan **does not** implement those backlog items; it should stay aligned with them so manual axis-from-wall panes are **not** mistaken for future neighbor-derived connection logic.

---

## 2. Current generator behavior

**Pipeline:** [`validateBlueprint()`](src/lib/blueprints/validateBlueprint.ts) resolves semantic classic keys to **`BlockTypeId`**s → [`generateStructureFromResolved`](src/lib/generation/generateStructure.ts) dispatches → [`generateMedievalTower`](src/lib/generation/generators/generateMedievalTower.ts) returns **`VoxelBlock[]`** (today **cube-only**: **`mergePlacements`** emits `{ x, y, z, blockTypeId }` only).

**Merge model:** Placements carry priority **`p`** and insertion index **`i`**. [`mergePlacements`](src/lib/generation/generators/generateMedievalTower.ts) sorts by **descending `p`**, then **`i`**, keeps **first per `(x,y,z)`**. Higher priority wins.

**Representative priorities** (abbreviated): foundation → interior floor → wall → roof → façade trim → corner pillar → corner capstone → **window** → portal accent → entrance arch → door → parapet → merlon.

**Windows:** [`buildWindowGlassSet`](src/lib/generation/generators/generateMedievalTower.ts) collects lattice keys for glass cells on exterior shells (respecting hollow interior, door aperture, corners, floor bands). Main body loop places **`m.window`** at **`PRI.WINDOW`** (50), else **`m.wall`** at **`PRI.WALL`** (30).

**Façade trim:** After the body loop, for each window glass key, optional **`PRI.FACADE_TRIM`** (**44**) placements add **`m.accent`** at **`yy ± 1`** on the shell (sill/lintel neighbors), guarded by [`shellCell`](src/lib/generation/generators/generateMedievalTower.ts) and door aperture.

**Entrance:** Portal jambs/lintel (**`PRI.PORTAL_ACCENT`**), door row (**`PRI.DOOR`**), optional arch voxels (**`PRI.ENTRANCE_ARCH`**), all **`m.accent`** or **`m.door`**.

**Roof / crown:** Flat or stepped pyramid **`m.roof`** (**`PRI.ROOF`**); parapet (**`PRI.PARAPET`**) and optional merlons (**`PRI.MERLON`**) use **`m.accent`**; corner capstones (**`PRI.CORNER_CAPSTONE`**) use **`m.accent`**.

**Coordinates:** Local **`lx, lz`** with **`ox = centerOrigin(W)`**, **`oz = centerOrigin(D)`**; world **`x = ox + lx`**, **`z = oz + lz`**. **Front** means **`lz === D - 1`**; **back** **`lz === 0`**; **left** **`lx === 0`**; **right** **`lx === W - 1`** ([`onFace`](src/lib/generation/generators/generateMedievalTower.ts)).

**structureAnalysis:** Still **occupancy-only** on **`(x,y,z)`**; **`shapeKind` / `state`** do not affect duplicates or connectivity ([`structureAnalysis.ts`](src/lib/voxel/structureAnalysis.ts), [`GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md)).

---

## 3. Candidate partial-block substitutions

| Candidate | Visual value | Risk | Metadata today | State | Duplicate risk |
|-----------|----------------|------|----------------|-------|----------------|
| **Glass panes** for window cells | Reads as thin glazing vs solid cube | Low if axis rule matches façade | **`classic/glass`** allows **pane** (presets resolve **`window`** → **`glass`**) | **`axis: "x" \| "z"`** | **Replace** same cell as current window cube → **no new coords** |
| **Accent slabs** for façade trim above/below windows | Subtle sill/lintel | Medium: wrong **`half`** looks muddy; **accent** keys often **unannotated** | Presets use **`limestone`**, **`mudstone`**, **`andesite`**, **`schist`** etc.—**not** in **`CLASSIC_MATERIAL_META`** today (**cube-only** fallback) | **`half: "top" \| "bottom"`** | **Replace** existing trim cubes → **no new coords** if same algorithm keys |
| **Accent / wall slabs** for roof parapet or flat roof cap | Possible crown read | Higher: competes with **roof** priority (**40** vs parapet **56**—usually OK); materials **`m.roof`** may be **slate_tiles** (**slab** ok) or unannotated | **Roof** / **accent** IDs vary by blueprint | **`half`** | Replacing cubes only—avoid stacking second block in same cell |
| **Posts** for portal jambs or corner accents | Strong vertical read | Higher collision risk with door/arch priorities; user preference: **defer** | **`oak_log`** allows **post**; generator rarely uses **oak_log** for jambs today (**accent** cubes) | none | Same-cell **replace** possible but **material** (`m.accent`) usually **not** post-annotated |

**Connection-aware panes** (neighbor-derived) are **explicitly out of scope**—see backlog § connection-aware blocks.

---

## 4. Recommended first adoption scope

**Recommendation:** **Phase A — windows only**

- For each lattice cell that today receives **`PRI.WINDOW`** + **`m.window`**, emit **`shapeKind: "pane"`** + appropriate **`state.axis`**, **only if** material allows **`pane`**; otherwise keep **full cube** (backward-compatible).
- **Defer** façade-trim slabs, roof/parapet slabs, and **posts** until either:
  - **`CLASSIC_MATERIAL_META`** is extended for the **actual** accent keys used by curated presets / common imports, **or**
  - trim/slab logic is gated strictly on **`isShapeAllowedForBlockType(m.accent, "slab")`** (meaning **most** current presets would **stay cube trim** until metadata catches up).

This matches the stated preference: **glass panes first**, **slabs only if placement points are clean**—trim points exist, but **metadata** on **`limestone`** / **`mudstone`** / etc. is **not** clean today without a **small metadata extension slice** (allowed as a **separate** commit before or after pane adoption, **not** mixed with connection-aware work).

**Phase B (optional follow-up commit):** façade-trim **slabs** **replacing** existing accent cubes **above/below** windows, with explicit **`half`** rules (§6), gated on metadata.

**Defer:** posts for entrances, parapet/roof slab refactors, any change that touches **`PRI.DOOR`** / arch overlap logic without a dedicated review.

---

## 5. Pane orientation rules

**Goal:** Pane thickness lies **in-plane with the wall normal** conceptually: façade lies in a plane constant in **`lx`** or **`lz`**.

**Concrete rule (verify in implementation against [`isExterior`](src/lib/generation/generators/generateMedievalTower.ts)):**

- If **`lz === 0`** or **`lz === D - 1`** (front/back façades): **`state.axis = "x"`**  
  (Wall plane spans **X × Y**; thin extent aligns with **world Z**.)

- If **`lx === 0`** or **`lx === W - 1`** (left/right façades): **`state.axis = "z"`**  
  (Wall plane spans **Z × Y**; thin extent aligns with **world X**.)

**Corners:** Window placement already excludes corners (**`isCorner`**); no ambiguous axis choice for window columns.

**Alignment with user-facing compass language:** Treat **front/back** (∓**Z** façades) like **“north/south-facing walls → axis `x`”**, and **left/right** (∓**X** façades) like **“east/west-facing → axis `z`”**, modulo your external compass convention—the **code truth** is **`lx/lz` vs `W/D`** above.

**Backlog separation:** These axes are **generator-authored hints**, not **connection-resolved** pane geometry (backlog: connection-aware panes).

---

## 6. Slab placement rules (Phase B only)

If façade trim slabs are adopted **after** pane Phase A:

- **Material:** Keep **`m.accent`** (same **`blockTypeId`** as today’s trim cubes)—**replace cube with slab** at the **same `(x,y,z)`**, never add a second block in the cell.
- **`half`:**
  - Cell **below** the glass stack (**sill** neighbor): prefer **`bottom`** (lower half fills “ledge” read toward ground).
  - Cell **above** the glass stack (**lintel** neighbor): prefer **`top`**.
- **Collision:** Trim pushes **must remain** lower priority than **window** on glass cells (already separate **`y`**). Watch **portal accent** / **arch** overlaps on the entrance face—**do not** introduce slabs without checking **`mergePlacements`** ordering for those **`lx,lz,y`** keys.
- **Metadata gate:** Emit slab **only** when **`isShapeAllowedForBlockType(m.accent, "slab")`** is true; otherwise leave **cube**.

---

## 7. Material compatibility

**Window → pane**

- Curated presets and edge-case fixtures resolve **`materials.window`** to **`classic/glass`** ([`sampleBlueprints`](src/lib/blueprints/sampleBlueprints.ts), [`edgeCaseBlueprints`](src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts)).
- **`glass`** is annotated with **`allowedShapeKinds`** including **`pane`** ([`classicMaterialMeta.ts`](src/lib/voxel/blocks/packs/classicMaterialMeta.ts)).
- **Blueprint reality:** Any **`CLASSIC_BLOCK_PACK`** key is allowed for **`materials.window`** ([`resolveMaterial`](src/lib/blueprints/validateBlueprint.ts)). If **`window`** were **`oak_leaves`** or **`oak_planks`**, **`pane`** would be **disallowed** by metadata—implementation **must** fall back to **cube** (or skip pane) so **`validateVoxelBlockPlacement`** never fails on valid blueprints.

**Trim → slab (Phase B)**

- Presets commonly use **`accent: "limestone"`**—maps to **`classic/limestone`**, which is **not** currently annotated (**cube-only** metadata fallback).
- **`limestone_bricks`**, **`cobblestone`**, **`slate_tiles`** **are** slab-annotated—generator **does not** use those keys for accent unless the blueprint says so.

**Conclusion**

- **Pane adoption** does **not** require metadata expansion **if** pane emission is **`glass`**-compatible or gated by **`isShapeAllowedForBlockType(m.window, "pane")`**.
- **Trim slab adoption** almost certainly requires either **annotating** common accent locals (**`limestone`**, **`mudstone`**, **`andesite`**, **`schist`**, …) with **conservative** **`allowedShapeKinds`** (**slab** only where acceptable), **or** accepting **no trim slabs** for most presets until that lands.

**No new textures or `CLASSIC_BLOCK_PACK` entries** in this milestone slice.

---

## 8. Validation strategy

**Do not rely on [`VoxelViewer`](src/components/voxel/VoxelViewer.tsx) skip/warn** for correctness ([`BLOCK_SYSTEM_BACKLOG.md`](docs/blocks/BLOCK_SYSTEM_BACKLOG.md) § render safety).

**Required checks on generator output:**

1. **`validateVoxelBlockShapeState`** per block (or **`validateVoxelBlockPlacement`**).
2. **`validateVoxelBlockMaterialShape`** per block (or **`validateVoxelBlockPlacement`**).
3. Structure-level aggregation: **`validateVoxelStructurePlacements`** ([`voxelBlockPlacement.ts`](src/lib/voxel/voxelBlockPlacement.ts)).

**Where to hook tests**

- Extend **[`testUtils.ts`](src/lib/generation/__tests__/testUtils.ts)** with something like **`assertGeneratedPlacementSemantics(blocks)`** calling **`validateVoxelStructurePlacements`**, **or** add the assertion inline in preset + edge-case loops—keep diagnostics readable (`formatGeneratorInvariantDiagnostics` style).

**structureAnalysis:** Continue to assert **duplicate coordinates**, **registry IDs**, **connectivity**, **grounding** unchanged ([`GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md)). Partial shapes remain **one block per cell**; occupancy semantics unchanged.

---

## 9. Test plan

| Area | Intent |
|------|--------|
| **Preset invariants** | Existing [`generatorPresetInvariants.test.ts`](src/lib/generation/__tests__/generatorPresetInvariants.test.ts) still pass |
| **Edge-case invariants** | Existing [`generatorEdgeCaseInvariants.test.ts`](src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts) still pass |
| **Placement semantics** | After `generateStructureFromResolved`, **`validateVoxelStructurePlacements(...).ok`** for every preset + edge-case fixture |
| **Duplicates / registry** | Still enforced via **`analyzeVoxelStructure`** + existing hard invariants |
| **At least one pane** | Assert **≥1** block with **`shapeKind === "pane"`** and valid **`state.axis`** for a preset known to have windows (e.g. default medieval preset or **`window_density_wide`**) — **or** conditional skip only when **`windowsPlacement === "none"`** / zero window cells |
| **No disallowed material/shape** | Covered by **`validateVoxelStructurePlacements`** if wired everywhere |
| **Blueprint surface** | No changes to [`MedievalTowerBlueprint`](src/lib/blueprints/types.ts), [`blueprintImportStructure`](src/lib/blueprints/blueprintImportStructure.ts), or import/export behavior |

**Avoid:** screenshot / browser tests.

---

## 10. Visual inspection plan

- **`/preview` → Partial block showcase:** sanity-check renderer behavior for panes/slabs independent of the tower.
- **`/preview` (preset towers)** and **`/visualizer`:** inspect **before/after** window façades (orbit same preset); panes should read thinner and slightly **different** silhouette—expect **style shift**, not “wrong mesh.”
- Optional: capture informal screenshots for PR discussion—**not** automated regression.

---

## 11. Non-goals

- New textures, generated assets, or **`CLASSIC_BLOCK_PACK`** edits  
- New building families  
- Connection-aware fences / walls / bars / panes (see backlog)  
- Doors / stairs / plants / lanterns / signs as new **shapeKind**s  
- Minecraft export  
- Blueprint schema / preset JSON / import-export format changes  
- Large tower visual redesign  
- Visual regression infrastructure  
- **`mergePlacements`** priority overhaul without cause  

---

## 12. Recommended implementation slice (next coding prompt)

Single-reviewable commit sequence:

1. **Extend internal placement record + [`mergePlacements`](src/lib/generation/generators/generateMedievalTower.ts)** to carry optional **`shapeKind` / `state`** into **`VoxelBlock`** (default **cube** behavior unchanged).
2. **Window cells only:** when emitting **`PRI.WINDOW`**, if **`isShapeAllowedForBlockType(m.window, "pane")`**, set **`pane`** + **`axis`** from §5; else legacy cube.
3. **Unit-level helper:** **`paneAxisForWindowCell(lx, lz, W, D)`** (pure) + brief comment referencing façade conventions.
4. **Tests:** **`validateVoxelStructurePlacements`** on all **`MEDIEVAL_TOWER_PRESETS`** + edge-case fixtures; assertion that some generated structure includes **≥1** pane where windows exist; keep **`assertGeneratedStructureHardInvariants`**.
5. **Docs (optional but small):** One paragraph in [`GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) noting **placement semantics** checks; optionally cross-link [`GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) § readability vs automated checks.

**Separate small PR (optional):** annotate **`limestone`**, **`mudstone`**, **`andesite`**, **`schist`** (conservative **`slab`** where desired) **before** Phase B trim slabs—or implement Phase B with strict metadata gating only.

**Do not** touch **`/visualizer`** wiring beyond whatever existing flows already do.

---

## 13. Risks and open questions

- **Visual shift:** Panes may look **more “open”** or expose interior emptiness differently than solid glass cubes—acceptable for Phase A but worth designer glance.  
- **Slab collisions:** Phase B trim slabs could interact oddly with **portal**, **arch**, or **corner** geometry if **`y`** keys overlap—needs careful diff review.  
- **Merge surprises:** Lower-priority partial could still lose if another placement shares a cell—always **replace**, don’t double-push.  
- **Unannotated materials:** Random **`window`** classic keys force **cube fallback**; tests should still pass.  
- **Test harness:** Reliability suite should stay fast; one **`validateVoxelStructurePlacements`** pass per fixture is cheap.  
- **Occupancy / connectivity:** **`analyzeVoxelStructure`** still treats each cell as occupied—**pane** does not create “holes” in lattice logic—interior void remains blueprint/generator responsibility.  
- **Interior readability:** More transparent windows may expose hollow-shell staging—note for [`GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) readability discussion, not this slice’s fix.  
- **Backlog hygiene:** Keep **`BLOCK_SYSTEM_BACKLOG.md`** connection-aware **pane** ideas separate from this **axis-from-wall** generator rule—implementation comments should say **“not connection-aware.”**

---

Scoping only — waiting for review before implementation.
