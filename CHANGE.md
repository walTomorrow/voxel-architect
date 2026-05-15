# Change log — Blueprint import panel and validation

## 1. Title of this issue

**Add blueprint import panel and validation** — inline paste UI on **`/visualizer`** only; **`parseBlueprintExchange`** for all parsing/validation; no file picker, no raw JSON, no backend.

## 2. Branch name

`milestone/blueprint-portability`

## 3. Files changed

| File | Change |
|------|--------|
| `src/app/visualizer/VisualizerClient.tsx` | Import panel (toggle, textarea, **Import blueprint** / **Cancel**), **`parseBlueprintExchange`** wiring, success banner, preset disconnect sentinel, **`handlePresetIdChange`** branch for sentinel. |
| `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` | **Import from `/visualizer`** section; export section no longer claims import is future-only; tightened “invalid imports” note. |

## 4. Where the import control was added

- Left blueprint sidebar in **`VisualizerClient`**, directly under the **Copy blueprint JSON** block (same workflow region).
- **Not** on **`/preview`**, **`StructureInspectionPanel`**, or **`VoxelViewer`**.

## 5. Import panel UX

- **Import blueprint JSON** toggles an **inline** panel (not modal/drawer).
- Panel contains: label, **textarea**, **Import blueprint**, **Cancel**.
- **Cancel** closes the panel and clears textarea, panel errors, and success banner.
- Opening the panel clears prior banner/panel errors for a clean attempt.
- **No** separate Validate button; **Import blueprint** runs validation.

## 6. How `parseBlueprintExchange` is used

- **`parseBlueprintExchange(importText.trim())`** only — no **`JSON.parse`**, **`kind`**, **`schemaVersion`**, or **`validateBlueprint`** inlined in the component.
- **`result.ok === false`** → **`Could not import blueprint: ${result.error}`** in the panel.
- **`result.ok === true`** → **`setBlueprint(structuredClone(result.blueprint))`**.

## 7. Empty textarea

- Trimmed empty string → **`Paste blueprint JSON before importing.`** (panel stays open).

## 8. Success / failure messages

- **Success (after apply):** **`Blueprint JSON imported successfully.`** as a small banner under the workflow block; panel closed; textarea cleared.
- **Failure:** inline **`Could not import blueprint: …`**; panel and pasted text **preserved**; **blueprint state unchanged**.

## 9. Behavior on valid import

- Updates **`blueprint`** from parsed result.
- Sets **`layerViewMode`** to **`"full"`** (avoids stale build-up/slice).
- **`selectedLayer`** continues to be clamped by the existing **`useEffect`** when **`layerExtents`** updates from the new structure.
- **Does not** increment **`cameraResetNonce`** (same as preset change / reload — no automatic refit).

## 10. Behavior on invalid import

- **No** **`setBlueprint`**; user can fix JSON and retry.

## 11. Preset state behavior chosen

- Added **`IMPORT_DISCONNECTED_PRESET_ID`** (`__va_no_preset__`) and an **Other** row appended to **`PRESET_INSPECTION_OPTIONS`** (visualizer only).
- After a successful import, **`selectedPresetId`** is set to this sentinel so **Reload preset** calls **`getMedievalTowerPreset(...)`** → **`undefined`** and **no-ops** (avoids silently reloading a stale named preset over the imported blueprint).
- Choosing **Other** in the preset `<select>` only updates **`selectedPresetId`**; it does **not** change **`blueprint`** (user can then pick a real preset to load a frozen snapshot).
- **`handlePresetIdChange`** handles the sentinel before **`getMedievalTowerPreset`**.
- Full **source labeling** (e.g. “Imported blueprint”) is **deferred**; **Other** is a minimal disconnect marker only.

## 12. Layer / view reset

- **`setLayerViewMode("full")`** on successful import.
- No **`cameraResetNonce`** bump on import.

## 13. Documentation

- **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`** — import flow, wrapped-only, invalid = no replace, no persistence.

## 14. Intentionally deferred

- Source status labels, modified-preset tracking, file upload/download, raw JSON import, separate Validate control, backend, **`localStorage`**, schema migrations, AI, tests framework, **`/preview`** import.

## 15. Build / TypeScript

| Check | Result |
|-------|--------|
| **`pnpm exec tsc --noEmit`** | **Passed** |
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack) |

## 16. Manual QA notes

Suggested:

1. **`/visualizer`** — **Import blueprint JSON** appears near copy control; opens inline panel with textarea and buttons.
2. **Cancel** — panel closes; textarea and errors cleared.
3. Empty **Import blueprint** → **Paste blueprint JSON before importing.**
4. Paste valid wrapped JSON from **Copy blueprint JSON** → import → success banner; panel closed; editor matches import; geometry regenerates via existing path; layer mode **Full**.
5. Malformed / wrong **`kind`** / wrong **`schemaVersion`** / raw inner-only JSON → error line; blueprint unchanged; textarea kept.
6. **`/preview`** unchanged.
7. After import, **Reload preset** does nothing until a real preset is chosen from the list.
8. **Refit camera** still works independently.

## 17. Remaining weaknesses / follow-up ideas

- **Preset `<select>`** shows **Other** while disconnected — true “imported” vs “edited off-preset” labeling is a follow-up.
- Large pasted JSON has no size guard (acceptable for lab for now).
