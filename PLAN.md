# Plan — Building Family Taxonomy and First New Family

## 1. Purpose

Generator Expansion has delivered **partial blocks**, **material metadata**, **placement validation**, **pane windows** on the medieval tower path, a **building style catalog** (metadata only, preset-tagged), and updated **blueprint / generator / AI boundary** docs. The product still has **one real building family** in code: **`medieval_tower`**.

The **next** step is not “more tower style presets.” It is **building family taxonomy**: defining which **structural generator grammars** the product officially supports, how they differ from **styles** and **presets**, how **AI and photo input** map into supported families, and which **first non-tower family** to implement with the same determinism and test discipline as the tower.

**Why family taxonomy before implementation**

- Adding generators without a family model produces ad-hoc `structureType` strings, incompatible validators, and untestable one-offs.
- **Styles** customize appearance within a grammar; **families** define shell grammar, zones, and which features exist (tower merlons vs workshop chimney).
- AI may invent **styles** later; it must not invent **families** at runtime—families are product-supported, versioned, and covered by reliability tests.

This plan scopes taxonomy and the **first new family** only. No implementation in this document.

---

## 2. Current family support

### Pipeline (shipped)

```text
MedievalTowerBlueprint
  → validateBlueprint()           // rejects non–medieval_tower structureType
  → ResolvedMedievalTower
  → generateStructureFromResolved()
  → generateMedievalTower()
  → VoxelBlock[]
  → analyzeVoxelStructure + validateVoxelStructurePlacements (tests)
```

| Layer | Location | Family-specific today? |
|-------|----------|-------------------------|
| Authoring schema | `src/lib/blueprints/types.ts` — `StructureType = "medieval_tower"` only | **Yes** — single blueprint interface |
| Validation | `validateBlueprint.ts` — clamps grid, materials, openings, roof, budget | **Yes** — tower heuristics (`estimateTowerBlocks`, square footprint) |
| Dispatch | `generateStructure.ts` — `switch (resolved.structureType)` | **Yes** — one case |
| Generator | `generateMedievalTower.ts` — shell, void, windows (pane), roof, crenellations | **Yes** — tower grammar |
| Presets | `MEDIEVAL_TOWER_PRESETS` + `styleId` on wrapper | **Yes** — six tower snapshots |
| Style catalog | `buildingStyles.ts` — `BuildingFamilyId = "medieval_tower"` | **Partially generalizable** — `applicableFamilies`, hints |
| Import/export | `blueprintExchange.ts` — envelope `blueprint: MedievalTowerBlueprint` | **Yes** — tower-only v1 |
| UI | `/visualizer`, `/preview` — tower blueprint forms and preset lists | **Yes** — assumes tower |

### What may generalize

- **`mergePlacements`** pattern (priority + per-cell merge) — reusable per family.
- **Material resolution** — classic key → `BlockTypeId`; shared across families.
- **`validateVoxelStructurePlacements`** — family-agnostic output check.
- **`assertGeneratedStructureHardInvariants`** — mostly reusable if the family emits a **single grounded connected mass** (may need exceptions later for compounds).
- **Style catalog shape** — extend `BuildingFamilyId` and `applicableFamilies`; add family-specific style entries later.
- **Test harness** — `validateBlueprint` → `generateStructureFromResolved` → invariants (parameterized by family).

### What stays family-specific

- Blueprint field sets (tower has `levels.floorCount`, crenellations; workshop needs chimney/forge zones).
- Validator rules and resolved grid shape.
- Generator phases (tower: symmetric window columns on four faces; cottage: gable roof; blacksmith: forge bay).

---

## 3. Family vs style vs preset

| Concept | Definition | Example |
|--------|------------|---------|
| **Family** | Product-supported **generator grammar** + blueprint schema slice. Dispatched by `structureType`. Defines allowed features (roof types, zones, connectivity expectations). | `medieval_tower` |
| **Style** | Reusable **aesthetic / material / detail profile** within a family. May be AI-extensible later. Lives in style catalog; optional on preset wrapper; **not** in blueprint schema today. | `gothic_stone` (`applicableFamilies: ["medieval_tower"]`) |
| **Preset** | **Curated concrete blueprint** (+ lab metadata: `id`, `label`, `styleId`). Frozen snapshot for regression and demos. | Preset `gothic_stone` → tower blueprint with 11×11 footprint + `styleId: "gothic_stone"` |

