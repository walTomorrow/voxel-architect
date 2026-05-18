# CHANGE.md — Documentation: project history and component grammar

**Branch:** `docs/project-history-and-component-grammar`  
**Scope:** Documentation only — no product code, generators, tests, routes, schemas, or UI changes.

## Summary

Documented the architecture pivot after **`generic_building`** merged to `main`: semantic compiler model, component pipeline, removed **`blacksmith_workshop`**, y-level/opening conventions, and project evolution timeline with screenshot inventory placeholders.

## Files created

| Path | Purpose |
|------|---------|
| [`docs/project-history/DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md) | Visual product timeline with embedded screenshots (see addendum) |
| [`docs/project-history/screenshots/README.md`](docs/project-history/screenshots/README.md) | Screenshot naming, inventory table, capture checklist |
| [`docs/project-history/screenshots/`](docs/project-history/screenshots/) | Eleven deployment captures (`01`–`11`, `.png`); see addendum |
| [`docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md) | Component IR, vocabulary, ordering, merge priorities, aperture masks, coordinates, deferred features |

## Files updated

| Path | Changes |
|------|---------|
| [`docs/generation/GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) | Semantic compiler framing; AI edits blueprints not voxels; `ComponentPlan` internal; `blacksmith_workshop` removed; generic path + opening/absence model; link to grammar doc |
| [`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) | Dual pipelines; generic/component tests; blacksmith removed; visual-fix policy; 100-test reference |
| [`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md) | Active types table; generic authoring sections; §4.2 generic building; blacksmith historical; roadmap tweaks |
| [`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md) | Tower-only v1 exchange; generic internal path; `ComponentPlan` not public; future v2 note |

## Assumptions and notes

- **Screenshot PNGs** — see **Addendum** below for the committed capture set and visual timeline layout.
- **`docs/GENERATION_DESIGN_PRINCIPLES.md`** at repo root was not present; canonical path is **`docs/generation/GENERATION_DESIGN_PRINCIPLES.md`** (workspace rules reference `AGENTS.md` only).
- **Docs lint:** `package.json` has no `docs:lint` or markdownlint script — not run.
- **Tests:** Not run (docs-only per task). Last merged generator slice reported **100** tests / **tsc** / **build** pass.

## Related implementation reference (unchanged in this PR)

Generic pipeline entry: `validateBlueprint()` → `validateGenericBuildingBlueprint()` → `compileGenericBuildingToComponentPlan()` → `generateFromComponentPlan()` — see merged slice in prior `CHANGE.md` entries on `milestone/generator-expansion`.

---

## Addendum — Project history screenshots and visual timeline

**Scope:** Documentation only (screenshots + timeline/README edits).

### What was added

Eleven **Cloudflare deployment captures** under `docs/project-history/screenshots/`, named `{nn}-{subject}-{short-sha}.png` so each file records the build it came from:

| File | Subject |
|------|---------|
| `01-landing-page-6969ede.png` | Landing page, first deployment |
| `02-preview-3d-visualization-6969ede.png` | Preview 3D rendering smoke test |
| `03-visualizer-blueprint-template-6969ede.png` | Developer lab / tower blueprint templates |
| `04-preview-onion-layers-be8de1d.png` | Preview tower presets + onion layers |
| `05-visualizer-onion-layers-be8de1d.png` | Developer lab onion layers (archival; not in timeline) |
| `06-preview-block-breakdown-f9d4137.png` | Block breakdown side panel |
| `07-preview-collapsible-sidepanel-65a28f6.png` | Collapsible preview panel |
| `08-visualizer-collapsed-sidepanel-65a28f6.png` | Collapsed lab + Guard Tower preset |
| `09-visualizer-blueprint-options-a5b3dce.png` | Copy / import blueprint JSON |
| `10-preview-partial-blocks-05fbfe8.png` | Partial blocks (posts, panes, slabs) |
| `11-preview-new-generic-preset-05fbfe8.png` | Generic building component pivot on preview |

Files were normalized to **lowercase `.png`** for GitHub and Markdown preview compatibility.

### Timeline and README updates

- [`docs/project-history/DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md) — Rewritten as a **visual-first** chronology: ten embedded images (`<img src="screenshots/…" width="900" />`) with short captions. Commit tables and Part A/B structure removed in favor of readable screenshots; brief architecture notes kept at the end. **`05-visualizer-onion-layers-be8de1d.png`** is omitted from the timeline (redundant with screenshot 04 at the same deployment).
- [`docs/project-history/screenshots/README.md`](docs/project-history/screenshots/README.md) — Inventory table aligned with the captures: route, commit message context from git where available, formal descriptions of what each image shows and why it matters.

### Viewing the timeline

Open [`DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md) in Markdown preview. Images resolve relative to `docs/project-history/screenshots/`. If preview is blank locally, allow workspace content in **Markdown › Preview: Security Level** (Cursor/VS Code), then re-open preview after `git add docs/project-history/`.

---

## Addendum — Generic Building Blueprint developer lab (`/generic-lab`)

**Branch:** `feature/generic-blueprint-lab`  
**Scope:** Developer-facing manual authoring surface for `GenericBuildingBlueprint` per [`PLAN.md`](PLAN.md).

### Summary

Added `/generic-lab` to edit generic presets, validate/generate live through the existing component pipeline, inspect in `VoxelViewer`, and copy raw `GenericBuildingBlueprint` JSON for debugging. Preview’s “Developer lab →” link now points here. `/visualizer` is unchanged.

