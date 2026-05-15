# Change log — Blueprint Portability: define import/export JSON format

## 1. Title of this issue

**Define blueprint import/export format** — official **v1 wrapped JSON** contract, **`blueprintExchange`** helpers, and **`docs/blueprints/`** documentation. **No** import/export UI, clipboard, or visualizer wiring in this issue.

## 2. Branch name

`milestone/blueprint-portability`

## 3. Files changed

| File | Change |
|------|--------|
| `src/lib/blueprints/blueprintExchange.ts` | **New:** kind + schema constants, **`BlueprintExchangeEnvelopeV1`**, **`serializeBlueprintExchange`**, **`parseBlueprintExchange`** with discriminated **`ParseBlueprintExchangeResult`**. |
| `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` | **New:** v1 format spec, validation order, non-goals, future UI behavior for invalid imports. |
| `docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md` | **Moved** from repo root `BLUEPRINT_FEATURE_CATALOG.md` (content unchanged). |
| `GENERATION_DESIGN_PRINCIPLES.md` | Link text updated to **`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`**. |
| `PLAN.md` | Catalog path notes aligned with implemented layout. |

## 4. Official v1 envelope shape

```json
{
  "kind": "voxel-architect-blueprint",
  "schemaVersion": 1,
  "blueprint": {}
}
```

**Required top-level fields only:** `kind`, `schemaVersion`, `blueprint`. **No** optional metadata (no timestamps, no app fields) in v1.

## 5. Helper functions added

- **`VOXEL_ARCHITECT_BLUEPRINT_KIND`** — literal **`"voxel-architect-blueprint"`**.
- **`BLUEPRINT_EXCHANGE_SCHEMA_VERSION`** — **`1`**.
- **`serializeBlueprintExchange(blueprint)`** — builds the envelope and returns **`JSON.stringify(..., null, 2)`**.
- **`parseBlueprintExchange(text)`** — layered checks; returns **`{ ok: true, blueprint }`** or **`{ ok: false, stage, error }`**; **does not throw** on normal invalid input (JSON parse is try/catch only).

## 6. Validation behavior (`parseBlueprintExchange`)

Stages (in order): **`json`** → **`root`** → **`kind`** → **`schemaVersion`** → **`blueprint`** (presence + non-array object) → **`structureType`** (**`medieval_tower`** only) → **`validateBlueprint`**. Raw inner JSON without the wrapper is **not** accepted.

## 7. Documentation

- **`docs/blueprints/BLUEPRINT_JSON_FORMAT.md`** — blueprint vs voxels, **`schemaVersion`** meaning, wrapped-only v1, validation order, non-goals.
- **`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`** — same catalog as before; new home under **`docs/blueprints/`**.

## 8. Doc move

- **From:** `BLUEPRINT_FEATURE_CATALOG.md` (repo root)  
- **To:** `docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`

## 9. Intentionally deferred

- Import/export **UI**, clipboard, textarea, **`localStorage`**, backend, database.
- Raw blueprint-only JSON import, **`schemaVersion` > 1**, optional envelope fields, source labels, AI, Minecraft / voxel export.
- **Automated unit tests** — repo has **no** Vitest/Jest setup; a full test framework was **not** added for this issue.

## 10. Manual verification (helpers)

Recommended quick checks in Node REPL or a scratch script (not committed):

- Serialize **`SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`** (or a preset clone) → parse → expect **`ok: true`**.
- Malformed JSON → **`ok: false`**, **`stage: "json"`**.
- Wrong **`kind`** → **`stage: "kind"`**.
- **`schemaVersion": "1"`** (string) → **`stage: "schemaVersion"`**.
- Missing **`blueprint`** → **`stage: "blueprint"`**.
- **`structureType": "other"`** → **`stage: "structureType"`**.
- Valid shape but **`dimensions.width": 2`** (fails validator) → **`stage: "validateBlueprint"`**.

## 11. Build result

| Check | Result |
|-------|--------|
| **`pnpm exec tsc --noEmit`** | **Passed** |
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack) |

## 12. Remaining weaknesses / follow-up ideas

- Add **Vitest** (or similar) and codify the manual matrix above as **`blueprintExchange`** unit tests.
- **`parseBlueprintExchange`** trusts JSON for **`blueprint`** shape after **`structureType`** check; stricter runtime schema (e.g. Zod) could be added if imports become a security or robustness concern.
- Future **import UI** on **`/visualizer`** should call **`parseBlueprintExchange`** and only then update React state.
