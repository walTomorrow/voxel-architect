# Plan: Front façade composition (portal zones + hierarchy)

## 1. Current understanding

### Generator pipeline

1. **`MedievalTowerBlueprint`** → **`validateBlueprint()`** resolves materials, clamps grid/roof, derives **`bodyLayers`**, checks hollow/footprint, entrance span vs wall thickness, etc.
2. **`generateMedievalTower(resolved)`** builds **`Placement[]`** in a fixed sequence: foundation → body shell (skipping door aperture cells) with **`windowGlass`** from **`buildWindowGlassSet`** → façade trim around glass → **portal jambs + lintel** (`PRI.PORTAL_ACCENT`) → door row → optional **arch** → corner capstones → roof → battlements → **`mergePlacements`** → optional **`filterGrounded`**.

### Preset system

- **`MEDIEVAL_TOWER_PRESETS`** in `sampleBlueprints.ts` provides hand-authored towers; **`SAMPLE_MEDIEVAL_TOWER_BLUEPRINT`** is Northwatch (same object as the **`northwatch`** preset entry).
- **`/visualizer`** clones presets, validates, generates, **`VoxelViewer`** renders.

### Relevant principles (`GENERATION_DESIGN_PRINCIPLES.md`)

| Principle | Implication for this milestone |
|-----------|----------------------------------|
| **§2.2 — Valid geometry is necessary but not sufficient** | Gothic Stone Tower validates but still reads as **uncomposed**; fix is **architectural composition**, not schema loosening. |
| **§2.3 — Entrances define façade hierarchy** | Front façade with a main entrance should be **composed around** the portal, not treated as a generic 1D window strip. |
| **§2.4 — Symmetry must be explicit** | Recent work fixed **symmetric along-slots** globally; the **entrance face** still needs **explicit** exclusion of the **portal zone** so symmetry is about **wings**, not the whole edge including jambs. |
| **§2.5 — Facades in zones** | Model **margins | left bay | portal zone | right bay | margins** (and vertical **base / body / lintel / crown** bands). |
| **§2.6 — Openings respect structure and rhythm** | Windows must not compete with **door, jambs, lintel, arch** for the same compositional role. |
| **§7.1 — Front façade rule** | Reserve a **portal zone**: aperture, door, jambs, lintel/arch, optional vertical clearance; **windows should avoid** that zone unless intentionally authored. |
| **§7.2 — Door parity** | **Odd façade width → odd door width**; **even → even**; awkward parity should **warn or normalize**. |
| **§7.3 — Window bay rule** | Valid bays avoid **portal zone** (not only the door aperture at low **y**). |
| **§7.5 — Trim hierarchy** | Entrance frame should read clearly; **`PRI.PORTAL_ACCENT` (52) > `PRI.WINDOW` (50)** can **suppress** glass where jambs and windows share a column, producing **holes or uneven bands**. |

---

## 2. Diagnosis — Gothic Stone Tower front façade

**Preset snapshot:** `dimensions.width/length = 10`, **`entranceSide: "front"`**, **`entranceWidth: 3`**, **`entranceHeight: 6`**, **`entranceStyle: "arched"`**, **`windowsPlacement: "symmetric"`**, **`windowsCountPerSide: 2`**, **`windowsStyle: "arched"`** (stride **3**), **`windowsFloors: "upper"`**, **`cornerPillars: true`**, stepped roof + crenellations.

### Geometry facts

- **`entranceSpanRange(W=10, entranceWidth=3)`** → **`lo = 3`**, **`hi = 5`** (door occupies **`lx ∈ {3,4,5}`** on **`lz = D−1`**). Centered on the **10-wide** façade span in local space (matches **`floor((W−width)/2)`** math).
- **Jamb columns:** generator places **`PORTAL_ACCENT`** at **`lx = elx0−1 = 2`** and **`lx = elx1+1 = 6`** from **`y = 1`** through **`portalYMax = min(H, ehy+1)`** (and lintel row at **`y = ehy+1`** across the door).
- **Symmetric window columns (current):** `symmetricAlongSlots` on interior along **`1..W−2 = 1..8`** with **`want = 2`**, **`minGap = 3`** yields **`[2, 6]`** — **exactly the jamb columns**.

