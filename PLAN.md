# Plan: Collapsible inspection panel (responsive lab UX)

## 1. Current understanding

### Branch and issue

- **Branch:** `feature/collapsible-inspection-panel` (new work on top of **`main`** after **`feature/material-block-breakdown`** merged).
- **Milestone:** **Developer Lab Tools** (responsive UX polish, not a new inspection feature set).
- **Issue:** On **narrow viewports**, the shared **`StructureInspectionPanel`** competes with the **`VoxelViewer`** canvas for vertical/horizontal space; the panel stacks (`border-t` on mobile, full width) and can feel **heavy** relative to the 3D viewport. We need a **simple collapse/expand** pattern so users can **reclaim canvas space** while still reaching preset, layers, counts, breakdown, and Refit.

### Current `/visualizer` layout

- **Outer:** `flex-col lg:flex-row` — **left** blueprint sidebar (`lg` breakpoint vs stacked top on small screens).
- **Viewer column:** `flex flex-1 flex-col md:flex-row` — **center** canvas (`flex-1`, `min-h-[min(50vh,28rem)]` on small), **right** **`StructureInspectionPanel`** (`w-full` then `md:w-[min(100%,18rem)]`, `border-t` → `md:border-l`).
- **`StructureInspectionPanel`** — preset, Full/Build-up/Slice, layer slider + prev/next, aggregate **visible / total**, **full-structure block breakdown**, Refit.

### Current `/preview` layout

- **Page:** `h-dvh` column — header, then **`PreviewInspectionClient`** in `flex-1 min-h-0`.
- **Client:** `flex-col md:flex-row` — canvas **`flex-1`**, **`StructureInspectionPanel`** same as visualizer (no blueprint editor).

### Shared component

- **`StructureInspectionPanel.tsx`** is the **single** UI surface for lab inspection on both routes; **`layerView.ts`** and **`blockBreakdown.ts`** stay presentation-agnostic and likely **unchanged** for this milestone.

---

## 2. Problem (responsive)

- **Desktop (`md`+ / `lg`+):** Fixed-width right rail is readable and matches the “three column lab” mental model.
- **Smaller screens:** The panel is **`w-full`** under the canvas (or beside it in a short row), consuming **`min` height** and pushing the canvas into a **short band**; long breakdown lists + Refit increase scroll length inside the rail.
- **Goal:** Preserve **all** existing controls without crowding the viewer: user can **hide** the rail to focus on orbit/zoom, then **reopen** it without losing state (in-memory only).

---

## 3. Proposed UX

### Direction (preferred)

1. **`md` and wider (align with existing `md:flex-row` viewer split):** Panel **always visible** (expanded) — same as today. No collapse affordance required unless we want an optional “hide” for power users; **default: no collapse on desktop** to minimize churn.
2. **Below `md`:** Panel becomes **collapsible**:
   - **Default:** Start **collapsed** on first paint **or** start expanded with one-tap hide — **recommend collapsed by default** on small screens so the canvas is primary on load; document final choice in code comment.
   - **Collapsed:** Canvas uses **`flex-1`** full width of the viewer column; a **persistent, obvious control** reopens the panel (e.g. **`Inspection`** or **`Show inspection`**).
   - **Expanded:** Panel behaves as today (full width under canvas in `flex-col`, scrollable content).

### Toggle placement (pick one in implementation)

| Option | Description |
|--------|-------------|
| **A — Thin vertical rail** | When collapsed, a **`~2.5–3rem`** wide strip at the **trailing** edge (bottom of column in `flex-col`, or right edge in row) with label/icon; tap expands full panel. No overlay library. |
| **B — Floating button** | **`absolute`** button **`top-3 right-3`** on the **canvas wrapper** (`relative` already on visualizer/preview). Tap opens panel (as overlay **or** pushes layout). **Overlay** risks covering voxels — prefer **push layout** (expand panel below or beside) over modal. |