### Files created

| Path | Purpose |
|------|---------|
| [`src/app/generic-lab/page.tsx`](src/app/generic-lab/page.tsx) | Route shell, metadata, nav to `/preview` and `/` |
| [`src/app/generic-lab/GenericLabClient.tsx`](src/app/generic-lab/GenericLabClient.tsx) | Collapsible editor, validation, last-valid render, viewer + debug JSON |
| [`src/app/generic-lab/genericLabUtils.ts`](src/app/generic-lab/genericLabUtils.ts) | Preset clone, clamps, material keys, JSON helper |
| [`src/app/generic-lab/GenericLabInspectionPanel.tsx`](src/app/generic-lab/GenericLabInspectionPanel.tsx) | Lab-specific layer modes, counts, breakdown, refit (no duplicate preset picker) |

### Files updated

| Path | Changes |
|------|---------|
| [`src/app/preview/page.tsx`](src/app/preview/page.tsx) | Developer lab link: `/visualizer` → `/generic-lab` (label unchanged) |

### Implementation notes

- **Pipeline:** `validateBlueprint` → `generateStructureFromResolved` (not throwing `generateStructure`).
- **Invalid UX:** Last valid structure stays on canvas; errors/notes in editor; stale banner on canvas and inspection panel.
- **Last-valid state:** React “adjust state during render” when `currentValid` changes (avoids `useEffect` + `setState` lint on new code).
- **Layer slider:** `effectiveLayer` derived via `clampLayerY` (no layer `useEffect`).
- **Hidden constraints:** `enforceSymmetry`, `requireGroundedStructure`, `allowFloatingBlocks` preserved from preset; not exposed in UI.
- **No:** `ComponentPlan` JSON, `blueprintExchange`, import, AI, images, `InteriorPlan`, new families.

### Deviations from PLAN.md

| PLAN | Actual |
|------|--------|
| Optional reuse of `StructureInspectionPanel` | Dedicated `GenericLabInspectionPanel` (avoids tower/generic/partial toggles and duplicate preset UI) |
| `useEffect` for last-valid snapshot | Render-time sync when `currentValid` changes (eslint `react-hooks/set-state-in-effect` / `refs` rules) |
| Open question: preview link label | Kept **“Developer lab →”** |

### Checks

| Command | Result |
|---------|--------|
| `pnpm test:generator` | **100** tests passed |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass — `/generic-lab` static route listed |
| `pnpm exec eslint src/app/generic-lab` | Pass (0 errors) |
| `pnpm lint` (full repo) | **Fails** on pre-existing `react-hooks/set-state-in-effect` in `PreviewInspectionClient.tsx` and `VisualizerClient.tsx` (unchanged this branch) |

### Addendum — 3D viewport layout fix

**Issue:** On `/generic-lab`, the canvas only occupied the top portion of the center column; most of the viewer area stayed empty.

**Cause:** The viewer row and `<main>` did not participate in the flex height chain, and `VoxelViewer` was missing `className="h-full w-full"` (used on `/preview` and `/visualizer`).

**Fix (`GenericLabClient.tsx`):**

- Viewer + inspection wrapper: `h-full min-h-0` so it fills space below the header beside the editor.
- `<main>`: `h-full` + `min-h-[min(52vh,26rem)]` (preview-aligned minimum on small screens).
- `VoxelViewer`: `className="h-full w-full"`.

### Addendum — Project history screenshot (`12-generic-lab`)

