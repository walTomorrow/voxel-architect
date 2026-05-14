# Plan: Viewer inspection UI — right panel + shared controls (follow-up)

## 0. Context (already shipped on `feature/onion-layer-viewer`)

The first onion/layer pass is live in **`VisualizerClient`** and **`VoxelViewer`**:

- **Full / Build-up / Slice** modes, **`y ≤ layer`** / **`y === layer`**, layer slider, prev/next, **visible / total** counts.
- **Preset** and **Refit camera** moved out of the blueprint sidebar into a **thin horizontal strip** above the canvas.
- **`boundsStructure`** keeps **full-model** orbit framing while **`structure`** can be filtered; layer changes do not refit the camera.

**`CHANGE.md`** documents that milestone. This document **supersedes** the earlier PLAN narrative for **what to do next** on the same branch.

---

## 1. Current issue — top toolbar discoverability

- The **view mode** control is a **small `<select>`** beside preset and counts; it reads as a secondary form field, not a primary “how am I viewing this structure?” choice.
- **Preset**, **view**, **layer slider**, **prev/next**, **counts**, and **Refit** share one **horizontal flex-wrap** row (`VisualizerClient` ~lines 852–970). On common widths it **wraps**, pushes the canvas down, and **hides** the layer workflow in plain sight.
- **Product intent:** **`/visualizer`** should feel **blueprint-first** (left column); **structure inspection** should feel like a dedicated **surface**, not a cramped chrome strip.

---

## 2. Plan goals (approved constraints)

1. Make onion/layer inspection **more discoverable** (clear hierarchy, not buried dropdowns).
2. Add a **right-side viewer / inspection** sidebar or panel on **`/visualizer`** and **`/preview`** where feasible.
3. **`/preview`** should expose **the same preset structures** with the **same layer tools** as the lab (not only **`/visualizer`**).
4. **Avoid duplicating** layer-view **logic** (filtering, y extents, clamping); a **shared helper and/or presentational component** is preferred.
5. Keep **`/visualizer`**’s **left** sidebar focused on **blueprint parameters**, validation, and workflow actions (**Reset / Reload preset** can stay there or mirror minimally — avoid two preset selectors).
6. **Camera behavior unchanged:** full **`boundsStructure`**, no refit on layer-only changes, manual **Refit** still increments nonce.
7. Keep the **same three modes** (Full, Build-up, Slice) and **visible / total** counts.
8. **No** autoplay, current-layer highlight, material breakdown, AI, persistence, import/export, or new structure types.

---

## 3. Proposed layout — `/visualizer`

**Desktop (e.g. `md:` and up): three columns**

| Region | Content |
|--------|---------|
| **Left** (existing, ~unchanged width) | **Blueprint editor** — metadata, dimensions, materials, massing, levels, openings, roof, features, constraints, validation, **Reset / Reload preset**. |
| **Center** (`flex-1`, `min-h-0`) | **Canvas only** — **`VoxelViewer`** edge-to-edge vertically. Optional: a **very slim** bottom hint row (“drag to orbit”) *or* omit to maximize canvas; **no** dense control strip above the canvas. |
| **Right** (new, fixed width e.g. `w-72`–`min(100%,20rem)`, scrollable) | **Inspection panel** — section title (e.g. “Structure inspection”), **preset** selector (single source for loading a hand-authored tower into the **editable** blueprint), **view mode** as **segmented buttons** or **radio group** (not a lone dropdown), **layer** slider + prev/next when Build-up/Slice, **visible / total**, **Refit camera**. |

**Mobile / narrow:** stack as **blueprint** (collapsible or tab) **or** inspection drawer; implementation can default to **collapsible inspection panel below canvas** if a full right rail is impractical — document the breakpoint behavior in code comments.

**Discoverability tactics**

- **View mode:** three **toggle buttons** or **radio** with short labels + optional one-line helper (“Show everything” / “Stack from floor” / “One height only”).
- **Visual grouping:** borders / `bg-zinc-900/50` between **Preset**, **View**, **Layer**, **Counts**, **Camera** subsections.

---

## 4. Proposed layout — `/preview`

**Today:** `src/app/preview/page.tsx` is a **server** page with header + **`VoxelPreviewPanel`** (`mode="immersive"`), which mounts **`VoxelViewer`** with **default sample structure** only — **no presets**, **no layer controls**.

**Target:** Treat **`/preview`** as a **public-friendly inspection surface** (still no blueprint editing):

- **Layout:** Same **center canvas + right inspection rail** as **`/visualizer`** (responsive rules aligned).
- **Data:** Client wrapper (new **`PreviewInspectionClient.tsx`** or similar under `src/app/preview/`) that:
  - Holds **`selectedPresetId`** (from **`MEDIEVAL_TOWER_PRESETS`** / **`getMedievalTowerPreset`** in **`sampleBlueprints.ts`**).
  - Runs **`validateBlueprint` → `generateStructureFromResolved`** to produce **`structure`** (read-only; no editable blueprint form).
  - Reuses **shared** layer state + filtering + **`VoxelViewer`** props (**`structure` = visible**, **`boundsStructure` = full**).
