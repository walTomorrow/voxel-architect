# Plan — Retire tower-era product path (full pivot to `generic_building`)

**Branch:** `cleanup/remove-legacy-visualizer`  
**Status:** Planning only — no implementation until review.  
**Supersedes:** Prior PLAN.md (visualizer-only retirement while keeping `medieval_tower` on `/preview`).

---

## 1. Goal

Complete the architecture pivot: **remove the tower-era product and generator path** and make the active product:

| Layer | Active surface |
|-------|----------------|
| Authoring | `GenericBuildingBlueprint` |
| Internal IR | `ComponentPlan` (not public) |
| Generation | Component generators + `compileGenericBuildingToComponentPlan` + `emitFromComponentPlan` |
| Developer lab | `/generic-lab` |
| Demo / inspection | `/preview` → **Generic** \| **Partials** |

**Remove active tower support:** `/visualizer`, `medieval_tower` generator, tower presets, preview Towers tab, tower validation branch, tower exchange helpers, tower-specific tests, and active docs that describe towers as current behavior.

**Keep:** `generic_building`, `/generic-lab`, partial-block showcase, historical screenshots (past-tense captions), `blacksmith_workshop` must not be revived.

**Out of scope:** AI, image upload, `InteriorPlan`, region selection, new families, generic `blueprintExchange` v2, public `ComponentPlan` JSON.

---

## 2. Tower-related code paths (survey)

### 2.1 App routes & UI

| Path / symbol | Role | Action |
|---------------|------|--------|
| [`src/app/visualizer/page.tsx`](src/app/visualizer/page.tsx) | Tower lab route shell | **Delete** |
| [`src/app/visualizer/VisualizerClient.tsx`](src/app/visualizer/VisualizerClient.tsx) (~1,169 lines) | Tower blueprint editor, import/export, `StructureInspectionPanel` | **Delete** |
| [`src/app/preview/PreviewInspectionClient.tsx`](src/app/preview/PreviewInspectionClient.tsx) | `preset_towers` mode, tower presets, default `useState("preset_towers")` | **Update** — Generic \| Partials only; default **Generic** |
| [`src/app/preview/page.tsx`](src/app/preview/page.tsx) | Metadata mentions “medieval tower presets” | **Update** copy |
| [`src/app/page.tsx`](src/app/page.tsx) | Landing CTA copy “sample tower” | **Update** — generic building / preview demo |
| [`src/components/voxel/StructureInspectionPanel.tsx`](src/components/voxel/StructureInspectionPanel.tsx) | `PreviewLabSource` includes `preset_towers`, “Towers” tab | **Update** — remove tower tab; simplify preset UI for Generic only |
| [`src/app/generic-lab/*`](src/app/generic-lab/) | Active lab | **Keep** (nav/copy only if needed) |

### 2.2 Blueprint layer

| Path / symbol | Role | Action |
|---------------|------|--------|
| [`src/lib/blueprints/types.ts`](src/lib/blueprints/types.ts) | `StructureType`, `MedievalTowerBlueprint`, tower-only interfaces, unions | **Update** — remove tower types; `StructureBlueprint` = `GenericBuildingBlueprint`; `ResolvedStructure` = `ResolvedGenericBuilding` |
| [`src/lib/blueprints/validateBlueprint.ts`](src/lib/blueprints/validateBlueprint.ts) | Dispatches `validateMedievalTowerBlueprint` + generic | **Update** — generic only (thin wrapper or re-export `validateGenericBuildingBlueprint`) |
| [`src/lib/blueprints/validateGenericBuilding.ts`](src/lib/blueprints/validateGenericBuilding.ts) | Generic validator | **Keep** |
| [`src/lib/blueprints/sampleBlueprints.ts`](src/lib/blueprints/sampleBlueprints.ts) | `MEDIEVAL_TOWER_PRESETS`, `SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`, northwatch, etc. | **Delete** entire file |
| [`src/lib/blueprints/sampleGenericBuildingBlueprints.ts`](src/lib/blueprints/sampleGenericBuildingBlueprints.ts) | Generic presets | **Keep** |
| [`src/lib/blueprints/blueprintExchange.ts`](src/lib/blueprints/blueprintExchange.ts) | Tower-only v1 envelope; only `VisualizerClient` | **Delete** |
| [`src/lib/blueprints/blueprintImportStructure.ts`](src/lib/blueprints/blueprintImportStructure.ts) | Import shape guard; only `blueprintExchange` | **Delete** |
| [`src/lib/blueprints/blueprintSource.ts`](src/lib/blueprints/blueprintSource.ts) | Visualizer sidebar provenance | **Delete** |

