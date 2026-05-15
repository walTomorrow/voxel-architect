# Plan: Blueprint Portability — import/export JSON format (documentation + exchange module)

## 1. Current understanding

### Milestone and branch

- **Branch:** `milestone/blueprint-portability`
- **Issue (this step):** Define blueprint **import/export** format — **documentation and typed helpers first**, not the full UI.
- **Goal:** A **rigorous, well-documented**, **frontend-only** blueprint **JSON exchange** format so later work can add import/export controls in **`/visualizer`** without rediscovering contracts in ad hoc UI code.

### What a blueprint is (this project)

- A **blueprint** is the **editable authoring state** consumed by **`/visualizer`**: design intent including **`structureType`**, **dimensions**, **materials** (classic pack keys), **massing**, **levels**, **openings**, **roof**, **features**, **constraints**, and **metadata** — modeled concretely today as **`MedievalTowerBlueprint`** in **`src/lib/blueprints/types.ts`** (alias **`StructureBlueprint`**).
- **`validateBlueprint()`** (**`src/lib/blueprints/validateBlueprint.ts`**) turns a raw blueprint into **`BlueprintValidationResult`** (errors, notes, optional **`resolved`** **`ResolvedMedievalTower`**). **`generateStructureFromResolved()`** consumes **resolved** output, not the raw JSON file format.
- **Presets** (**`src/lib/blueprints/sampleBlueprints.ts`**) are stable **`MedievalTowerBlueprint`** snapshots (clone before UI mutation); they are **not** the exchange envelope.

### What is intentionally *not* exported (v1 contract)

- **No** **`VoxelBlock[]`** or generated voxel arrays.
- **No** Minecraft **`.schem` / `.litematic`** (or any voxel world export).
- **No** **`ResolvedMedievalTower`** in the default v1 envelope unless we explicitly justify it later (resolved form is derived; keeping the file to **authoring blueprint** avoids duplicating generator internals in GitHub issues and AI outputs).

### Why frontend-only for now

- No **backend**, **database**, or **`localStorage`** per product decisions — exchange is **files / clipboard / issue text** in the browser, validated entirely client-side.
- A stable **wrapped JSON** contract supports: **debugging** (attach one JSON to an issue), **tests** (golden envelopes), **GitHub workflows** (human + bot readable), and future **AI blueprint generation** (model emits JSON → same parser as import).

### How this supports future workflows

- **Issues / tests:** Pretty-printed, diff-friendly JSON with a **`kind`** discriminator reduces “is this even our format?” confusion.
- **AI:** Models can target **`blueprint`** object fields documented in **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`** and **`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`**; import pipeline rejects invalid proposals before touching editor state.

---

## 2. Documentation organization

### Target layout

- Create **`docs/blueprints/`** as the home for **blueprint-specific** documentation (schema intent, exchange format, feature catalog).

### `BLUEPRINT_FEATURE_CATALOG.md`

- **Location:** **`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`** (moved from repo root as part of this milestone).
- **References:** **`GENERATION_DESIGN_PRINCIPLES.md`** cites **`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`**.

### `BLUEPRINT_JSON_FORMAT.md` (new)

- **Location:** **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`**.
- **Contents (planned):** Official v1 envelope; required vs optional fields; **`schemaVersion`** semantics; examples (minimal + one real preset snapshot); import validation order; explicit non-goals; relationship to **`MedievalTowerBlueprint`** / **`validateBlueprint()`**.

### `GENERATION_DESIGN_PRINCIPLES.md`

- **Stay at repo root** unless a strong reason appears later. It governs **generation**, **viewer**, and **AI behavior** across the product — broader than **exchange format** alone. Only **cross-links** into **`docs/blueprints/`** should be updated when the catalog moves.

### Other references

- **`src/lib/blueprints/validateBlueprint.ts`** — comment referencing **`GENERATION_DESIGN_PRINCIPLES`** only; **no** catalog path today.
- **`README.md`**, **`VISION.md`**, **`PROJECT_CONTEXT.md`** — no current links to the catalog filename; **optional** future README link to **`docs/blueprints/`** is out of scope for this issue unless desired in a follow-up.

---

## 3. Proposed export format (official v1 wrapped JSON)

### Envelope shape

```json
{
  "kind": "voxel-architect-blueprint",
  "schemaVersion": 1,
  "blueprint": { }
}
```