**Relationships**

- One family → many styles → many presets (presets may share a style with different dimensions).
- **Preset id ≠ style id** (e.g. `northwatch` → `rustic_stone_watchtower`).
- AI may propose a **new style** (palette + hints) for a **supported family**; product may accept as custom profile or map to nearest catalog style.
- AI must **not** register a new `structureType` at runtime; unsupported requests map to **closest supported family** + backlog signal.

---

## 4. Supported-family policy

A **supported building family** must satisfy:

1. **Deterministic generator** — same validated blueprint → same `VoxelBlock[]`.
2. **Blueprint schema** — explicit TypeScript type (or documented family section); `structureType` discriminator.
3. **Validation** — `validateBlueprint` (or `validateBlueprintForFamily`) returns errors/notes and a **resolved** input type.
4. **Reliability tests** — at least smoke + curated preset invariants + targeted edge fixtures; `validateVoxelStructurePlacements` on outputs.
5. **Curated preset(s)** — ≥1 hand-authored reference blueprint in repo.
6. **Style applicability** — document which `styleId`s apply (`applicableFamilies`); new families start with **family-specific** styles or “default only.”
7. **Feature manifest** — document which catalog features exist (openings, roof, interior void, zones, partial shapes).

**AI / photo policy**

- Classify user intent → **`supportedFamilyId`** from a closed product list.
- Optional: **`requestedFamily`** (user/AI label, e.g. `"cathedral"`) stored as metadata/backlog when not supported.
- Apply **style** and blueprint field edits within the chosen family.
- Never call an unshipped generator; never emit voxels without validation.

**Candidate / backlog families**

- Record `requestedFamily` + prompt snippet for prioritization (Notre Dame → cathedral-like; barn photo → `barn` candidate).

---

## 5. Candidate family taxonomy

Practical taxonomy for medieval/fantasy + incremental real-world coverage. Status: **planned**, not shipped.

### By category

| Category | Families (candidate ids) | Notes |
|----------|-------------------------|--------|
| **Defensive / vertical** | `medieval_tower`, `gatehouse`, `keep` (later) | Tower shipped; gatehouse overlaps fortified preset |
| **Residential** | `cottage`, `house`, `rowhouse` (later) | Low rise, gable roof, chimney |
| **Craft / industrial** | `blacksmith_workshop`, `mill` (later) | Zones: forge, storage; distinct silhouette |
| **Religious** | `chapel`, `shrine`, `hall_church` (later), `cathedral` (much later) | Vertical emphasis, nave metaphor |
| **Commercial** | `tavern`, `inn`, `shopfront`, `market_stall` | Signage, wide front, overhang |
| **Agricultural** | `barn`, `stable` | Large footprint, simple massing |
| **Civic / monumental** | `warehouse`, `town_hall` (later) | Span and height without full cathedral grammar |

### Implementation waves (suggested)

- **Wave 0 (now):** `medieval_tower`
- **Wave 1:** one non-tower family (this plan → **blacksmith_workshop**)
- **Wave 2:** `cottage` or `tavern` (habitation + commercial read)
- **Wave 3:** `chapel` (vertical sacred mass) or `gatehouse` (defensive, tower-adjacent)
- **Later:** barn, cathedral-like, rowhouse, civic

Keep ids **stable snake_case** aligned with `structureType` where possible.

---

## 6. Candidate first non-tower families