**Tower-only types to remove from `types.ts` (if unused after delete):**  
`BlueprintDimensions`, `BlueprintMassing`, `BlueprintLevels`, tower `BlueprintOpenings`, tower `BlueprintRoof`, tower `BlueprintFeatures`, `FootprintShape`, `VerticalEmphasis`, `SymmetryMode`, `RoofStyle`, `WindowPlacement`, `WindowFloors`, `MedievalTowerBlueprint`, `ResolvedMedievalTower`.

**Keep in `types.ts`:** `BlueprintMetadata`, `BlueprintMaterials`, `BlueprintConstraints`, all `GenericBuilding*`, `GenericBuildingBlueprint`, `ResolvedGenericBuilding`, `EntranceSide` (shared with generic entrance).

### 2.3 Generation layer

| Path / symbol | Role | Action |
|---------------|------|--------|
| [`src/lib/generation/generators/generateMedievalTower.ts`](src/lib/generation/generators/generateMedievalTower.ts) (~811 lines) | Tower family generator | **Delete** |
| [`src/lib/generation/generators/generateGenericBuilding.ts`](src/lib/generation/generators/generateGenericBuilding.ts) | Generic entry | **Keep** |
| [`src/lib/generation/generateStructure.ts`](src/lib/generation/generateStructure.ts) | `switch` on `medieval_tower` \| `generic_building` | **Update** — `generic_building` only |
| [`src/lib/generation/components/*`](src/lib/generation/components/) | Component pipeline | **Keep** |
| [`src/lib/generation/families/buildingFamilies.ts`](src/lib/generation/families/buildingFamilies.ts) | Catalog: `medieval_tower` + `generic_building` | **Update** — `generic_building` only; remove `medieval_tower` entry |
| [`src/lib/generation/styles/buildingStyles.ts`](src/lib/generation/styles/buildingStyles.ts) | Six tower aesthetic styles; only `sampleBlueprints` + test | **Delete** |
| [`src/lib/generation/facade/paneAxis.ts`](src/lib/generation/facade/paneAxis.ts) | Pane axis helper | **Keep** — used by `sparseWindows.ts` (generic) |
| [`src/lib/generation/placement/placementUtils.ts`](src/lib/generation/placement/placementUtils.ts) | `filterGrounded` (tower), `filterGroundedConnected26` (generic) | **Keep** — generic uses 26-connected; `filterGrounded` still tested in `placementUtils.test.ts` |

### 2.4 Voxel / viewer defaults

| Path | Role | Action |
|------|------|--------|
| [`src/lib/voxel/sampleStructure.ts`](src/lib/voxel/sampleStructure.ts) `SAMPLE_STRUCTURE` | Hand-built stone “tower” default for `VoxelViewer` | **Investigate → update** — change default to empty `{ blocks: [] }` or document-only; avoid tower-shaped default when no structure passed |
| [`src/components/voxel/VoxelViewer.tsx`](src/components/voxel/VoxelViewer.tsx) | `structure = SAMPLE_STRUCTURE` default | **Update** if `SAMPLE_STRUCTURE` retired |
| [`PARTIAL_BLOCK_SHOWCASE_STRUCTURE`](src/lib/voxel/sampleStructure.ts) | Preview Partials tab | **Keep** |

### 2.5 References by search term (summary)

| Term | Delete | Update to generic | Historical docs only | Investigate |
|------|--------|-------------------|----------------------|-------------|
| `/visualizer` | Route files | `next.config` redirect → `/generic-lab` | Timeline §3,7–8; screenshot README | — |
| `VisualizerClient` | Entire file | — | — | — |
| `medieval_tower` | Generator, family entry, types, tests | `buildingFamilies`, docs | Grammar, FEATURE_CATALOG §4.1, timeline | — |
| `MedievalTowerBlueprint` | types, samples, fixtures, visualizer | Unions → generic only | BLUEPRINT_JSON_FORMAT | — |
| `MEDIEVAL_TOWER_PRESETS` / `getMedievalTowerPreset` | `sampleBlueprints.ts`, preview, tests | — | — | — |
| `generateMedievalTower` | File | `generateStructure.ts` | — | — |
| `validateMedievalTowerBlueprint` | Inline in `validateBlueprint.ts` | — | — | — |
| `preset_towers` / **Towers** tab | — | Preview + `StructureInspectionPanel` | — | — |
| `northwatch` | Presets | — | Comments, screenshots, material meta note | — |
| `blueprintExchange` | 3 blueprint files | — | BLUEPRINT_JSON_FORMAT (historical spec) | — |
| `buildingStyles` | File + test | — | DESIGN_PRINCIPLES style paragraph | Future AI styles TBD |