- **`kind`** (string, **required**): Literal **`"voxel-architect-blueprint"`** — discriminates our files from random JSON, Minecraft tools, or other apps.
- **`schemaVersion`** (number, **required**): Integer **exchange format version** (see §4). For v1 implementation, only **`1`** is accepted on import.
- **`blueprint`** (object, **required**): The **authoring** blueprint object — today must satisfy **`MedievalTowerBlueprint`** / **`StructureBlueprint`** after structural checks, then **`validateBlueprint()`**.

### Serialization rules

- **Pretty-printed** JSON (stable indentation, e.g. **2 spaces**) for human/AI/Git diff readability.
- **UTF-8** text; no BOM required; document if we ever add a BOM policy.

### Optional metadata (recommended stance)

- **Default v1:** **No** optional fields **required** for valid export/import.
- **Allow optional** top-level keys only if **useful and low-risk**:
  - **`exportedAt`** (string, ISO-8601): helps issue forensics; omit vs include is exporter choice; importer **ignores** unknown optional keys or documents “strip and warn” policy in **`BLUEPRINT_JSON_FORMAT.md`**.
  - **`exportedBy`** / app name: **Defer** unless we fix a constant string (e.g. **`"voxel-architect"`**) in code — avoid coupling to **`package.json`** version noise in the format spec.
- **Do not** embed **generated blocks**, **seeds**, or **resolved** grid in v1 unless a future issue explicitly extends the envelope with a version bump.

---

## 4. `schemaVersion` decision

- **`schemaVersion`** is the **blueprint exchange envelope version** (shape and meaning of **`kind` + top-level keys + how `blueprint` is interpreted**), **not** the Next.js app version, **not** the procedural generator version.
- **Increment** when we introduce **breaking** envelope changes (e.g. new required field, renamed **`kind`**, or a new **`blueprint`** discriminant strategy) or when we intentionally version a **new blueprint family** behind the same wrapper with incompatible semantics (prefer documenting in **`BLUEPRINT_JSON_FORMAT.md`**).
- **Unsupported version:** Import must **fail fast** with a **clear error** (e.g. “Unsupported schemaVersion: 2 (supported: 1)”) — **no** partial apply to **`VisualizerClient`** state in later UI work.
- **v1 scope:** Only **`schemaVersion === 1`** is in scope for this milestone’s implementation; no migration framework beyond “accept 1, reject others.”

---

## 5. Raw vs wrapped JSON

- **Official v1 support:** **Wrapped JSON only** (`kind` + `schemaVersion` + `blueprint`).
- **Raw blueprint JSON** (object matching **`MedievalTowerBlueprint`** without envelope): **defer** as a possible convenience import (“paste inner object”) in a later issue — not part of the v1 official contract.
- **Why wrapped is safer:** unambiguous file type for humans/tools; room for **`schemaVersion`** and future optional provenance without conflating **authoring fields** with **transport metadata**; reduces accidental paste of **`ResolvedMedievalTower`** or unrelated JSON being treated as a blueprint.

---

## 6. Validation strategy (layered, for later import UI)

Planned **order** (each step returns a clear error; **do not** apply to editor until all pass):

1. **JSON parse** — syntactically valid JSON.
2. **Root object** — must be a plain object (not array/primitive).
3. **`kind`** — must equal **`"voxel-architect-blueprint"`** (exact string).
4. **`schemaVersion`** — must be **`1`** for this milestone’s importer (number, not string — document coercion policy: reject string **`"1"`** for strictness unless we explicitly allow coercion later).
5. **`blueprint`** — must exist and be a **non-null object** (not array).
6. **`blueprint.structureType`** — must be **`"medieval_tower"`** for v1 (only supported type today per **`validateBlueprint`** gate).
7. **`validateBlueprint(blueprint as StructureBlueprint)`** — **`ok === true`**; on failure, surface **`errors`** (and optionally **`notes`**) without mutating React state.

**Invalid imports:** Never assign into **`VisualizerClient`** **`blueprint`** state until the pipeline succeeds (future UI issue).

---

## 7. Code organization

### New module: `src/lib/blueprints/blueprintExchange.ts`

**Define:**

