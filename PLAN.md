# Plan — Generic Building Blueprint developer lab (`/generic-lab`)

**Branch:** `feature/generic-blueprint-lab`  
**Status:** Planning only — no implementation until review.  
**Prior work:** `generic_building` component pipeline is merged on `main` (see [`CHANGE.md`](CHANGE.md), [`REPO_SURVEY_GENERIC_LAB.md`](REPO_SURVEY_GENERIC_LAB.md)).  
**Supersedes:** Older “slice 2 component vertical” content in git history; this document is the active plan for the lab route only.

---

## 1. Goal

Ship a **developer-facing** route at **`/generic-lab`** where a developer can:

1. Pick a starting preset from `GENERIC_BUILDING_PRESETS`.
2. Edit a **`GenericBuildingBlueprint`** through form controls (the same semantic object future AI will target).
3. **Validate** and **generate** on change via the existing generic component pipeline.
4. **Render** the result in **`VoxelViewer`** with inspection helpers (layers, breakdown, stats).
5. See **validation errors**, **validation notes**, read-only blueprint JSON, and an optional **Copy GenericBuildingBlueprint JSON** debug action.

This is the **manual** version of the architecture chain:

```text
GenericBuildingBlueprint
  → validateBlueprint() / validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()  [internal ComponentPlan — not exposed]
  → generateFromComponentPlan()
  → VoxelBlock[]
  → VoxelViewer
```

**Out of scope for this branch:** AI, images, JSON import, `blueprintExchange`, tower lab changes, new generators, `InteriorPlan`.

---

## 2. Non-goals

| Non-goal | Reason |
|----------|--------|
| AI / prompt / image upload | Future milestone |
| `ComponentPlan` UI or JSON export | Internal IR only |
| Generic `blueprintExchange` v2 or tower envelope reuse | Tower-only v1 in `blueprintExchange.ts` |
| JSON **import** in V1 | Copy-only debug export |
| Edit `/visualizer` or remove it | Remains tower lab; cleanup branch later |
| Change `/` landing CTA to generic lab | Home links to `/preview` only today |
| New building families / revive `blacksmith_workshop` | Architecture constraint |
| `InteriorPlan`, region selection | Not in schema |
| React route tests | No existing app test harness |
| Docs sweep (except optional `CHANGE.md` at end of implementation) | Per branch discipline unless asked |

---

## 3. Decisions already made

| Decision | Detail |
|----------|--------|
| **Route** | `/generic-lab` at `src/app/generic-lab/` |
| **Tower lab** | `/visualizer` unchanged on this branch |
| **Preview nav** | Change existing “Developer lab →” link from `/visualizer` to `/generic-lab` |
| **Generic lab nav** | Link back to `/preview` (and optionally home); do not replace main landing CTA |
| **State type** | `GenericBuildingBlueprint` in React state; preserve `structureType: "generic_building"` and `schemaVersion: 1` on patches |
| **Generation API** | `validateBlueprint` + `generateStructureFromResolved` — **not** throwing `generateStructure()` in UI |
| **Invalid UX** | Prefer **last valid render** + visible errors; document fallback if too costly |
| **Hidden constraint toggles** | `enforceSymmetry`, `requireGroundedStructure` not exposed (not enforced by generic generator) |
| **`allowFloatingBlocks`** | Keep at preset default (`false`) in state; **no V1 control** (generator **does** honor it via `emitFromComponentPlan`) |

---

## 4. Current repo surfaces to reuse

| Surface | Path | Reuse |
|---------|------|--------|
| Validation | `validateBlueprint()` in `src/lib/blueprints/validateBlueprint.ts` | Dispatches `validateGenericBuildingBlueprint()` |
| Generic validator | `src/lib/blueprints/validateGenericBuilding.ts` | Rules + `BlueprintValidationResult` |
| Presets | `src/lib/blueprints/sampleGenericBuildingBlueprints.ts` | `GENERIC_BUILDING_PRESETS`, `getGenericBuildingPreset`, `DEFAULT_GENERIC_PRESET_ID` |
| Generate | `generateStructureFromResolved()` in `src/lib/generation/generateStructure.ts` | → `generateGenericBuilding()` |
| Compiler | `compileGenericBuildingToComponentPlan()` in `src/lib/generation/components/compileGenericBuildingPlan.ts` | Internal only |
| Emit | `generateFromComponentPlan()` in `src/lib/generation/components/emitFromComponentPlan.ts` | Merge + `filterGroundedConnected26` |
| Renderer | `VoxelViewer` in `src/components/voxel/VoxelViewer.tsx` | `structure`, `boundsStructure`, `cameraResetNonce` |
| Layer view | `src/lib/voxel/layerView.ts` | `LayerViewMode`, `computeLayerYExtents`, `filterBlocksForLayerView`, `clampLayerY` |
| Breakdown | `fullStructureBlockBreakdown()` in `src/lib/voxel/blockBreakdown.ts` | Material counts |
| Materials | `CLASSIC_BLOCK_PACK` in `src/lib/voxel/blocks/packs/classic.ts` | Same pattern as `CLASSIC_KEYS` in `VisualizerClient.tsx` |
| Preview reference | `src/app/preview/PreviewInspectionClient.tsx` | Validate → generate → view loop for generic presets |
| Layout reference | `src/app/visualizer/VisualizerClient.tsx` | Collapsible left editor, validation block, copy JSON pattern — **not** tower field bindings |

