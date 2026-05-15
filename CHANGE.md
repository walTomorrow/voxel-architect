# Change log — Blueprint export: copy wrapped JSON to clipboard

## 1. Title of this issue

**Add blueprint export and copy-to-clipboard** — **`/visualizer`** only; uses **`serializeBlueprintExchange`**; no import UI, download, or **`localStorage`**.

## 2. Branch name

`milestone/blueprint-portability`

## 3. Files changed

| File | Change |
|------|--------|
| `src/app/visualizer/VisualizerClient.tsx` | **Copy blueprint JSON** control, clipboard handler, validation-gated enablement, inline success/failure messages, feedback cleared when validation fails. |
| `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` | New section **Export from `/visualizer` (copy to clipboard)** describing workflow, wrapped payload, validation gate, and future import. |

## 4. Where the export control was added

- **Left blueprint sidebar** in **`VisualizerClient`**, directly under the **Reset to default** / **Reload preset** row and above the metadata **`dl`**.
- **Not** added to **`/preview`**, **`StructureInspectionPanel`**, or **`VoxelViewer`**.

## 5. How `serializeBlueprintExchange` is used

- Import from **`@/src/lib/blueprints/blueprintExchange`**.
- On click (when allowed): **`serializeBlueprintExchange(blueprint)`** where **`blueprint`** is the current React **`useState`** value — **editable lab state**, not a separate preset reference.
- Result is passed to **`navigator.clipboard.writeText`** (no hand-rolled envelope in the component).

## 6. Validation behavior

- **`validation.ok`** from existing **`useMemo(() => validateBlueprint(blueprint), [blueprint])`** gates export.
- **Enabled:** **`Copy blueprint JSON`** when **`validation.ok`**.
- **Disabled:** when invalid, with adjacent note: **Fix validation errors before exporting.**
- **`useEffect`** clears copy feedback when **`validation.ok`** becomes false so stale success text does not linger over an invalid blueprint.

## 7. Clipboard success / failure behavior

- Uses **`navigator.clipboard.writeText(json)`** inside **`try`/`catch`**.
- Missing **`navigator.clipboard`** or **`writeText`** → treat as failure (same message as rejected write).
- **Success:** **Blueprint JSON copied to clipboard!**
- **Failure:** **Blueprint JSON failed to copy. Please check browser settings.**
- No **`alert`**, no toast library; messages render as small text under the button.
- Each click **clears** prior feedback then sets the new outcome.

## 8. Passive export

- Copy does **not** mutate **`blueprint`**, **`selectedPresetId`**, layer mode, **`selectedLayer`**, **`cameraResetNonce`**, or any viewer props — only **`copyBlueprintFeedback`** local UI state updates.

## 9. Documentation

- **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`** — export workflow, intent vs voxels, validation-only enablement, import deferred.

## 10. Intentionally deferred

- Import UI / textarea / raw JSON import, download **`.json`**, source labels, backend, **`localStorage`**, voxel/Minecraft export, AI, new schema fields, **`/preview`** export.

## 11. Build / TypeScript

| Check | Result |
|-------|--------|
| **`pnpm exec tsc --noEmit`** | **Passed** |
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack) |

## 12. Manual QA notes

Suggested checks:

1. Open **`/visualizer`** — **Copy blueprint JSON** appears in the left blueprint column under preset actions.
2. Valid blueprint — button **enabled**; click → **Blueprint JSON copied to clipboard!**; paste shows **`kind`**, **`schemaVersion`**, **`blueprint`**, pretty-printed; no **`blocks`** / voxel arrays at top level.
3. Invalidate blueprint (e.g. break a validator rule) — button **disabled**; **Fix validation errors before exporting.** visible; prior success message cleared.
4. After copy, change dimensions only — no spurious camera refit from copy; layer controls unchanged unless edited separately.
5. **`/preview`** — unchanged (no export control).

## 13. Remaining weaknesses / follow-up ideas

- **Clipboard API** requires **secure context** (HTTPS or localhost); failure message covers denial.
- **Import** — wire **`parseBlueprintExchange`** in a future **`/visualizer`** issue; optional “clear feedback on blur” if UX requests it.