---

## 3. Preview after tower removal

### Recommended behavior

| Question | Decision |
|----------|----------|
| Tabs | **Generic \| Partials** only (remove **Towers**). |
| Default tab | **`preset_generic`** (`DEFAULT_GENERIC_PRESET_ID` / `simple_rustic_cabin`). |
| Route role | **Keep `/preview`** as the main public demo / inspection surface (orbit, layers, breakdown). |
| Developer lab link | **Keep** “Developer lab →” → `/generic-lab` (already correct). |
| Copy | Remove “tower”, “medieval tower”, “Towers and Generic” wording; describe generic presets + partial showcase. |
| `PreviewLabSource` type | `"preset_generic" \| "partial_showcase"` only. |
| Preset `<select>` | Shown only in **Generic** mode (or always when not Partials); lists `GENERIC_BUILDING_PRESETS` only. |
| `StructureInspectionPanel` | Remove three-way source toggle; two-way **Generic \| Partials** (or single preset list + Partials button). |

### `StructureInspectionPanel` simplification

- Remove `preset_towers` from `PreviewLabSource`.
- Remove “Towers” button and “Preset lists apply to Towers and Generic” copy.
- Default `panelDescription` → generic preset text (already partially duplicated in `PreviewInspectionClient` for generic).
- Props: drop tower-specific branches; `presetOptions` only when `previewSource === "preset_generic"`.

---

## 4. Blueprint / type changes

### Is removing `MedievalTowerBlueprint` safe?

**Yes**, after deleting all importers (survey shows no production path outside tower stack). Plan:

1. **`StructureType`** → `"generic_building"` only (or remove discriminant if redundant).
2. **`StructureBlueprint`** → alias or rename to `GenericBuildingBlueprint`.
3. **`ResolvedStructure`** → `ResolvedGenericBuilding`.
4. **`validateBlueprint(blueprint)`** → delegate only to `validateGenericBuildingBlueprint` (keep export name for tests/UI).
5. **Delete** tower-only interface blocks from `types.ts` (~90 lines of tower schema).

No reason to keep dead tower types “for documentation” — docs carry historical JSON examples in git / `BLUEPRINT_JSON_FORMAT.md` (marked retired).

### Family catalog

[`buildingFamilies.ts`](src/lib/generation/families/buildingFamilies.ts): single shipped family `generic_building`.  
[`buildingFamilies.test.ts`](src/lib/generation/__tests__/buildingFamilies.test.ts): expect length **1**; keep `blacksmith_workshop` undefined assertion.

---

## 5. Generator changes

| Action | Path |
|--------|------|
| **Delete** | [`generateMedievalTower.ts`](src/lib/generation/generators/generateMedievalTower.ts) |
| **Delete** | [`buildingStyles.ts`](src/lib/generation/styles/buildingStyles.ts) |
| **Update** | [`generateStructure.ts`](src/lib/generation/generateStructure.ts) — remove `generateMedievalTower` import and `medieval_tower` case |
| **Keep** | All `src/lib/generation/components/**` |
| **Keep** | [`generateGenericBuilding.ts`](src/lib/generation/generators/generateGenericBuilding.ts), [`placementUtils.ts`](src/lib/generation/placement/placementUtils.ts), [`paneAxis.ts`](src/lib/generation/facade/paneAxis.ts) |

---

## 6. Tests

### Delete (tower-only)

| File | Reason |
|------|--------|
| [`src/lib/generation/__tests__/generatorPresetInvariants.test.ts`](src/lib/generation/__tests__/generatorPresetInvariants.test.ts) | `MEDIEVAL_TOWER_PRESETS` only |
| [`src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts`](src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts) | `EDGE_CASE_BLUEPRINT_FIXTURES` (tower) |
| [`src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts`](src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts) | Tower blueprint fixtures |
| [`src/lib/generation/__tests__/buildingStyles.test.ts`](src/lib/generation/__tests__/buildingStyles.test.ts) | Tower styles + preset `styleId` |

