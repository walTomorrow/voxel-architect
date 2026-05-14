# Change log — Fix: floating battlements (stepped-roof column support + grounded filter)

## 1. Title of this bugfix

**Medieval tower crenellations:** remove **floating merlons** and **unsupported parapets** on **stepped** roofs by tying battlements to **per-column roof tops**, and make **`filterGrounded`** only treat **surviving** lower voxels as support (bottom-up pass).

---

## 2. Files changed

| File | Change |
|------|--------|
| `src/lib/generation/generators/generateMedievalTower.ts` | Added **`colRoofTop`** map (`colKey(lx,lz) → max roof Y`) updated with every roof voxel; **parapet** only where that column has roof; **parapet keys** tracked; **merlons** only where a parapet was emitted at `(lx, yParapet, lz)`; replaced **`filterGrounded`** with a **bottom-up** pass (sort by `y`, then require `(x,y−1,z)` to be in the **grounded** set); removed temporary **`globalThis`** debug assignments. |

---

## 3. Root cause of the floating blocks

1. **Uniform parapet height** at `yTopRoof + 1` for every façade cell assumed a roof voxel existed at **`(lx, yTopRoof, lz)`** on the **outer wall**. On a **stepped pyramid**, the **highest** roof voxels are **inset**; many perimeter columns never get roof at the global top `y`, so parapets were **unsupported** and **`filterGrounded` removed them**.
2. **`filterGrounded`** built `below` from **all** merged voxels **before** removal, so **merlons** could still “see” **parapet keys** at `(x, y−1, z)` even when those parapets were **dropped** as ungrounded — merlons **survived** and looked **floating** above the last real roof.

---

## 4. What fix was implemented

- **`recordRoof(wx, y, wz)`** updates **`roofCells`** (unchanged stepped support) and **`colRoofTop[colKey(wx,wz)] = max(previous, y)`** for every placed roof block.
- **Parapet:** for each **exterior** `(lx, lz)`, read `topY = colRoofTop.get(colKey(lx,lz))`. If missing, **skip**. Otherwise **`yParapet = topY + 1`** (per-column walk height), emit parapet, record **`parapetKeys.add(lk(lx, yParapet, lz))`**.
- **Merlon:** same column `topY` / `yParapet`; emit merlon at **`yMerlon = yParapet + 1`** only if **`parapetKeys`** contains that parapet cell and the parity mask passes.
- **`filterGrounded`:** sort blocks by **`y`** (then `x`, `z`); keep a block iff **`y ≤ 0`** or the cell **directly below** is already in the **kept-grounded** set (no phantom support from voxels that will be removed).

---

## 5. Whether `filterGrounded` was changed

**Yes.** Replaced the one-pass `below = Set(all keys)` filter with a **single ascending-`y` pass** that only adds support for voxels that **actually remain** in the output.

---

## 6. Whether schema changed

**No.**

---

## 7. Whether sample blueprint changed

**No.**

---

## 8. Final default sample block count

**647** voxels for `SAMPLE_MEDIEVAL_TOWER_BLUEPRINT` after `validateBlueprint` → `generateMedievalTower` (measured with `pnpm dlx tsx` in-repo).  
*(Count differs from the pre-battlement-bug era ~611 because parapet/merlon placement now follows real roof columns; the stepped cap may omit the outermost top roof ring where the bottom-up filter cannot chain support — see “remaining weaknesses.”)*

---

## 9. Visual verification notes for `/visualizer`

- **Expected:** No **detached** ring of accent blocks above an empty gap; merlons sit **directly** on parapets, parapets **directly** on the **highest roof voxel in that façade column**.
- **Crenellations:** Still appear when **`features.crenellations`** is true; pattern may be **slightly shorter** overall (`maxY` was **9** in the automated sample check vs. **12** when merlons were incorrectly kept).
- **Manual check:** Open **`/visualizer`**, reset to sample, orbit the crown — confirm **no floating battlements**.

---

## 10. Build / test result

| Check | Result |
|-------|--------|
| `pnpm run build` | **Passed** (Next.js 16.2.6 compile + TypeScript + static generation completed successfully). |
| Quick integrity script | **0** blocks missing a voxel **directly below** in the final `VoxelBlock[]` (post-filter). |
| `validateBlueprint(SAMPLE_MEDIEVAL_TOWER_BLUEPRINT)` | **OK** (no errors in the default configuration). |

---

## Remaining weaknesses / follow-ups

- **Stepped + half merlons:** the topmost **roof ring** can still lose voxels if the cell below is empty on that column (pre-existing interaction with **sparse merlons** and strict vertical support). A follow-up could **raise merlons to a full belt**, **fill crenel slots**, or **reorder** “top roof cap vs. battlements” if a denser silhouette is required.
- **`estimateTowerBlocks`** in `validateBlueprint.ts` was **not** updated in this pass; if `maxBlockCount` margins get tight on larger footprints, bump the estimate slightly.

---

*This file supersedes the prior CHANGE entry for handoff / review.*
