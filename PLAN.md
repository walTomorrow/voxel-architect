# Plan — Minecraft-Inspired Material Families and Texture Roles

**Branch:** `milestone/generator-expansion`  
**Status:** Scoping / audit only — **no code, tests, textures, or CHANGE.md updates in this step.**

**Carry-forward from Partial Block Foundation:** The renderer today **skips** invalid **`shapeKind`/`state`** with a dev warning (`VoxelViewer.tsx`). That is acceptable render-safety for slice 1. Once generators emit partial blocks, **correctness should be enforced earlier** via **`validateVoxelBlockShapeState`** (and kin) **before** placement lists reach the viewer — extend reliability / generator tests accordingly in a later slice.

---

## 1. Purpose

The **partial block model** answers: *How can one **`blockTypeId`** (one texture bundle) render as **cube / slab / pane / post** inside a cell?*

The **material-family / texture-role** layer answers: *What **materials** exist in the vocabulary, how are they **grouped**, what **roles** (log vs planks vs brick) do entries play, and **which shapes** are semantically allowed for each role so generators don’t invent nonsense combinations?*

This plan is the **next conceptual layer**: organize **Minecraft-inspired** families and roles **before** adding many new **`classic`** keys or wiring generators to partial shapes at scale. Goal is **architectural usefulness**, not **exhaustive Minecraft parity**.

---

## 2. Current registry and texture summary

**Inspected paths:**

- **`src/lib/voxel/blocks/registry-types.ts`** — **`BlockTypeDefinition`**: **`faces`** only (`uniform` | `topSideBottom`), plus optional **`metalness`**, **`roughness`**, **`transparent`**, **`opacity`**, **`alphaTest`**, **`depthWrite`**. **No** material family, role, allowed shapes, or Minecraft metadata.
- **`src/lib/voxel/blocks/registry.ts`** — **`getBlockDefinition`**, **`blockTypeId(pack, local)`**, pack map; **`BlockTypeId`** = **`pack/localKey`** string.
- **`src/lib/voxel/blocks/packs/classic.ts`** — Flat **`Record<string, BlockTypeDefinition>`**: ~40 entries (`as const satisfies BlockPackDefinitions`). Comment: PNGs under **`public/textures/classic/*.png`**. **Workspace snapshot:** **`public/textures/classic`** may be absent from the repo mirror (textures often shipped separately); runtime still expects URLs from **`textureUrls.ts`**.
- **`src/lib/voxel/blocks/textureUrls.ts`** — **`/textures/{packId}/{filename}`**.

**Naming patterns already implying families / roles (implicit, not typed):**

| Pattern | Examples |
|---------|-----------|
| **Species wood** | **`oak_*`**, **`pine_*`**, **`maple_*`**, **`beech_*`**, **`eucalyptus_*`** — paired **`_log`**, **`_planks`**, **`_leaves`** |
| **Stone / masonry** | **`cobblestone`**, **`mossy_cobblestone`**, **`limestone`**, **`limestone_bricks`**, **`mudstone`**, **`schist`**, **`slate`**, **`slate_tiles`**, **`andesite`**, **`mud_bricks`**, **`mud_cracked`**, **`layer_rock`**, **`gravel`**, **`snow`** |
| **Glass** | **`glass`** (transparent material flags) |
| **Terrain / organic** | **`grass`**, **`grass_snowy`**, **`mud`** |
| **Special** | **`obsidian`**, **`old_clay`** |

**Placement model today:** **`src/lib/voxel/types.ts`** + **`voxelBlockShape.ts`** — **`blockTypeId`** + optional **`shapeKind`/`state`**; **`VoxelViewer.tsx`** batches by **`blockTypeId` + shape bucket** and builds materials only from **`BlockTypeDefinition`**.

---

## 3. Proposed metadata model (design only)

**Goal:** Attach **family**, **role**, **shape policy**, and **future MC hints** without exploding **`blockTypeId`** strings (`oak_slab_top_north` — **avoid**).

**Recommended least-disruptive approach (slice 1 of metadata):**