**Do not reuse:** `parseBlueprintExchange`, `serializeBlueprintExchange`, `blueprintImportStructure`, tower preset helpers, `previewBodyWallLayers`, `planFootprintWD`.

---

## 5. Proposed file changes

| Action | Path |
|--------|------|
| **Add** | `src/app/generic-lab/page.tsx` — metadata, header shell, `<GenericLabClient />` |
| **Add** | `src/app/generic-lab/GenericLabClient.tsx` — main client lab UI |
| **Add** (optional, recommended) | `src/app/generic-lab/genericLabUtils.ts` — `clampInt`, preset clone, JSON copy helper (keeps client file smaller) |
| **Edit** | `src/app/preview/page.tsx` — `href="/visualizer"` → `href="/generic-lab"`; label may stay “Developer lab →” or become “Generic blueprint lab →” (product copy choice) |
| **No change** | `src/app/visualizer/*`, `src/lib/generation/*`, `src/lib/blueprints/types.ts` (unless bugfix discovered during implementation) |
| **End of branch** | `CHANGE.md` addendum describing lab route (when implementing) |

No new library modules required for V1 if logic lives in the client component.

---

## 6. Proposed route / component structure

### `src/app/generic-lab/page.tsx`

- Server component (mirror `src/app/preview/page.tsx` / `src/app/visualizer/page.tsx`).
- `metadata`: title e.g. “Generic blueprint lab · Voxel Architect”.
- Header row:
  - Link “Return to home” → `/` (optional; preview has it).
  - Link “← Preview” → `/preview` (**required**).
  - Subtitle: developer lab for `generic_building` (not AI).
- Full-height flex child: `<GenericLabClient />`.

### `src/app/generic-lab/GenericLabClient.tsx`

`"use client"` — primary layout:

```text
┌─────────────────────────────────────────────────────────────┐
│  [collapsible] LEFT: preset + form sections                 │
│  Body | Roof | Entrance | Windows | Features | Materials    │
│  | Constraints | Validation (errors/notes)                    │
├──────────────────────────────┬──────────────────────────────┤
│  MAIN: VoxelViewer             │  RIGHT or BOTTOM strip:      │
│  (layer modes via sub-panel    │  stats, grid, breakdown,     │
│   or reuse StructureInspection │  read-only JSON, copy btn    │
│   Panel if it fits)            │                              │
└──────────────────────────────┴──────────────────────────────┘
```

**Responsive:** Match visualizer pattern — collapsible left panel on mobile (`blueprintPanelOpen` boolean), wide layout `lg:flex-row`.

**Right panel options (pick one in implementation):**

- **A (recommended):** Reuse `StructureInspectionPanel` for layer modes + breakdown + counts (as preview does), and add a **separate** “Lab debug” section below left form for errors/notes/JSON/copy.
- **B:** Single right column combining inspection + debug (more custom markup).

Errors must **not** rely on preview’s empty-canvas-only pattern — always list `validation.errors` in the lab chrome.

---

## 7. Editable state model

```ts
// Core state
const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_GENERIC_PRESET_ID);
const [blueprint, setBlueprint] = useState<GenericBuildingBlueprint>(initialFromPreset);
const [blueprintPanelOpen, setBlueprintPanelOpen] = useState(true);

// Generation / validation (derived)
const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);

// Last-valid render (see §10)
const [lastValidStructure, setLastValidStructure] = useState<VoxelStructure>({ blocks: [] });
const [lastValidResolved, setLastValidResolved] = useState<ResolvedGenericBuilding | null>(null);

// Viewer chrome
const [cameraResetNonce, setCameraResetNonce] = useState(0);
const [layerViewMode, setLayerViewMode] = useState<LayerViewMode>("full");
const [selectedLayer, setSelectedLayer] = useState(0);
const [copyJsonFeedback, setCopyJsonFeedback] = useState<"success" | "error" | null>(null);
```

