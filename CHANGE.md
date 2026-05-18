# Phase 6 implementation report

## Branch

`feature/component-authoring-model`

## Phase implemented

**Phase 6 — /generic-lab V2 component tree + editing**

## Files created

- `src/app/generic-lab/GenericLabShell.tsx` — v1/v2 mode toggle (default v1)
- `src/app/generic-lab/v2/GenericLabV2Client.tsx` — V2 lab orchestration (preset, validate, generate, stale preview)
- `src/app/generic-lab/v2/ComponentTreePanel.tsx` — read-only semantic component tree
- `src/app/generic-lab/v2/ComponentInspectorPanel.tsx` — selected-component field editor + per-component material overrides
- `src/app/generic-lab/v2/ValidationPanel.tsx` — structured errors / warnings / notes
- `src/app/generic-lab/v2/DebugPanel.tsx` — read-only authoring JSON, normalized JSON, ComponentPlanV2 summary
- `src/app/generic-lab/v2/genericLabV2Utils.ts` — clone preset, tree builder, patch, materials, plan summary helpers
- `src/app/generic-lab/v2/__tests__/genericLabV2Utils.test.ts` — unit tests for tree grouping, patch, surfaces, materials
- `src/lib/blueprints/formatValidationFeedback.ts` — shared v1/v2 validation message formatting (used by preview)

## Files updated

- `src/app/generic-lab/page.tsx` — mounts `GenericLabShell` instead of `GenericLabClient` directly
- `src/app/preview/PreviewInspectionClient.tsx` — imports `formatValidationFeedback` from shared module
- `vitest.config.ts` — includes `src/app/generic-lab/v2/__tests__/**/*.test.ts`

## V2 lab mode behavior

- `/generic-lab` shows a **Lab mode** bar: **Generic v1** (default) | **Generic v2**.
- **Generic v1** renders the existing `GenericLabClient` unchanged (same editor, validation, generation, inspection panel).
- **Generic v2** renders `GenericLabV2Client` with:
  - Preset picker for `simple_cabin_v2`, `stone_workshop_v2`, `porch_house_v2` (reload supported)
  - Draft cloned from preset on load
  - `validateBlueprint()` → `generateStructure()` when valid
  - `VoxelViewer` with layer inspection via existing `GenericLabInspectionPanel`
  - **Stale preview**: last valid structure kept when draft becomes invalid; banner on canvas and in inspection panel

## Component tree behavior

- Built from authoring components only (no `room_shell`, `plan_door`, etc.).
- Root **room** first, then facade surfaces in fixed order: **front → back → left → right** (headers only).
- Surface children ordered: door → window_group → porch → chimney; stable id labels.
- **Steps** nested under their `targetDoor` when possible.
- **Roof** section after surfaces with roof components as children.
- Selecting room or component nodes drives the inspector.

## Inspector editing behavior

- Edits **existing** components only; component **id is read-only** (no auto-rename).
- Supported fields per type (room, roof, door, window_group, porch, chimney, step) per Phase 6 spec.
- `targetSurface` selects use facade surfaces only (no roof).
- Step `targetDoor` and porch `aroundDoor` use door id lists; porch allows blank `(none)` for `full_facade`.
- Enum fields use `<select>`, numbers use `<input type="number">`, booleans use checkbox.

## Validation / stale preview behavior

- `ValidationPanel` shows structured `ValidationIssue` entries with **code**, **message**, and optional **path**, **componentId**, **surface**, **anchor**, **suggestion**.
- Errors, warnings, and notes are visually distinct.
- Invalid draft: validation lists issues; canvas keeps **last valid** structure; stale banners shown.

## Debug panel behavior

- Read-only **authoring** blueprint JSON (always).
- Read-only **normalized** JSON when validation passes.
- Read-only **ComponentPlanV2 summary** (planVersion, rootRoomId, bounds, component kinds + sourceComponentId, mask counts) — not editable public IR.
- Generated block count when a structure is displayed.

## Materials

**Fully implemented:**

- Root blueprint palette (all six classic slots) in V2 client sidebar.
- Per-component material overrides in inspector (inherit vs override per slot).

## Add / remove components

**Deferred** — no add/remove for window_group, chimney, porch, step, or remove-component actions in this pass.

## V1 lab safety

- `GenericLabClient.tsx` was **not** moved, renamed, or rewritten.
- V1 behavior is preserved behind the shell toggle; default mode remains **Generic v1**.

## Out of scope (confirmed not added)

- AI runtime, prompt box, LLM operation queue, image upload
- Floor plans, interiors, multiple rooms, walls-as-components
- Freeform coordinate editing, region selection
- Public editable ComponentPlanV2
- V1 removal, V1 schema changes, V1 preset removal, `applyOperations`

## Tests added / updated

- `src/app/generic-lab/v2/__tests__/genericLabV2Utils.test.ts` (8 tests): tree grouping, surface order, step nesting, roof section, `patchComponent` immutability, facade-only target surfaces, material override helper, door id listing.

## Manual verification results

Verified by implementation review and successful production build; interactive UI checks recommended locally:

| Check | Result |
|-------|--------|
| `/generic-lab` loads | Pass (static route in build) |
| Generic v1 mode works as before | Pass — same `GenericLabClient` behind toggle |
| Generic v2 mode loads | Pass — `GenericLabV2Client` wired |
| V2 preset picker (3 presets) | Pass — options from `previewPresetCatalog` |
| Each preset can validate + generate | Pass — existing V2 pipeline + preset invariants tests |
| Component tree grouping | Pass — unit tests + tree builder |
| Selection updates inspector | Pass — shared `selectedComponentId` state |
| Edits revalidate / regenerate | Pass — `useMemo` on draft → validation → generation |
| Invalid edits → errors + stale canvas | Pass — mirrors V1 snapshot pattern |
| Material edits | Pass — root + per-component overrides |
| Debug panels read-only | Pass — `readOnly` textareas / JSON summary |
| `/preview` still works | Pass — only shared `formatValidationFeedback` extract |

## Command results

```
pnpm exec tsc --noEmit   → exit 0
pnpm lint                → exit 0 (0 errors; unused-import warnings fixed)
pnpm test:generator      → exit 0 (22 files, 134 tests)
pnpm run build           → exit 0 (routes: /, /generic-lab, /preview)
```

## Next recommended phase

**Phase 7** (per PLAN.md): narrow add/remove for facade-attached components (window_group, chimney, porch, step) if desired; optional AI/operations runtime remains later. Continue keeping V1 intact until V2 lab is stable in daily use.
