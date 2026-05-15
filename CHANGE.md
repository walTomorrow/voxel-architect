# Change log — Full-structure block breakdown (Developer Lab)

## 1. Title of this milestone

**Material / block-type inventory** in **`StructureInspectionPanel`**: a compact, **full-generated-structure-only** per-**`blockTypeId`** count list (developer lab), shared by **`/visualizer`** and **`/preview`**, without per-type visible-layer counts.

## 2. Branch name

`feature/material-block-breakdown`

## 3. Files changed

| File | Change |
|------|--------|
| `src/lib/voxel/blockBreakdown.ts` | **New** — **`fullStructureBlockBreakdown`**, **`displayLabelForBlockTypeId`**, **`FullStructureBreakdownRow`**; pure counting + sort (desc **`count`**, tie-break **`blockTypeId`**). |
| `src/components/voxel/StructureInspectionPanel.tsx` | New prop **`fullStructureBreakdown`**; **“Block breakdown”** section under aggregate **visible / total**; intro copy notes breakdown is full-structure only. |
| `src/app/visualizer/VisualizerClient.tsx` | **`useMemo`** breakdown from **`structure.blocks`** only; pass to panel. |
| `src/app/preview/PreviewInspectionClient.tsx` | Same **`useMemo`** + prop wiring. |

## 4. What was implemented

- **Aggregate line unchanged:** **visible / total** blocks still reflect the current layer mode (Full, Build-up, Slice).
- **New section:** **Block breakdown** — one count per **`blockTypeId`** for the **entire** last successful **`structure.blocks`** only.
- **Labels:** Local id segment with **`_` → space** when **`getBlockDefinition`** recognizes the type; otherwise full **`blockTypeId`**.
- **Sorting:** Descending count; stable **`blockTypeId`** ascending tie-break.
- **Rows:** Only **`count > 0`**; list scrolls inside **`max-h-44`** when long.

## 5. Final scope decision (visible vs full per type)

- **Per-type visible counts** and **visible/total pairs per row** were **not** implemented.
- **Reason:** Inventory of the **complete** generated model is the higher-value first step and keeps the panel simpler; layer scrub no longer changes the breakdown.

## 6. How the helper computes and sorts

- **`fullStructureBlockBreakdown(blocks)`** walks **`blocks` once**, increments a **`Map<blockTypeId, number>`**, builds rows, drops nonpositive counts, sorts **`(b.count - a.count)`** then **`localeCompare`** on **`blockTypeId`**.
- **Input** is always **`structure.blocks`** from existing **`useMemo`** (no extra **`generateStructureFromResolved`** calls, no mutation of **`VoxelBlock`**).

## 7. Where the breakdown appears in the UI

- **`StructureInspectionPanel`**, **below** “Block counts” and **above** “Refit camera”.
- **`/visualizer`** and **`/preview`** both pass the same prop shape.

## 8. What was intentionally deferred

- Per-layer / per-type **visible** breakdowns, charts, swatches, material categories, AI copy, persistence, import/export, semantic metadata, new structure types, **`VoxelViewer`** changes.

## 9. Manual QA notes

| Check | Where |
|-------|--------|
| Six presets render; breakdown lists types; **sum of row counts = total** block line’s **total** | **`/visualizer`**, **`/preview`** |
| **Build-up / Slice** change **visible / total** aggregate but **not** breakdown rows | Both |
| **Preset** / **blueprint edits** refresh breakdown | **`/visualizer`** |
| **Invalid blueprint** — no crash; breakdown hidden (`null` rows) | **`/visualizer`** |
| **Camera** — layer scrub still no refit; **Refit** still works | Both |

## 10. Build result

| Check | Result |
|-------|--------|
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack). |

## 11. Remaining weaknesses / follow-up ideas

- Labels are **heuristic** (no registry **`displayName`** yet).
- Optional later: **visible-per-type** column, export, or collapse long lists by category.

---

*This file was overwritten for this milestone.*