### Preset load / reload

- On mount: clone `getGenericBuildingPreset(DEFAULT_GENERIC_PRESET_ID).blueprint`.
- Preset `<select>`: map `GENERIC_BUILDING_PRESETS` to `{ id, label }`.
- **Reload preset:** `structuredClone(preset.blueprint)` for current `selectedPresetId` (mirror visualizer “reset” behavior).
- Every `setBlueprint` patch must keep:
  - `structureType: "generic_building"`
  - `schemaVersion: 1`
  - `constraints.allowFloatingBlocks` unchanged from loaded preset (or hardcode `false`)
  - `constraints.enforceSymmetry` / `requireGroundedStructure` from preset (hidden, not edited)

### Type guard

`validateBlueprint` accepts `StructureBlueprint`; pass `GenericBuildingBlueprint` as-is. Narrow `validation.resolved` with `resolved?.structureType === "generic_building"` before using `grid`.

---

## 8. Field controls and UI ranges

Bind controls to `setBlueprint((b) => ({ ...b, ... }))` with **`clampInt`** (copy from `VisualizerClient.tsx` lines 49–52) for numeric fields.

Use validator ranges from `validateGenericBuildingBlueprint` (`src/lib/blueprints/validateGenericBuilding.ts`):

| Control | Blueprint path | UI control | Min | Max | Notes |
|---------|----------------|------------|-----|-----|-------|
| Name | `metadata.name` | text | — | — | Required string in practice |
| Description | `metadata.description` | textarea | — | — | Optional |
| Width | `body.width` | number | 5 | 17 | integer |
| Depth | `body.depth` | number | 5 | 13 | integer |
| Height | `body.height` | number | 4 | 9 | wall layers above foundation |
| Wall thickness | `body.wallThickness` | select 1 \| 2 | 1 | 2 | |
| Hollow interior | `body.hollowInterior` | checkbox | — | — | |
| Roof kind | `roof.kind` | select | — | — | `none` \| `pitched_gable` \| `shed` |
| Roof layers | `roof.layers` | number | 1 | 3 | disable or hide when `kind === "none"`; validator defaults 2/1 |
| Roof overhang | `roof.overhang` | number | 0 | 1 | validator clamps >1 with note |
| Entrance side | `openings.entrance.side` | select | — | — | `front` \| `back` \| `left` \| `right` |
| Entrance width | `openings.entrance.width` | number | 1 | 3 | |
| Entrance height | `openings.entrance.height` | number | 2 | 4 | note if >2 |
| Window mode | `openings.windows.mode` | select | — | — | `none` \| `front_only` \| `front_and_sides` \| `all_sides` |
| Window count | `openings.windows.count` | number | 0 | 12 | |
| Window height band | `openings.windows.heightBand` | select | — | — | `auto` \| `mid` \| `upper`; default `auto` when unset |
| Chimney enabled | `features.chimney.enabled` | checkbox | — | — | ensure `features.chimney` object exists when toggled on |
| Chimney side | `features.chimney.side` | select left \| right | — | — | when chimney enabled |
| Front step | `features.frontStep.enabled` | checkbox | — | — | ensure `features.frontStep` object exists |
| Materials ×6 | `materials.*` | `<select>` | — | — | options = `Object.keys(CLASSIC_BLOCK_PACK).sort()` |
| Max block count | `constraints.maxBlockCount` | number | e.g. 1000 | 500000 | mirror visualizer `MAX_BLOCK_COUNT_*` or tighter lab cap |

### Hidden / fixed (not in V1 UI)

| Field | V1 behavior |
|-------|-------------|
| `constraints.enforceSymmetry` | Preserve from preset; no control |
| `constraints.requireGroundedStructure` | Preserve from preset; no control |
| `constraints.allowFloatingBlocks` | Preserve from preset (`false`); no control |
| `metadata.notes` | Omit unless trivial textarea desired |
| `materials.door` | Expose in Materials section (in schema; trim uses accent, door slot resolved but walk band empty) |

### Conditional UI

- When `roof.kind === "none"`: roof layers input disabled; layers ignored by validator (0 roof layers).
- When `openings.windows.mode === "none"`: optional hint that count is ignored (validator note).
- When `features.chimney.enabled === false`: hide chimney side select.

---

## 9. Validation / generation flow

On every `blueprint` change (via `useMemo` / `useEffect`):

