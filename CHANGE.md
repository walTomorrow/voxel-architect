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
