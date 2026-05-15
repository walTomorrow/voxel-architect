# Blueprint JSON exchange format (v1)

This document defines the **official frontend-only** JSON format for exchanging **Voxel Architect blueprints** (e.g. GitHub issues, manual copy/paste, future import/export UI). It is not a Minecraft schematic format and not a voxel block dump.

## What a blueprint is

A **blueprint** is the **editable architectural authoring state** used by **`/visualizer`**: parameters such as `structureType`, dimensions, materials (classic pack keys), massing, levels, openings, roof, features, constraints, and metadata. In code this is modeled as **`MedievalTowerBlueprint`** (`src/lib/blueprints/types.ts`). It expresses **design intent**, not placed voxels.

## Blueprint vs generated voxel blocks

- **Blueprint:** Input to **`validateBlueprint()`** and, when valid, to procedural **generation**.
- **`VoxelBlock[]` / generated structure:** Output of the generator. It is **not** part of this exchange format.
- **`ResolvedMedievalTower`:** Derived internal representation after validation; **not** included in the v1 envelope.

Keeping the file to the **authoring blueprint** avoids duplicating generator internals and keeps issues and AI outputs aligned with what the UI edits.

## Official v1 wrapped JSON

The only supported v1 shape is a **wrapper object** with exactly these **required** top-level fields:

```json
{
  "kind": "voxel-architect-blueprint",
  "schemaVersion": 1,
  "blueprint": {}
}
```

- **`kind`** — Literal string **`"voxel-architect-blueprint"`**. Identifies the file as this project’s exchange format (not raw Minecraft JSON, not arbitrary config).
- **`schemaVersion`** — Integer **`1`**. This is the **exchange envelope version**, not the Next.js app version or generator version.
- **`blueprint`** — Object satisfying **`MedievalTowerBlueprint`** after validation (see below). For v1 the only supported **`blueprint.structureType`** is **`"medieval_tower"`**.

Exports use **pretty-printed** JSON (indentation **`2`** spaces) via **`JSON.stringify(..., null, 2)`**.

### Minimal v1 contract

- **No** optional top-level fields in v1 (no timestamps, no app name, no source labels in the envelope).
- **No** raw blueprint-only JSON as an officially supported import in v1; importers accept **only** the wrapped shape above.

## `schemaVersion` meaning

- **`schemaVersion`** versions the **exchange document** (`kind` + required keys + rules for `blueprint`).
- When the wrapper contract or required semantics change in a breaking way, increment **`schemaVersion`** and document the new rules here.
- Importers should **reject** unknown versions with a clear error (e.g. only **`1`** is accepted until a later milestone adds **`2`**).

## Why raw blueprint JSON is not supported in v1

- **Wrapped JSON** is unambiguous in issue trackers and chat (discriminator + version + payload).
- Raw inner objects are easier to confuse with **`ResolvedMedievalTower`**, API responses, or other tools. Raw import may be offered later as a **non-official** convenience; it is out of scope for v1.

## Validation order (import)

When implementing import UI, run checks in this order and **do not** apply the blueprint to editor state until all succeed:

1. **JSON parse** — syntactically valid JSON.
2. **Root** — parsed value is a **plain object** (not `null`, not an array, not a primitive).
3. **`kind`** — equals **`"voxel-architect-blueprint"`** exactly.
4. **`schemaVersion`** — strictly the **number** **`1`** (not the string `"1"`).
5. **`blueprint`** — property present; value is a **non-null object** and **not** an array.
6. **`blueprint.structureType`** — **`"medieval_tower"`** (only supported type for v1).
7. **`validateBlueprint()`** — returns **`ok: true`** for the inner blueprint.

Helpers live in **`src/lib/blueprints/blueprintExchange.ts`** (`parseBlueprintExchange`). Invalid input returns a **discriminated failure** with **`stage`** and **`error`**; it does **not** throw for normal validation failures.

## Export from `/visualizer` (copy to clipboard)

The **blueprint lab** at **`/visualizer`** includes **Copy blueprint JSON** in the left blueprint sidebar. It copies the **current editable blueprint** (the same in-memory object the form edits), **not** a frozen preset snapshot unless that is what is currently loaded, and **not** generated **`VoxelBlock[]`** data.

- The clipboard payload is the **official v1 wrapped** JSON from **`serializeBlueprintExchange`** (pretty-printed: **`kind`**, **`schemaVersion`**, **`blueprint`** only).
- Export is **enabled only when** the current blueprint **`validateBlueprint()`** passes; otherwise the control is disabled and a short note explains that validation must be fixed first.

## Import from `/visualizer` (paste JSON)

**`/visualizer`** also provides an inline **Import blueprint JSON** workflow in the same sidebar:

- Users paste **official wrapped** JSON only; **`parseBlueprintExchange`** performs all envelope checks and **`validateBlueprint()`** before any editor update.
- **Raw** inner blueprint JSON (no **`kind`** / **`schemaVersion`** wrapper) is **rejected** by the parser in v1.
- If parsing fails, the **current blueprint is not replaced**; the panel stays open and the pasted text remains for correction.
- On success, the editor applies the imported **`blueprint`** object, closes the panel, and clears the textarea. Import is **frontend-only** — nothing is written to a backend or **`localStorage`**.

## Future UI behavior for invalid imports

For any UI that calls **`parseBlueprintExchange`**, failures should surface **`error`** (and optionally **`stage`**) and **must not** replace editor state until **`ok: true`**.

## Non-goals (v1 / this format)

- No **backend**, **database**, or **`localStorage`** in the format contract.
- No **generated voxel** export, **Minecraft** (`.schem` / `.litematic`) export.
- No **AI** integration in the file format.
- No **schema migration framework** beyond “accept **`schemaVersion` 1 only”** until a later version is defined.

## Related docs

- **Feature coverage (architectural systems the blueprint may express):** [`BLUEPRINT_FEATURE_CATALOG.md`](./BLUEPRINT_FEATURE_CATALOG.md)
- **Generation and AI principles (broader than this file):** [`../../GENERATION_DESIGN_PRINCIPLES.md`](../../GENERATION_DESIGN_PRINCIPLES.md)
