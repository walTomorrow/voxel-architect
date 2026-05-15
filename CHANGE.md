# Change log — Blueprint source status and docs

## 1. Title of this issue

**Add blueprint source status and docs** — UI-only provenance label on **`/visualizer`**; v1 export envelope unchanged.

## 2. Branch name

`milestone/blueprint-portability`

## 3. Files changed

| File | Change |
|------|--------|
| `src/lib/blueprints/blueprintSource.ts` | **New:** `BlueprintSource` type, `blueprintsDeepEqual`, `formatBlueprintSourceStatus`, preset/import source factories. |
| `src/app/visualizer/VisualizerClient.tsx` | `blueprintSource` state, derived status label, transitions on preset/reset/reload/import, disabled **Reload preset** when disconnected, **Imported / Custom** select label. |
| `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` | **Blueprint source status** section (UI-only, not exported). |

## 4. Source state approach chosen

- **Baseline + kind** stored in React state (`BlueprintSource`), not in JSON.
- **Modified** is **derived** at render time by comparing the current `blueprint` to `baseline` via `JSON.stringify` deep equality (`blueprintSource.ts`). This reuses the same snapshot the lab already clones on load/import and avoids tracking a separate “dirty” flag that could drift.
- **Tradeoff:** comparison is simple and robust for this lab’s plain JSON-shaped blueprints; it is not a semantic diff and could theoretically disagree if key order differed (unlikely here because edits use immutable spreads and `structuredClone`).

## 5. Source labels added

Displayed under **Blueprint source** in the left workflow sidebar:

| Condition | Label |
|-----------|--------|
| Preset, matches baseline | `Preset — <preset label>` |
| Preset, differs from baseline | `Modified preset — <preset label>` |
| Import, matches baseline | `Imported blueprint` |
| Import, differs from baseline | `Modified imported blueprint` |
| Custom kind (reserved) | `Custom blueprint` / `Modified custom blueprint` |

## 6. Source transition behavior

- **Initial load:** preset source for default **Northwatch** with that preset’s blueprint as baseline.
- **Select real preset (right rail or workflow):** loads preset, sets preset source + baseline.
- **Reset to default:** loads default preset, preset source + baseline.
- **Reload preset:** reloads selected preset, preset source + baseline (only when a real preset id is selected).
- **Import success:** imported source + baseline from imported blueprint; `selectedPresetId` → disconnect sentinel.
- **Sentinel select (`Imported / Custom`):** updates select only; does **not** change blueprint or source (imported/modified state preserved).

## 7. Preset reload behavior

- **Reload preset** is **disabled** when `selectedPresetId === __va_no_preset__`.
- Helper text: **Select a preset to reload a preset baseline.**
- Right-rail option label renamed from **Other** to **Imported / Custom** (internal id unchanged).

## 8. Export JSON format unchanged

- **Copy blueprint JSON** still calls **`serializeBlueprintExchange(blueprint)`** only.
- Envelope remains `{ kind, schemaVersion, blueprint }` — no `source`, `presetId`, `modified`, or optional metadata added.

## 9. Documentation

- **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`** — source status is lab UI-only, baseline/modified behavior, export still minimal v1.

## 10. Intentionally deferred

- Source fields in JSON, `localStorage`, edit history, undo/redo, tooltips, file upload/download, raw JSON import, **`/preview`** changes, `custom` creation flow beyond sentinel row.

## 11. Build / TypeScript

| Check | Result |
|-------|--------|
| **`pnpm exec tsc --noEmit`** | **Passed** |
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack) |

## 12. Manual QA notes

1. **`/visualizer`** — **Blueprint source** visible above copy/import controls.
2. Default → **Preset — Northwatch Spire (default)**; edit field → **Modified preset — …**.
3. **Reset** → preset label again; **select another preset** → **Preset — …**; modify → **Modified preset — …**.
4. **Copy** → paste JSON has only `kind`, `schemaVersion`, `blueprint`.
5. **Import** → **Imported blueprint**; edit → **Modified imported blueprint**; **Reload preset** disabled with helper.
6. **Select real preset after import** → blueprint replaced; **Preset — …** label.
7. **`/preview`** unchanged.

## 13. Remaining weaknesses / follow-up ideas

- **`custom` kind** is typed but unused unless we add a dedicated “start from blank” flow.
- Deep equality via `JSON.stringify` is adequate for the lab; a field-order–safe compare could be added if imports ever produce different key ordering.
