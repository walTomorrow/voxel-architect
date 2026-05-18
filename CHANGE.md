# Change report — Generic v2 lab layout refinement

## Branch

`feature/component-authoring-model`

## Scope

Layout and UX refinement for the real `/generic-lab` Generic v2 mode only. No schema, validator, generator, emitter, preset, or blueprint type changes. No changes to `/generic-lab-concepts`, V1 lab mode, or concept exploration.

## Files updated

- `src/app/generic-lab/v2/GenericLabV2Client.tsx` — viewer-first three-column workbench layout
- `src/app/generic-lab/v2/ComponentInspectorPanel.tsx` — compact header with face + detail summary at top
- `src/app/generic-lab/v2/genericLabV2Display.ts` — `buildSelectedComponentPreview` helper for overlay/inspector context

## Files created

- `src/app/generic-lab/v2/SelectedComponentPreviewOverlay.tsx` — compact bottom overlay on the live preview
- `src/app/generic-lab/v2/__tests__/genericLabV2Display.test.ts` — preview summary test for `porch_house_v2` front windows

## Layout changes (summary)

- **Top bar:** Preset, reload, and blueprint materials (collapsed `<details>`) moved out of the left column into a compact header so the workbench body is only map · preview · inspector.
- **Three columns (desktop):** Fixed-width semantic map (~304px), flexible center preview, fixed-width inspector (~352px). Validation/debug sits in a collapsed bottom strip outside the main row.
- **Mobile:** Preview is ordered first (`order-1`) with a generous minimum height; map and inspector stack below with capped heights so the viewer stays primary.

## VoxelViewer priority

- Center column is `flex-1` with `absolute inset-0` `VoxelViewer` filling the panel (no nested grid sharing horizontal space with the inspector).
- Removed the previous layout where the inspector sat beside the viewer inside the center column.
- Stale-structure banner uses a single compact line at the top of the preview.
- Structure inspection and validation/debug are collapsed by default and live outside the preview’s flex growth path.

## Left / right panel simplification

**Left**

- Semantic map only (no preset block or materials form above the tree).
- Map scrolls internally; full height on `lg` breakpoints.

**Right**

- Inspector is the primary panel; structure inspection is a collapsed `<details>` footer with a reduced max height (`10rem`).
- Inspector header is tighter: human name, monospace id, face + key details (no separate “type” / palette inheritance line).
- Material overrides remain collapsed `<details>` (unchanged behavior).

## Selected-component preview context

- `buildSelectedComponentPreview` builds name, id, attachment line (`Attached to Front face`), and a detail string (e.g. `2 windows · symmetric · auto height`).
- `SelectedComponentPreviewOverlay` renders a small bottom-left card on the `VoxelViewer` (pointer-events none, max width ~md) so tree selection, preview, and inspector refer to the same component.
- No voxel or mesh highlighting was added.

## Preserved behavior

- Rich semantic map, visual surface cards, segmented horizontal placement, live generation, stale preview, collapsible validation/debug, V1 lab mode toggle, and all existing edit paths via `patchComponent`.

## Confirmations

- V1 lab mode remains intact (`GenericLabShell` unchanged).
- `/generic-lab-concepts` untouched.
- No schema, generation pipeline, AI, image upload, interior, floor plan, multiple-room, freeform coordinate, or region-selection changes.
- ComponentPlanV2 is not exposed as editable JSON.

## Tests

- **Added:** `genericLabV2Display.test.ts` (window group preview summary for `porch_house_v2`).
- **Unchanged:** `genericLabV2Utils.test.ts` (no helper behavior changes).

## Manual verification checklist

- [ ] Open `/generic-lab`, switch to **Generic v2** — V1 still works when toggled.
- [ ] On a laptop-width window, the voxel preview dominates; map and inspector are side columns.
- [ ] Preset reload and blueprint materials (collapsed) work from the top bar.
- [ ] Selecting components in the semantic map updates the preview overlay and inspector header.
- [ ] Invalid draft still shows stale structure with a compact top banner.
- [ ] Validation & debug strip expands only when opened; structure inspection stays collapsed by default.
- [ ] Edit a window count / face / placement — live preview updates when valid.

## Command results

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm lint` | Pass |
| `pnpm test:generator` | Pass (135 tests, including new display test) |
| `pnpm run build` | Pass |
