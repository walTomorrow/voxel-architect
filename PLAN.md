# Plan — Architectural Component Grammar Pivot

**Scoping only — waiting for review before implementation.**

---

## 1. Purpose

Generator Expansion validated that **multiple building families** can ship behind a shared pipeline (`StructureBlueprint` → `validateBlueprint` → `generateStructureFromResolved` → `VoxelBlock[]` → invariants). That work is valuable. The **next risk** is treating the long-term ~30-family taxonomy as a mandate for **~30 independent generator codebases**, each re-implementing shells, roofs, entrances, windows, chimneys, and interior placeholders.

We are **pivoting the implementation strategy**, not abandoning families.

| Concept | Role after pivot |
|--------|-------------------|
| **Building family** | Supported **semantic recipe** — which components, in what configuration, for which product entrypoints (presets, future AI classification) |
| **Architectural component** | Reusable **deterministic geometry module** (foundation, hollow shell, pitched roof, entrance, window pattern, chimney, interior zone stub, etc.) |
| **Style** | Material / detail / aesthetic overlay on top of a recipe (still metadata-first until a resolver exists) |
| **Preset** | Concrete curated blueprint snapshot (or near-resolved example) for preview and tests |

**Core principle:** AI (later) reasons about **intent, constraints, style, and components**. **Deterministic code** emits geometry. AI must **not** place individual blocks or output raw voxel coordinates as the authoritative plan.

**Why pivot now**

- **Duplicated logic:** `blacksmith_workshop` already mirrors rectangular-shell patterns that would repeat for `cottage_house`, `tavern_inn`, `market_shopfront`, etc.
- **Generic boxes:** Copy-paste family generators converge on “hollow rect + roof + door + windows” without shared composition rules.
- **Weak versatility:** Changing window rhythm or roof type across families requires N edits, not one component.
- **Brittle validation:** Each family adds another parallel schema + validator + test matrix.
- **Hard-to-scale AI mapping:** A 30-way `structureType` switch does not give models a stable vocabulary of **semantic parts** to target.
- **Interrupted cottage WIP** is a warning sign: a third near-duplicate generator was in flight before the abstraction boundary was defined.

The ~30-family taxonomy remains useful for **classification, coverage planning, and product language**. It must **not** imply ~30 isolated `generateFoo.ts` monoliths.

**Intended pipeline (target architecture)**

```text
user intent / future AI
  → supported family + style + constraints
  → architectural component recipe (component plan)
  → deterministic component generators
  → merge / resolve placements
  → VoxelBlock[]
  → validation + preview
```

---

## 2. Current working tree / interrupted cottage inventory

**Branch:** `milestone/generator-expansion`  
**Inspection date:** working tree with **uncommitted** cottage Batch A WIP (implementation paused mid-run).  
**`CHANGE.md`:** not modified by WIP (still describes blacksmith `/preview` integration only).  
**Docs under `docs/`:** not modified by WIP (still describe two shipped families; blacksmith “library/tests only, no lab UI” is **stale** relative to shipped `/preview` tabs).  
**Generator tests:** `buildingFamilies.test.ts` **not** updated (still expects 2 families) while `buildingFamilies.ts` WIP registers 3 — **test/catalog mismatch** if WIP were committed as-is.

### `git status --short` (summary)

**Modified (10 files)**

| Path | Summary |
|------|---------|
| `PLAN.md` | Replaced with Wave 2 Batch A plan (superseded by this document) |
| `src/lib/blueprints/types.ts` | `cottage_house` + `CottageHouseBlueprint` / `ResolvedCottageHouse` unions |
| `src/lib/blueprints/validateBlueprint.ts` | Import + `case "cottage_house"` |
| `src/lib/generation/generateStructure.ts` | `generateCottageHouse` dispatch |
| `src/lib/generation/families/buildingFamilies.ts` | `cottage_house` as **shipped** |
| `src/lib/generation/generators/generateMedievalTower.ts` | Imports shared `placementUtils` + `paneAxis`; removed local helpers |
| `src/lib/generation/generators/generateBlacksmithWorkshop.ts` | Same helper extraction |
| `src/lib/generation/__tests__/generatorWindowPanes.test.ts` | `paneAxis` import path → `facade/paneAxis` |
| `src/app/preview/PreviewInspectionClient.tsx` | Presets/Partials mode + family/preset dropdowns (includes cottage) |
| `src/components/voxel/StructureInspectionPanel.tsx` | `PreviewLabMode`, family dropdown, two-way source toggle |