| Criterion | Cottage / house | Blacksmith / workshop | Chapel / shrine | Tavern / inn |
|-----------|-----------------|----------------------|-----------------|--------------|
| **Visual distinctiveness vs tower** | High — low, wide, gable | High — chimney, forge mass, work yard | Medium-high — nave/steeple metaphor; risk of “tall box” | Medium — wide front, stories; risk of generic pub box |
| **Implementation complexity** | Medium — gable roof, chimney; fewer zones than forge | Medium-high — **semantic zones** (forge, storage) | High — proportions, possible apse/steeple | Medium — multi-bay, signage; interior pressure |
| **Demo usefulness** | High (relatable) | **Very high** (craft fantasy, CS project story) | High (iconic) | High (social hub) |
| **Reuses partial blocks / metadata** | Pane windows, cubes; logs/planks | Pane + cubes; **no furnace texture** — forge via accent/obsidian placeholder | Pane, stone palettes | Pane, planks, accent trim |
| **Interior / floor-plan pressure** | Medium (rooms) | **High but bounded** (forge + storage **zones** without full floorPlan schema) | Medium (nave void) | High (common room, bar) |
| **Object / furniture needs** | Bed/table later | **Anvil/workbench/crates** as cube placeholders | Altar, pews later | Barrels, counter |
| **Testability** | Good — single mass, gable | Good if **one connected component**; watch detached chimney | Risk of disconnected spire | Medium |
| **“Simple box” risk** | Medium without gable/chimney | Low if chimney + forge bay + asymmetric mass | Medium | Medium-high |

---

## 7. Recommendation for first new family

**Recommend: `blacksmith_workshop` (blacksmith / village forge workshop)**

Aligns with stated preference; code inspection supports it over cottage/chapel/tavern for **first** expansion.

### Why blacksmith over cottage/chapel/tavern

- **More visually distinct from tower** than a small house: horizontal emphasis, **chimney stack**, **forge glow block**, optional **front work apron**, asymmetric utility mass—not another vertical shell with crenellations.
- **Bridges to interiors** via **named zones** (forge, storage, work floor) without implementing full `floorPlan` schema—matches catalog/docs forward direction (forge room intent).
- **Strong demo narrative** for Generator Expansion: “AI asks for a forge; blueprint encodes zones; generator realizes geometry.”
- **Reuses existing assets**: cobblestone, limestone, oak_planks, oak_log, glass, obsidian/schist accents; **no new textures** required for v1 (backlog lists forge/furnace face as future).
- **Cottage** is simpler but does not exercise **zone semantics**; easy to defer to wave 2.
- **Chapel** risks tall-box similarity to tower and higher proportion research cost.
- **Tavern** pulls toward interior/bar layout and multi-room pressure earlier than needed.

### Semantic features (blacksmith)

| Feature | v1 implement | Defer |
|---------|--------------|-------|
| Rectangular footprint, 1–2 stories | Yes | — |
| Pitched / shed roof (not stepped pyramid) | Yes | Complex multi-gable |
| Front entrance + windows (pane if glass) | Yes | — |
| Hollow interior or partial floor slab | Yes (simple void + optional floor layer) | Room graph |
| **Chimney** (vertical accent column through roof) | Yes (cube stack) | Connection-aware |
| **Forge zone** (interior or rear bay; hot block placeholder) | Yes (accent/obsidian cube cluster) | Furnace block def |
| **Workbench zone** (plank/log cubes) | Yes (placeholder voxels) | Anvil mesh/block |
| **Storage zone** (crate-like cubes) | Optional minimal | Crate object types |
| Front **work area** / awning | Defer | Overhang grammar |
| Style catalog entries | Defer to family+generator slice 2 | — |

### Anti–simple-box measures

- Asymmetric chimney side; forge bay inset or rear bump-out; contrasting materials (stone walls, plank door/trim); lower **height:width** ratio than tower; roof ridge + eaves step-in one layer.

---

## 8. Proposed first-family blueprint shape

**Recommendation:** add a **separate `BlacksmithWorkshopBlueprint` type** and widen unions—**do not mutate `MedievalTowerBlueprint`**.

```ts
// Conceptual — not implemented

type StructureType = "medieval_tower" | "blacksmith_workshop";

type StructureBlueprint = MedievalTowerBlueprint | BlacksmithWorkshopBlueprint;

type ResolvedStructure =
  | ResolvedMedievalTower
  | ResolvedBlacksmithWorkshop;
```

