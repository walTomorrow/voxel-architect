# Change log — Collapsible inspection panel (responsive lab)

## 1. Title of this milestone

**Responsive inspection rail:** below the **`md`** breakpoint, **`StructureInspectionPanel`** starts **collapsed** with a **Show inspection** control; expanded sheet includes **Hide inspection** and all existing lab tools. **`md` and up** keeps the **same fixed right rail** as before (no extra collapse UI on desktop).

## 2. Branch name

`feature/collapsible-inspection-panel`

## 3. Files changed

| File | Change |
|------|--------|
| `src/components/voxel/StructureInspectionPanel.tsx` | Split into **`InspectionPanelBody`** (shared content), **`LayerSection`** (typed layer controls), and wrapper: **desktop** `aside` (`hidden md:flex`, unchanged classes), **mobile** `md:hidden` collapsible (`useState`, default **collapsed**). |

## 4. What was implemented

- **Desktop (`md`+):** Single **`aside`** — same width, border, padding, and vertical layout as the pre-milestone panel.
- **Mobile (`<md`):** Default **collapsed** — full-width **Show inspection** row; expanded — header row (**Inspection** + **Hide inspection**) + scrollable **`aside`** (`max-h-[min(52vh,28rem)]`) with the same body as desktop.
- **State:** `mobileInspectionOpen` only; **no** `localStorage`, URL, or cookies.
- **No** changes to **`VisualizerClient`**, **`PreviewInspectionClient`**, **`VoxelViewer`**, **`layerView`**, or **`blockBreakdown`** — behavior is encapsulated in the panel.

## 5. Small-screen collapse behavior

- Collapsed: one tap target; canvas column keeps **`flex-1`** height in parent layout (more room than a full open panel under the canvas).
- Expanded: all controls (preset, modes, layer slider, counts, breakdown, Refit) unchanged in behavior.

## 6. Desktop behavior

- Unchanged layout and discoverability: no collapse toggle on **`md+`**; no new parent wrappers required.

## 7. How existing inspection tools were preserved

- **`InspectionPanelBody`** is the single source for form content; rendered inside desktop **`aside`** and inside mobile expanded **`aside`** (CSS hides the non-active branch at each breakpoint so only one branch is interactive per viewport width).

## 8. How camera behavior was preserved

- **`cameraResetNonce`** is not touched on collapse/expand.
- **`VoxelViewer`** props unchanged by this diff; layout reflow may resize the canvas only.

## 9. What was intentionally deferred

- Persistence of open/collapsed state, resize breakpoint tuning beyond **`md`**, drawer libraries, animated transitions, deduplicating DOM for screen readers with **`useSyncExternalStore`**.

## 10. Manual QA notes

| Check | Where |
|-------|--------|
| **`md+`:** panel always visible; all controls | **`/visualizer`**, **`/preview`** |
| **`<md`:** starts collapsed; Show/Hide; controls after reopen; preset/layers/breakdown/Refit | Both |
| **Invalid blueprint** | **`/visualizer`** — panel still usable to reload preset |
| **Camera** | No intentional refit on toggle |

## 11. Build result

| Check | Result |
|-------|--------|
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack). |

## 12. Remaining weaknesses / follow-up ideas

- Two **`InspectionPanelBody`** instances exist in the React tree (one hidden by CSS at a time) — acceptable for the lab; could be replaced with a single branch using **`matchMedia`** + conditional render if hydration or a11y needs tighten.
- Optional: remember open state **only for session** without `localStorage` (e.g. reset on route change only).

---

*This file was overwritten for this milestone.*

## 13. Append — Desktop inspection collapse + visualizer blueprint collapse

Follow-up after initial mobile-only collapse: **`md` and wider** now expose a way to hide the right inspection rail, and **`/visualizer`** can hide the left blueprint editor so both side panels are collapsible on desktop.

### `StructureInspectionPanel.tsx`

- **New state:** `desktopInspectionOpen`, default **`true`** (ephemeral; no persistence).
- **`md`+ when expanded:** Same effective width (`md:w-[min(100%,18rem)]`), with a top bar (**Hide inspection**) and scrollable body (`overflow-y-auto`) so long breakdown lists do not overflow the viewport.
- **`md`+ when collapsed:** A **`w-10`** strip on the right with a control (**‹**, `title` / `aria-label`: “Show inspection”) to reopen the full rail.
- **`<md`:** Unchanged — still uses **`mobileInspectionOpen`** (default collapsed) with **Show inspection** / sheet **Hide inspection**.

### `VisualizerClient.tsx`

- **New state:** `blueprintPanelOpen`, default **`true`**.
- **When expanded:** Existing blueprint **`aside`** unchanged in role; added **Hide blueprint** next to **Reset to default** and **Reload preset**.
- **When collapsed:**
  - **`<lg`:** Full-width **Show blueprint editor** row (`border-b`, same chrome family as mobile inspection) above the viewer + inspection column.
  - **`lg`+:** **`w-10`** left strip with **›** (`title` / `aria-label`: “Show blueprint editor”) before the main viewer row, matching the right-rail strip pattern.

### Files touched (this append)

| File | Change |
|------|--------|
| `src/components/voxel/StructureInspectionPanel.tsx` | Desktop conditional rail vs slim strip; header **Hide inspection**; inner scroll region. |
| `src/app/visualizer/VisualizerClient.tsx` | `blueprintPanelOpen`; conditional render for collapsed strip / show bar; **Hide blueprint** in header actions. |

### QA to add for this append

| Check | Where |
|-------|-------|
| **`md`+:** Hide / show inspection; controls and Refit after reopen | **`/visualizer`**, **`/preview`** |
| **Visualizer:** Hide blueprint; **`<lg`** show bar; **`lg`+** left strip; editor and validation after reopen | **`/visualizer`** |
| **`PreviewInspectionClient`:** no blueprint column — inspection desktop collapse only | **`/preview`** |

### Build

- **`pnpm exec tsc --noEmit`** — passed after this append (verify again after local edits).