**Untracked (new)**

| Path | Summary |
|------|---------|
| `src/lib/generation/placement/placementUtils.ts` | `mergePlacements`, `filterGrounded`, `centerOrigin`, `GeneratorPlacement` |
| `src/lib/generation/facade/paneAxis.ts` | `paneAxisForWindowCell` |
| `src/lib/generation/__tests__/placementUtils.test.ts` | Unit tests for helpers |
| `src/lib/blueprints/validateCottageHouse.ts` | Cottage validator |
| `src/lib/blueprints/sampleCottageBlueprints.ts` | `rustic_cottage`, `forest_cabin` presets |
| `src/lib/generation/generators/generateCottageHouse.ts` | Cottage generator (~blacksmith-shaped) |
| `src/app/preview/previewGeneratorFamilies.ts` | Preview registry wiring tower + blacksmith + cottage |
| `src/lib/generation/__tests__/generatorCottagePresetInvariants.test.ts` | Preset invariants |
| `src/lib/generation/__tests__/generatorCottageEdgeCaseInvariants.test.ts` | Edge fixtures |
| `src/lib/generation/__tests__/generatorCottagePanes.test.ts` | Pane + smoke |
| `src/lib/generation/__tests__/fixtures/cottageEdgeCaseBlueprints.ts` | Edge blueprints |

**Not touched by WIP:** `CHANGE.md`, `docs/**` (except this `PLAN.md` overwrite), `blueprintExchange.ts`, `/visualizer`, `buildingFamilies.test.ts`, tower/blacksmith preset bodies, `sampleBlueprints.ts`, `sampleBlacksmithBlueprints.ts`.

### Per-file classification

| File | Class | Notes |
|------|-------|-------|
| `PLAN.md` (prior Wave 2 content) | **D** | Superseded; safe to overwrite (this doc) |
| `src/lib/blueprints/types.ts` | **C** | Full cottage schema on unions |
| `src/lib/blueprints/validateBlueprint.ts` | **C** | Cottage routing |
| `src/lib/blueprints/validateCottageHouse.ts` | **C** | Untracked; complete-looking validator |
| `src/lib/blueprints/sampleCottageBlueprints.ts` | **C** | Untracked; 2 presets |
| `src/lib/generation/generators/generateCottageHouse.ts` | **C** | Untracked; duplicate of blacksmith grammar |
| `src/lib/generation/generateStructure.ts` | **C** | Cottage dispatch |
| `src/lib/generation/families/buildingFamilies.ts` | **C** | Registers cottage as shipped |
| `src/lib/generation/__tests__/generatorCottage*.ts` | **C** | Untracked cottage tests |
| `src/lib/generation/__tests__/fixtures/cottageEdgeCaseBlueprints.ts` | **C** | Untracked |
| `src/app/preview/previewGeneratorFamilies.ts` | **C** | Cottage in preview registry |
| `src/app/preview/PreviewInspectionClient.tsx` | **C / D** | Family dropdown refactor **bundled** with cottage; revert cottage wiring; **re-plan** preview scaling separately |
| `src/components/voxel/StructureInspectionPanel.tsx` | **C / D** | Same — API change tied to cottage preview |
| `src/lib/generation/placement/placementUtils.ts` | **B** | Behavior-neutral extraction candidate |
| `src/lib/generation/facade/paneAxis.ts` | **B** | Behavior-neutral extraction candidate |
| `src/lib/generation/generators/generateMedievalTower.ts` | **B** | Imports shared helpers only (if helpers kept) |
| `src/lib/generation/generators/generateBlacksmithWorkshop.ts` | **B** | Same |
| `src/lib/generation/__tests__/generatorWindowPanes.test.ts` | **B** | Import path only (if `paneAxis` kept) |
| `src/lib/generation/__tests__/placementUtils.test.ts` | **B** | New tests for helpers (optional in helper-only slice) |
| `buildingFamilies.test.ts` (unchanged) | **E** | Would fail against WIP catalog — evidence WIP incomplete |