**Avoid:** Third-party drawer libraries, new routing, redesign of blueprint sidebar.

### Shared behavior

- **`/visualizer`** and **`/preview`** should use the **same** collapse rules and the **same** component API so QA is one matrix.

### Breakpoint

- Tie collapse behavior to the **same Tailwind `md` (768px)** breakpoint already used for **`md:flex-row`** between canvas and panel, unless UX testing shows `lg` is better — document if adjusted.

---

## 4. State and persistence

- **`useState<boolean>`** (or enum `open | collapsed`) **inside `StructureInspectionPanel`** OR in each parent — **prefer internal** to avoid duplicating state in **`VisualizerClient`** and **`PreviewInspectionClient`**, unless a parent needs to know open state for layout (e.g. if the toggle is **outside** the panel). If the toggle is **inside** the panel’s wrapper component, **internal state** is enough.
- **No `localStorage`**, no URL query params, no cookies — collapse resets on full page reload (acceptable for lab tools).

---

## 5. Scope boundaries (non-goals)

- No new inspection features (extra tabs, charts, AI, etc.).
- No **persistence**.
- No import/export, new structure types, **`VoxelViewer`** camera logic changes, or **material charts**.
- No **autoplay** / layer highlighting.
- No new **UI component libraries** unless the repo already ships one and it is clearly justified (default: **plain React + Tailwind**).

---

## 6. Interaction with existing tools

After implementation, the expanded panel must still expose:

- Preset `<select>`
- **Full / Build-up / Slice** mode buttons
- Layer slider + **Prev / Next** when applicable
- **Visible / total** aggregate counts
- **Full-structure block breakdown** list
- **Refit camera**

Collapsing must **not** reset preset, layer mode, **`selectedLayer`**, or blueprint — only **visibility** of the control surface changes.

---

## 7. Camera behavior

- **`boundsStructure`** / **`structure`** split in **`VoxelViewer`** stays as today.
- **Do not** increment **`cameraResetNonce`** on collapse/expand unless we discover a **must-fix** canvas sizing bug (not planned).
- **Resize** of the WebGL canvas from layout reflow is acceptable; **no intentional** “refit on panel toggle” unless current **`LabOrbitRig`** already reacts to bounds fingerprint (it should not change from panel toggle since **full** bounds unchanged).

---

## 8. Testing plan

- **`pnpm run build`**
- **`/visualizer`:** desktop (`md`+): layout matches current; all controls work.
- **`/preview`:** same.
- **Narrow viewport** (e.g. devtools iPhone / <768px): panel can **collapse** and **expand**; canvas gains usable area when collapsed; after reopen, preset/layers/breakdown/Refit still work.
- **Preset change**, **layer scrub**, **invalid blueprint** on visualizer — no crashes; collapse state can reset on navigation **only if** we explicitly choose that (default: **preserve** state across invalid/valid toggles if simple).
- **Refit** after expand/collapse still works.

---

## 9. Files expected to change

| Likelihood | File |
|------------|------|
| **High** | **`src/components/voxel/StructureInspectionPanel.tsx`** — wrapper layout, collapse toggle, responsive classes, internal state. |
| **Maybe** | **`src/app/visualizer/VisualizerClient.tsx`** / **`src/app/preview/PreviewInspectionClient.tsx`** — only if an extra wrapper `relative` / flex tweak is cleaner in the parent than inside the panel. |
| **Maybe** | **`src/app/preview/page.tsx`** — only if header + client need a **`min-h-0`** tweak after new flex nesting. |
| **After implementation** | **`CHANGE.md`** |
| **Now** | **`PLAN.md`** (this document). |

**Unlikely:** **`VoxelViewer.tsx`**, **`layerView.ts`**, **`blockBreakdown.ts`**, generators, schema, validator, presets.

---

## 10. Approval checkpoint

**Waiting for approval before implementation.**