- **Header:** Keep light nav (e.g. “Return to home”); optional link to **`/visualizer`** for authors.

**`VoxelPreviewPanel`:** Either **deprecated** for this page in favor of the new client layout, or **refactored** to accept optional **`structure` / inspection props`** — prefer **new preview client** to avoid breaking marketing/home embeds if **`VoxelPreviewPanel`** is reused elsewhere (grep before delete).

---

## 5. Shared component / helper strategy

| Piece | Recommendation |
|------|----------------|
| **Pure math** | Extract **`computeLayerYExtents`**, **`filterBlocksForLayerView`**, and **`LayerViewMode` type** to e.g. **`src/lib/voxel/layerView.ts`** (or `src/components/voxel/layerViewUtils.ts`) so **`VisualizerClient`** and **`PreviewInspectionClient`** both import the same functions — **single source of truth**. |
| **UI** | Add **`StructureInspectionPanel`** (name TBD) under **`src/components/voxel/`** — **controlled** presentational component: props for `layerViewMode`, `onLayerViewModeChange`, `selectedLayer`, `onSelectedLayerChange`, `layerExtents`, `visibleCount`, `totalCount`, `validationOk` (or `hasStructure`), `onRefitCamera`, optional **`presetSection`** render prop **or** `presetSelect` props (`presets`, `selectedId`, `onSelect`). **No** internal `useMemo` for filtering — parents pass counts/extents so the panel stays dumb and testable. |

**Rationale:** Logic once; UI once; pages differ only in **what happens on preset change** (load blueprint vs generate read-only).

---

## 6. Preset selection — `/preview` vs `/visualizer`

| Page | On preset change |
|------|-------------------|
| **`/visualizer`** | **`structuredClone(preset.blueprint)`** into **`blueprint`** state, **`setSelectedPresetId`**, reset layer mode to **Full**, clamp layer (existing rules). Left sidebar remains the **editor** for the loaded blueprint. |
| **`/preview`** | **`setSelectedPresetId`**, regenerate **`structure`** from that preset’s blueprint via **validate + generate** (no `setBlueprint` — there is no authorable blueprint UI). Reset **Full** + clamp **`selectedLayer`** the same way. |

**Single preset `<select>`** per page inside the **shared inspection panel** (or slotted UI), not duplicated on the left **`/visualizer`** sidebar.

---

## 7. Files expected to change

| File | Change |
|------|--------|
| **`src/lib/voxel/layerView.ts`** (new) | **`LayerViewMode`**, **`computeLayerYExtents`**, **`filterBlocksForLayerView`** moved from **`VisualizerClient`**. |
| **`src/components/voxel/StructureInspectionPanel.tsx`** (new) | Right-rail UI: preset block, view mode toggles, layer controls, counts, Refit. |
| **`src/app/visualizer/VisualizerClient.tsx`** | Remove top horizontal toolbar; compose **center canvas** + **`<StructureInspectionPanel />`**; import shared layer helpers. |
| **`src/app/preview/page.tsx`** | Swap **`VoxelPreviewPanel`** for a **client** inspection layout (or thin server wrapper + client child). |
| **`src/app/preview/PreviewInspectionClient.tsx`** (new, name TBD) | Preset-driven **`structure`**, shared layer state, **`VoxelViewer`** + panel. |
| **`src/components/voxel/VoxelPreviewPanel.tsx`** | Update or leave as legacy for **`/`** home — **inspect usages**; avoid breaking landing if it still wraps the demo. |

**Likely unchanged:** **`VoxelViewer.tsx`** (already supports **`boundsStructure`**); **`sampleBlueprints.ts`** (preset list only); **generators / schema / validator**.

**After implementation:** **`CHANGE.md`** should be updated (separate commit / step).

---

## 8. Out of scope (unchanged)

- Autoplay, layer highlighting, per-material counts, AI, persistence, import/export, new structure types, WASD fly, selection tools, schema changes.

---

## 9. Testing plan

- **`pnpm run build`**
- **`/visualizer`:** all six presets load; **view mode** control is obvious (segmented UI); **right panel** scrolls if needed; **canvas** uses full remaining width; **layer scrub** does **not** move camera; **Refit** works; **invalid blueprint** disables/hides layer controls without crash.
- **`/preview`:** preset changes structure; **same** three modes and counts; home link works.
- **Narrow viewport:** no overlapping unusable controls (document chosen collapse behavior).
- **Regression:** **`VoxelViewer`** still receives **`boundsStructure`** when filtered.

---

## 10. Approval checkpoint

**Waiting for approval before implementation.**