| Export / artifact | Purpose |
|-------------------|---------|
| **Kind constant** | e.g. **`VOXEL_ARCHITECT_BLUEPRINT_KIND = "voxel-architect-blueprint"`** |
| **Schema version constant** | e.g. **`BLUEPRINT_EXCHANGE_SCHEMA_VERSION = 1`** |
| **Types** | **`BlueprintExchangeEnvelopeV1`**, **`BlueprintExportPayload`** (or equivalent narrow types for `kind` / `schemaVersion` / `blueprint`) |
| **`serializeBlueprintExport(blueprint: MedievalTowerBlueprint): string`** | Build envelope, **`JSON.stringify(..., null, 2)`** |
| **`parseBlueprintExchange(text: string): …`** | Parse + structural validation of wrapper; return **discriminated result** **`{ ok: true, envelope } | { ok: false, error: string, stage?: string }`** (exact shape to implement) |
| **`validateExchangeForImport(...)`** or merged parse | Optionally separate “parse envelope” vs “run **`validateBlueprint`**” so tests can target each layer |

**Rule:** **`VisualizerClient`** (and future UI) should **call these helpers**, not hand-roll **`JSON.stringify`** of the blueprint or inline **`kind`** strings.

**Re-exports:** Only add **`index.ts`**-style barrel updates if the repo already uses that pattern for blueprints (today: direct imports from **`types`**, **`validateBlueprint`**, etc.) — **prefer** direct import from **`blueprintExchange.ts`** unless a follow-up standardizes barrels.

---

## 8. Source labeling implications (future, not this issue)

The envelope is **not** required to carry **UI source labels** in v1. Later, optional metadata could include:

- **`source`**: **`"preset"`** | **`"import"`** | **`"custom"`** | etc.
- **`presetId`** / **`presetLabel`** when derived from a preset.

**This issue:** Document in **`BLUEPRINT_JSON_FORMAT.md`** that v1 **does not** include **`source`** fields; UI continues to infer “preset vs modified” from existing client state until a dedicated labeling issue adds optional envelope fields with a **`schemaVersion`** or extension policy.

---

## 9. Scope boundaries (explicit non-goals for this milestone)

**Do not add:**

- Import/export **UI** (no buttons, no textarea panel, no clipboard hook).
- **Backend**, **database**, **`localStorage`**.
- Generated **voxel** export, **Minecraft** export.
- **AI** integration.
- **Schema migration** system beyond **“accept `schemaVersion` 1 only”** checks.
- New **`structureType`** values or generator features.
- Large **`VisualizerClient`** / **`StructureInspectionPanel`** / **`VoxelViewer`** layout changes.

---

## 10. Testing plan

- **`pnpm run build`**
- **`pnpm exec tsc --noEmit`** (or equivalent CI TypeScript gate)
- **Unit-style checks** (where the project places tests today, or lightweight **`*.test.ts`** if introduced):  
  - Serialize **`SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`** (or a preset clone) → parse → **`validateBlueprint`** round-trip expectations.  
  - Invalid cases: malformed JSON, wrong **`kind`**, wrong **`schemaVersion`**, missing **`blueprint`**, **`structureType`** mismatch, blueprint failing **`validateBlueprint`** — each returns a **clear** failure path, **no throw** unless documented.
- **No** change to default **`/visualizer`** behavior until a **later** issue wires UI to helpers.

---

## 11. Files expected to change

| Likelihood | File |
|------------|------|
| **High** | **`src/lib/blueprints/blueprintExchange.ts`** (new) |
| **High** | **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`** (new) |
| **High** | **`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`** (moved from repo root) |
| **High** | **`GENERATION_DESIGN_PRINCIPLES.md`** (link text/path to catalog after move) |
| **Now** | **`PLAN.md`** (this document) |
| **After implementation** | **`CHANGE.md`** — summarize envelope, module, doc moves |

| Maybe | Notes |
|-------|--------|
| **`src/lib/blueprints/types.ts`** | Only if a **small** shared type alias helps **`blueprintExchange.ts`** avoid duplication — avoid large refactors. |

| Unlikely in this issue | **`VisualizerClient.tsx`**, **`VoxelViewer.tsx`**, generator files, **`validateBlueprint`** logic (reuse as-is), **`sampleBlueprints.ts`** content, **`StructureInspectionPanel.tsx`** |

---

## 12. Approval checkpoint

**Waiting for approval before implementation.**