- Added [`docs/project-history/screenshots/12-generic-lab-blueprint-editor-81e6a4b.png`](docs/project-history/screenshots/12-generic-lab-blueprint-editor-81e6a4b.png) from user capture of `/generic-lab`.
- Updated [`docs/project-history/DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md) (§11) and [`docs/project-history/screenshots/README.md`](docs/project-history/screenshots/README.md) inventory.

---

## Addendum — Retire tower-era product path (`cleanup/remove-legacy-visualizer`)

**Branch:** `cleanup/remove-legacy-visualizer`  
**Scope:** Remove active `medieval_tower` generator, `/visualizer` UI, tower presets/exchange, and preview Towers tab. Pivot product to **`generic_building`** only (`/preview` Generic | Partials, `/generic-lab`).

### Summary

Tower-era code paths are deleted or retired. `/visualizer` permanently redirects to `/generic-lab`. Preview defaults to **Generic**; partial block showcase unchanged. Historical screenshots and project-history docs kept with past-tense wording.

### Files deleted

| Path | Purpose (removed) |
|------|-------------------|
| `src/app/visualizer/page.tsx` | Tower lab route |
| `src/app/visualizer/VisualizerClient.tsx` | Tower blueprint editor, import/export |
| `src/lib/blueprints/sampleBlueprints.ts` | `MEDIEVAL_TOWER_PRESETS`, tower samples |
| `src/lib/blueprints/blueprintExchange.ts` | Tower-only v1 JSON envelope |
| `src/lib/blueprints/blueprintImportStructure.ts` | Import shape guard |
| `src/lib/blueprints/blueprintSource.ts` | Visualizer UI source labels |
| `src/lib/generation/generators/generateMedievalTower.ts` | Tower family generator |
| `src/lib/generation/styles/buildingStyles.ts` | Tower style metadata catalog |
| `src/lib/generation/__tests__/generatorPresetInvariants.test.ts` | Tower preset invariants |
| `src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts` | Tower edge-case invariants |
| `src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts` | Tower edge-case fixtures |
| `src/lib/generation/__tests__/buildingStyles.test.ts` | Building styles tests |

### Files changed (product)

| Path | Changes |
|------|---------|
| [`next.config.ts`](next.config.ts) | Permanent redirect `/visualizer` → `/generic-lab` |
| [`src/lib/blueprints/types.ts`](src/lib/blueprints/types.ts) | `StructureType` = `generic_building` only; tower types removed |
| [`src/lib/blueprints/validateBlueprint.ts`](src/lib/blueprints/validateBlueprint.ts) | Thin wrapper → `validateGenericBuildingBlueprint` |
| [`src/lib/blueprints/validateGenericBuilding.ts`](src/lib/blueprints/validateGenericBuilding.ts) | `BlueprintValidationResult` defined here (breaks circular import) |
| [`src/lib/generation/generateStructure.ts`](src/lib/generation/generateStructure.ts) | `generic_building` dispatch only |
| [`src/lib/generation/families/buildingFamilies.ts`](src/lib/generation/families/buildingFamilies.ts) | Single shipped family |
| [`src/app/preview/PreviewInspectionClient.tsx`](src/app/preview/PreviewInspectionClient.tsx) | Default `preset_generic`; no tower presets |
| [`src/app/preview/page.tsx`](src/app/preview/page.tsx) | Copy: Generic \| Partials |
| [`src/app/page.tsx`](src/app/page.tsx) | Landing copy aligned with generic pivot |
| [`src/components/voxel/StructureInspectionPanel.tsx`](src/components/voxel/StructureInspectionPanel.tsx) | `PreviewLabSource` = generic \| partials; **Towers** tab removed |
| [`src/components/voxel/VoxelViewer.tsx`](src/components/voxel/VoxelViewer.tsx) | Default `EMPTY_STRUCTURE` instead of tower sample |
| [`src/lib/voxel/sampleStructure.ts`](src/lib/voxel/sampleStructure.ts) | Removed `buildSampleTower` / `SAMPLE_STRUCTURE`; kept partial showcase |
| [`README.md`](README.md) | Generator tests describe `generic_building` pipeline |

### Tests rewritten / removed

| Action | File |
|--------|------|
| **Rewrite** | `generatorPipeline.smoke.test.ts` — generic default preset |
| **Rewrite** | `buildingFamilies.test.ts` — one family; `medieval_tower` undefined |
| **Rewrite** | `generatorWindowPanes.test.ts` — `paneAxisForWindowCell` only (3 tests) |
| **Delete** | Tower preset/edge-case/style tests (see deleted files) |

**Test count:** **76** tests, **15** files (was ~100 across 18 files).

### Docs updated

| Path | Changes |
|------|---------|
| [`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) | Generic-only pipeline; retired tower note; 76-test reference |
| [`docs/generation/GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) | §1.5–1.6 generic-only; retired tower; example blueprint |
| [`docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md) | Tower family retired; grounding/deferred notes |
| [`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md) | Active generic path; historical v1 exchange |
| [`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md) | Active table generic-only; §4.1 retired |
| [`docs/project-history/DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md) | Past tense for tower era; current product summary |
| [`docs/project-history/screenshots/README.md`](docs/project-history/screenshots/README.md) | Historical `/visualizer` rows; `/generic-lab` as replacement |

Historical screenshot PNGs under `docs/project-history/screenshots/` were **not** deleted.

### Checks

| Command | Result |
|---------|--------|
| `pnpm test:generator` | **76** passed, 15 files |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass — routes: `/`, `/preview`, `/generic-lab` (no `/visualizer` page) |
| `pnpm exec eslint src/app/preview src/app/generic-lab src/lib/blueprints src/lib/generation next.config.ts` | Pass (1 pre-existing warning in `openingMask.test.ts`) |
| `pnpm lint` (full repo) | **Fails** — pre-existing issues in `VoxelPreviewPanel.tsx`, `VoxelViewer.tsx`, `structureAnalysis.ts` (not introduced by this branch) |

### Manual verification (expected)

| Check | Expected |
|-------|----------|
| `/preview` | Defaults to **Generic** |
| `/preview` Generic | Preset generates and inspects |
| `/preview` Partials | Static partial showcase |
| `/generic-lab` | Edit/validate/generate generic blueprints |
| `/visualizer` | **308** redirect → `/generic-lab` |
| Towers tab | **Absent** |
| Active tower generator | **None** |

### Remaining references (intentional)

| Location | Why |
|----------|-----|
| `next.config.ts` | `/visualizer` redirect |
| `buildingFamilies.test.ts` | Asserts `medieval_tower` not registered |
| `GenericLabClient.tsx` | UI copy: “Not blueprintExchange” |
| `docs/project-history/*` | Historical routes/screenshots (past tense) |
| `docs/**` retired/historical sections | `medieval_tower`, `blueprintExchange` v1 documented as retired |
| `PLAN.md` | Implementation plan for this branch |

---

## Addendum — Full-repo lint fixes

**Branch:** `cleanup/remove-legacy-visualizer`  
**Scope:** ESLint violations only; no product or generator behavior changes.

### Files changed

| Path | Fix |
|------|-----|
| [`src/components/voxel/VoxelPreviewPanel.tsx`](src/components/voxel/VoxelPreviewPanel.tsx) | Replaced `useEffect` + `setMounted(true)` with `useSyncExternalStore` for client-only canvas mount (`react-hooks/set-state-in-effect`) |
| [`src/components/voxel/VoxelViewer.tsx`](src/components/voxel/VoxelViewer.tsx) | `LabOrbitRig` reads `controls` / `camera` via `useStore().getState()` inside `useLayoutEffect` instead of mutating `useThree` hook return values (`react-hooks/immutability`); `sceneBounds` `useMemo` deps → `[boundsStructure]` (`react-hooks/exhaustive-deps`); removed unused `voxelStructureLayoutKey` helper |
| [`src/lib/voxel/structureAnalysis.ts`](src/lib/voxel/structureAnalysis.ts) | `connectedComponentCount26` / `largestComponentSize26`: `let` → `const` (`prefer-const`) |
| [`src/lib/generation/components/__tests__/openingMask.test.ts`](src/lib/generation/components/__tests__/openingMask.test.ts) | Dropped unused `y` in destructuring (`@typescript-eslint/no-unused-vars`) |

### Lint issues resolved

| Rule | File | Resolution |
|------|------|------------|
| `react-hooks/set-state-in-effect` | `VoxelPreviewPanel.tsx` | `useSyncExternalStore` SSR/client gate |
| `react-hooks/immutability` | `VoxelViewer.tsx` | Imperative orbit/camera updates via R3F store `getState()` |
| `react-hooks/exhaustive-deps` | `VoxelViewer.tsx` | `useMemo` depends on `boundsStructure` |
| `prefer-const` | `structureAnalysis.ts` | Two component-size locals |
| `@typescript-eslint/no-unused-vars` | `openingMask.test.ts` | Omit unused coordinate |

### Checks

| Command | Result |
|---------|--------|
| `pnpm lint` | **Pass** (0 errors, 0 warnings) |
| `pnpm test:generator` | **76** passed, 15 files |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass |

---

## Addendum — GenericBuildingBlueprint v2 Phase 1 (types + fixtures)

**Branch:** `feature/component-authoring-model`  
**Phase implemented:** Phase 1 — Types + fixtures (per [`PLAN.md`](PLAN.md) §16)

### Summary

Added public **schemaVersion 2** authoring types, three hand-authored v2 presets, structured **validation result types** (no validator yet), and **ComponentPlanV2** skeleton IR. V1 shapes, validation, generation, preview, and `/generic-lab` behavior are unchanged. `validateBlueprint()` returns a clear error for `schemaVersion: 2` until Phase 2.

### Files created

| Path | Purpose |
|------|---------|
| [`src/lib/blueprints/types/materials.ts`](src/lib/blueprints/types/materials.ts) | `BlueprintMaterialPalette`, `ComponentMaterialOverride` |
| [`src/lib/blueprints/types/genericBuildingV2.ts`](src/lib/blueprints/types/genericBuildingV2.ts) | Public v2 blueprint + component union, attachments, surfaces |
| [`src/lib/blueprints/types/validationResult.ts`](src/lib/blueprints/types/validationResult.ts) | `ValidationIssue`, `BlueprintValidationResultV2` |
| [`src/lib/blueprints/sampleGenericBuildingBlueprintsV2.ts`](src/lib/blueprints/sampleGenericBuildingBlueprintsV2.ts) | Presets: `simple_cabin_v2`, `stone_workshop_v2`, `porch_house_v2` |
| [`src/lib/generation/components/v2/types.ts`](src/lib/generation/components/v2/types.ts) | Skeleton `ComponentPlanV2` / `PlanComponentV2` IR |
| [`src/lib/blueprints/__tests__/v2Schema.fixtures.test.ts`](src/lib/blueprints/__tests__/v2Schema.fixtures.test.ts) | Preset shape + type surface + v2 not-implemented guard |

### Files updated

| Path | Changes |
|------|---------|
| [`src/lib/blueprints/types.ts`](src/lib/blueprints/types.ts) | `StructureBlueprint` union includes v2; re-exports v2 + validation types |
| [`src/lib/blueprints/validateBlueprint.ts`](src/lib/blueprints/validateBlueprint.ts) | Reject `schemaVersion: 2` with Phase 2 message; export v2 validation types |

### V2 public types added

- `GenericBuildingBlueprintV2` — root `materials` palette, `components[]`, `schemaVersion: 2`
- Component union: `room`, `roof`, `door`, `window_group`, `porch`, `chimney`, `step`
- Attachments: `attach.targetSurface` + optional `placement.horizontal` (`left` \| `center` \| `right`); steps use `attach.targetDoor`
- Roof: `targetRoom` (not `main-room.roof` on public roof component)
- `ComponentId`, `RoomSurfaceRef`, material override types
- `BlueprintValidationResultV2` / `ValidationIssue` (types only)

### V2 preset fixtures

| Preset id | Components (stable ids) |
|-----------|-------------------------|
| `simple_cabin_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, `chimney`, `front-step` |
| `stone_workshop_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, `left-windows` |
| `porch_house_v2` | `main-room`, `main-roof`, `front-door`, `front-windows`, `front-porch`, `front-step` |

Presets are syntax-valid TypeScript; they do not validate or generate yet.

### ComponentPlanV2 skeleton

Internal plan kinds: `room_shell`, `roof`, `door`, `window_group`, `porch`, `chimney`, `step` — plus `PlanBoundsV2`, `DerivedOpeningsV2`, `ResolvedMaterialPaletteV2`. No lowering, emitters, or generation.

### Confirmations

- **V1 runtime unchanged** — v1 presets, `validateGenericBuildingBlueprint`, `generateStructure`, preview, and lab still use schemaVersion 1 only.
- **No V2 validation implementation** — only result types; `validateBlueprint` returns not-implemented for v2.
- **No V2 generation, lowering, emitters, preview/lab UI, or LLM operations.**

### Checks

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm lint` | **Pass** |
| `pnpm test:generator` | **80** tests passed, **16** files (+4 v2 fixture tests) |

### Next steps (Phase 2)

- Implement `validateGenericBuildingBlueprintV2` + normalization
- Parse/resolve `RoomSurfaceRef` to internal structs
- ID rules, single root room, attachment and opening fit checks
- Unit tests for validation errors/warnings/notes

---

## Addendum — GenericBuildingBlueprint v2 Phase 2 — validation + normalization

**Branch:** `feature/component-authoring-model`  
**Phase implemented:** Phase 2 — V2 validation + normalization (per [`PLAN.md`](PLAN.md) §16)

### Summary

Implemented `validateGenericBuildingBlueprintV2`, wired `validateBlueprint()` dispatch for `schemaVersion` 1 vs 2, added `parseRoomSurfaceRef()` for public surface strings, and added unit tests. V2 blueprints validate to a **normalized** blueprint on success; there is still **no** `resolved` object, lowering, emitters, generation branch, preview/lab V2 UI, or operations. V1 validation, resolution, and generation behavior are unchanged.

### Files created

| Path | Purpose |
|------|---------|
| [`src/lib/blueprints/parseRoomSurfaceRef.ts`](src/lib/blueprints/parseRoomSurfaceRef.ts) | `parseRoomSurfaceRef(ref)` → `{ roomId, face }` or parse error |
| [`src/lib/blueprints/validateGenericBuildingV2.ts`](src/lib/blueprints/validateGenericBuildingV2.ts) | `validateGenericBuildingBlueprintV2`, normalization draft types |
| [`src/lib/blueprints/__tests__/validateGenericBuildingV2.test.ts`](src/lib/blueprints/__tests__/validateGenericBuildingV2.test.ts) | V2 validation/normalization unit tests (21 cases) |

### Files updated

| Path | Changes |
|------|---------|
| [`src/lib/blueprints/validateBlueprint.ts`](src/lib/blueprints/validateBlueprint.ts) | Dispatch: v1 → existing validator; v2 → `validateGenericBuildingBlueprintV2`; unknown version → error; overloads + `isBlueprintValidationResultV2` |
| [`src/lib/generation/generateStructure.ts`](src/lib/generation/generateStructure.ts) | Early throw for `schemaVersion: 2` (generation remains Phase 4) |
| [`src/app/preview/PreviewInspectionClient.tsx`](src/app/preview/PreviewInspectionClient.tsx) | Narrow validation to v1 presets (`GenericBuildingBlueprint` cast + v2 guard) |
| [`src/lib/blueprints/__tests__/v2Schema.fixtures.test.ts`](src/lib/blueprints/__tests__/v2Schema.fixtures.test.ts) | Removed obsolete “v2 not implemented” expectation |

### Validation rules implemented (hard errors)

- `structureType` must be `generic_building`; `schemaVersion` must be `2`
- `components` non-empty; each component is an object with valid slug `id` (`/^[a-z][a-z0-9-]*$/`); ids unique
- Exactly one `room` component (root); room `width`/`depth`/`wallHeight`/`wallThickness` in approved ranges; hollow interior minimum span
- Blueprint `materials` and per-component overrides use classic pack keys (`CLASSIC_BLOCK_PACK`)
- `targetSurface` strings parse via `parseRoomSurfaceRef`; target room component must exist, be type `room`, and match the root room id
- Face must be `front` \| `back` \| `left` \| `right` \| `roof`; door/window/porch/chimney cannot target `roof` (`surface_roof_not_allowed`)
- Roof uses `targetRoom` referencing an existing root room (`room` type)
- Steps: `attach.targetDoor` required, must reference an existing `door` component; at most one step per door
- Porch: `aroundDoor` must reference an existing door when set; `door_only` requires `aroundDoor`; `full_facade` forbids `aroundDoor`
- Door/window opening fit on façade (width/height/count vs interior span); **window count above façade capacity → error** (`window_count_exceeds_facade`)
- Unknown `component.type` → error

### Normalization behavior (notes)

- Missing `attach.placement.horizontal` → `center` (note: `default_placement_horizontal`)
- Roof: default/clamp `layers` (1–3), default/clamp `overhang` (0–1), default shed `orientation` to `front_back`; clear layers when `kind: none`
- Missing `window_group.heightBand` → `auto`
- Safe numeric clamps on roof fields emit notes when values change

### Warnings implemented

- `no_door` — blueprint has no door component
- `no_windows` — no `window_group` components
- `chimney_on_front` — chimney attached to `main-room.front` (or root front face)
- `porch_depth_large` — porch `depth` > 4
- `window_count_high` — window count ≥ 80% of computed façade slot capacity (error if above 100%)

### Tests added/updated

- **New:** `validateGenericBuildingV2.test.ts` — presets pass; duplicate id; bad slug; missing/multiple rooms; invalid/unknown/non-room/non-root surfaces; roof `targetRoom`; step/porch door refs; invalid materials; placement default; no door/window warnings; door too wide; window over-capacity **error**
- **Updated:** `v2Schema.fixtures.test.ts` — fixture-only (no dispatch stub)
- **Unchanged:** all existing V1 generator/validation tests still pass

### Confirmations

- **V1 runtime unchanged** — v1 `validateGenericBuildingBlueprint` + `resolved` + `generateStructure` path untouched; preview/lab still load v1 presets only
- **No V2 generation/UI/operations** — no resolver, `ComponentPlanV2` lowering, v2 emitters, `generateStructure` v2 branch, `/generic-lab` v2 UI, `applyOperations`, or `resolved` on v2 validation result

### Checks

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm lint` | **Pass** |
| `pnpm test:generator` | **100** tests passed, **17** files |

### Next steps (Phase 3)

- Resolver: surface catalog, `ResolvedGenericBuildingV2` (or equivalent internal struct)
- Lower `GenericBuildingBlueprintV2` → `ComponentPlanV2`

---

## Addendum — GenericBuildingBlueprint v2 Phase 3 — resolver + ComponentPlanV2 lowering

**Branch:** `feature/component-authoring-model`  
**Phase implemented:** Phase 3 — Resolution + ComponentPlan v2 lowering (per [`PLAN.md`](PLAN.md) §13)

### Summary

Added internal **resolved semantic graph** types, `resolveGenericBuildingV2()`, aperture mask derivation, and `compileGenericBuildingV2Plan()` lowering to **ComponentPlanV2**. Pipeline: validate → normalize → resolve → compile plan. **No voxel emitters**, no `generateStructure` v2 success path, no preview/lab V2 UI.

### Files created

| Path | Purpose |
|------|---------|
| [`src/lib/blueprints/types/resolvedGenericBuildingV2.ts`](src/lib/blueprints/types/resolvedGenericBuildingV2.ts) | Internal `ResolvedGenericBuildingV2`, resolved component union, surfaces, anchors, apertures |
| [`src/lib/blueprints/resolveMaterialPaletteV2.ts`](src/lib/blueprints/resolveMaterialPaletteV2.ts) | Blueprint + override → `ResolvedMaterialPaletteV2` (classic pack keys) |
| [`src/lib/blueprints/resolveGenericBuildingV2.ts`](src/lib/blueprints/resolveGenericBuildingV2.ts) | `resolveGenericBuildingV2(normalized)` |
| [`src/lib/generation/components/v2/facadePlacementV2.ts`](src/lib/generation/components/v2/facadePlacementV2.ts) | Horizontal door span + symmetric/even window slot helpers |
| [`src/lib/generation/components/v2/deriveApertureMasksV2.ts`](src/lib/generation/components/v2/deriveApertureMasksV2.ts) | `deriveApertureMasksV2` → `shellSkipMask` / `windowMask` / `doorMask` |
| [`src/lib/generation/components/v2/compileGenericBuildingV2Plan.ts`](src/lib/generation/components/v2/compileGenericBuildingV2Plan.ts) | `compileGenericBuildingV2Plan(resolved)` |
| [`src/lib/blueprints/__tests__/resolveGenericBuildingV2.test.ts`](src/lib/blueprints/__tests__/resolveGenericBuildingV2.test.ts) | Resolver tests (8 cases) |
| [`src/lib/generation/components/__tests__/compileGenericBuildingV2Plan.test.ts`](src/lib/generation/components/__tests__/compileGenericBuildingV2Plan.test.ts) | Lowering/plan tests (9 cases) |

### Files updated

| Path | Changes |
|------|---------|
| [`src/lib/generation/components/v2/types.ts`](src/lib/generation/components/v2/types.ts) | Enriched `PlanDoorV2` / `PlanWindowGroupV2` / porch/chimney/step params; `doorMask` in `DerivedOpeningsV2` |
| [`src/lib/blueprints/__tests__/v2Schema.fixtures.test.ts`](src/lib/blueprints/__tests__/v2Schema.fixtures.test.ts) | `PlanStepV2` fixture includes `anchor` |

### Resolved types added (internal)

- `ResolvedGenericBuildingV2` — `rootRoomId`, `origin`, `grid`, `materials`, `surfaces`, `anchors`, `openingsByFacade`, `components`
- `ResolvedRoomSurfaceV2` — five faces per root room (`main-room.{front,back,left,right,roof}`)
- `ResolvedDoorAnchorV2` / `ResolvedDoorApertureV2` / `ResolvedWindowApertureV2`
- `ResolvedFacadeOpeningsV2` — doors/windows grouped per `EntranceSide`
- Typed resolved components: room, roof, door, window_group, porch, chimney, step

### Resolver behavior

- Assumes Phase 2–validated input; throws `ResolveGenericBuildingV2Error` on broken invariants
- Single root room; compiler origin `{ x: 0, y: 0, z: 0 }`
- Surface catalog from root room dimensions + wall thickness (reuses `facadeInteriorSpan`)
- Doors resolved first; then windows (door span excluded from window slots via `pickWindowSlotsFromAllowed`)
- Material inheritance: component override → blueprint palette → `blockTypeId("classic", …)`
- Roof `targetRoom`, step `targetDoor`, porch `aroundDoor` resolved to component ids
- `PlanBoundsV2` grid: room size + porch depth along outward normal + 1 cell for front/back/left/right steps

### Lowering behavior

- `compileGenericBuildingV2Plan` emits component-oriented plan kinds: `room_shell`, `door`, `window_group`, `roof`, `porch`, `chimney`, `step`
- Each plan component carries `sourceComponentId`; doors/windows include full aperture descriptors
- `deriveApertureMasksV2` fills plan-level masks (room-local keys, v1-compatible door/window Y rules)

### Aperture / bounds behavior

- Doors: horizontal placement (`left` \| `center` \| `right`) → façade span; mask cells `y = 1..height` on wall plane
- Windows: `symmetric` \| `even` slots on allowed coordinates; `heightBand` → `wy`; forbidden door span on same façade
- **simple_cabin_v2** deterministic bounds: `9×8×5` body, `2` roof layers, `0` overhang (depth `+1` for front step)

### Tests added/updated

- **New:** `resolveGenericBuildingV2.test.ts`, `compileGenericBuildingV2Plan.test.ts`
- **Preserved:** all V1 generator/validation tests pass

### Confirmations

- **V1 runtime unchanged** — v1 validate/resolve/generate/preview/lab paths untouched
- **No V2 voxel emission / generation / UI / operations** — `generateStructure` still throws for `schemaVersion: 2`; no emitters, no preview v2 presets

### Checks

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm lint` | **Pass** |
| `pnpm test:generator` | **117** tests passed, **19** files |

### Next steps (Phase 4)

- `emitFromComponentPlanV2`, porch emitter, `generateStructure` v2 dispatch
- Generator invariant tests (non-empty voxels per v2 preset)

---

## Addendum — GenericBuildingBlueprint v2 Phase 4 — emitters + generation

**Branch:** `feature/component-authoring-model`  
**Phase implemented:** Phase 4 — V2 emitters + generation (per [`PLAN.md`](PLAN.md) §13)

### Summary

Implemented deterministic **voxel emission** from `ComponentPlanV2`, `generateGenericBuildingV2()`, and **`generateStructure` dispatch for `schemaVersion: 2`**. V2 presets now validate → resolve → compile → emit to `VoxelBlock[]`. No preview/lab wiring.

### Files created

| Path | Purpose |
|------|---------|
| [`src/lib/generation/generators/generateGenericBuildingV2.ts`](src/lib/generation/generators/generateGenericBuildingV2.ts) | `generateGenericBuildingV2(resolved)` entry |
| [`src/lib/generation/components/v2/planContextV2.ts`](src/lib/generation/components/v2/planContextV2.ts) | World origin + room shell context for emitters |
| [`src/lib/generation/components/v2/emitFromComponentPlanV2.ts`](src/lib/generation/components/v2/emitFromComponentPlanV2.ts) | Plan dispatch, merge, grounding filter |
| [`src/lib/generation/components/v2/emitters/roomShell.ts`](src/lib/generation/components/v2/emitters/roomShell.ts) | Foundation + hollow shell (mask skip) |
| [`src/lib/generation/components/v2/emitters/door.ts`](src/lib/generation/components/v2/emitters/door.ts) | Door fill from `doorMask` + lintel trim |
| [`src/lib/generation/components/v2/emitters/windows.ts`](src/lib/generation/components/v2/emitters/windows.ts) | Windows from `windowMask` (pane when allowed) |
| [`src/lib/generation/components/v2/emitters/roof.ts`](src/lib/generation/components/v2/emitters/roof.ts) | `pitched_gable`, `shed` (+ orientation), `none` |
| [`src/lib/generation/components/v2/emitters/porch.ts`](src/lib/generation/components/v2/emitters/porch.ts) | Exterior porch deck (`full_facade` / `door_only`) |
| [`src/lib/generation/components/v2/emitters/chimney.ts`](src/lib/generation/components/v2/emitters/chimney.ts) | Façade chimney stack |
| [`src/lib/generation/components/v2/emitters/step.ts`](src/lib/generation/components/v2/emitters/step.ts) | Door-anchored exterior step |
| [`src/lib/generation/__tests__/generatorGenericPresetInvariantsV2.test.ts`](src/lib/generation/__tests__/generatorGenericPresetInvariantsV2.test.ts) | V2 invariant + feature smoke tests |

### Files updated

| Path | Changes |
|------|---------|
| [`src/lib/generation/generateStructure.ts`](src/lib/generation/generateStructure.ts) | `schemaVersion: 2` → validate/normalize/resolve/generate V2 |
| [`src/lib/generation/components/priorities.ts`](src/lib/generation/components/priorities.ts) | Added `PORCH` merge priority |

### V2 generation entry behavior

- `generateGenericBuildingV2(resolved)` → `compileGenericBuildingV2Plan` → `emitFromComponentPlanV2` → `VoxelBlock[]`
- `generateStructure` for v2: `validateGenericBuildingBlueprintV2` → `resolveGenericBuildingV2` → `generateGenericBuildingV2`

### emitFromComponentPlanV2 behavior

Deterministic order: **room_shell → porch → door(s) → windows (plan mask) → roof → chimney → step**  
Uses `mergePlacements` + `filterGroundedConnected26` when `allowFloatingBlocks` is false (same as v1).

### Emitter behavior by plan kind

| Kind | Behavior |
|------|----------|
| `room_shell` | Full room footprint floor at y=0; exterior walls y≥1; skips `shellSkipMask` |
| `door` | Fills `doorMask` cells with door material; accent lintel/jambs from aperture span |
| `window_group` | Emits from plan `windowMask` only (not recomputed) |
| `roof` | Gable/shed adapted from v1 roof math on **room** W×D; `none` emits nothing |
| `porch` | y=0 deck slabs outside façade (`full_facade` or door span) |
| `chimney` | Accent column on resolved façade side/horizontal |
| `step` | Single floor block outside target door anchor |

### Tests added/updated

- **New:** `generatorGenericPresetInvariantsV2.test.ts` — all 3 v2 presets; hard invariants; placement semantics; `generateStructure` v2 dispatch; door/window/chimney/step/porch smoke
- **Preserved:** all V1 generator tests pass

### Confirmations

- **V1 runtime unchanged** — v1 `generateStructure` / preview / generic-lab still use schemaVersion 1 presets only
- **No preview/lab/operations/UI** — v2 presets not wired into `/preview` or `/generic-lab`

### Checks

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm lint` | **Pass** |
| `pnpm test:generator` | **123** tests passed, **20** files |
| `pnpm run build` | **Pass** |

### Next steps (Phase 5)

- Ship v2 presets in `/preview` grouped picker
- Manual inspection of v1 + v2 generated structures

---

## Addendum — GenericBuildingBlueprint v2 Phase 5 — preview preset exposure

**Branch:** `feature/component-authoring-model`  
**Phase implemented:** Phase 5 — Presets + `/preview` (per [`PLAN.md`](PLAN.md) §13)

### Summary

`/preview` now exposes all three **GenericBuildingBlueprint v2** presets alongside existing **v1** generic presets and the **partial block showcase**. Source toggle groups: **Generic v1** / **Generic v2** / **Partials**. Default source remains **Generic v1** (`simple_rustic_cabin`).

### Files created

| Path | Purpose |
|------|---------|
| [`src/lib/blueprints/previewPresetCatalog.ts`](src/lib/blueprints/previewPresetCatalog.ts) | Preview source types, v1/v2 preset option lists, id validation helpers |
| [`src/lib/blueprints/__tests__/previewPresetCatalog.test.ts`](src/lib/blueprints/__tests__/previewPresetCatalog.test.ts) | Catalog coverage (3 tests) |

### Files updated

| Path | Changes |
|------|---------|
| [`src/app/preview/PreviewInspectionClient.tsx`](src/app/preview/PreviewInspectionClient.tsx) | v1/v2/Partials sources; `validateBlueprint` + `generateStructure`; v2 validation errors/warnings/notes |
| [`src/components/voxel/StructureInspectionPanel.tsx`](src/components/voxel/StructureInspectionPanel.tsx) | Three-way source toggle; schema label; validation errors/warnings sections |
| [`src/app/preview/page.tsx`](src/app/preview/page.tsx) | Metadata mentions v1 + v2 presets |

### How `/preview` grouping works

| Source button | Preset dropdown | Default preset |
|---------------|-----------------|----------------|
| **Generic v1** | V1 `GENERIC_BUILDING_PRESETS` | `simple_rustic_cabin` |
| **Generic v2** | V2 `GENERIC_BUILDING_V2_PRESETS` | `simple_cabin_v2` |
| **Partials** | (none — static showcase) | — |

Panel title and description reflect the active group; v2 shows `schemaVersion 2 · component-authored blueprint`.

### V2 presets exposed

| Preset id | Label |
|-----------|--------|
| `simple_cabin_v2` | Simple cabin (v2) |
| `stone_workshop_v2` | Stone workshop (v2) |
| `porch_house_v2` | Porch house (v2) |

### Preview behavior

| Source | Validate | Generate | Viewer |
|--------|----------|----------|--------|
| Generic v1 | `validateBlueprint()` | `generateStructure()` | unchanged |
| Generic v2 | `validateBlueprint()` → structured issues | `generateStructure()` (v2 pipeline) | same `VoxelViewer` |
| Partials | — | static structure | unchanged |

On failure: empty canvas message + validation errors in panel (and inline when no structure). Warnings/notes shown in panel when present.

### Tests added/updated

- **New:** `previewPresetCatalog.test.ts`
- **Preserved:** all generator tests (126 total)

### Manual verification checklist

- [ ] `/preview` loads without runtime console errors
- [ ] **Generic v1** presets still render (e.g. simple rustic cabin, shed roof workshop)
- [ ] **Partials** showcase still renders
- [ ] **Generic v2** — each preset renders non-empty structure:
  - [ ] `simple_cabin_v2` — cabin, door, windows, chimney, front step
  - [ ] `porch_house_v2` — visible front porch deck
  - [ ] `stone_workshop_v2` — workshop proportions and limestone/slate materials
- [ ] Switching v1 ↔ v2 ↔ Partials updates title, schema label, and preset list
- [ ] `/generic-lab` unchanged (still v1-only)

### Confirmations

- **No generic-lab V2 UI** — no component tree, editing, operations, or AI
- **V1 default preserved** — initial source is `preset_generic_v1`

### Checks

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | **Pass** |
| `pnpm lint` | **Pass** |
| `pnpm test:generator` | **126** tests passed, **21** files |
| `pnpm run build` | **Pass** |

### Next steps (Phase 6)

- `/generic-lab` read-only component tree for v2
- Optional v2 preset editing in lab (6b/6c)
