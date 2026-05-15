# Plan: Material / block-type breakdown (Developer Lab Tools)

## 1. Current understanding

### Branch and issue

- **Branch:** `feature/material-block-breakdown` (new work on top of **`main`** after **`feature/onion-layer-viewer`** merged).
- **Milestone:** **Developer Lab Tools** (continuation of the internal lab, not a public marketing redesign).
- **Issue:** Inspectors can see **aggregate** visible/total block counts in **`StructureInspectionPanel`**, but not **how** the current view (or the full model) is composed by **block type / material**. This follow-up adds a **compact per-type breakdown** aligned with **`VoxelBlock.blockTypeId`**.

### Existing layer / inspection system (baseline)

- **`src/lib/voxel/layerView.ts`** — **Full**, **Build-up** (`y ≤ selectedLayer`), **Slice** (`y === selectedLayer`); helpers for extents and filtering; **no mutation** of blocks.
- **`StructureInspectionPanel`** — controlled right rail: preset, view mode buttons, layer slider + prev/next, **visible / total** aggregate, Refit.
- **`VisualizerClient`** / **`PreviewInspectionClient`** — compute **`structure`** (full generated blocks) and **`visibleStructure`** (filtered for **`VoxelViewer.structure`**); pass **`boundsStructure={structure}`** so the camera frames the full model.
- **`VoxelViewer`** — unchanged contract: render subset vs full bounds.

### Scope surfaces

- **Yes:** the breakdown must work on both **`/visualizer`** and **`/preview`** — same panel, same props pattern, same pure helpers.
- **Still** part of the **Developer Lab Tools** milestone: dense, factual, **developer-oriented** copy (not consumer polish).

---

## 2. Feature concept

Add a **per `blockTypeId` block count** breakdown:

| Column | Meaning |
|--------|---------|
| **Label** | Human-readable where possible; else **`blockTypeId`** string. |
| **Visible** | Count of blocks of that type in the **currently rendered** block list (after layer filter). |
| **Total** | Count of that type in the **full** generated **`structure.blocks`** for the current blueprint / preset. |

**Example rows (illustrative):**

```text
limestone_bricks   812 visible / 1,402 total
slate_tiles        184 visible / 221 total
glass               62 visible / 96 total
oak_planks          28 visible / 41 total
```

**Placement:** New subsection **below** the existing **“Block counts”** aggregate line, **inside** **`StructureInspectionPanel`**.

**Tone:** Compact monospace or small table; **no** charts, **no** swatches in v1 unless trivial later.

---

## 3. Data design

### Source of truth

- Each **`VoxelBlock`** already carries **`blockTypeId: BlockTypeId`** (`pack/local`, e.g. `classic/cobblestone`) — see **`src/lib/voxel/types.ts`**.

### Pure helper (new module, suggested path)

**`src/lib/voxel/blockBreakdown.ts`** (or adjacent name):

1. **`countBlocksByType(blocks: readonly VoxelBlock[]): ReadonlyMap<BlockTypeId, number>`**  
   - Single pass: increment per **`blockTypeId`**.  
   - Empty input → empty map.  
   - **Do not** mutate the input array or block objects.

2. **`mergeVisibleAndTotalCounts(...)`** (or one function returning rows):  
   - Input: **`totalByType`** from **`countBlocksByType(fullBlocks)`**, **`visibleByType`** from **`countBlocksByType(visibleBlocks)`**.  
   - Output: sorted rows **`{ blockTypeId, visible, total }[]`**.  
   - **Include only types with `total > 0`** (nonzero in full structure), per product preference; **visible** may be `0` in Slice for types absent on that **y**.  
   - **Sort** by **descending `total`** (stable tie-breaker: **`blockTypeId`** lexicographic).

3. **`displayLabelForBlockTypeId(id: BlockTypeId): string`**  
   - **`getBlockDefinition(id)`** from **`src/lib/voxel/blocks/registry.ts`** confirms the id is registered; **`BlockTypeDefinition`** has **no** `displayName` field today — derive a readable string from the **local** segment after `/` (e.g. replace `_` with space, optional title case), or show full **`blockTypeId`** if parsing fails.  
   - Keeps registry **read-only**; no schema change.

### Where computation runs

