# Plan — Blacksmith Workshop Review and Next Integration Slice

## 1. Purpose

Generator Expansion now has **two shipped generator families** (`medieval_tower`, `blacksmith_workshop`). Adding a third family immediately (cottage, chapel, tavern) would multiply schema, validator, generator, preset, and UI coupling before the **first multi-family pattern** is reviewed in practice.

The next step should be **review and integration**, not another grammar:

- **Blacksmith** is the template for how later families split types, validate, dispatch, preset, and test—without touching tower behavior.
- **Visual and product judgment** for blacksmith has only happened via automated invariants, not human inspection in the app (blacksmith is library/test-only).
- **UI surfaces** (`/preview`, `/visualizer`) still assume tower presets and tower blueprint editing; import/export remains **tower-only v1**.

This plan audits the blacksmith slice and recommends the **safest next implementation step**—likely minimal **`/preview`** inspection before visualizer authoring or exchange v2.

---

## 2. Current blacksmith implementation summary

### Blueprint / resolved types (`types.ts`)

- **`BlacksmithWorkshopBlueprint`**: `structureType: "blacksmith_workshop"`; `dimensions` **`width` / `depth` / `height`** (rectangular, non-square allowed); shared six **material** slots; `massing` (`wallThickness`, `hollowInterior`); `roof` (`pitched_gable` | `shed`); `openings` (entrance + `windowsPlacement` + `windowsCount`); `features` (`chimney`, `forge`, `workbench`, `storage`); `constraints`.
- **`ResolvedBlacksmithWorkshop`**: resolved materials + normalized **`grid`** (`width`, `depth`, `bodyLayers`, `roofLayers`, `overhang`).
- **`StructureBlueprint`** / **`ResolvedStructure`** unions include tower + blacksmith.
- **No** `floorPlan`, rooms, levels, crenellations, or tower-only enums on blacksmith.

### Validation

- **`validateBlueprint()`** dispatches by `structureType`.
- Tower logic lives in **`validateMedievalTowerBlueprint`** (renamed path inside `validateBlueprint.ts`)—unchanged behavior.
- **`validateBlacksmithWorkshop.ts`**: clamps width 7–15, depth 5–11, height 4–8, wall T 1–2, roof layers, body/roof height budget, `maxBlockCount` estimate with roof-layer reduction.

### Generator dispatch (`generateStructure.ts`)

- **`generateStructureFromResolved`**: `medieval_tower` → `generateMedievalTower`; `blacksmith_workshop` → `generateBlacksmithWorkshop`; exhaustive `never` on union.

### Generator behavior (`generateBlacksmithWorkshop.ts`)

- Foundation (y=0), hollow shell walls, interior floor at y=1 in void.
- Entrance aperture + **door** row; sparse **windows** at `windowY`; **pane** when material allows (imports **`paneAxisForWindowCell`** from tower module).
- **Pitched gable** (perimeter-only intermediate layers) or **shed** (inset along depth).
- **Chimney**: accent column on left/right exterior wall (`lx` 0 or W−1), y=1…roof+1.
- **Forge**: accent hearth at rear interior (`lz = T+1`) + wall neighbors; optional second accent cell.
- **Workbench / storage**: `door` material cubes in interior (front bench row, corner crates).
- **`mergePlacements`** + **`filterGrounded`** (local copies, same pattern as tower).
- **No** slabs/posts; no window trim slabs.

### Presets (`sampleBlacksmithBlueprints.ts`)

| id | Footprint | Roof | Notes |
|----|-----------|------|--------|
| `rustic_village_forge` | 11×7 | pitched_gable | full features |
| `dark_ironworks` | 9×8 | shed | obsidian/schist; no storage |

No **`styleId`** on blacksmith preset wrapper (styles deferred).

### Family catalog (`buildingFamilies.ts`)