### Why it still looks wrong

1. **Portal zone vs window keys** — **`buildWindowColumnKeySet`** does **not** subtract the **horizontal portal reserve** on the entrance face. **`inDoorAperture`** only suppresses glass for **`y ≤ entranceHeight`**, so **upper-floor glass** can target **`lx = 2` and `lx = 6`**, the same columns as **full-height jambs** below. **`PORTAL_ACCENT` wins merges over `WINDOW`**, so upper windows on those columns can **disappear or fragment**, breaking **vertical rhythm** and making the portal read as **lumpy or asymmetric**.
2. **Door / façade parity (§7.2)** — **`W = 10` (even)** with **`entranceWidth = 3` (odd)** contradicts the documented **even→even** recommendation; the door can read as **slightly “off”** relative to even-grid masonry even when mathematically centered.
3. **No zoned composition** — Windows on the front are chosen from **the same global symmetric 1D rule** as the back face; the **entrance is not a first-class “central zone”** with **wing bays** chosen outside **`[elx0−1 … elx1+1]`** (or similar).
4. **Trim vs glass** — Façade trim around windows uses **`PRI.FACADE_TRIM` (44)**; portal uses **52**. Hierarchy is right for **jambs vs glass**, but **jambs should not share columns with chosen window bays** if the design goal is a **clear frame + flanking windows**.
5. **Preset vs generator** — The preset is **not “invalid”**; the main gap is **generator policy** (zones + portal reserve). Tuning **`entranceWidth`** to **4** (even) is a **secondary** option **after** logic respects portal wings.

---

## 3. Proposed façade composition model (generator-first)

### Preferred approach: entrance-face “composition pass” in data, not a second voxel pass