**Avoid** a single generic “bag of fields” blueprint for all families in v1—it obscures validation and UI. A thin **family registry** (metadata + validator + generator refs) is enough abstraction.

### `BlacksmithWorkshopBlueprint` (proposed fields)

| Section | Fields | Mirror tower? | Family-specific |
|---------|--------|---------------|-----------------|
| Identity | `structureType: "blacksmith_workshop"` | Discriminator | Yes |
| | `metadata` (name, description, notes) | Same pattern | — |
| Dimensions | `width`, `length`, `height` | Similar | Lower default height; rectangular (non-square allowed?) |
| Materials | 6 slots: wall, floor, roof, window, door, accent | **Same slots** | Defaults: stone + planks + glass |
| Massing | footprint, wallThickness, hollowInterior | Partial | Drop tower-only: `verticalEmphasis`, `symmetry` enum may simplify to `bilateral` default |
| | `singleStory` or `bodyLayers` | — | Replace `levels.floorCount` tower semantics |
| Roof | `style: "pitched_gable" \| "shed"`; height, overhang | Different enum | No stepped_pyramid / crenellations |
| Openings | entranceSide, width, height, style | Similar | Typically single front door |
| | windowsStyle, placement, count | Similar subset | Fewer faces (front + sides) |
| Features | `chimney: { side, width }` | — | **Yes** |
| | `forge: { zone: "interior_rear" \| "side_bay"; footprint hint }` | — | **Yes** |
| | `workbench: boolean` | — | **Yes** |
| | `storage: boolean` | — | **Yes** |
| Constraints | maxBlockCount, allowFloating, requireGrounded | Same | — |

**Explicitly omit from v1 blueprint**

- `floorPlan`, `rooms[]`, furniture catalog
- Crenellations, corner pillars, merlons, tower window column algorithm params

**Import/export**

- v1 envelope today is tower-only. Options for first family slice:
  - **(Preferred for slice C)** Ship generator + types in repo tests only; defer exchange envelope to **schemaVersion 2** with discriminated union, **or**
  - Add optional v2 envelope in same milestone if import is required—higher scope.

---

## 9. Generator strategy for first family

**New module:** `generateBlacksmithWorkshop(resolved: ResolvedBlacksmithWorkshop): VoxelBlock[]`

Reuse patterns from `generateMedievalTower`:

- `centerOrigin`, `mergePlacements`, `filterGrounded`, material ids from resolved
- Pane windows: same `isShapeAllowedForBlockType(m.window, "pane")` + façade axis rule (adapt axis helper for rectangular faces)
- **No slab trim** near panes (tower lesson)

### Phases (deterministic order)

1. **Foundation** — full footprint at y=0 (`m.floor` or wall).
2. **Shell** — hollow interior; walls T thick; door aperture on entrance face.
3. **Interior floor** (optional) — single layer in void at y=1 if enabled.
4. **Forge zone** — reserve rectangular cells; place accent/obsidian “heat” cubes + surround stone.
5. **Workbench zone** — plank/log cubes along wall or center table row.
6. **Storage zone** (optional) — corner plank “crate” stacks (2–4 cubes).
7. **Windows** — sparse on front/sides; pane when allowed.
8. **Roof** — pitched gable: layer shrinking rows or slope voxels; chimney penetration (hole + stack above).
9. **Chimney** — vertical column on designated side through roof + 1–2 above ridge.

### Interior objects: v1 recommendation

- **Implement placeholder blocks** (known classic keys) inside zones—not abstract “furniture ids.”
- **Do not** implement floor-plan graph or walkability yet.
- Zones are **generator-authored** from blueprint flags (e.g. `forge.enabled: true`), not AI voxel placement.

### Connectivity

- Target **single 26-connected component** including chimney (attach chimney base to wall/roof).
- If forge bump-out risks disconnect, merge bump into shell or connect with 1-voxel bridge (deterministic rule).

---

## 10. Relationship to styles