- **`medieval_tower`**, **`blacksmith_workshop`** — both `shipped`; helpers `getBuildingFamily`, `getAllBuildingFamilies`.

### Style catalog (`buildingStyles.ts`)

- **`BuildingFamilyId`** re-exported from family catalog.
- Six styles still **`applicableFamilies: ["medieval_tower"]` only**.

### Tests (per CHANGE.md)

- **73** tests / **13** files: blacksmith preset invariants, 3 edge fixtures, pane + fallback smoke, family catalog; tower suites unchanged.
- Shared **`assertGeneratedStructureHardInvariants`** + **`assertGeneratedStructurePlacementSemantics`**.

### Docs touched

- **`GENERATOR_RELIABILITY.md`**, **`GENERATION_DESIGN_PRINCIPLES.md`** §1.5 — second family noted; not blueprint exchange format.

### Explicitly not implemented

- **No** `/preview` or **`/visualizer`** blacksmith integration.
- **No** import/export v2 (`blueprintExchange` still rejects non-tower).
- **No** style resolver, blacksmith styles, AI/photo, new textures/blocks.

---

## 3. Architecture review

| Area | Assessment |
|------|------------|
| **Type separation** | **Good.** Distinct `BlacksmithWorkshopBlueprint` / `ResolvedBlacksmithWorkshop`; tower types untouched. Unions at `StructureBlueprint` / `ResolvedStructure` are the right seam. |
| **`validateBlueprint` dispatch** | **Maintainable for 2 families.** At 3–4 families, consider `validators/[family].ts` + thin router; **no urgent split**. |
| **`generateStructure` dispatch** | **Same** — fine now; optional registry map later. |
| **`buildingFamilies.ts`** | **Useful, not overbuilt** — id, displayName, description, status only. Keep as product manifest. |
| **Style catalog dependency** | **Clean** — re-exports `BuildingFamilyId`; tower-only styles documented by `applicableFamilies`. |
| **`blueprintExchange` tower-only** | **Safe and clear** — import fails fast on `structureType !== "medieval_tower"`; TS cast to `MedievalTowerBlueprint` after check. Risk is **user expectation** (“why can’t I import my smithy?”), not runtime corruption. |
| **Shared generator helpers** | **Duplication** (`mergePlacements`, `filterGrounded`, `centerOrigin`, face helpers) between tower and blacksmith. **Defer extract** until a third family proves need; premature `generation/placementUtils.ts` adds churn. |
| **Cross-family import** | Blacksmith imports **`paneAxisForWindowCell`** from `generateMedievalTower.ts` — acceptable short-term; later move to `generation/facade/paneAxis.ts` if cottage also needs it. |

### Cleanup before UI / family #3 (optional, low priority)

- None **blocking** preview.
- Consider **family label helper** (`getBuildingFamily(structureType)?.displayName`) for inspection UI copy.
- Do **not** widen `blueprintExchange` types until v2 is designed.

---

## 4. Generator quality review

**Mechanical quality (tests):** Strong — valid IDs, no duplicate coords, single 26-component, grounded, `maxBlockCount`, placement semantics, pane rules.

**Architectural readability (visual, unverified in UI):** Plausible but **not proven**; risks below.

| Signal | Implementation | Likely read |
|--------|----------------|-------------|
| **Rectangular footprint** | W≠D presets (11×7, 9×8) | Low/wide vs tower — **good** |
| **Roof** | Shrinking-layer gable/shed (tower-like algorithm, lower R) | **Moderate** — may read as “stepped cap” not true gable; shed variant helps |
| **Chimney** | Full-height accent on wall mid-depth | **Good** if contrast sufficient (mudstone/schist on cobble/obsidian) |
| **Forge** | 2–4 interior blocks at rear, accent center | **Weak–moderate** — small, low, easy to miss in full view |
| **Workbench** | 1–2 door planks near front interior | **Weak** — may read as random floor junk without context |
| **Storage** | 2–3 door cubes in corner | **Weak** |
| **Entrance** | 3-wide door on front | **Good** |
| **Windows** | Single band at `windowY`, pane when glass | **Good** on front; sides sparse |
| **Material contrast** | Presets use distinct wall/roof/accent | **Good** (rustic, dark) |
| **Connectivity** | Chimney through wall; interior on y=1 floor | Tests enforce one component — **good** |
| **maxBlockCount** | Validator estimate + roof trim | Edge fixture `tight_max_block_count` exercises — **good** |

