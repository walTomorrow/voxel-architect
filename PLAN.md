# PLAN — Debug: floating battlements / merlons above the tower

## Context

After the generator-quality pass, `/visualizer` shows a **square ring of blocks** (battlements) **visibly separated** from the roof / parapet band — looks like **floating** geometry. This plan diagnoses root cause and proposes a **minimal fix** (no implementation in this step).

---

## 1. Which placement pass creates the floating blocks?

The **`MERLON` pass** at the end of `generateMedievalTower` (crenellations block: loop over exterior non-corners, `push(lx, yMerlon, lz, PRI.MERLON, m.accent)`).

The **gap** the user sees is largely where **`PARAPET`** voxels were **expected** (same ring, one voxel **below** the merlons) but **do not appear** in the final output for many façade columns.

---

## 2. Block type: MERLON, PARAPET, ROOF, CORNER_CAPSTONE, or other?

- **Visible “floating” uprights:** **`MERLON`** (`PRI.MERLON`, `m.accent`).
- **Missing / invisible band under them:** many **`PARAPET`** voxels (`PRI.PARAPET`) are **dropped later** by `filterGrounded`, so the merlons no longer sit on a visible continuous ledge.
- **Not the primary cause:** `ROOF`, `CORNER_CAPSTONE` (different heights / materials); the screenshot description matches **accent merlons** and the **vertical gap** where parapet should be.

---

## 3. Why are they not directly supported by blocks below (geometry)?

**Stepped roof** only places the **top** roof layer on a **shrunken inset** (`wx` / `wz` in `[inset, W-1-inset]`). The **building façade** still extends to `lx = 0` … `W-1`, but the **highest roof surface** does **not** cover every **exterior** `(lx, lz)` on the footprint.

**Parapet** is emitted for **all** exterior `(lx, lz)` at `yParapet = yTopRoof + 1` with **no check** that `(lx, lz, yTopRoof)` actually has a **`ROOF`** voxel beneath.

So for columns where the **top stepped ring has no roof** at `yTopRoof`, the parapet voxel at `yParapet` has **empty space** directly below → **physically unsupported** in the intended voxel column.

---

## 4. Why did `filterGrounded` not remove the merlons when `requireGroundedStructure` is true?

`filterGrounded` in `generateMedievalTower.ts` is:

```text
below = Set of all (x,y,z) keys from the FULL merged list (pre-removal)
keep block b iff b.y <= 0 OR below has (b.x, b.y-1, b.z)
```

So:

1. **Unsupported parapets** are still present in `blocks` when `below` is built → their keys **are** in `below`.
2. A **merlon** at `(x, yMerlon, z)` checks support at `(x, yMerlon-1, z) = (x, yParapet, z)` — the **parapet** cell.
3. That key **exists in `below`** even if the parapet will later be **filtered out** as unsupported (because parapet’s own support at `(x, yTopRoof, z)` is missing).

So merlons **incorrectly pass** the grounded check: they use **coordinates** of parapets that are **not** part of a grounded chain to bedrock, because **`below` is not restricted to voxels that survive grounding**.

**Summary:** bug is **not** “merlons lack logic” alone — it’s the **interaction** of (a) parapets on columns with no roof below, and (b) **`filterGrounded` using a static `below` set from the pre-filtered list**.

---

## 5. Minimal fix (preferred order)

**Option A — Generator-only (smallest surface):**

- Only **`push` PARAPET** where there is a **roof** voxel at `(lx, lz, yTopRoof)` (reuse / mirror the `roofCells` idea used for stepped caps).
- Only **`push` MERLON** where a **parapet** was actually emitted (e.g. track a `Set` of `(lx,lz)` parapet keys), so merlons never target “air columns.”

This removes unsupported parapets **and** merlons on bad columns without changing `filterGrounded`.

**Option B — Correct `filterGrounded` (principled):**

- Build grounded support **iteratively** (e.g. by increasing `y`, or repeat until fixed point) so `below` only contains **grounded** voxels when deciding whether to keep the next layer — merlons cannot “rest” on parapets that were removed.

**Recommendation:** do **A** first (fast, localized), optionally add **B** in the same PR if we want global correctness for any future features.

**No schema change.**

---

## 6. How to verify battlements sit on parapet / roof (no visual gap)

1. **`pnpm dev`** → `/visualizer` → default sample, default camera: **merlons touch** a continuous **accent parapet** band; **no air gap** between slate roof top and parapet, or between parapet and merlons.
2. **Spot-check coordinates** (optional quick log in dev only, then remove): for every `MERLON`, assert `roofCells.has(lk(lx, yTopRoof, lz))` and parapet present at `(lx, yParapet, lz)` in final `VoxelBlock[]`.
3. **`pnpm run build`** still passes.

---

## 7. Schema changes?

**None preferred; none required** for A or B.

---

## 8. Files to change

| File | Change |
|------|--------|
| `src/lib/generation/generators/generateMedievalTower.ts` | Gate parapet (and merlon) placement on roof support / placed-parapet set; optionally fix `filterGrounded` implementation in this file. |
| `src/lib/blueprints/validateBlueprint.ts` | **Only if** `estimateTowerBlocks` needs a small tweak after fewer crenellation voxels (unlikely). |
| `PLAN.md` | This debugging plan (supersedes prior façade plan for now). |

---

**Waiting for approval before implementation** (next step: apply Option A and optionally B, then re-test `/visualizer` and `pnpm run build`).
