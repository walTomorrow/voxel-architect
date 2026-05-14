# Change log — Viewer inspection UI (right panel + shared layer tools)

## 1. Title of this milestone

**Structure inspection panel:** move onion/layer controls from a cramped **top toolbar** into a dedicated **right sidebar** on **`/visualizer`**, share **`StructureInspectionPanel`** and **`layerView`** helpers with a new **`/preview`** preset inspection flow, without changing **`VoxelViewer`** camera semantics or **`VoxelPreviewPanel`** (still available for other embeds).

## 2. Branch name

`feature/onion-layer-viewer`

## 3. Files changed

| File | Change |
|------|--------|
| `src/lib/voxel/layerView.ts` | **New** — **`LayerViewMode`**, **`computeLayerYExtents`**, **`filterBlocksForLayerView`**, **`clampLayerY`** (single source for y extents / filtering / clamping). |
| `src/components/voxel/StructureInspectionPanel.tsx` | **New** — controlled **right-rail** UI: preset `<select>`, **Full / Build-up / Slice** as **segmented buttons**, layer label + slider + prev/next, **visible / total**, **Refit camera**. |
| `src/app/visualizer/VisualizerClient.tsx` | Removed top preview toolbar; **three-region layout** — blueprint **left**, **`VoxelViewer`** **center**, **`StructureInspectionPanel`** **right** (`md:flex-row` on the viewer column). Imports shared **`layerView`** helpers; preset handler loads blueprint + resets **Full**. |
| `src/app/preview/PreviewInspectionClient.tsx` | **New** — read-only **`selectedPresetId`** → clone preset blueprint → validate → generate; same layer state + **`VoxelViewer`** **`boundsStructure` / `structure`** split as the lab. |
| `src/app/preview/page.tsx` | Replaced **`VoxelPreviewPanel`** with **`PreviewInspectionClient`**; header adds link to **`/visualizer`**. |
| `src/components/voxel/VoxelPreviewPanel.tsx` | **Unchanged** — still used only if re-wired elsewhere; **`/`** home does **not** import it. |

## 4. What changed in `/visualizer` layout

- **Left:** Blueprint form, validation, **Reset to default** / **Reload preset** (unchanged role).
- **Center:** Full-height **`VoxelViewer`** only (no horizontal control strip above the canvas).
- **Right:** **`StructureInspectionPanel`** — preset, discoverable **view mode buttons**, layer tools when Build-up/Slice, counts, Refit.

Narrow viewports: viewer column stacks **canvas** then **inspection** (`flex-col`); inspection panel uses a **top border** so separation stays clear.

## 5. What changed in `/preview`

- **`/preview`** is now a **preset inspection** page: same **six** medieval tower presets, **validate → generate → view**, **no** blueprint editor.
- **`PreviewInspectionClient`** mirrors the lab’s layer filtering and **`boundsStructure`** behavior.
- **`VoxelPreviewPanel`** is no longer used by this route (component kept intact).

## 6. Shared utilities / components

- **`src/lib/voxel/layerView.ts`** — all y-based filtering math shared by **`VisualizerClient`** and **`PreviewInspectionClient`**.
- **`StructureInspectionPanel`** — presentational; parents own React state and pass counts, extents, and callbacks.

## 7. How camera bounds / refit behavior was preserved

- **`VoxelViewer`** unchanged: **`boundsStructure`** still drives **`LabOrbitRig`** / layout fingerprint; **`structure`** is the (possibly filtered) draw list.
- **Layer slider** and view mode changes do **not** alter full-structure bounds → **no** automatic camera jump.
- **Refit camera** still bumps **`cameraResetNonce`**.

## 8. What was intentionally deferred

- Autoplay, current-layer highlighting, material/block-type breakdown, AI, persistence, import/export, semantic metadata, selection, new structure types, major renderer redesign.

## 9. Manual QA notes

| Area | Check |
|------|--------|
| **`/visualizer`** | Left / center / right on **`md+`**; preset loads blueprint; **Full / Build-up / Slice**; counts; **Refit**; layer scrub **without** camera jump; invalid blueprint does not crash the panel. |
| **`/preview`** | All six presets render; same layer tools; no blueprint sidebar; header links work. |
| **Home (`/`)** | Still static marketing page (no **`VoxelPreviewPanel`** dependency). |
| **Narrow width** | Canvas + panel stack without unusable overlap. |

## 10. Build result

| Check | Result |
|-------|--------|
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack). |

## 11. Remaining weaknesses / follow-up ideas

- **`PRESET_INSPECTION_OPTIONS`** is duplicated between **`VisualizerClient`** and **`PreviewInspectionClient`** — could export a readonly list from **`sampleBlueprints`** later.
- **View mode** can stay on Build-up/Slice while the blueprint becomes invalid — controls disable but mode label does not auto-revert to Full (low priority).
- Optional: collapsible **right rail** on small tablets to reclaim canvas width.

---

*This file was overwritten for this milestone.*