- **Companion metadata map** keyed by **`BlockTypeId`** (or by **`classic`** local key + resolver), **alongside** existing **`CLASSIC_BLOCK_PACK`**, **not** yet mandatory fields inside **`BlockTypeDefinition`**.
  - Keeps **`classic.ts`** readable and avoids churn to **`satisfies BlockPackDefinitions`** until shape is proven.
  - Allows **partial annotation**: only curated keys get metadata rows initially; missing key ⇒ safe defaults (see below).
- **Later optional:** Fold proven fields into **`BlockTypeDefinition`** if ergonomics win.

**Proposed fields (on metadata row or future extended definition):**

| Field | Purpose |
|-------|---------|
| **`materialFamily`** | Minecraft-inspired family id, e.g. `oak`, `pine`, `limestone`, `cobble`, `glass_clear` |
| **`materialGroup`** | Coarser bucket for UI / generators: `wood`, `stone_masonry`, `glass`, `metal`, `organic`, `roof`, `light`, … |
| **`textureRole`** | `log`, `planks`, `leaves`, `cobble`, `brick`, `tile`, `block`, `pane_proxy`, … |
| **`defaultShapeKind`** | Usually `cube`; could default `glass` entries toward `cube` until pane placement exists |
| **`allowedShapeKinds`** | Subset of **`VoxelBlockShapeKind`** (+ future kinds): generator validation target |
| **`tags`** | `exterior_shell`, `roof`, `accent`, `foundation`, `transparent`, … |
| **`minecraftCompatibility`** | See §9 — `exact` / `approximate` / `composed` / `unsupported` + optional payload |

**Defaults when metadata missing:** **`materialFamily`** inferred from naming heuristics **or** `unknown`; **`allowedShapeKinds`** = **`["cube"]`** only until annotated (conservative).

---

## 4. Material family taxonomy (first pass)

Manageable **Minecraft-inspired** groups (not exhaustive):

1. **Wood** — species trunk, planks, leaves; trim/beam roles later.  
2. **Stone / masonry** — raw stone, cobble, brick-like, sedimentary, decorative variants.  
3. **Glass / stained glass** — clear + tinted roles (tint may share geometry, different texture later).  
4. **Metal / utility** — iron, copper, chains, bars, lanterns (many **not** in **`classic`** yet).  
5. **Organic / nature** — leaves, grass, flowers, vines, crops.  
6. **Roof-like** — slate tiles, clay, shingles; often overlaps stone/clay families.  
7. **Light / emissive** — lanterns, glowstone-like (texture + emissive in renderer later).  
8. **Decorative / crafted utility** — clay pots, carved stone — **low priority** until core shells work.

**Custom VA-only families** — explicitly **out of scope** for this taxonomy slice.

---

## 5. Texture / material roles by family

| Family group | Example **`textureRole`** values | Texture reuse for partial shapes (now) |
|--------------|-----------------------------------|----------------------------------------|
| **Wood** | `log`, `planks`, `stripped_log` (later), `leaves`, `door` (later) | Slab/pane/post reuse **planks** / **log** cube textures; leaves stay **cube** until **`cross_plant`** |
| **Stone / masonry** | `raw`, `cobble`, `brick`, `carved`, `tile`, `cap` | Slab/post reuse **same uniform or brick** texture |
| **Glass** | `block`, `pane` (logical role), `stained` | **Pane** shape reuses **`glass.png`** until dedicated pane texture |
| **Metal** | `block`, `bars`, `chain`, `lantern`, `grate`, `door` | Often need **new textures later**; defer entries until assets exist |
| **Nature** | `leaves`, `grass_top`, `vine`, `flower`, `crop`, `cross_plant` | **`cross_plant`** deferred; cube textures now |
| **Roof-like** | `tile`, `slate`, `ridge`, `trim` | **`slate_tiles`**, **`slate`** — slab/stair roles later |
| **Light** | `lantern`, `torch`, `glow` | Metadata ahead of textures/renderer emissive |

Roles that **likely need custom textures later:** door panels, trapdoors, distinct pane borders, multi-face lanterns, connected fences/walls.

---

## 6. Shape compatibility matrix