```ts
const validation = useMemo(() => validateBlueprint(blueprint), [blueprint]);

useEffect(() => {
  if (!validation.ok || !validation.resolved) return;
  if (validation.resolved.structureType !== "generic_building") return;
  const blocks = generateStructureFromResolved(validation.resolved);
  const structure = { blocks };
  setLastValidStructure(structure);
  setLastValidResolved(validation.resolved);
}, [validation]);
```

**Display pipeline:**

```ts
const displayStructure = validation.ok ? { blocks: generate... } : lastValidStructure;
// OR: always use lastValidStructure for viewer; only update lastValid on success
```

**Layer filtering** (same as preview):

- `computeLayerYExtents(displayStructure.blocks)` — use **full** structure for extents when showing last-valid (prefer extents from `lastValidStructure` always).
- `filterBlocksForLayerView` on **display** blocks for canvas; breakdown from **full** `lastValidStructure.blocks`.

**Do not call** `generateStructure(blueprint)` in UI (throws on invalid).

---

## 10. Invalid-state behavior

### Preferred (V1 target)

| State | Canvas | Errors | Notes | Stats / JSON |
|-------|--------|--------|-------|----------------|
| Valid | Current generated structure | “Blueprint OK” | show `validation.notes` | from current `resolved` |
| Invalid | **Last valid** structure (stale) | Red list `validation.errors` | show notes if any | show last valid stats; label JSON as “last valid” or current form (see below) |

Implementation sketch:

- Maintain `lastValidStructure` + `lastValidResolved` updated only when `validation.ok`.
- `VoxelViewer` receives layer-filtered view of `lastValidStructure` (or empty on first load before any valid state).
- Banner: “Current fields are invalid — showing previous structure” when `!validation.ok && lastValidStructure.blocks.length > 0`.

### Fallback (acceptable if last-valid is too brittle)

- Clear canvas and show message (preview-style).
- **PLAN explicitly allows this fallback** only if last-valid causes bugs (e.g. layer slider vs stale bounds); document in `CHANGE.md`.

### Read-only JSON display

- Show `JSON.stringify(blueprint, null, 2)` for **current form state** (including invalid values) so developers can see what they typed.
- Label clearly: “Current editor state (may be invalid)”.

### Copy JSON button

- **Label:** “Copy GenericBuildingBlueprint JSON” (not blueprintExchange).
- Payload: raw object:

```json
{
  "structureType": "generic_building",
  "schemaVersion": 1,
  ...
}
```

- Use `navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2))`.
- Enable always (even when invalid) for debugging; optional: disable copy when `structureType` wrong (should not happen).

---

## 11. Stats / debug display

When `lastValidResolved` / `lastValidStructure` available:

| Stat | Source |
|------|--------|
| Block count | `lastValidStructure.blocks.length` |
| Resolved grid | `lastValidResolved.grid` — show `width`, `depth`, `bodyLayers`, `roofLayers`, `overhang` |
| Body echo | `lastValidResolved.body` (width/depth/height/wallThickness) |
| Material breakdown | `fullStructureBlockBreakdown(lastValidStructure.blocks)` |
| Validation notes | `validation.notes` when `validation.ok`; when invalid, still show notes if validator returned any before failure (usually empty on hard fail) |

Optional (low cost): run `analyzeVoxelStructure(lastValidStructure.blocks)` for `connectedComponentCount26` / `duplicateCoordinateCount` as dev-only readout — **not required** for V1.

**Do not expose** `ComponentPlan` or `compileGenericBuildingToComponentPlan` output in UI.

---

## 12. Navigation changes

### `src/app/preview/page.tsx` (only preview change)

Current (lines 31–36):

```tsx
<Link href="/visualizer" ...>Developer lab →</Link>
```

**Change to:**

```tsx
<Link href="/generic-lab" ...>Developer lab →</Link>
```

(or “Generic blueprint lab →” — keep short).

### `src/app/generic-lab/page.tsx`

- **Required:** link to `/preview` (“← Preview” or “Back to preview”).
- **Optional:** link to `/` (parity with preview header).
- **Do not** add link to `/visualizer` in V1 unless desired as secondary “Tower lab (legacy)” — default **omit** to avoid confusion.

### Unchanged

- `src/app/page.tsx` — still CTA to `/preview` only.
- `src/app/visualizer/page.tsx` — no edits; route remains reachable by direct URL.

---

## 13. Testing / check plan

After implementation:

```bash
pnpm test:generator
pnpm exec tsc --noEmit
pnpm run build
pnpm lint
```

Manual checklist:

