# Change log — Symmetric window bays + lab camera refit

## 1. Title of this milestone

**Medieval tower window rhythm fix** (deterministic façade bay selection) and **VoxelViewer orbit/zoom** tuned to structure bounds for the internal **`/visualizer`** lab.

---

## 2. Files changed

| File | Change |
|------|--------|
| `src/lib/generation/generators/generateMedievalTower.ts` | Removed **`y`**-dependent hash modulo; added **symmetric along-slot** selection, **`buildWindowColumnKeySet`**, and **`shouldPlaceWindowAt`** wired through **`buildWindowGlassSet`**. |
| `src/components/voxel/VoxelViewer.tsx` | **`LabOrbitRig`**: bbox from blocks (with **`GROUP_Y_SHIFT`**), dynamic **target / minDistance / maxDistance / polar limits / camera near-far**; **`voxelStructureLayoutKey`** to avoid refitting on unrelated re-renders; **`cameraResetNonce`** prop. |
| `src/app/visualizer/VisualizerClient.tsx` | **`cameraResetNonce`** state, **Refit camera** button, pass **`cameraResetNonce`** to **`VoxelViewer`**. |

---

## 3. Root cause of the window issue

- **`windowsPlacement: "symmetric"`** only meant “windows on all four sides,” **not** mirror-symmetric bays per façade.
- **`(lx * 5 + lz * 7 + y * 11) % stride`** mixed **`y`**, so the same **(lx, lz)** column could qualify on one floor and fail on the next → **broken vertical rhythm**.
- **`floor(slots / count)` + `u % step`** produced **off-center, sparse** columns for **`windowsCountPerSide === 2`** on **wide** façades; **Dark Wizard** looked fine mainly because **`countPerSide: 4`** collapsed **`step`** to **1**, masking the hash.

---

## 4. New window bay-selection logic

1. **`windowStyleStride(style)`** is the **minimum gap** (in voxel units along the façade) between selected **along** indices.
2. **`symmetricAlongSlots(lo, hi, requestedCount, minGap)`** tries **`requestedCount` → 1`**: **`tryPlaceSymmetricAlong`** places **center first** (odd counts), then **symmetric pairs** **`(ceil(center−d), floor(center+d))`** when **both** are valid, **each** is at least **`minGap`** from existing picks, and **the pair is separated by at least `minGap`** along the façade.
3. **`buildWindowColumnKeySet`** builds a **`Set<colKey(lx,lz)>`**:
   - **`front_only`**: only **front** face (`lz = D − 1`) gets **`slotsX`**.
   - **`symmetric`**: **front/back** use **`slotsX`**, **left/right** use **`slotsZ`** (square towers: same span logic on each axis).
4. **`shouldPlaceWindowAt`** requires **`windowColumnKeys.has(colKey(lx,lz))`**, **`windowFloorOk`**, exterior, not corner, placement side rule, and **`!inDoorAperture(lx,lz,y)`** so door columns can still host glass **above** the portal.
5. **`buildWindowGlassSet`** takes the predicate; **`isWindowColumnSeed`** uses the predicate only (no **`y`** hash).

---

## 5. Whether presets changed

**No.** All six **`MEDIEVAL_TOWER_PRESETS`** authoring objects unchanged.

---

## 6. Whether the schema changed

**No.**

---

## 7. Viewer navigation changes

- **Bounding box** of **`structure.blocks`** in the same space as the voxel **`group`** (**`y − GROUP_Y_SHIFT`** with **`GROUP_Y_SHIFT = 1.25`**).
- **Orbit target** → bbox **center**; **`maxDistance`** scales with **`~6.5 × maxDim`** (clamped **40–320**); **`minDistance`** scales (~**12%** of max dimension, clamped **2.4–14**).
- **`maxPolarAngle`** → **`π − 0.04`** (allows looking from **below** horizontal); **`minPolarAngle`** → **0.05**.
- **Camera** repositioned on fit along **`(1, 0.55, 1)`** direction; **`near` / `far`** scale with size.
- **`cameraResetNonce`**: **`Refit camera`** in **`/visualizer`** reruns the fit (and **`OrbitControls`** defaults are no longer fixed **`maxDistance: 28`** / **`maxPolarAngle: π/2`** from JSX — **`LabOrbitRig`** applies limits after mount).
- **`voxelStructureLayoutKey`**: refit when **extent / block count** changes, not on every identical parent re-render.

---

## 8. Validation / generation safety

- **Deterministic:** no `Math.random`; bay math is pure integer geometry from **`ResolvedMedievalTower`**.
- **Validation order** unchanged in **`VisualizerClient`**.
- **Merge / dedup** unchanged (**`mergePlacements`**).
- **Battlements / roof** logic untouched (only body-shell window selection and **`buildWindowGlassSet`** call path changed).
- **Viewer** does not modify **`VoxelBlock[]`**.

---

## 9. Manual QA (recommended)

| Preset | Suggested check |
|--------|-----------------|
| **Fortified Gate Tower** | Façade windows **mirror** about center; readable rhythm on **`windowsFloors: all`**. |
| **Tall Watchtower** | Vertical window **columns** align floor-to-floor on upper bands. |
| **Gothic Stone Tower** | Same; **arched** style still uses stride **3** for spacing. |
| **Dark Wizard Tower** | Still dense and readable (**regression reference**). |
| **Northwatch / Compact Guard** | Still reasonable; **Compact** **front_only** unchanged semantically. |
| **All stepped + crenellations** | Orbit crown — **no floating** merlon/parapet rings. |
| **Camera** | Tall preset: **zoom out** sees full height; orbit **below** horizon sees **foundation**; **Refit camera** after messy orbit; **Compact** remains usable. |

Automated **`npx tsx`** spot-check: all six presets **`validateBlueprint` → OK**; block counts **647, 1519, 2055, 1417, 134, 1438** (same totals as before this change for these presets — glass/trim distribution may still differ slightly without changing the aggregate count).

---

## 10. Build result

| Check | Result |
|-------|--------|
| **`pnpm run build`** | **Passed** (Next.js 16.2.6). |

---

## 11. Remaining weaknesses / follow-up ideas

- **`voxelStructureLayoutKey`** is a **bbox + count** fingerprint — theoretical collisions could skip a refit (very unlikely).
- **Rectangular `W ≠ D`** footprints (not in schema today) would want **independent** span logic per face if added later.
- **Validation `notes`** when **`windowsCountPerSide`** is **implicitly reduced** by slot math is not implemented (silent graceful degradation only).
- Optional: auto-increment **`cameraResetNonce`** on preset select (currently user can use **Refit camera**).

---

*This file was overwritten for this milestone.*
