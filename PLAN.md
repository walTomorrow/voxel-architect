# Plan — Building Style System for Generator Expansion

## 1. Purpose

Generator Expansion has established the **partial block foundation** (`shapeKind` / `state` on `VoxelBlock`), **renderer support** for cube / slab / pane / post, a **curated `CLASSIC_MATERIAL_META`** layer, **placement validation** (`validateVoxelBlockPlacement` / `validateVoxelStructurePlacements`), **generator-emitted pane windows** when window materials allow pane, and **reliability tests** that treat placement semantics as correctness—not viewer fallbacks.

The **next** component is a **building style system**: a reusable layer that describes **aesthetic and material/detail intent** without adding another **building family** or rewriting the medieval tower generator.

**Why style now**

- Curated presets already read as distinct moods (gothic stone, dark wizard, fortified gate) but express that only through **scattered blueprint fields** and **preset ids**—there is no shared vocabulary for AI, docs, or future families.
- **Material metadata** answers “can this block be a pane/slab/post?”; **style** should answer “which palette and detail profile fit this mood?”—orthogonal concerns.
- Partial-block adoption taught a constraint: **style must not bypass generator rules** (e.g. slab trim below pane windows was reverted because it looked wrong). A style layer should guide **blueprint defaults** and **future generator policy**, not raw per-voxel overrides.

**Goal of this milestone slice (after plan approval)**

- Define how Voxel Architect **represents** and **uses** style across families.
- **Not** in scope for the first implementation: new building families, new textures, schema churn, interiors, or broad generator redesign.

---

## 2. Current style behavior

Today, “style” is **implicit**—encoded by **curated preset snapshots** and **blueprint parameters**, not by a dedicated `style` field (`src/lib/blueprints/types.ts` has no style property).

### Preset catalog (`MEDIEVAL_TOWER_PRESETS`)

| Preset id | Label (implicit style read) | Distinctive material palette | Massing / silhouette | Openings / crown |
|-----------|----------------------------|------------------------------|----------------------|------------------|
| `northwatch` | Default balanced medieval watch | cobblestone walls, limestone accent, slate_tiles roof, glass | medium vertical, T=2, bilateral | arched entrance, symmetric upper windows, stepped pyramid + crenellations + corner pillars |
| `tall_watchtower` | Slender military watch | mudstone accent, thin shell T=1, tall emphasis | very tall body, simple entrance | same window banding pattern, stepped crown |
| `fortified_gate` | Fortress / gatehouse mass | mossy_cobblestone walls, wide 13×13, T=3 | medium, thick shell | flat roof (tests flat cap path), windows on all floors |
| `gothic_stone` | Pale gothic stone | limestone_bricks wall+floor, arched windows | tall, 11×11 | arched entrance + arched window style |
| `compact_guard` | Minimal border post | gravel floor, slate roof, andesite accent | low emphasis, 5×5, T=1, no corner pillars | front_only windows, width-1 door |
| `dark_wizard` | Dark fantasy tower | obsidian wall, schist floor/accent, dense windows | tall, arched windows all floors, 4/side | moody palette, stepped crown |

Preset **ids** and **`metadata.name` / `description`** carry human style language; the **blueprint body** carries the machine-readable choices.

### What is blueprint-driven vs hardcoded

| Concern | Blueprint-driven today | Generator-hardcoded today |
|--------|-------------------------|---------------------------|
| Materials (6 slots) | `materials.*` classic keys → resolved `BlockTypeId` | No style resolver; uses `r.materials` directly |
| Footprint / height budget | `dimensions` + validator clamps → `grid` | `centerOrigin`, shell/void rules |
| Vertical read | `massing.verticalEmphasis`, `wallThickness`, `hollowInterior` | Body layer loop, corner pillar branch |
| Symmetry | `massing.symmetry`, `constraints.enforceSymmetry` | Window column placement algorithm |
| Entrance | `openings.entranceSide/Style/Width/Height` | Portal jambs, door row, optional arch voxels |
| Windows | `windowsStyle`, `windowsPlacement`, `windowsFloors`, `windowsCountPerSide` | `buildWindowGlassSet`, pane vs cube via `isShapeAllowedForBlockType(m.window, "pane")` |
| Roof / crown | `roof.style`, `height`, `overhang`; `features.crenellations`, `cornerPillars` | Roof layers, parapet, merlons, capstones |
| Façade trim | *(no trim-specific blueprint flags)* | `PRI.FACADE_TRIM` cubes at `yy±1` around glass (**full cube**; slabs reverted) |
| Partial shapes | Indirect via material choice | Pane emission only; no generator slabs/posts from trim |