**Current implemented shapes:** **`cube`**, **`slab`**, **`pane`**, **`post`** (`types.ts`, **`voxelBlockShape.ts`**).  
**Deferred:** door, stair, fence, wall, trapdoor, **`cross_plant`**, lantern geometry, sign, bars-as-own-shape (may share **pane** branch).

| Material group / typical role | **Now** (`cube` / `slab` / `pane` / `post`) | **Later** |
|-------------------------------|---------------------------------------------|-----------|
| **Stone / brick / cobble** (`brick`, `cobble`, `raw`) | **cube**, **slab**, **post**; **pane** odd unless “iron grate” proxy | **stair**, **wall** |
| **`glass` block role** | **cube**, **pane** | stained variants |
| **Wood planks** | **cube**, **slab**, **post** (beam) | **door**, **fence**, **trapdoor**, **stair** |
| **Wood log** | **cube**, **post** (vertical beam); **slab** weaker semantically but texture-reusable | stripped log, bark rules |
| **Leaves / foliage** | **cube** only recommended until **`cross_plant`** | **`cross_plant`**, vine |
| **Grass / mud topsoil** | **cube** | specialized ground layers |
| **Roof tiles** (`slate_tiles`, etc.) | **cube**, **slab** | **stair**, ridge **trim** |

**Policy:** **`allowedShapeKinds`** in metadata encodes this; **`validateVoxelBlockShapeState`** stays structural — add **`validateVoxelBlockMaterialShape`** later that checks **`(blockTypeId, shapeKind)`** against metadata.

---

## 7. Initial curated family set

**Map to what exists in `classic.ts` today** (do **not** assume spruce/dark_oak/stone_brick/iron/copper/stained_glass until textures exist).

| Conceptual family | Representative **`classic`** keys (existing) |
|-------------------|-----------------------------------------------|
| **Oak wood** | `oak_log`, `oak_planks`, `oak_leaves` |
| **Pine / conifer** | `pine_log`, `pine_planks`, `pine_leaves` (MC “spruce-like”) |
| **Maple / secondary hardwood** | `maple_*` |
| **Beech** | `beech_*` |
| **Eucalyptus** | `eucalyptus_*` |
| **Cobble / moss** | `cobblestone`, `mossy_cobblestone` |
| **Limestone masonry** | `limestone`, `limestone_bricks` |
| **Mud / mudstone** | `mud`, `mudstone`, `mud_bricks`, `mud_cracked` |
| **Schist / slate roof line** | `schist`, `slate`, `slate_tiles` |
| **Andesite / gravel / snow** | `andesite`, `gravel`, `snow`, `layer_rock` |
| **Glass** | `glass` |
| **Grass / turf** | `grass`, `grass_snowy` |
| **Dark / special stone** | `obsidian` |
| **Clay / ceramic** | `old_clay` |

**Later asset slices** can add true **MC-named** families (`stone_brick`, `iron_block`, `copper`, stained glass) **with** textures — not required for this planning doc’s taxonomy to be “wrong,” only **prioritized**.

---

## 8. Texture asset policy

- **No auto-generated / mystery textures** (agents must not drop unnamed PNGs without registry rows).
- **Prefer existing `classic` textures** for new metadata-only work.
- **Partial shapes reuse** parent **`blockTypeId`** textures (`CHANGE.md` confirms foundation behavior).
- **Iconic blocks** (doors, lanterns) may later get **dedicated** textures **explicitly** authored.
- **Missing textures:** keep **loud failure** in dev (`VoxelViewer` throws on missing map entry) unless a later issue adds opt-in debug fallback.
- **Later slice:** **`classic.ts` filename ↔ disk** audit script (CI optional) — not blocking metadata introduction.

---

## 9. Future Minecraft compatibility metadata (no export yet)

Proposed per-**`blockTypeId`** (or per logical VA primitive):

```ts
minecraftCompatibility: {
  status: "exact" | "approximate" | "composed" | "unsupported";
  notes?: string;
  // optional: suggested MC block id(s), blockstate hints — TBD when export exists
}
```

- **Normal VA mode:** full internal vocabulary + partial shapes.  
- **Future MC-compatible mode:** restrict placements to **`exact`** or approved **`approximate`** rows.  
- **`composed`:** one VA cell maps to multiple MC blocks (document only).  
- **`unsupported`:** VA-only aesthetic.