### Rewrite / trim

| File | Action |
|------|--------|
| [`generatorPipeline.smoke.test.ts`](src/lib/generation/__tests__/generatorPipeline.smoke.test.ts) | Use `GENERIC_BUILDING_PRESETS[0]` or `DEFAULT_GENERIC_PRESET_ID` instead of `SAMPLE_MEDIEVAL_TOWER_BLUEPRINT` |
| [`generatorWindowPanes.test.ts`](src/lib/generation/__tests__/generatorWindowPanes.test.ts) | **Keep** `describe("paneAxisForWindowCell")` (3 tests); **delete** `medieval tower window-adjacent…` and `medieval tower window panes` describes; optional: add 1–2 generic preset pane assertions (or rely on `generatorGenericPresetInvariants` + component tests) |
| [`buildingFamilies.test.ts`](src/lib/generation/__tests__/buildingFamilies.test.ts) | Single family `generic_building`; update length expectations |

### Keep (target suite focus)

| Area | Files |
|------|--------|
| Generic validation | [`validateGenericBuilding.test.ts`](src/lib/blueprints/__tests__/validateGenericBuilding.test.ts) |
| Generic preset invariants | [`generatorGenericPresetInvariants.test.ts`](src/lib/generation/__tests__/generatorGenericPresetInvariants.test.ts) |
| Component compiler | [`compileGenericBuildingPlan.test.ts`](src/lib/generation/components/__tests__/compileGenericBuildingPlan.test.ts) |
| Component generators | [`componentGenerators.test.ts`](src/lib/generation/components/__tests__/componentGenerators.test.ts), [`entranceDoorway.test.ts`](src/lib/generation/components/__tests__/entranceDoorway.test.ts), [`openingMask.test.ts`](src/lib/generation/components/__tests__/openingMask.test.ts), [`shedRoof.test.ts`](src/lib/generation/components/__tests__/shedRoof.test.ts) |
| Pipeline smoke | [`generatorPipeline.smoke.test.ts`](src/lib/generation/__tests__/generatorPipeline.smoke.test.ts) (after rewrite) |
| Placement | [`placementUtils.test.ts`](src/lib/generation/__tests__/placementUtils.test.ts) |
| Pane axis | [`generatorWindowPanes.test.ts`](src/lib/generation/__tests__/generatorWindowPanes.test.ts) (trimmed) |
| Voxel | [`partialBlockShowcase.test.ts`](src/lib/voxel/__tests__/partialBlockShowcase.test.ts), [`materialMetaHelpers.test.ts`](src/lib/voxel/__tests__/materialMetaHelpers.test.ts), [`voxelBlockShape.test.ts`](src/lib/voxel/__tests__/voxelBlockShape.test.ts), [`structureAnalysis.test.ts`](src/lib/voxel/__tests__/structureAnalysis.test.ts) |
| Families | [`buildingFamilies.test.ts`](src/lib/generation/__tests__/buildingFamilies.test.ts) (rewritten) |
| Shared utils | [`testUtils.ts`](src/lib/generation/__tests__/testUtils.ts) |