**No automatic reverts in this task.** Recommendations only (§3).

---

## 3. Revert recommendation

### Goal

Return the branch to **two shipped families** (`medieval_tower`, `blacksmith_workshop`) and **known-good preview** (Towers | Blacksmith | Partials), then pursue component grammar on a clean base.

### Revert — delete untracked cottage + helper test files

```text
src/lib/blueprints/validateCottageHouse.ts
src/lib/blueprints/sampleCottageBlueprints.ts
src/lib/generation/generators/generateCottageHouse.ts
src/app/preview/previewGeneratorFamilies.ts
src/lib/generation/__tests__/generatorCottagePresetInvariants.test.ts
src/lib/generation/__tests__/generatorCottageEdgeCaseInvariants.test.ts
src/lib/generation/__tests__/generatorCottagePanes.test.ts
src/lib/generation/__tests__/fixtures/cottageEdgeCaseBlueprints.ts
```

**Optional (if reverting helper extraction too):**

```text
src/lib/generation/placement/placementUtils.ts
src/lib/generation/facade/paneAxis.ts
src/lib/generation/__tests__/placementUtils.test.ts
```

### Revert — restore modified files to `HEAD`

```text
src/lib/blueprints/types.ts
src/lib/blueprints/validateBlueprint.ts
src/lib/generation/generateStructure.ts
src/lib/generation/families/buildingFamilies.ts
src/lib/generation/generators/generateMedievalTower.ts
src/lib/generation/generators/generateBlacksmithWorkshop.ts
src/lib/generation/__tests__/generatorWindowPanes.test.ts
src/app/preview/PreviewInspectionClient.tsx
src/components/voxel/StructureInspectionPanel.tsx
```

(`PLAN.md` is intentionally overwritten by this planning doc, not reverted to Wave 2.)

### Do **not** revert (unchanged at HEAD)

- Tower/blacksmith preset bodies, validators (except routing), `blueprintExchange`, `/visualizer`, docs, `CHANGE.md`.

### Salvage later (clean slice, not from messy WIP commit)

| Item | Action |
|------|--------|
| `mergePlacements`, `filterGrounded`, `centerOrigin` | Re-extract in **Stage 1** with tower/blacksmith parity tests |
| `paneAxisForWindowCell` | Move to `generation/facade/paneAxis.ts`; update pane tests import |
| Preview family + preset dropdowns | Re-implement **without** cottage; registry local to `/preview` |
| Cottage family | **Do not** reintroduce as one-off generator; implement as **first component-recipe family** after internal `ComponentPlan` exists |

---

## 4. Revised architecture: component grammar over family recipes

```text
Blueprint / future AI intent
  → family recipe (which components + params)
  → component plan (validated, ordered)
  → deterministic component generators (each → Placement[] or VoxelBlock[])
  → mergePlacements + filterGrounded
  → VoxelBlock[]
  → validateVoxelStructurePlacements + structure invariants
```

| Layer | Responsibility |
|-------|----------------|
| **Architectural component** | Named semantic module with typed params (e.g. `hollow_wall_shell`, `pitched_gable_roof`). Emits staged placements. |
| **Family recipe** | Curated list/configuration of components for a product-supported family (e.g. blacksmith = rect body + shell + roof + entrance + windows + chimney + forge/workbench/storage zones). |
| **Style** | Material palette, opening density, roof accent hints — applied when resolving materials or component params (future resolver). |
| **Preset** | Hand-authored or validated blueprint that compiles to a component plan (directly or via family validator). |

Families are **not** giant `switch` bodies that place every block. They are **orchestrators** that build a `ComponentPlan` and run shared generators.

---

## 5. Candidate architectural component vocabulary

Near-term vocabulary (implement gradually). **Deferred** items are catalogued for taxonomy alignment, not immediate code.

### Massing