Extend **`buildWindowColumnKeySet`** (or a dedicated helper it calls) so that when **`openings.entranceSide`** identifies the **front** (and analogously **back / left / right`**):

1. **Define `portalAlongForbidden`** on that façade’s **along** axis:
   - Always exclude **`el..eh`** (door span along the edge).
   - Also exclude **jamb columns** **`el−1`** and **`eh+1`** when in range (these are **`PORTAL_ACCENT`** columns in the current generator).
   - Optionally add **one-cell “breathing” margin** beyond jambs (design choice; start without, add if still tight).

2. **Build entrance-face window columns** by running **`symmetricAlongSlots`** only on **`allowedAlong = sorted([lo..hi] \ forbidden)`** (not on raw **`1..W−2`**). If **`allowedAlong`** is too sparse to place **`windowsCountPerSide`**, **degrade count** on that façade only (same spirit as current symmetric degradation).

3. **Non-entrance façades** — Keep **existing symmetric along-slots** on **`1..W−2`** or **`1..D−2`** (no portal subtraction) unless the same **along index** would duplicate a corner-only ambiguity; **minimal change** outside the entrance face.

4. **`front_only`** — Already only the front edge; apply the same **portal-reserved** candidate set.

5. **Preserve** — **`tryPlaceSymmetricAlong` / `symmetricAlongSlots`** remain the core; add a **thin adapter**: “symmetric slots from **filtered candidate list**” (either by **masking indices** or by **mapping consecutive slot indices** to allowed along values — prefer **explicit list** for even/odd clarity).

6. **Vertical “portal band” (optional v1.5)** — Principles mention **clearance above the door**. v1 can stay **`inDoorAperture`** + **column exclusion**; v2 can extend **`inPortalVerticalBand(lx,lz,y)`** to suppress windows in a **short band above the lintel** for a calmer transition to **upper** window floors.

### Merge / priority

- Prefer **not** lowering **`PORTAL_ACCENT`** priority; instead **do not emit conflicting `WINDOW` glass** in portal-adjacent columns on the entrance face.
- Re-check **`FACADE_TRIM`** around windows adjacent to portal columns so trim does not suggest a **second door frame**.

---

## 4. Validation considerations

**Prefer minimal validation changes.**

| Idea | Recommendation |
|------|------------------|
| **Parity note** | If **`W`** even and **`entranceWidth`** odd (or converse), append a **`notes.push`** in **`validateBlueprint`** (non-fatal): *“Door width parity differs from façade parity; composition may look less balanced (see GENERATION_DESIGN_PRINCIPLES §7.2).”* |
| **Clamp entrance width** | **Avoid silent clamp** in validation unless product decision; optional **future** “normalize to even” behind a flag — **out of scope** for this milestone unless you explicitly want it. |
| **windowsCountPerSide vs portal** | If, after filtering, **zero** bays fit on the entrance face while **`windowsCountPerSide > 0`**, **`notes`** could say *“Entrance portal reserve leaves no symmetric window bays on the entrance façade; windows appear on other faces only.”* — helps presets like **very narrow** towers. |

No **new required errors** unless a hard invariant is violated.

---

## 5. Preset considerations (Gothic Stone Tower)

- **Prefer generator fix first** — **`GOTHIC_STONE_TOWER_BLUEPRINT`** stays unchanged for the first implementation pass.
- **If** after portal-reserved bays the front still has **0** windows (unlikely at **W=10**, **count=2**), then consider **`entranceWidth: 4`** (even parity with façade) or **`windowsCountPerSide: 1`** — **only with visual confirmation**.
- **`BLUEPRINT_FEATURE_CATALOG.md`** can stay the vocabulary source; no catalog edit required for this task.

---

## 6. Scope boundaries

Do **not** add: AI/prompts, API routes, persistence/`localStorage`, public **`/demo`**, new structure types, layer viewer, blueprint import/export, **broad schema refactor**, or **major renderer** work.

---

## 7. Determinism and safety

| Property | How the plan preserves it |
|----------|---------------------------|
| **Deterministic generation** | Zone filtering and slot selection are **pure functions** of **`ResolvedMedievalTower`** + derived portal indices. |
| **Validation-before-generation** | Unchanged pipeline in **`/visualizer`**. |
| **No duplicate voxel keys** | Still single **`mergePlacements`** pass; **fewer** conflicting WINDOW vs PORTAL pushes **reduces** merge contention. |
| **Grounded / battlements** | **No** edits to roof/parapet/merlon passes in v1 if window keys only affect **body façade** glass selection. |
| **Stale geometry when invalid** | Unchanged. |

---

## 8. Testing plan

1. **`pnpm run build`**
2. **`/visualizer`** loads.
3. **Gothic Stone Tower** — front façade: **clear portal**, **symmetric wing windows**, **lintel/arch** readable; **no** glass “eating” jamb columns.
4. **Fortified Gate Tower** — wide door on **`windowsFloors: all`**; confirm **no** window columns inside **portal reserve**; jambs + windows readable.
5. **Tall Watchtower** — narrow footprint; ensure **degraded** entrance-face count still looks intentional, not broken.
6. **Dark Wizard Tower** — **regression**: dense symmetric bays still look good; portal still centered.
7. **Northwatch / Compact Guard** — unchanged or improved; **Compact** **front_only** still valid.
8. **Battlements** — stepped roofs: **no** floating merlon rings.
9. **Camera** — **`LabOrbitRig`** / **Refit camera** still behave after any **`VoxelViewer`** touch (ideally **no** viewer changes this milestone).

---

## 9. Files expected to change (implementation phase)

| File | Role |
|------|------|
| `src/lib/generation/generators/generateMedievalTower.ts` | Portal-aware **candidate along** set for the **entrance façade**; optional helper **`symmetricAlongSlotsFromCandidates`**; wire into **`buildWindowColumnKeySet`**. |
| `src/lib/blueprints/validateBlueprint.ts` | **Optional** **`notes`** for parity / impossible entrance-face bay count (minimal). |
| `src/lib/blueprints/sampleBlueprints.ts` | **Only** if Gothic (or another preset) still fails composition after logic (e.g. **`entranceWidth`** parity tweak). |
| `CHANGE.md` | After implementation. |
| `PLAN.md` | This document (planning only now). |

**Unlikely:** `VisualizerClient.tsx`, `types.ts`, **`BLUEPRINT_FEATURE_CATALOG.md`**, **`GENERATION_DESIGN_PRINCIPLES.md`** (reference only).

---

## 10. Approval checkpoint

**Waiting for approval before implementation.**