| # | Check |
|---|--------|
| 1 | `/preview` → Developer lab link opens `/generic-lab` |
| 2 | `/generic-lab` → Preview link returns to `/preview` |
| 3 | `/visualizer` still loads and edits towers (regression) |
| 4 | Reload each preset; edit fields; structure updates when valid |
| 5 | Invalid combo shows errors; last-valid canvas behavior per §10 |
| 6 | Copy JSON produces valid `generic_building` object; paste into read-only viewer |
| 7 | Layer modes + breakdown + refit camera work on generated structure |
| 8 | `roof.kind: none` and `windows.mode: none` paths |
| 9 | Material `glass` shows panes when applicable |

No new automated route tests unless added later.

---

## 14. Risks and open questions

| Risk | Mitigation |
|------|------------|
| Large `GenericLabClient.tsx` | Extract `genericLabUtils.ts` + small section components if >~400 lines |
| `features.chimney` / `frontStep` undefined on patch | Initialize sub-objects when enabling checkboxes (mirror preset shapes) |
| Entrance side invalid string from free text | Use `<select>` only |
| Last-valid confuses users | Banner + errors always visible |
| `StructureInspectionPanel` assumes preset inspection copy | Pass custom `title` / `panelDescription` props |
| Performance on every keystroke | `useMemo` validation is cheap; generation only on valid — acceptable for lab |

### Open questions (resolve before or during implementation)

1. **Right panel layout:** Reuse `StructureInspectionPanel` vs custom debug column?
2. **Preview link label:** Keep “Developer lab” or rename to “Generic blueprint lab”?
3. **Secondary link** to `/visualizer` for tower editing? (Default: no.)
4. **JSON panel:** Current invalid editor state vs last-valid resolved snapshot?
5. **First paint:** Run validation on initial preset so canvas is populated immediately (expected yes).

---

## 15. Step-by-step implementation sequence

| Step | Task | Files |
|------|------|-------|
| **1** | Add `page.tsx` shell + nav links | `src/app/generic-lab/page.tsx`, edit `src/app/preview/page.tsx` |
| **2** | Scaffold `GenericLabClient` layout (collapsible aside + viewer column) | `GenericLabClient.tsx` |
| **3** | Wire preset select + reload; `useState<GenericBuildingBlueprint>` | `GenericLabClient.tsx` |
| **4** | Wire `validateBlueprint` + `generateStructureFromResolved` + last-valid state | `GenericLabClient.tsx` |
| **5** | Integrate `VoxelViewer` + layer view + `StructureInspectionPanel` | `GenericLabClient.tsx` |
| **6** | Add form sections (Body → Constraints) with clamps/enums | `GenericLabClient.tsx` |
| **7** | Add validation errors/notes UI | `GenericLabClient.tsx` |
| **8** | Add stats (counts, grid, breakdown) | `GenericLabClient.tsx` |
| **9** | Add read-only JSON + Copy GenericBuildingBlueprint JSON | `GenericLabClient.tsx` |
| **10** | Polish responsive collapse, empty states, invalid banner | `GenericLabClient.tsx` |
| **11** | Run test/typecheck/build/lint; manual checklist §13 | — |
| **12** | `CHANGE.md` addendum | `CHANGE.md` |

**Stop after step 11 for review** unless user requests docs updates.

---

## Reference — key symbols

| Symbol | Location |
|--------|----------|
| `GenericBuildingBlueprint` | `src/lib/blueprints/types.ts` |
| `ResolvedGenericBuilding` | `src/lib/blueprints/types.ts` |
| `BlueprintValidationResult` | `src/lib/blueprints/validateBlueprint.ts` |
| `validateGenericBuildingBlueprint` | `src/lib/blueprints/validateGenericBuilding.ts` |
| `GENERIC_BUILDING_PRESETS` | `src/lib/blueprints/sampleGenericBuildingBlueprints.ts` |
| `generateGenericBuilding` | `src/lib/generation/generators/generateGenericBuilding.ts` |
| `compileGenericBuildingToComponentPlan` | `src/lib/generation/components/compileGenericBuildingPlan.ts` |
| `generateFromComponentPlan` | `src/lib/generation/components/emitFromComponentPlan.ts` |
| `VoxelViewer` | `src/components/voxel/VoxelViewer.tsx` |
| `StructureInspectionPanel` | `src/components/voxel/StructureInspectionPanel.tsx` |
| `PreviewInspectionClient` | `src/app/preview/PreviewInspectionClient.tsx` |
| `VisualizerClient` | `src/app/visualizer/VisualizerClient.tsx` (UX reference only) |