### Refinements to consider **after** first visual inspection (not blocking architecture)

1. **Chimney** — widen to 2×1 footprint or cap with 2×2 accent “stack” at roof exit.
2. **Forge** — raise to y=2 when bodyLayers≥3; add 3×2 accent pad; optional single **oak_log** post if metadata allows (low risk) — **or** skip posts per policy.
3. **Roof** — gable: only shrink along **width** for front/back pediment read; shed: asymmetric lz inset only.
4. **Workbench** — align on front wall inside void (visible through door line), 3-block counter.
5. **No new textures** — all refinements use existing slots (`accent`, `door`, `wall`, `roof`).

**Recommendation:** Do **not** block preview on generator polish; bundle **at most one** small refinement pass **after** viewing `rustic_village_forge` in `/preview` if chimney/forge are unreadable.

---

## 5. Test coverage review

### What is well covered

| Suite | Value |
|-------|--------|
| **`generatorBlacksmithPresetInvariants`** | End-to-end per curated preset — **high signal** |
| **`generatorBlacksmithEdgeCaseInvariants`** | Min footprint, max rectangular, tight budget — **good** |
| **`generatorBlacksmithPanes`** | Glass panes + oak_planks fallback + smoke — **good** |
| **`buildingFamilies.test`** | Catalog integrity — **appropriate** |
| **Shared hard invariants** | Same bar as tower — **correct** for v1 single-component policy |

### Gaps / limits

- **No visual regression** — boxy smithy can pass all tests.
- **No assertions** on chimney/forge/workbench **presence** (only aggregate connectivity) — could add **soft** tests: “when feature enabled, at least N blocks of accent/door in interior bounds” (avoid exact counts).
- **Feature-off paths** — no dedicated fixture with `forge: false` etc.
- **Entrance sides** other than front — validator allows; generator supports; **untested** on blacksmith.
- **Shed vs gable** — both presets exercise indirectly; no isolated roof-style fixture.
- **Overfit risk** — low today (few presets); avoid snapshot block counts.

### Recommended test additions (implementation slice, optional)

- One test: **`rustic_village_forge`** with `features.chimney.enabled` ⇒ at least one accent block above `bodyLayers`.
- One test: `forge.enabled` ⇒ ≥1 accent in interior coordinate range.
- Keep **optional** until after preview QA informs what must stay stable.

---

## 6. UI integration options

| Option | Complexity | Demo value | Risk | Tower compatibility | Exposes immature behavior? |
|--------|------------|------------|------|---------------------|---------------------------|
| **A. No UI; generator refine only** | Low–med | Low until viewed via devtools | Low | Full | No |
| **B. Minimal `/preview` blacksmith presets** | **Low** | **High** | **Low** | **Full** (additive source) | **Controlled** (read-only presets) |
| **C. Minimal `/visualizer` family selector** | Med–high | High | Med | Breaks if forms stay tower-only | Yes — empty/wrong fields |
| **D. Full multi-family editor** | Very high | High | High | Major rewrite | Yes |
| **E. Import/export v2 first** | High | Med | Med | Tower path must migrate | N/A — no blacksmith in lab yet |

### Notes per option