| Component | Produces | Families (examples) | When | New blocks? |
|-----------|----------|---------------------|------|-------------|
| `rectangular_body` | Footprint + vertical budget, origin centering | blacksmith, cottage, tavern, market | **Soon** | No |
| `tower_volume` | Square/round vertical prism, level stack | medieval_tower | **Soon** (extract from tower) | No |
| `hall_volume` | Long narrow mass | chapel, barn | Defer | No |
| `attached_bay` | Side extension volume | L-plan houses | Defer | No |
| `courtyard_shell` | U/O perimeter | monastery, market | Later | No |

### Shell

| Component | Produces | Families | When | New blocks? |
|-----------|----------|----------|------|-------------|
| `foundation` | y=0 floor grid | rect families | **Soon** | No |
| `floor_layer` | Interior y=1 floor | hollow rect | **Soon** | No |
| `hollow_wall_shell` | Perimeter walls, door/window apertures | blacksmith, cottage, many | **Soon** | No (pane optional) |
| `partition_stub` | Interior wall segment | tavern, house | Defer | No |

### Roofs

| Component | Produces | Families | When | New blocks? |
|-----------|----------|----------|------|-------------|
| `pitched_gable_roof` | Layered perimeter ring shrink | tower crown variant, blacksmith, cottage | **Soon** | No |
| `shed_roof` | Single-slope layers | blacksmith, cottage, warehouse | **Soon** | No |
| `flat_roof` | Single cap layer | modern/industrial | Defer | No |
| `stepped_roof` | Pyramid steps | tower | Exists in tower | No |
| `spire_or_steeple` | Vertical accent | chapel | Defer | No |

### Openings

| Component | Produces | Families | When | New blocks? |
|-----------|----------|----------|------|-------------|
| `front_entrance` | Door row on chosen face | most | **Soon** | No |
| `side_entrance` | Door on left/right/back | workshop, barn | Soon | No |
| `sparse_windows` | Count-based columns, pane-aware | blacksmith, cottage | **Soon** | No |
| `window_band` | Horizontal run | tavern, market | Defer | No |
| `large_double_door` | Wide aperture | barn, hangar | Defer | No |
| `tall_feature_window` | Single tall opening | chapel | Defer | No |

### Details

| Component | Produces | Families | When | New blocks? |
|-----------|----------|----------|------|-------------|
| `chimney` | Wall-adjacent stack | blacksmith, cottage | **Soon** | No |
| `porch_front_step` | Low connected pad outside door | cottage | Soon | No |
| `awning` | Overhang blocks | market, tavern | Defer | No |
| `sign_marker` | Accent plaque | tavern, shop | Defer | No |
| `steeple_stub` | Small roof peak | chapel | Defer | No |
| `crenellation_crown` | Merlons/parapet | medieval_tower | Exists | No |
| `buttress_stub` | Corner mass | cathedral | Later | No |

### Interior semantic zones (floor y=1 placeholders, not room graphs)

| Component | Produces | Families | When | New blocks? |
|-----------|----------|----------|------|-------------|
| `hearth_zone` | Accent cluster | cottage | Soon | No |
| `forge_zone` | Accent + neighbors | blacksmith | **Soon** (extract) | No |
| `workbench_zone` | Door/accent row | blacksmith | Soon | No |
| `storage_zone` | Corner stacks | blacksmith | Soon | No |
| `common_room_zone` | Open floor hint | tavern | Defer | No |
| `altar_zone` | Center accent | chapel | Defer | No |
| `stall_zone` | Repeated bays | market | Defer | No |

---

## 6. How existing families map to components

### `medieval_tower` (today: monolithic `generateMedievalTower.ts`)

| Today (conceptual) | Future component |
|--------------------|------------------|
| Square footprint, centered origin | `tower_volume` |
| Foundation + per-level floors | `foundation`, `floor_layer` (per level) |
| Hollow or solid shell by level | `hollow_wall_shell` (level-aware) |
| Window columns + pane axis | `sparse_windows` / tower-specific `window_columns` |
| Door / entrance arch | `front_entrance` + tower portal accents |
| Roof crown (stepped/pyramid) | `stepped_roof` or `pitched_gable_roof` variant |
| Crenellations, corner pillars, caps | `crenellation_crown`, corner detail components |
| Parapet, merlons | Part of crown component |