- **`VisualizerClient`** and **`PreviewInspectionClient`** already own **`structure`** and **`visibleStructure`** (or equivalent **`visibleStructure.blocks`**).  
- Add **`useMemo`** in each parent:

  ```text
  totalByType = countBlocksByType(structure.blocks)
  visibleByType = countBlocksByType(visibleStructure.blocks)
  breakdownRows = mergeVisibleAndTotalCounts(visibleByType, totalByType)
  ```

- **Do not** re-run **`generateStructureFromResolved`** for counts.  
- **Do not** change the generator, blueprint schema, or validator.

---

## 4. Display design (`StructureInspectionPanel`)

- **Section title:** e.g. **“By block type”** or **“Materials (counts)”** — short, uppercase micro-label consistent with existing panel sections.
- **Layout:** Under **Block counts** (`visibleCount` / `totalCount`), add **`border-t`** + **`max-h-*` + `overflow-y-auto`** on the list container (e.g. **`max-h-40`–`48`**) so tall towers do not push **Refit** off-screen; panel remains scrollable as a whole.
- **Row format:** One line per type, **`{label}: {visible} / {total}`** or two-column monospace alignment — keep **≤18rem** panel width in mind.
- **Empty / invalid:** If **`!hasStructure`**, hide the breakdown or show a single muted line (“No geometry”); **never** throw.
- **“Show all”:** Not required for v1 — type count for medieval towers stays small; **revisit** only if a future generator emits dozens of types.

---

## 5. Relationship to layer modes

| Mode | Expected behavior |
|------|-------------------|
| **Full** | **`visibleStructure.blocks`** equals **`structure.blocks`** → **visible == total** for every type (same as aggregate line). |
| **Build-up** | As **`selectedLayer`** increases, **visible** per type is **non-decreasing** (cumulative **y** slab). |
| **Slice** | **Visible** counts reflect **only** blocks with **`y === selectedLayer`**; many types may be **0** visible while **total > 0**. |
| **All** | Updating breakdown is **pure derivation** from existing arrays → **no camera movement**, **no generator** calls. |

---

## 6. Scope boundaries (explicit non-goals)

Do **not** add:

- Charts, pie graphs, sparklines  
- Color swatches (unless later tied trivially to existing textures — out of v1)  
- Minecraft export, cost/resource estimates, crafting recipes  
- AI explanations of composition  
- Semantic metadata, role/region/sourceFeature filters  
- **localStorage** / persistence, import/export  
- New structure types  
- Major UI redesign of the lab layout  
- Changes to **`VoxelViewer.tsx`** unless an unforeseen bug appears  

---

## 7. Testing plan

- **`pnpm run build`**
- **`/visualizer`** and **`/preview`** load; all **six** presets render.
- **Full mode:** for each type row, **visible === total**; sums of per-type **total** equal **`structure.blocks.length`**.
- **Build-up:** scrub **`selectedLayer`** — per-type **visible** counts change monotonically (non-decreasing); aggregate **visible** matches **`visibleStructure.blocks.length`**.
- **Slice:** pick several **y** — visible per type matches a manual spot-check intuition; types with no voxels on that layer show **0** visible.
- **Preset change** / **blueprint edit:** breakdown updates to match new **`structure`**.
- **Invalid blueprint** (`/visualizer`): panel does not crash; breakdown hidden or empty state only.
- **Camera:** layer scrub and breakdown updates still **do not** refit or jump the camera; **Refit** still works.

---

## 8. Files expected to change

| Likelihood | File |
|------------|------|
| **High** | **`src/lib/voxel/blockBreakdown.ts`** (new) — counting, merge, sort, display label helper. |
| **High** | **`src/components/voxel/StructureInspectionPanel.tsx`** — new optional props (e.g. **`breakdownRows`** or **`breakdown: … | null`**); render list under aggregate counts. |
| **High** | **`src/app/visualizer/VisualizerClient.tsx`** — `useMemo` breakdown from **`structure`** / **`visibleStructure`**; pass into panel. |
| **High** | **`src/app/preview/PreviewInspectionClient.tsx`** — same as visualizer. |
| **After implementation** | **`CHANGE.md`** |
| **Now** | **`PLAN.md`** (this document). |

**Unlikely:** **`src/lib/voxel/layerView.ts`**, **`VoxelViewer.tsx`**, **`sampleBlueprints.ts`**, generators, schema, validator — **no** changes unless a small bug is discovered.

**Reference only:** **`CHANGE.md`** (prior merged branch notes); **`registry-types.ts`** (no `displayName` today).

---

## 9. Approval checkpoint

**Waiting for approval before implementation.**