- **A** — Defers the main feedback loop; tests ≠ aesthetics.
- **B** — Fits existing **`PreviewInspectionClient`** + **`StructureInspectionPanel`** pattern (`preset_towers` | `partial_showcase`); add third source or family+preset two-step.
- **C** — **`VisualizerClient`** is **`MedievalTowerBlueprint`** throughout (~500+ lines), tower form fields, copy JSON, reload preset — **not ready**.
- **D** — Requires family-specific forms, validation UX, exchange — out of scope.
- **E** — Discriminated union envelope, migration, UI copy — **after** preview proves blacksmith worth authoring.

---

## 7. Recommended next integration slice

**Primary recommendation: Option B — minimal `/preview` support for blacksmith presets.**

**Why not generator refinement first?**

- Architecture is **stable enough** (clean types, dispatch, tests green per CHANGE.md).
- Mechanical correctness is **proven**; remaining issues are **visual/readability** best judged in **`VoxelViewer`**, which `/preview` already provides for towers.
- Refining blind risks overfitting tests without human confirmation.

**Why preview before visualizer / exchange?**

- Aligns with user preference and product principle (**visual first**).
- **Inspection-only** — no blueprint editing, no import/export, no family-specific forms.
- Lowest regression risk to tower demo path.

**Contingency:** During implementation, run **5-minute visual QA** on both blacksmith presets. If chimney or forge is **unreadable**, add **§9 micro-refinements** in the **same PR** (still no new textures). If merely “ugly but legible,” defer polish to a follow-up generator slice.

**Do not recommend:** visualizer family selector, exchange v2, or cottage family in the next slice.

---

## 8. Minimal `/preview` support design

### UX model

Extend **`PreviewLabSource`** (or equivalent) with a third mode:

```text
"preset_towers" | "preset_blacksmith" | "partial_showcase"
```

**Alternative:** two-step **Family** (tower | blacksmith) + **Preset** `<select>` when not in partial showcase. Prefer **three-way source toggle** for parity with existing “Partial block showcase” pattern and less clutter than nested selects.

| Source | Preset list | Generation |
|--------|-------------|------------|
| Preset towers | `MEDIEVAL_TOWER_PRESETS` | `validateBlueprint` → `generateStructureFromResolved` |
| Preset blacksmith | `BLACKSMITH_PRESETS` | same |
| Partial showcase | (disabled) | static `PARTIAL_BLOCK_SHOWCASE_STRUCTURE` |

### Behavior

- Default remains **`preset_towers`** + `northwatch` — **no change** to initial load behavior.
- Blacksmith: clone preset blueprint → validate → generate; show in **`VoxelViewer`**.
- **Preserve** partial block showcase toggle and layer modes (full / build-up / slice).
- **Block breakdown** — already generic (`fullStructureBlockBreakdown`); works on any `VoxelBlock[]`.
- **Panel copy** — family-aware description, e.g. “Hand-authored blacksmith workshop preset; read-only inspection.”
- **Metadata** — show `structureType`, preset label, `metadata.name`, validation notes if any (optional), block count / bounds from breakdown (existing).
- **Do not** show tower-only fields (floorCount, crenellations, merlons).
- Optional read-only line: **Family:** Blacksmith workshop (`blacksmith_workshop`) from `getBuildingFamily`.

### Files likely to change

| File | Change |
|------|--------|
| `src/components/voxel/StructureInspectionPanel.tsx` | Extend `PreviewLabSource`; third toggle button; preset `<select>` binds to blacksmith list when source is blacksmith; update helper text |
| `src/app/preview/PreviewInspectionClient.tsx` | State for source + blacksmith preset id; `useMemo` blueprint from `getBlacksmithPreset`; `StructureBlueprint` typing; same validation/generation path |
| `src/app/preview/page.tsx` | Only if props/copy references “towers only” |

**Do not change:** `VisualizerClient.tsx`, `blueprintExchange.ts`, `sampleBlueprints.ts` bodies, tower generators, tests (except optional preview smoke if added — **defer**).

### TypeScript notes

