# CHANGE.md — Documentation: blueprints, generators, AI boundary, future floor plans

## Files changed

- `docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md` — expanded **responsibility split** (blueprint vs generator vs AI vs voxels), **future floor plans / interiors** (explicitly not implemented), demo motivation, **current medieval tower** limits; glossary **`VoxelBlock`** clarified (optional partial shapes).
- `docs/blueprints/BLUEPRINT_JSON_FORMAT.md` — blueprint as **semantic intent**; **blueprint vs generator** table; **AI and structured intent**; **future floor plans** note; related-doc link fix.
- `docs/generation/GENERATION_DESIGN_PRINCIPLES.md` — new **§1.1–§1.5** (blueprint responsibility, generator responsibility, AI boundary, future floor plans/interiors, current pipeline scope); **Purpose** links fixed (`../blueprints/…`, `./GENERATOR_RELIABILITY.md`).
- `docs/generation/GENERATOR_RELIABILITY.md` — placement-semantics coverage note; **`assertGeneratedStructurePlacementSemantics`** / **`generatorWindowPanes`** in table; intra-folder link to design principles.
- `docs/VISION.md` — **structured generation** refined (blueprint-first AI); **interior exploration** subsection under MVP; **current development status** de-staled; backlog pointer.
- `docs/GENERATION_DESIGN_PRINCIPLES.md` — **new** stub pointing to `docs/generation/GENERATION_DESIGN_PRINCIPLES.md`.

## Blueprint responsibility (added/updated)

Blueprints are **structured semantic intent and constraints** (family, dimensions, materials, roof/crown/openings, features, budgets)—**not** **`VoxelBlock[]`** dumps. Future **floor-plan / interior intent** is described as **forward-looking only** (no schema yet).

## Generator responsibility (added/updated)

Generators **deterministically** realize validated blueprints into **`VoxelBlock[]`**, owning placement, merges, shell/void/openings, partial shapes where implemented (**pane** windows when material-compatible), **`maxBlockCount`**, and test-covered reliability—including **`validateVoxelStructurePlacements`** in preset/edge suites.

## AI boundary (added/updated)

AI should target **blueprint-level** briefs (materials, openings, massing; someday rooms/zones); **avoid** raw coordinate streams as the primary path. Generator keeps exact geometry **deterministic** and **testable**.

## Future floor plans / interiors (documentation only)

Documented as: **semantic constraints at blueprint level**, **deterministic realization in generators**; possible future fields (rooms, zones, circulation, doors, stairs, object zones, walkability); **not in schema today**; templates may precede full schema; AI floor plans only as **structured intent**, not voxel output.

## Confirmations

- **No** changes to blueprint **schema**, source **code**, **tests**, **generator**, **presets**, **`/preview`**, **`/visualizer`**, textures, or **`docs/blocks/BLOCK_SYSTEM_BACKLOG.md`**.
- **Documentation-only** task.

## Verification

**Not run** — docs-only update (`pnpm test:generator`, `tsc`, `build` unchanged by this commit).