| Question | Recommendation |
|----------|----------------|
| Blacksmith-specific style IDs later? | **Yes** — e.g. `rustic_village_forge`, `mountain_ironworks` with `applicableFamilies: ["blacksmith_workshop"]`. |
| Current six styles on tower only? | **Keep** — all existing entries remain `medieval_tower` only. |
| Extend `BuildingFamilyId`? | **Yes** when blacksmith ships: `"medieval_tower" \| "blacksmith_workshop"`. |
| Family before blacksmith styles? | **Yes** — implement **family + generator + 1–2 presets** first; add 2–3 blacksmith styles in a follow-up slice (catalog only or with preset tags). |
| Style resolver? | **Still defer** — presets carry full blueprint; optional `styleId` on `BlacksmithWorkshopPreset` wrapper mirrors tower. |

AI-invented styles: allowed as **custom palette/hints** only within a supported family; not new families.

---

## 11. Relationship to AI and photo input

**Future flow**

```text
prompt / photo
  → classify supportedFamilyId (closed set)
  → optional requestedFamily (unsupported label → backlog)
  → optional styleId or invented style profile (within family)
  → blueprint draft (family-specific fields + zones)
  → validateBlueprint → generateStructure → VoxelBlock[]
```

**Examples**

| Input | Supported mapping | Backlog signal |
|-------|-------------------|----------------|
| “Gothic stone tower” | `medieval_tower` + `gothic_stone` style | — |
| “Village blacksmith with forge” (after ship) | `blacksmith_workshop` + future forge style | — |
| Notre Dame photo (no cathedral) | Closest: `chapel` or `medieval_tower` tall | `requestedFamily: "cathedral"` |
| Barn photo | Closest: `cottage` / `warehouse` when exist; else `blacksmith_workshop` or tower | `requestedFamily: "barn"` |
| “Skyscraper” | Closest: `medieval_tower` tall / refuse with note | `requestedFamily: "skyscraper"` |

AI must not output raw voxels; must not set `structureType` to an unshipped value without fallback.

---

## 12. Validation and tests

### New family test matrix

| Suite | Content |
|-------|---------|
| `validateBlueprint` | Blacksmith-specific clamps (min footprint, chimney side valid, roof style enum) |
| Smoke | One default preset validates + non-empty blocks |
| Preset invariants | `it.each(BLACKSMITH_PRESETS)` — reuse `assertGeneratedStructureHardInvariants` + placement semantics |
| Edge fixtures | Tight `maxBlockCount`, max entrance, thin walls (mirror `edgeCaseBlueprints.ts` pattern) |
| Block IDs | All resolved ids in registry |
| Duplicates | `duplicateCoordinateCount === 0` |
| Connectivity | Default: **single 26-component** + grounded (same as tower unless design docs exception) |
| Budget | `blocks.length <= maxBlockCount` |
| Panes | If window is glass, pane rules tests analogous to `generatorWindowPanes.test.ts` |
| Styles | Extend `buildingStyles.test.ts` only when blacksmith styles added |
| Import/export | If schemaVersion bumped: round-trip tests for new discriminator |

### Hard invariants for blacksmith

- **Likely sufficient unchanged** if: one building mass, chimney connected, no floating forge cubes.
- **Revisit if:** exterior forge bump, detached signboard, or future yard objects — may need component policy per family documented in `GENERATOR_RELIABILITY.md`.

### Shared test utils

- Parameterize `maxBlockCount` from resolved constraints.
- Optional `familyId` in diagnostic strings for clarity.

---

## 13. UI and preview considerations

| Surface | Today | First-family recommendation |
|---------|-------|------------------------------|
| `/visualizer` | Tower blueprint form, `MEDIEVAL_TOWER_PRESETS`, `structureType` display | **Tower unchanged** in slice C; family selector is slice D |
| `/preview` | Tower preset inspection | **No change** in slice C |
| `blueprintExchange` | Tower-only v1 | Defer or v2 with union |

**Recommendation for first implementation (slice C):** **Generator + blueprint types + tests + in-repo presets only—no UI.** Avoids large `VisualizerClient` branch and exchange breakage.

