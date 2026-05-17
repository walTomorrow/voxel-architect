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