- Blueprint state: `StructureBlueprint` or separate memos per source — avoid casting everything to `MedievalTowerBlueprint`.
- `validateBlueprint` / `generateStructureFromResolved` already accept unions.

### Non-goals for this slice

- No import/export, no edit fields, no style catalog UI, no family catalog browser (optional one-line label only).

---

## 9. Blacksmith visual refinement design (contingency)

If preview QA requires a **small generator pass** (same milestone, sub-slice):

| Priority | Change | Materials |
|----------|--------|-----------|
| 1 | Chimney **2-wide** at wall (lx and lx+1 or lz offset) through roof + cap | `accent` |
| 2 | Forge **3×2** accent pad at rear, center, y=1 (and y=2 if H≥3) | `accent` + `wall` rim |
| 3 | Gable roof: shrink **lx** span per layer, keep full **lz** (ridge along depth) | `roof` |
| 4 | Workbench: 3×1 `door` against front interior wall | `door` |
| 5 | Raise `windowY` to `H - 1` when H≥3 for clearer band | — |

**Tests to update:** only if adding feature-presence assertions; re-run full `pnpm test:generator`.

**Out of scope:** new textures, furnace block, slabs/posts, exterior awning.

---

## 10. Import/export and visualizer deferral

| Surface | Why wait |
|---------|----------|
| **Import/export v2** | v1 envelope hardcodes `MedievalTowerBlueprint`. v2 needs discriminated `structureType`, version bump, UI error messages, round-trip tests. Preview does not need serialization. |
| **`/visualizer`** | Entire lab is tower authoring: `MedievalTowerBlueprint` state, tower enums in forms, “Copy blueprint JSON” → v1 export, preset reload baseline, structure inspection sidebar assumes tower fields. Blacksmith needs **different form fields** (chimney side, forge flags, depth not length). |
| **Preview vs visualizer** | Preview = **generate and judge**. Visualizer = **edit and export**. Judging quality first avoids building forms for a grammar that may change after visual QA. |

**User confusion mitigation (docs only, later):** One line in blueprint JSON doc: “Exchange v1 supports medieval tower only; blacksmith available in app preview presets.” **Not required** in the preview implementation slice unless product asks.

---

## 11. Non-goals

- No third building family
- No AI / photo classification runtime
- No `floorPlan` / rooms / circulation schema
- No import/export v2 in the recommended slice
- No `/visualizer` multi-family rewrite or family selector
- No style resolver
- No blacksmith **style** catalog entries unless explicitly split later
- No new textures, assets, or block definitions
- No connection-aware blocks or new partial shape kinds
- No Minecraft export
- No tower preset or generator behavior changes
- No window-adjacent slab trim
- No unsupported-family backlog in blueprint metadata

---

## 12. Risks and open questions

| Risk | Mitigation |
|------|------------|
| Blacksmith still reads as a **box with hat** | Preview QA; §9 contingency; avoid over-claiming in demo copy |
| **Preview UI clutter** (3 sources + presets) | Short labels: “Towers” / “Blacksmith” / “Partials”; default towers |
| **Inspection panel** tower-centric copy | Family-aware `panelDescription`; generic breakdown |
| **Import gap** confuses users | Defer exchange; optional README/doc line later |
| **Family-specific forms** complexity | Visualizer only after preview sign-off |
| **Placeholders** (door planks) don’t read as bench/crates | Accept v1; textures deferred per backlog |
| **Tower demo regression** | Default source unchanged; tower code path untouched |
| **Generator duplication** drifts | Extract helpers when family #3 lands |

**Open questions for review**

1. **Three-way source toggle** vs family + preset dropdowns?
2. Should preview show **validation notes** for blacksmith (validator already returns notes)?
3. Is **one** contingency generator PR allowed in the same slice as preview, or strictly preview-only?
4. Add **feature-presence** tests now or after preview QA?
5. When to schedule **visualizer** family selector relative to **exchange v2**?

---

Scoping only — waiting for review before implementation.