**Expected test count:** ~**100 − 6 − 6 − ~8 − ~7 ≈ 73–80** (verify after run); update [`GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) count when implementing.

**`blueprintExchange` deletion:** **No test breakage** (zero test imports).

---

## 7. Documentation

### Active-product updates (required)

| Document | Changes |
|----------|---------|
| [`docs/generation/GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) | Single active path: `generic_building` + component pipeline; towers **historical**; developer lab = `/generic-lab`; remove `MedievalTowerBlueprint` as co-equal authoring target; trim `buildingStyles` / tower preset paragraphs |
| [`docs/generation/GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md) | Remove tower preset/edge-case suites; update test count; diagnostics → `/generic-lab` |
| [`docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md) | Remove “`medieval_tower` remains legacy vertical family” as **active**; note tower family **retired** |
| [`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md) | Tower exchange = **historical** (retired with `/visualizer`); active authoring = raw `GenericBuildingBlueprint` (as in `/generic-lab` copy button); remove live import/export UI references |
| [`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md) | Active table: **`generic_building` only**; §4.1 Medieval Tower → **Historical / retired**; remove `/visualizer` from active surfaces |
| [`docs/project-history/DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md) | §3,7–8: past tense (“tower-era lab, **later retired**”); §11: `/generic-lab` replaced visualizer **and** tower authoring; **Current product** → Preview Generic \| Partials, `/generic-lab`, no `/visualizer` |
| [`docs/project-history/screenshots/README.md`](docs/project-history/screenshots/README.md) | Rows 03/08/09: historical `/visualizer`; row 12: remove “tower lab remains”; checklist: `/visualizer` historical |

### Historical only (keep files, adjust wording)

- All `docs/project-history/screenshots/*visualizer*.png` — **do not delete**.
- Timeline embeds for tower era — keep; captions note retirement after §11.
- [`CHANGE.md`](CHANGE.md) — addendum when implementing (not in planning step).

### Optional / low priority

- [`docs/VISION.md`](docs/VISION.md) — “tower” as future **recipe** over components is still valid vision language; clarify not the old `medieval_tower` generator.
- [`README.md`](README.md) — generator test blurb still accurate.

---

## 8. Redirects / routes

| Route | After cleanup |
|-------|----------------|
| `/` | Unchanged → `/preview` CTA |
| `/preview` | Generic \| Partials inspection |
| `/generic-lab` | Active developer lab |
| `/visualizer` | **No page** — **`redirect` (308)** → `/generic-lab` in [`next.config.ts`](next.config.ts) |

**Other URLs:** No dedicated tower preview URLs existed. Bookmarks to `/visualizer` are the only legacy route concern.

**Build manifest:** Expect routes `/`, `/preview`, `/generic-lab`, `_not-found` only (+ redirect config).

---

## 9. Risks and open questions

| Risk | Mitigation |
|------|------------|
| **Broad type union removal** | Single-type `StructureBlueprint`; run `tsc` after each layer (types → validate → generate → UI) |
| **Tests expecting `medieval_tower`** | Delete/replace per §6; run `pnpm test:generator` until green |
| **Preview default was towers** | Explicit `useState("preset_generic")` |
| **`VoxelViewer` default `SAMPLE_STRUCTURE`** | Still a small tower mesh — change default to `{ blocks: [] }` or minimal placeholder to avoid misleading empty viewer |
| **Docs drift** | Grep `visualizer`, `medieval_tower`, `Towers`, `MEDIEVAL_TOWER` after implementation |
| **Family catalog tests** | Update expected family count to 1 |
| **GENERATOR_RELIABILITY “100 tests”** | Update doc to new count |
| **Full-repo `pnpm lint`** | Deleting `VisualizerClient.tsx` removes one `set-state-in-effect` failure; `PreviewInspectionClient` may still fail unless fixed in this branch (**investigate** — small derived-layer fix optional) |
| **Deleting `blueprintExchange`** | Safe — no tests; document envelope as historical in BLUEPRINT_JSON_FORMAT |
| **Cloudflare deployed links** | Redirect handles `/visualizer` |

**Open questions (confirm before implement):**

1. **`SAMPLE_STRUCTURE`:** Remove entirely vs keep for dev-only fixture?
2. **`validateBlueprint` name:** Keep as alias to generic validator vs rename exports?
3. **`buildingStyles.ts`:** Delete now vs keep file with zero consumers for future AI (recommend **delete**).
4. **Lint:** Fix `PreviewInspectionClient` layer `useEffect` in same branch?

---

## 10. Verification

```bash
pnpm test:generator
pnpm exec tsc --noEmit
pnpm run build
pnpm exec eslint src/app/preview src/app/generic-lab src/lib/blueprints src/lib/generation next.config.ts
pnpm lint
```

| Check | Expectation |
|-------|-------------|
| `test:generator` | All remaining tests pass; count ↓ from 100 |
| `tsc` | No references to deleted symbols |
| `build` | No `/visualizer` page; redirect configured |
| Manual | `/preview` defaults to Generic; Partials works; `/generic-lab` works; `/visualizer` redirects |
| `pnpm lint` | Strict improvement if visualizer removed; preview may still warn |

---

## 11. Implementation sequence

### Phase A — Remove tower app & libs

| Step | Action | Paths |
|------|--------|-------|
| A1 | Add redirect | [`next.config.ts`](next.config.ts) |
| A2 | Delete visualizer route | [`src/app/visualizer/page.tsx`](src/app/visualizer/page.tsx), [`VisualizerClient.tsx`](src/app/visualizer/VisualizerClient.tsx) |
| A3 | Delete tower-only blueprint modules | [`blueprintExchange.ts`](src/lib/blueprints/blueprintExchange.ts), [`blueprintImportStructure.ts`](src/lib/blueprints/blueprintImportStructure.ts), [`blueprintSource.ts`](src/lib/blueprints/blueprintSource.ts), [`sampleBlueprints.ts`](src/lib/blueprints/sampleBlueprints.ts) |
| A4 | Delete tower generator & styles | [`generateMedievalTower.ts`](src/lib/generation/generators/generateMedievalTower.ts), [`buildingStyles.ts`](src/lib/generation/styles/buildingStyles.ts) |

### Phase B — Types & validation

| Step | Action | Paths |
|------|--------|-------|
| B1 | Remove tower types/unions | [`types.ts`](src/lib/blueprints/types.ts) |
| B2 | Slim validator dispatcher | [`validateBlueprint.ts`](src/lib/blueprints/validateBlueprint.ts) |
| B3 | Generic-only generate dispatch | [`generateStructure.ts`](src/lib/generation/generateStructure.ts) |
| B4 | Single-family catalog | [`buildingFamilies.ts`](src/lib/generation/families/buildingFamilies.ts) |

### Phase C — Preview & shared UI

| Step | Action | Paths |
|------|--------|-------|
| C1 | Preview client: Generic default, no towers | [`PreviewInspectionClient.tsx`](src/app/preview/PreviewInspectionClient.tsx) |
| C2 | Inspection panel: two modes | [`StructureInspectionPanel.tsx`](src/components/voxel/StructureInspectionPanel.tsx) |
| C3 | Preview + landing metadata/copy | [`preview/page.tsx`](src/app/preview/page.tsx), [`page.tsx`](src/app/page.tsx) |
| C4 | VoxelViewer default structure (if changed) | [`VoxelViewer.tsx`](src/components/voxel/VoxelViewer.tsx), [`sampleStructure.ts`](src/lib/voxel/sampleStructure.ts) |

### Phase D — Tests

| Step | Action | Paths |
|------|--------|-------|
| D1 | Delete tower test files | [`generatorPresetInvariants.test.ts`](src/lib/generation/__tests__/generatorPresetInvariants.test.ts), [`generatorEdgeCaseInvariants.test.ts`](src/lib/generation/__tests__/generatorEdgeCaseInvariants.test.ts), [`fixtures/edgeCaseBlueprints.ts`](src/lib/generation/__tests__/fixtures/edgeCaseBlueprints.ts), [`buildingStyles.test.ts`](src/lib/generation/__tests__/buildingStyles.test.ts) |
| D2 | Rewrite smoke, families, window panes | [`generatorPipeline.smoke.test.ts`](src/lib/generation/__tests__/generatorPipeline.smoke.test.ts), [`buildingFamilies.test.ts`](src/lib/generation/__tests__/buildingFamilies.test.ts), [`generatorWindowPanes.test.ts`](src/lib/generation/__tests__/generatorWindowPanes.test.ts) |

### Phase E — Docs & changelog

| Step | Action | Paths |
|------|--------|-------|
| E1 | Project history (past tense, current product) | [`DEVELOPMENT_TIMELINE.md`](docs/project-history/DEVELOPMENT_TIMELINE.md), [`screenshots/README.md`](docs/project-history/screenshots/README.md) |
| E2 | Generation + blueprint docs | [`GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md), [`GENERATOR_RELIABILITY.md`](docs/generation/GENERATOR_RELIABILITY.md), [`ARCHITECTURAL_COMPONENT_GRAMMAR.md`](docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md), [`BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md), [`BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md) |
| E3 | Run §10 checks; update test counts in docs | — |
| E4 | `CHANGE.md` addendum | [`CHANGE.md`](CHANGE.md) |

**Stop after E4 for review.** Do not add AI, import v2, or new families.

---

## Reference — post-cleanup architecture

```text
GenericBuildingBlueprint
  → validateBlueprint() / validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()   [internal ComponentPlan]
  → generateFromComponentPlan()
  → VoxelBlock[]
  → /preview (inspect) | /generic-lab (author)
```

**Retired (historical):** `MedievalTowerBlueprint`, `generateMedievalTower()`, `/visualizer`, tower `blueprintExchange` v1, `/preview` Towers tab.