**No export implementation** in this milestone slice.

---

## 10. Relationship to generators and building families

- **Tower generator:** Can adopt **slab/pane/post** for roofs, windows, pillars **once** **`allowedShapeKinds`** + **`validateVoxelBlockMaterialShape`** exist — avoids invalid combos noted in § carry-forward.  
- **Cottages / houses:** need **wood + stone + glass** families and slab/stair/pane vocabulary.  
- **Blacksmith / workshop:** stone + **metal** (future textures) + slab/post.  
- **Chapel / shrine:** stone variants + glass pane + vertical emphasis (posts).  
- **Tavern / shop / barn:** overlap cottage vocabulary + larger openings (doors later).  

**Blueprint catalog** (`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md`) stays the **feature taxonomy**; material metadata is the **voxel vocabulary** underneath. **Building-family schemas** should wait until **material + shape policies** stabilize enough for generators to stay testable (`docs/generation/GENERATOR_RELIABILITY.md`).

**Design principles** (`docs/GENERATION_DESIGN_PRINCIPLES.md`): readability still **not** guaranteed by mechanical tests — metadata reduces “random toggle” growth by scoping **allowed** material/shape pairs.

---

## 11. Recommended next implementation slice

1. **Add `src/lib/voxel/blocks/classicMaterialMeta.ts`** (name TBD): **`Partial<Record<ClassicLocalKey, MaterialMeta>>`** or map builder from **`blockTypeId`** strings — **optional fields only**, defaults conservative.  
2. **Define TypeScript types** for **`MaterialMeta`** (family, group, role, **`allowedShapeKinds`**, optional **`minecraftCompatibility`**).  
3. **Annotate a small curated subset** (e.g. `oak_planks`, `cobblestone`, `limestone_bricks`, `glass`, `slate_tiles`) — **no new PNGs**.  
4. **Pure helpers:** `getMaterialMeta(blockTypeId)`, `isShapeAllowedForBlockType(blockTypeId, shapeKind)` — used in tests only until generators call them.  
5. **Tests:** metadata presence for annotated keys; **`allowedShapeKinds`** includes **`cube`**; unknown keys fall back safely; optional MC status shape.  
6. **Do not** change **`generateMedievalTower`** output yet (unless a **dev-only** structure mirrors **`SAMPLE_PARTIAL_BLOCK_FOUNDATION`** pattern).  
7. **Do not** extend **`BlockTypeDefinition`** in **`registry-types.ts`** until companion map proves stable (follow-on PR).

---

## 12. Risks and open questions

| Risk | Mitigation idea |
|------|-----------------|
| **Over-modeling early** | Ship **partial** metadata map + defaults; expand incrementally. |
| **Registry churn** | Companion map first; migrate to **`BlockTypeDefinition`** only when stable. |
| **Texture sprawl** | Roles table + policy; defer MC-complete asset sets. |
| **Minecraft parity rabbit hole** | Architectural usefulness gate; **`minecraftCompatibility`** explicitly **`approximate`**. |
| **Family vs role confusion** | Docs + naming: **family** = species/material line; **role** = how texture is used (log vs planks). |
| **Invalid generator combos** | **`validateVoxelBlockMaterialShape`** + reliability tests **before** viewer. |
| **Wrong export assumptions** | Status + notes; revisit when MC version target chosen. |

**Open questions from codebase:**

- Should **`materialFamily`** be **MC-canonical** (`oak`) while **`classic`** uses **`pine`** as spruce surrogate — document mapping in meta **`notes`**.  
- **`grass`** / **`grass_snowy`** — family `terrain` vs `organic`?  
- **`obsidian`** — `stone_special` or `nether_theme` for MC metadata?  
- **`allowedShapeKinds`** for **`glass`**: allow **`post`**? (Probably **no** — metadata should forbid meaningless combos.)  
- When to merge **`validateVoxelBlockShapeState`** + material validator — single **`assertValidPlacedBlock`** for generators?

---

Scoping only — waiting for review before implementation.