**Slice D (follow-up):** minimal lab support—family dropdown, load `BLACKSMITH_PRESETS[0]`, validate/generate path through existing pipeline with discriminated blueprint type.

---

## 14. Recommended first implementation slice

**Recommended path: C — Minimal blacksmith blueprint + generator + tests, no UI**

| Path | Description | Verdict |
|------|-------------|---------|
| A | Taxonomy docs only | Too thin after style catalog |
| B | Union types + family catalog, no generator | Acceptable prep-only; delays demo value |
| **C** | **Blacksmith schema + validator + generator + 1–2 presets + tests** | **Preferred** — one quality family |
| D | C + minimal preview/visualizer | Good fast follow-up, not first commit |
| E | Multiple families at once | Rejected — shallow generators |

### Slice C deliverables (after plan approval)

1. `BlacksmithWorkshopBlueprint` + `ResolvedBlacksmithWorkshop` in `types.ts`
2. `StructureBlueprint` / `ResolvedStructure` unions; dispatch in `generateStructure.ts`
3. `validateBlacksmithWorkshop` (split or extend `validateBlueprint`)
4. `generateBlacksmithWorkshop.ts` — phases in §9
5. `BLACKSMITH_PRESETS` (1–2 curated snapshots)
6. Tests: smoke, preset invariants, 2–3 edge fixtures, pane/trim policy parity with tower
7. Extend `BuildingFamilyId` in **family catalog** file (new `buildingFamilies.ts` optional) — ids + manifest, not full taxonomy doc dump
8. **No** UI, **no** import/export v2 unless explicitly approved
9. **No** blacksmith styles in catalog yet (or 1 default style entry metadata-only)

**Second slice:** D (UI) + exchange v2 + 2–3 blacksmith `styleId`s in catalog.

---

## 15. Non-goals

- No multi-family batch (cottage + tavern + chapel in one PR)
- No AI runtime, photo pipeline, or prompt classification implementation
- No `floorPlan` / room / circulation schema
- No new textures or block definitions (forge/furnace face remains backlog)
- No Minecraft export
- No connection-aware blocks, fences, stairs, doors as partial kinds
- No new partial shape kinds
- No broad UI redesign
- No style resolver unless blacksmith presets need it later
- No runtime registration of unsupported families
- No generator slab trim at windows (tower policy carries over)
- No cathedral, barn, rowhouse, or apartment implementation in first slice

---

## 16. Risks and open questions

| Risk | Mitigation |
|------|------------|
| Schema union complexity | Separate types per family; shared `BlueprintMaterials` only |
| Dispatch / resolved typing | Exhaustive `switch`; `never` exhaust checks |
| Blacksmith reads as box | Chimney, forge bay, roof pitch, material contrast, asymmetric chimney |
| Object vocabulary without furniture blocks | Plank/stone **placeholders**; document as v1 approximation |
| Connectivity (chimney, bump-out) | Deterministic attachment rules; test `connectedComponentCount26` |
| UI tower assumptions | Defer UI; grep `MedievalTowerBlueprint` at integration time |
| Style catalog drift | Add blacksmith styles only after family tests green |
| `validateBlueprint` god-file | Split validators per family behind single entrypoint |
| Import/export breakage | Keep v1 tower-only until v2 designed |
| AI requests “forge” on tower | Classification + notes; tower cannot encode forge zone |

**Open questions for review**

1. Allow **non-square** footprint for blacksmith in v1, or force square like tower?
2. `structureType` string: `"blacksmith_workshop"` vs `"blacksmith"`?
3. Is one 26-component mandatory for chimney, or allow documented exceptions?
4. Ship **import/export v2** in same PR as generator, or tests-only until UI?
5. Minimum preset count: 1 (default forge) or 2 (rustic + dark iron)?
6. Add **`buildingFamilies.ts` catalog** in slice C, or only types + generator?
7. Should unsupported-family backlog live in blueprint `metadata.notes` or separate telemetry type later?

---

Scoping only — waiting for review before implementation.