**Stay family-specific longer:** level bands, defensive rhythm, corner pillar grammar, crown/merlon interplay (tower identity).

**Extract first:** placement merge/grounding (done in WIP), pane axis, possibly foundation + window pane emission patterns shared with rect families.

### `blacksmith_workshop` (today: monolithic `generateBlacksmithWorkshop.ts`)

| Today | Future component |
|-------|------------------|
| W×D×H budget, centered | `rectangular_body` |
| y=0 fill | `foundation` |
| Perimeter loop + hollow void | `hollow_wall_shell` |
| Pitched/shed caps | `pitched_gable_roof` / `shed_roof` |
| Entrance + door | `front_entrance` |
| Window sets | `sparse_windows` |
| Chimney column | `chimney` |
| Forge / bench / storage | `forge_zone`, `workbench_zone`, `storage_zone` |

**Good first internal refactor target:** blacksmith is self-contained, preview-approved, and mostly rectilinear — but it is **already shipped and demo-stable**. Prefer **extracting components from blacksmith logic** without changing external blueprint schema initially.

### Overlap warning

Cottage WIP duplicated ~90% of blacksmith. That duplication is exactly what the component grammar prevents.

---

## 7. Family recipe model

### Conceptual recipes (not implemented)

**`blacksmith_workshop`**

```text
rectangular_body
hollow_wall_shell
pitched_or_shed_roof   # param from blueprint.roof.style
front_entrance
sparse_windows
chimney
forge_zone
workbench_zone
storage_zone
```

**`cottage_house` (future, component-based — not one-off generator)**

```text
rectangular_body
hollow_wall_shell
pitched_gable_roof | shed_roof
front_entrance
sparse_windows
chimney
hearth_zone
porch_front_step   # optional
```

**`tavern_inn` (deferred)**

```text
rectangular_body
optional_second_story   # later massing component
pitched_gable_roof
wide_front_facade
window_band
sign_marker
common_room_zone
```

**`temple_chapel_shrine` (deferred)**

```text
hall_volume
pitched_gable_roof
centered_front_entrance
tall_feature_window
steeple_stub
altar_zone
```

### Recipe representation — staged recommendation

| Stage | Representation |
|-------|----------------|
| **Now** | Code-only family orchestrators (current generators) |
| **Stage 2** | Internal TypeScript `ComponentPlan` + `compileFamilyRecipe(familyId, resolvedBlueprint)` |
| **Stage 3+** | Optional `componentPlan` field on blueprints **only if** validation story is clear |
| **AI era** | AI outputs **family + component params + style**, never voxels |

Recipes should remain **curated and validated**, not free-form graphs at first.

---

## 8. Blueprint strategy under component grammar

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** | Keep family-specific blueprint types; map internally to `ComponentPlan` | **Recommended near-term** |
| **B** | Introduce generic `ComponentPlanBlueprint` immediately | Too abrupt; weakens family semantics |
| **C** | Optional `componentPlan` on all blueprints | Defer until A is stable |
| **D** | Replace family blueprints with component graph now | Over-generalizes; breaks presets/import |

**Recommendation: A**

- Preserve `MedievalTowerBlueprint`, `BlacksmithWorkshopBlueprint`, etc. as **authoring and preset surfaces**.
- Add **internal** compilation: `ResolvedBlacksmithWorkshop` → `ComponentPlan` → generators.
- Validators stay per-family but gain shared sub-validators (footprint, openings, roof enums).
- AI later targets semantic fields; compiler fills component params.

**Guards**

- Do not expose raw voxel lists in blueprints.
- Do not expose unconstrained component DAGs to users/AI at v1.
- Keep `maxBlockCount`, grounding, and material resolution centralized.

---

## 9. Component plan internal representation

**Internal-only at first** (not public JSON schema).

