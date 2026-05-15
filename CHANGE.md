# Change log — Blueprint portability QA fixes

## Title

Blueprint portability QA fixes (`milestone/blueprint-portability`)

## Files changed

| File | Change |
|------|--------|
| `src/lib/blueprints/blueprintImportStructure.ts` | **New:** required-field shape checks for imported `medieval_tower` blueprints (types aligned with `types.ts` + `/visualizer` controls). |
| `src/lib/blueprints/blueprintExchange.ts` | Call structural validation before `validateBlueprint()`; keep `try/catch` around validator. |
| `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` | Document required inner blueprint fields, rejection of misspelled keys, extra-key policy. |

Prior QA commits on this branch also included `VisualizerClient.tsx` (5s success dismiss, Copy/Import button row, import error display).

## Stricter imported blueprint structural validation

**Problem:** Typos such as `constraints.maxBlock` instead of `constraints.maxBlockCount` could pass `validateBlueprint()` (undefined comparisons) and reach `setBlueprint()`, causing React controlled/uncontrolled input warnings on `/visualizer`.

**Fix:** `validateImportedMedievalTowerStructure()` verifies required top-level sections (`metadata`, `dimensions`, `materials`, `massing`, `levels`, `openings`, `roof`, `features`, `constraints`) and nested fields used by the editor (including `constraints.maxBlockCount`, all material slots, opening numeric fields, etc.) with correct JSON types (`string` / `number` / `boolean`).

**Example failure:** `Missing required blueprint field: constraints.maxBlockCount` → UI: `Could not import blueprint: Missing required blueprint field: constraints.maxBlockCount`.

**Policy:** Unknown extra keys are **allowed**; they do not replace required keys.

## Controlled / uncontrolled input warning

Prevented by rejecting incomplete shapes **before** `setBlueprint()`.

## `validateBlueprint` exception handling

`parseBlueprintExchange()` still wraps `validateBlueprint()` in **`try/catch`** so malformed nested access cannot crash the page.

## Success message auto-dismiss (already on branch)

- Copy and import success messages clear after **5 seconds** with timer cleanup in `useEffect`.

## Copy / Import button layout (already on branch)

- **Copy blueprint JSON** and **Import blueprint JSON** share one `flex-wrap` row when the import panel is closed.

## Unchanged

- v1 envelope (`kind`, `schemaVersion`, `blueprint` only)
- Wrapped-only import, source status, layer Full on success, `/preview`, export behavior

## Build / TypeScript

| Check | Result |
|-------|--------|
| `pnpm exec tsc --noEmit` | **Passed** |
| `pnpm run build` | **Passed** |

## Manual QA notes

1. Valid export → import → success; banner clears ~5s.
2. Copy success clears ~5s; Copy + Import side by side.
3. Paste valid JSON with `constraints.maxBlock` instead of `maxBlockCount` → inline error; blueprint unchanged; no controlled/uncontrolled warning.
4. Malformed JSON / raw inner blueprint → still rejected inline.
5. `/preview` unchanged.

## Remaining weaknesses

- Structural checks enforce presence and JSON types, not enum value validity (that remains `validateBlueprint()`).
- Optional `metadata.description` / `metadata.notes` are not required for import (only `metadata.name`).
