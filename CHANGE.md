# CHANGE.md — /preview blacksmith preset inspection

## Files changed

- `src/app/preview/PreviewInspectionClient.tsx` — three read-only sources (Towers / Blacksmith / Partials); separate tower/blacksmith preset ids; `StructureBlueprint` validate → `generateStructureFromResolved`; family-aware panel copy; validation notes when present.
- `src/components/voxel/StructureInspectionPanel.tsx` — `PreviewLabSource` adds `preset_blacksmith`; three-way source toggle (Towers, Blacksmith, Partials); optional `validationNotes`; partial-showcase preset hint updated.
- `src/app/preview/page.tsx` — **not** modified (header unchanged).

## /preview source changes

| Source | Behavior |
|--------|----------|
| **Towers** (default) | Unchanged: `MEDIEVAL_TOWER_PRESETS`, default `northwatch`. |
| **Blacksmith** | `BLACKSMITH_PRESETS`, default `rustic_village_forge`; validate + generate + `VoxelViewer` with `boundsStructure`. |
| **Partials** | Unchanged: static `PARTIAL_BLOCK_SHOWCASE_STRUCTURE`, no blueprint validation. |

## Blacksmith preset rendering

- Clone selected preset blueprint → `validateBlueprint` → `generateStructureFromResolved`.
- Generic block breakdown, layer modes, refit camera (same as towers).
- Panel shows family label, `structureType: blacksmith_workshop`, preset name/description, read-only note.
- Validator **notes** listed when non-empty (no error UI expansion).

## Confirmations

- **Default tower preview:** still loads `preset_towers` + `northwatch`.
- **Partial showcase:** unchanged (no generator path).
- **`/visualizer`:** not modified.
- **Import/export v2:** not added; `blueprintExchange` unchanged.
- **Blueprint editing:** not added for blacksmith.
- **Generators:** not changed.
- **Blacksmith styles / style resolver:** not added.
- **Textures / assets / block definitions:** none added.

## Follow-up (visual QA, not fixed here)

- Generator polish (chimney width, forge pad visibility, roof silhouette) deferred until after inspecting presets in `/preview`.

## Tests / verification

| Command | Result |
|---------|--------|
| `pnpm test:generator` | Pass — **13** files, **73** tests |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm run build` | Pass — Next.js **16.2.6** |