```ts
// Conceptual — names illustrative

type ComponentId = string; // stable instance id within plan

type ArchitecturalComponent =
  | { kind: "rectangular_body"; width: number; depth: number; bodyLayers: number }
  | { kind: "hollow_wall_shell"; wallThickness: number; hollow: boolean }
  | { kind: "pitched_gable_roof"; layers: number; overhang: number }
  | { kind: "shed_roof"; layers: number }
  | { kind: "front_entrance"; side: EntranceSide; width: number; height: number }
  | { kind: "sparse_windows"; placement: "none" | "front_only" | "front_and_sides"; count: number }
  | { kind: "chimney"; side: "left" | "right" }
  | { kind: "forge_zone" }
  | { kind: "hearth_zone" }
  // ...

type ComponentPlan = {
  familyId: BuildingFamilyId;
  footprint: { width: number; depth: number; bodyLayers: number; roofLayers: number };
  origin: { ox: number; oz: number }; // from centerOrigin
  materials: ResolvedMaterials;
  constraints: BlueprintConstraints;
  components: readonly ArchitecturalComponent[];
};
```

**Ordering:** Recipe defines **canonical order** (foundation → shell → openings → roof → details → interior zones). Generators run in that order; all emit into one `Placement[]`.

**Conflict resolution:** Reuse existing **`mergePlacements`** — higher `p` wins; tie-break by insertion index `i`.

**Priorities:** Per-component priority bands (e.g. zones < walls < windows < doors) aligned with current `PRI` constants.

**`maxBlockCount`:** Applied at validation (estimate) and/or post-merge trim policy (today: validator reduces roof layers — keep policy at plan compile time).

**Placement validation:** Final `VoxelBlock[]` still passes `validateVoxelStructurePlacements` and generator hard invariants.

---

## 10. Generator architecture under the pivot

| Stage | Work |
|-------|------|
| **0** | Revert interrupted cottage WIP (§3) |
| **1** | Extract neutral helpers only: `placementUtils`, `paneAxis`; prove tower/blacksmith unchanged via existing tests |
| **2** | Define `ArchitecturalComponent` union + `ComponentPlan` + `compileXToPlan` per family (internal); component generator modules that return `GeneratorPlacement[]` |
| **3** | **Either** wire `generateBlacksmithWorkshop` through plan (behavior-neutral refactor) **or** implement `cottage_house` as first plan-native family |
| **4** | Ship `cottage_house` as recipe + presets + preview + tests |

### Stage 3 choice

| Path | Pros | Cons |
|------|------|------|
| **Adapt blacksmith first** | Exercises grammar on shipped family; no new public family | Regression risk on demo-ready family |
| **Cottage first on new plan** | No regression to blacksmith output; proves new family path | New presets/tests; cottage recipe must be right |

**Safest path:** **Stage 2 + blacksmith internal compile behind feature flag or parity test** comparing old vs plan output (block multiset or hash), then **Stage 4 cottage** as first **new** family using the grammar. If parity testing is too heavy for v1, **cottage as first plan-native family** with blacksmith still monolithic until parity exists — acceptable if cottage tests are strict and blacksmith untouched.

**Recommendation:** Stage 1 → Stage 2 → **cottage as first consumer-facing new family (Stage 4)** while **blacksmith refactors internally (Stage 3)** only when component generators have unit tests and parity checks.

---

## 11. Preview strategy after pivot

**Keep**

- **Partial block showcase** separate (static structure, no generator).
- **Family dropdown + preset dropdown** for generator families (re-introduce cleanly post-revert without cottage until shipped).

**Default:** `medieval_tower` / `northwatch`.

**Minimal post-pivot preview additions**

| Feature | Priority |
|---------|----------|
| Family + preset dropdowns | High (product scaling) |
| Validation notes | Keep |
| Family label + `structureType` + preset description | Keep |
| Read-only **component list** (compiled plan summary) | Medium — helps debug grammar |
| Per-component block counts | Low |
| Visualizer editing | **Out of scope** |

Do not block preview on component UI — optional debug panel later.

---

## 12. Test strategy

| Layer | Tests |
|-------|-------|
| **Component unit** | Each component generator: non-empty where applicable, valid block IDs, no duplicate coords in isolation |
| **Merge** | `mergePlacements` priority / tie-break (existing + `placementUtils.test`) |
| **Plan compile** | Family blueprint → plan shape snapshots (structural, not voxel counts) |
| **Family smoke** | Preset invariants: connected 26, grounded, `maxBlockCount`, placement semantics |
| **Parity** | Blacksmith old vs plan output (optional multiset compare) when refactoring |
| **Regression** | Tower presets unchanged when only helpers move |

