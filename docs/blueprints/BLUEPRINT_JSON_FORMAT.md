# Blueprint JSON exchange format (v1)

This document defines the **official frontend** JSON format for exchanging **medieval tower** blueprints (e.g. GitHub issues, manual copy/paste, **`/visualizer`** import/export). It is not a Minecraft schematic format and not a voxel block dump.

For **generic buildings**, see [Internal authoring vs exchange](#internal-authoring-generic_building) below — they are **not** part of v1 exchange yet.

---

## What a blueprint is

A **blueprint** is the **editable architectural authoring state**: parameters such as `structureType`, dimensions, materials (classic pack keys), massing, levels, openings, roof, features, constraints, and metadata.

- **Tower exchange / visualizer:** **`MedievalTowerBlueprint`** (`src/lib/blueprints/types.ts`)
- **Generic app/library path:** **`GenericBuildingBlueprint`** — same types module; validated and generated in-app but **not** wrapped by `blueprintExchange` v1

Blueprints express **structured semantic intent and constraints**. They are **not** lists of voxel placements. A future blueprint layer may describe **floor-plan / interior layout intent**; that **does not exist in the schema yet** (see [`../generation/GENERATION_DESIGN_PRINCIPLES.md`](../generation/GENERATION_DESIGN_PRINCIPLES.md) §1.4).

---

## What is **not** public JSON

| Artifact | Notes |
|----------|--------|
| **`VoxelBlock[]`** | Generator output only — never part of v1 exchange |
| **`ResolvedMedievalTower` / `ResolvedGenericBuilding`** | Post-validation internal snapshots |
| **`ComponentPlan`** | **Internal compiler IR** for `generic_building` — **must not** be imported, exported, or documented as an authoring format ([`../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md)) |

---

## Blueprint vs generator responsibilities

| Layer | Role |
|-------|------|
| **Blueprint** | What to build: intent, parameters, constraints. v1 exchange carries the inner **`blueprint`** object for **towers only**. |
| **Validator** | `validateBlueprint()` → family-specific normalization; resolves semantic materials to **`BlockTypeId`**. |
| **Generator** | **Deterministic** realization: **`generateMedievalTower()`** or **`generateGenericBuilding()`** → **`VoxelBlock[]`**, merge/priority, partial shapes where implemented, **`maxBlockCount`**, reliability-tested geometry. |

---

## AI and structured intent

Tools or models should **propose or edit blueprint fields** (or natural language that maps to those fields).

They should **not** treat raw **`VoxelBlock[]`** coordinate dumps or **`ComponentPlan`** JSON as the primary authoring or exchange format.

---

## Official v1 wrapped JSON (tower-only)

The only **supported exchange** shape today is a **wrapper object** with exactly these **required** top-level fields:

```json
{
  "kind": "voxel-architect-blueprint",
  "schemaVersion": 1,
  "blueprint": {}
}
```

- **`kind`** — Literal **`"voxel-architect-blueprint"`**.
- **`schemaVersion`** — Integer **`1`** (envelope version, not app version).
- **`blueprint`** — Object satisfying **`MedievalTowerBlueprint`** after validation. For v1 exchange, the only supported **`blueprint.structureType`** is **`"medieval_tower"`**.

Implementation: **`src/lib/blueprints/blueprintExchange.ts`** (`parseBlueprintExchange`, `serializeBlueprintExchange`).

Exports use **pretty-printed** JSON (indent **2**).

### Minimal v1 contract

- **No** optional top-level fields in v1 (no timestamps, preset ids, or UI source labels in the envelope).
- **No** raw inner blueprint-only JSON as officially supported import in v1.
- **`generic_building`** inner objects are **rejected** by v1 exchange parsers until a future **`schemaVersion`** defines them.

---

## Internal authoring (`generic_building`)

**In the app and test library today:**

```text
GenericBuildingBlueprint (JSON-shaped object in code / presets)
  → validateBlueprint() / validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()  →  ComponentPlan (internal)
  → generateFromComponentPlan()
  → VoxelBlock[]
  → /preview  →  Generic tab
```

- Presets: `src/lib/blueprints/sampleGenericBuildingBlueprints.ts`
- **No** clipboard import/export UI for generic blueprints yet
- **Future import/export v2** may add a new envelope and `structureType: "generic_building"` — **not implemented**

---

## `schemaVersion` meaning

- Versions the **exchange document** (`kind` + required keys + rules for `blueprint`).
- Breaking envelope changes increment **`schemaVersion`** and are documented here.
- Importers should **reject** unknown versions (only **`1`** accepted until v2 is defined).

---

## Validation order (tower import)

When implementing import UI, run checks in this order and **do not** apply the blueprint to editor state until all succeed:

1. JSON parse  
2. Root is a plain object  
3. **`kind`** === `"voxel-architect-blueprint"`  
4. **`schemaVersion`** === number **`1`**  
5. **`blueprint`** present, non-null object, not array  
6. **`blueprint.structureType`** === `"medieval_tower"`  
7. **`validateBlueprint()`** → **`ok: true`**

Invalid input returns a discriminated failure with **`stage`** and **`error`** (no throw for normal validation failures).

---

## Export / import from `/visualizer`

**`/visualizer`** is **tower-oriented**:

- **Copy blueprint JSON** — current editable **`MedievalTowerBlueprint`**, v1 wrapped envelope only when validation passes.
- **Import blueprint JSON** — wrapped tower JSON only; raw inner blueprint rejected in v1.

**`/preview`** inspects generated structures (Towers | Generic | Partials) and does **not** define a separate blueprint exchange format.

Blueprint **source** labels in the visualizer sidebar are **UI-only** and are **not** included in exported JSON.

---

## Future: floor plans, generics, and v2 (not implemented)

- **Floor plans** — future blueprint fields; v1 unchanged until a new **`schemaVersion`** documents them.  
- **Generic building exchange** — may appear in **import/export v2** with an extended envelope and validation rules.  
- **ComponentPlan** — remains **internal** even if generic blueprints become exchangeable.

---

## Non-goals (v1 / this format)

- No backend, database, or `localStorage` in the format contract  
- No generated voxel export, Minecraft schematic export  
- No AI fields in the file format  
- No **`generic_building`** in v1 **`blueprintExchange`**  
- No public **`ComponentPlan`** JSON  

---

## Related docs

- [`BLUEPRINT_FEATURE_CATALOG.md`](./BLUEPRINT_FEATURE_CATALOG.md) — active structure types and feature taxonomy  
- [`../generation/GENERATION_DESIGN_PRINCIPLES.md`](../generation/GENERATION_DESIGN_PRINCIPLES.md)  
- [`../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md)  
- [`../project-history/DEVELOPMENT_TIMELINE.md`](../project-history/DEVELOPMENT_TIMELINE.md)
