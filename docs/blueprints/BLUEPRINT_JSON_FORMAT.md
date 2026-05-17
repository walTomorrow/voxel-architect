# Blueprint JSON (authoring and exchange)

This document describes how **Voxel Architect** represents building intent in JSON: the **active** `generic_building` path and the **retired** tower-era **blueprintExchange v1** envelope (historical reference only).

It is not a Minecraft schematic format and not a voxel block dump.

---

## What a blueprint is

A **blueprint** is the **editable architectural authoring state**: `structureType`, dimensions, semantic materials (classic pack keys), massing, openings, roof, features, constraints, and metadata.

**Active product:** **`GenericBuildingBlueprint`** (`structureType: "generic_building"`) in `src/lib/blueprints/types.ts`.

Blueprints express **structured semantic intent**. They are **not** lists of voxel placements. A future layer may describe **floor-plan / interior layout intent**; that **does not exist in the schema yet** (see [`../generation/GENERATION_DESIGN_PRINCIPLES.md`](../generation/GENERATION_DESIGN_PRINCIPLES.md) §1.4).

---

## What is **not** public JSON

| Artifact | Notes |
|----------|--------|
| **`VoxelBlock[]`** | Generator output only — never an authoring interchange format |
| **`ResolvedGenericBuilding`** | Post-validation internal snapshot |
| **`ComponentPlan`** | **Internal compiler IR** for `generic_building` — **must not** be imported, exported, or documented as an authoring format ([`../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md)) |

---

## Active pipeline (`generic_building`)

```text
GenericBuildingBlueprint (JSON-shaped object in code / presets / /generic-lab)
  → validateBlueprint() / validateGenericBuildingBlueprint()
  → ResolvedGenericBuilding
  → compileGenericBuildingToComponentPlan()  →  ComponentPlan (internal)
  → generateFromComponentPlan()
  → VoxelBlock[]
  → /preview  →  Generic | Partials
  → /generic-lab  →  manual edit + copy raw blueprint JSON (debug)
```

| Layer | Role |
|-------|------|
| **Blueprint** | What to build: intent, parameters, constraints |
| **Validator** | `validateBlueprint()` → `validateGenericBuildingBlueprint()`; resolves semantic materials to **`BlockTypeId`** |
| **Generator** | **Deterministic** component emitters → merge → **`VoxelBlock[]`**, partial shapes where implemented, **`maxBlockCount`**, reliability-tested geometry |

- Presets: `src/lib/blueprints/sampleGenericBuildingBlueprints.ts`
- **No** public clipboard **import/export envelope** for generic blueprints yet (future **import/export v2** — not implemented)
- **`/visualizer`** (tower lab) was **retired**; permanent redirect to **`/generic-lab`**

---

## AI and structured intent

Tools or models should **propose or edit blueprint fields** (or natural language that maps to those fields).

They should **not** treat raw **`VoxelBlock[]`** coordinate dumps or **`ComponentPlan`** JSON as the primary authoring or exchange format.

---

## Historical: blueprintExchange v1 (tower-only, retired)

The tower era supported a **wrapped** JSON envelope for **`medieval_tower`** blueprints (copy/paste from the retired **`/visualizer`** lab):

```json
{
  "kind": "voxel-architect-blueprint",
  "schemaVersion": 1,
  "blueprint": { "structureType": "medieval_tower", "...": "..." }
}
```

- **`kind`** — `"voxel-architect-blueprint"`
- **`schemaVersion`** — `1`
- **`blueprint`** — validated **`MedievalTowerBlueprint`** (types and module **removed** from the active codebase)

Implementation **`src/lib/blueprints/blueprintExchange.ts`** and tower sample presets were **deleted** with the tower-era retirement. Screenshots and timeline notes remain under [`../project-history/`](../project-history/).

**Do not** treat v1 as a supported import path in the current app.

---

## Future (not implemented)

- **import/export v2** — optional envelope for **`generic_building`**
- **Floor plans** — new blueprint fields; new **`schemaVersion`** when defined
- **ComponentPlan** — remains **internal** even if generic blueprints become exchangeable

---

## Non-goals

- No backend, database, or `localStorage` in the format contract
- No generated voxel export, Minecraft schematic export
- No AI fields in the file format (today)
- No public **`ComponentPlan`** JSON