**Avoid** exact total block-count snapshots unless locking a bug fix.

**Behavior-neutral helper extraction:** Rely on existing tower/blacksmith preset + edge + pane suites.

---

## 13. Documentation strategy

**Not in this planning task.** After implementation:

| Doc | Update |
|-----|--------|
| `docs/generation/GENERATION_DESIGN_PRINCIPLES.md` | Component grammar, families as recipes, AI targets semantics |
| `docs/generation/GENERATOR_RELIABILITY.md` | Per-family + per-component coverage |
| `docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md` | Align features with component vocabulary |
| **New** `docs/generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md` | Canonical component list, merge rules, recipe examples |

Clarify everywhere: **components ≠ voxel dumps**; **families = recipes**; **styles = overlays**; **AI ≠ block placer**.

---

## 14. Recommended next implementation slice

| Option | Description |
|--------|-------------|
| A | Revert cottage WIP only |
| B | Revert cottage WIP + redo neutral helpers cleanly |
| C | Revert + internal component types only |
| D | Revert + grammar + cottage |
| E | Continue cottage one-off | **Rejected** |

### **Chosen: B**

**Rationale from actual WIP**

- Cottage generator/validator/tests/catalog are **complete-looking but wrong direction** (duplicate blacksmith).
- Preview refactor is **coupled** to cottage registry; incomplete product verification (`CHANGE.md` stale, `buildingFamilies.test` not updated).
- Helper extraction in WIP is **likely correct** but should land in a **behavior-neutral PR** with `pnpm test:generator` + `tsc` proof, not bundled with cottage.

**Then (after review): C → blacksmith plan compile (Stage 3) → D′ cottage as first component-recipe family (Stage 4)** — not D as originally stated (no cottage until plan exists).

---

## 15. Non-goals

- Continuing interrupted **cottage_house** one-off implementation
- Implementing **all Wave 2** families (barn, market, tavern, chapel, warehouse, …)
- Implementing **all ~30** taxonomy families as isolated generators
- **AI / photo runtime**
- **Public component blueprint JSON** schema
- **`floorPlan` / rooms / circulation** schema
- **Import/export v2**
- **`/visualizer` rewrite** or cottage editing there
- **Style resolver** implementation
- **New textures, assets, or block definitions**
- **Connection-aware** partial blocks
- **New partial shape kinds**
- **Minecraft export**
- **Runtime AI-invented families**
- **Raw voxel blueprint output from AI**

---

## 16. Risks and open questions

| Risk | Mitigation |
|------|------------|
| **Over-abstraction** | Start with 8–12 components; no arbitrary DAG |
| **Under-abstraction** | Map blacksmith + cottage overlap explicitly; forbid copy-paste third generator |
| **Retrofit blacksmith vs cottage proof** | Parity tests or cottage-only on new plan; see §10 |
| **Code modules vs data records** | TypeScript discriminated unions first; data-driven recipes later |
| **Blueprint vs internal plan** | Family blueprints stay authoritative for presets; plan is compile target |
| **Component conflicts** | Documented `PRI` bands + single merge pass |
| **Still generic boxes** | Recipes must enforce asymmetry (chimney side, zones, window counts) |
| **Preview without component visibility** | Add read-only plan summary when debugging |
| **Tower behavior regression** | Helper-only PRs gated on full tower tests |
| **WIP salvage** | Revert all cottage paths; re-extract helpers in clean commit |

**Open questions**

1. Should `medieval_tower` ever share `hollow_wall_shell`, or stay a separate vertical grammar with shared utilities only?
2. When should `BUILDING_FAMILIES` list a family as `shipped` — generator only, or generator + preview + tests?
3. Is blacksmith multiset parity required before merging Stage 3, or is cottage-first acceptable?
4. Do interior zones remain y=1 placeholders until floor-plan schema exists?
5. Should preview family dropdown ship before or with the first component-native family?

---

**Scoping only — waiting for review before implementation.**