### Implicit style categories already present

- **Gothic / ecclesiastical stone**: `gothic_stone` (limestone mass, arched openings).
- **Fortified / military**: `fortified_gate`, `tall_watchtower`, `compact_guard` (mass, thickness, or austerity).
- **Fantasy / dark**: `dark_wizard` (obsidian, dense glazing).
- **Rustic / village stone**: `northwatch`, `fortified_gate` (cobble + limestone family).
- **Wizard / forge mood** (future blacksmith family): not a separate generator yet, but palette patterns (dark stone + accent schist) preview how **style** might later attach to other families.

### Aspirational docs vs code

- [`BLUEPRINT_FEATURE_CATALOG.md`](docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md) Tier 5 and §8 show **future** `style`, `mood`, and AI vocabulary—these are **not** in the shipped schema.
- [`BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md) notes style-like choices are carried by **materials and parameters** today.

---

## 3. Family vs style distinction

| Concept | Definition | Examples |
|--------|------------|----------|
| **Building family** | Structural **generator strategy** + blueprint shape: footprint grammar, which subsystems exist (tower shell vs cottage hall vs forge workshop). Dispatched by `structureType` → `generateStructureFromResolved`. | `medieval_tower` (only family shipped); future: `cottage`, `blacksmith`, `chapel`, `tavern` |
| **Building style** | **Aesthetic and detail rules within a family**: material mood, opening vocabulary, ornament density, symmetry habits, encouraged partial shapes **where generator policy allows**. | Gothic stone tower, dark wizard, fortified military, wooden frontier cottage, rustic village forge |
| **Material palette** | Concrete classic keys (or resolved ids) for slots: wall, floor, roof, window, door, accent. | `{ wall: "limestone_bricks", accent: "limestone", window: "glass", … }` |
| **Feature / detail profile** | Boolean and enum knobs the generator understands today: crenellations, corner pillars, roof style, window style/placement, entrance style. | `features.crenellations: true`, `openings.windowsStyle: "arched"` |

**Concrete pairings (family fixed, style varies)**

- Family **tower**, style **gothic stone** → pale masonry, arched openings, stepped slate crown (`gothic_stone` preset).
- Family **tower**, style **dark wizard** → dark shell, dense arched glazing, schist accents (`dark_wizard`).
- Family **blacksmith** (future), style **rustic village forge** → not implemented; would share forge family grammar but warm stone/wood palette and forge-zone semantics later.
- Family **cottage** (future), style **wooden frontier** → different generator; low massing, plank-forward palette.

**Why style ≠ family**

- Same family generator can render many styles by changing **palette + feature profile** without forking placement code.
- Adding a “gothic cottage” is a **style** (+ maybe palette defaults), not a new cottage **family**, once a cottage generator exists.
- Confusing them leads to `structureType: "gothic_tower"` explosion; prefer `structureType: "medieval_tower"` + `styleId: "gothic_stone"`.

---

## 4. Candidate style model

Lightweight **catalog record** (TypeScript module, not blueprint schema yet):

```ts
type BuildingFamilyId = "medieval_tower"; // extend when families ship

interface BuildingStyleDefinition {
  readonly styleId: string;           // stable snake_case, e.g. "gothic_stone"
  readonly displayName: string;
  readonly description?: string;
  readonly applicableFamilies: readonly BuildingFamilyId[];
  readonly tags?: readonly string[];  // "gothic", "fortress", "fantasy", "stone_heavy"

  /** Default authoring hints — applied only when resolving style → blueprint (future) */
  readonly defaultPalette?: Partial<BlueprintMaterials>; // classic keys only
  readonly massingHints?: Partial<Pick<BlueprintMassing, "verticalEmphasis" | "symmetry">>;
  readonly openingsHints?: Partial<Pick<BlueprintOpenings, "windowsStyle" | "entranceStyle" | "windowsPlacement" | "windowsFloors">>;
  readonly roofHints?: Partial<Pick<BlueprintRoof, "style">>;
  readonly featuresHints?: Partial<BlueprintFeatures>;

  /** Non-authoritative mood metadata for AI/docs */
  readonly mood?: readonly ("bright" | "dark" | "austere" | "ornate")[];
  readonly ornamentation?: "minimal" | "moderate" | "heavy";
  readonly colorMood?: "warm" | "cold" | "neutral";

  /**
   * Shapes a style *prefers* when generators support them — must still pass
   * isShapeAllowedForBlockType at emission time.
   */
  readonly encouragedPartialShapes?: readonly ("pane" | "slab" | "post")[];
}
```

**Design rules for the model**

- **`styleId`** is stable across presets, AI prompts, and export metadata (future).
- **`applicableFamilies`** prevents applying cottage palettes to tower generators.
- **Hints** are defaults/overrides, not a second blueprint—merged only through an explicit resolver (later).
- **Tags** support search and prompt grounding without encoding geometry.
- Do **not** store connection flags, voxel coordinates, or texture paths in style records.

**Preset linkage (no schema change)**

```ts
interface MedievalTowerPreset {
  readonly id: string;
  readonly label: string;
  readonly blueprint: MedievalTowerBlueprint;
  readonly styleId?: string; // references catalog — optional first slice
}
```

---

## 5. Relationship to material metadata

[`CLASSIC_MATERIAL_META`](src/lib/voxel/blocks/packs/classicMaterialMeta.ts) + [`materialMetaHelpers`](src/lib/voxel/blocks/materialMetaHelpers.ts) define **per-block** capabilities:

- `materialGroup`, `textureRole`, `tags`
- `allowedShapeKinds` (cube / slab / pane / post)
- Unannotated keys: **cube-only** for partial shapes

**How style should use metadata**

| Layer | Responsibility |
|-------|----------------|
| **Style** | Chooses palette keys and mood; may *prefer* pane windows when `window` resolves to glass. |
| **Material metadata** | Authoritative on whether `shapeKind: "pane"` (etc.) is valid for a `blockTypeId`. |
| **Generator** | Emits partials only when metadata + local policy agree (today: panes yes; trim slabs no). |
| **Validation** | `validateVoxelStructurePlacements` must pass on all generator output. |

**Style must not bypass metadata** — e.g. a “gothic stained glass” style cannot force `pane` on `oak_planks` without changing the window material or accepting cube fallback (existing `generatorWindowPanes` behavior).

**Sufficiency for first style work**

- **Sufficient** for catalog + preset tagging + AI vocabulary: current metadata covers glass (pane), common roof/accent stones (slab-capable), logs (post), planks (slab/post).
- **Future expansion** (not this slice): more annotated keys, `materialVariation` bands, style-level “discouraged shapes” tied to generator policy tables (e.g. never slab adjacent to pane trim).

**Lesson from trim slabs**

- Metadata allowed slab on accent stones; generator used slabs; visual QA failed. **Style/catalog should document generator policy exclusions** separately from `allowedShapeKinds` until generator rules catch up.

---

## 6. Relationship to blueprints

**Current schema** (`MedievalTowerBlueprint`): `structureType`, `metadata`, `dimensions`, `materials`, `massing`, `levels`, `openings`, `roof`, `features`, `constraints` — **no `style` field**.

**Import/export** ([`BLUEPRINT_JSON_FORMAT.md`](docs/blueprints/BLUEPRINT_JSON_FORMAT.md)): envelope is `kind` + `schemaVersion` + `blueprint` only; lab source/preset tracking is UI-local.

### Staged recommendation (aligned with milestone preference)

| Stage | What | Schema impact |
|-------|------|----------------|
| **1 — Now (first implementation)** | **Style catalog module** + taxonomy docs in code; **optional `styleId` on preset wrapper**; map existing six presets to catalog entries. | **None** on `MedievalTowerBlueprint` |
| **2 — Later** | **Style resolver**: `resolveStyleToBlueprintHints(styleId, family)` merges hints into a clone for lab/AI seeding. | Still none if resolver runs at UI/AI boundary |
| **3 — Optional** | `metadata.styleId?: string` or top-level `styleId?: string` on blueprint | **Additive optional** field; bump `schemaVersion` when introduced |
| **4 — Far** | Required style for multi-family AI | Only if product needs it |

**Can style live in existing fields today?**

Yes, partially:

- `materials` ≈ palette
- `massing.verticalEmphasis`, `openings.*`, `roof.*`, `features.*` ≈ detail profile
- `metadata.name/description` ≈ human style label

What is **missing** without a catalog: stable **`styleId`**, cross-preset vocabulary, AI grounding, and “apply gothic defaults” without hand-copying six slot groups.

**Do not add a required blueprint field yet** — avoids locking import/export and validator before multiple families exist.

---

## 7. Relationship to generators

**Today:** [`generateMedievalTower`](src/lib/generation/generators/generateMedievalTower.ts) reads only `ResolvedMedievalTower` — no style input.

**Consumption patterns (staged)**

1. **None (catalog only)** — style is documentation + preset tags; generator unchanged. **Lowest risk.**
2. **Seed resolver (pre-generator)** — `applyStyleHints(styleId, blueprint) → blueprint` for lab defaults; user edits remain authoritative. Deterministic merge rules (hints fill **missing** slots only, or explicit `resetFromStyle` action).
3. **Generator-internal style policy (later)** — family-specific tables: e.g. `medieval_tower` + `styleId` → window density caps, trim shape policy, parapet density. Must stay **deterministic** and tested.
4. **Family adapters (future)** — `generateCottage(resolved, stylePolicy)` where `stylePolicy` is derived from catalog, not raw voxels.

**What must remain deterministic**

- Same validated blueprint (+ same generator version) → same `VoxelBlock[]`.
- Merge priority by `(x,y,z)` unchanged unless a style policy is part of **validated** blueprint fields.
- Partial emission gated by `isShapeAllowedForBlockType` + generator policy.

**Current generator facts style must respect**

- Pane windows: `paneAxisForWindowCell` + `isShapeAllowedForBlockType(m.window, "pane")`.
- Façade trim: **full cube** at `yy±1` (no slabs).
- No posts from accent trim path.

---

## 8. Relationship to AI

Per [`GENERATION_DESIGN_PRINCIPLES.md`](docs/generation/GENERATION_DESIGN_PRINCIPLES.md) §1.3–§1.4 and blueprint catalog **Responsibility split**:

**AI may propose**

- `structureType` (family)
- `styleId` or natural language mapped to catalog entry
- Material palette (classic keys per slot)
- Feature/opening preferences (arched vs simple, crenellations, window density)
- Mood / ornamentation tags (Tier 5 catalog — narrative, not geometry)

**AI must not**

- Emit authoritative `VoxelBlock[]` streams
- Bypass `validateBlueprint()` / `validateVoxelStructurePlacements`
- Invent block keys outside `CLASSIC_BLOCK_PACK`

**Suggested AI flow (future)**

```text
prompt → (family, styleId?, overrides) → style catalog defaults
       → merge into blueprint draft → validateBlueprint → generateStructure
```

**Style catalog as prompt grounding**

- Gives the model a **closed set** of `styleId` values with `applicableFamilies` and example palettes (from existing presets).
- Reduces contradictory requests (“minecraft modern cottage” on `medieval_tower`) via validation notes.

**Floor plans / interiors**

- Documented as future blueprint semantics only; style system should **not** imply room layout until schema exists.

---

## 9. Recommended first implementation slice

**Recommended path: B — Style catalog module without schema changes** (with light **preset `styleId` tagging**, which is preset-wrapper metadata, not blueprint schema).

**Why not A alone**

- Taxonomy-only in markdown drifts from code; catalog in `src/lib/` stays testable and powers preset tags + future resolver.

**Why not D/E first**

- Optional/required blueprint `styleId` affects import/export and validator versioning before multi-family proof.
- Full **resolver** that overwrites user blueprints is easy to get wrong without UX for “reset from style”.

**Why B fits constraints**

- No blueprint schema / import-export change.
- No generator behavior change in the first slice (preserves trim-cube + pane behavior and all invariant tests).
- Maps 1:1 onto existing six presets as reference implementations.
- Enables follow-up **E** (resolver) without committing schema.

**First slice deliverables (implementation prompt after review)**

1. `src/lib/generation/styles/` (or `src/lib/blueprints/buildingStyles.ts`):
   - `BUILDING_STYLES` record keyed by `styleId`
   - `getBuildingStyle(styleId)`, `stylesForFamily(familyId)`
   - Six entries mirroring current presets (hints copied from actual blueprint snapshots)
2. Add optional `styleId` to `MedievalTowerPreset` + set on each `MEDIEVAL_TOWER_PRESETS` entry.
3. Vitest: unique ids, families include `medieval_tower`, palette keys ∈ `CLASSIC_BLOCK_PACK`, no generator output change (existing suites unchanged).
4. **Do not** wire catalog into `generateMedievalTower` yet.

**Optional micro-doc** (only if team wants): short “Style catalog” subsection in `GENERATION_DESIGN_PRINCIPLES.md` — **defer** unless requested; this plan is the source of truth until implementation.

---

## 10. Tests and validation strategy

**If first slice is catalog + preset tags (recommended)**

| Test | Purpose |
|------|---------|
| `styleId` uniqueness | No duplicate keys in `BUILDING_STYLES` |
| `applicableFamilies` | Each style lists `medieval_tower` for current catalog |
| Palette keys resolvable | Every `defaultPalette` key passes `isClassicKey` / registry |
| Hint enums valid | `verticalEmphasis`, `windowsStyle`, etc. match blueprint unions |
| Preset ↔ style | Each `MEDIEVAL_TOWER_PRESETS[].styleId` references catalog |
| **Regression** | Existing `generatorPresetInvariants`, `generatorEdgeCaseInvariants`, `generatorWindowPanes` unchanged (no generator edits) |

**Not needed in catalog-only slice**

- Snapshot voxel counts per style
- Visual regression infrastructure

**When resolver (stage 2) ships**

- Unit tests: `applyStyleHints` merge rules, idempotent on full blueprint, `validateBlueprint` ok
- Optional: cloned blueprint gets expected materials after `styleId` only

**When generator consumes style (stage 3+)**

- Extend `assertGeneratedStructurePlacementSemantics` per style policy fixtures
- Never rely on VoxelViewer skip/warn

---

## 11. Non-goals

- No new textures; no texture generation
- No new block definitions in `CLASSIC_BLOCK_PACK`
- No new building families or generators beyond `medieval_tower`
- No blueprint schema change in the first slice
- No blueprint import/export format change
- No curated preset **blueprint body** changes unless fixing a catalog typo (prefer snapshot fidelity)
- No interiors / floor plans / room schema
- No AI agent implementation or prompt pipeline
- No Minecraft export / compatibility mode
- No connection-aware blocks (fences, walls, bars, connection-aware panes)
- No new partial shape kinds; no doors, stairs, plants, lanterns, signs
- No broad medieval tower generator redesign
- No reintroduction of window-adjacent **slab** trim without explicit visual policy
- No post adoption in tower generator from style defaults
- No `/preview` or `/visualizer` changes unless TypeScript requires imports for preset `styleId` display (defer UI)
- No visual regression / screenshot CI
- No edits to `docs/blocks/BLOCK_SYSTEM_BACKLOG.md` in the first slice

---

## 12. Risks and open questions

| Risk | Mitigation |
|------|------------|
| Style taxonomy too abstract to drive geometry | Anchor each style to a **real preset snapshot**; hints are copies, not imagination |
| Early blueprint `styleId` locks wrong model | Defer schema; use preset + catalog only first |
| Style vs material palette overlap | Style owns **defaults**; blueprint `materials` remain authoritative after edit |
| Generator interprets style differently per family | Keep family-specific **policy tables** separate from global catalog |
| Six presets “enough” styles | Catalog can list **theoretical** styles with `referencePresetId` optional; only six need full hints initially |
| User-facing vs internal | First slice **internal** (preset tags, tests); UI label “Style: Gothic Stone” can wait |
| AI maps vague prompts to wrong `styleId` | Closed enum + validator notes; require `structureType` match |
| Encouraged partial shapes vs generator policy | Catalog `encouragedPartialShapes` is non-binding until generator tables exist; document trim/slab exclusion |
| Style resolver overwrites user edits | Merge only empty slots, or explicit “Apply style defaults” action |
| Multi-family future | `applicableFamilies` on each style; blacksmith styles must not appear on tower validator paths |

**Open questions for review**

1. Should `styleId` equal preset id (`gothic_stone`) or be decoupled (`gothic_stone_tower` vs preset `gothic_stone`)?
2. When schema gains `styleId`, does it live on `metadata` or top-level?
3. Should catalog include **anti-patterns** (e.g. “do not use slab trim near panes”) for generator stage 3?
4. Is a separate `materialPaletteId` needed, or is `defaultPalette` enough?
5. How will style interact with future **floor-plan zones** (forge style → forge room hint)?

---

Scoping only — waiting for review before implementation.
