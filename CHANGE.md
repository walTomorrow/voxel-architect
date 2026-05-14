# Change log — Entrance façade portal reserve (medieval tower)

## 1. Title of this milestone

**Front façade composition fix:** reserve a **portal zone** on the **entrance façade** before symmetric window-bay selection, so wing windows no longer compete with door span and jamb columns on presets such as **Gothic Stone Tower**.

**Supplement — door/footprint parity and façade symmetry:** An **odd-width** entrance on an **even-width** tower cannot yield **equal** left/right margin in whole voxels (`entranceSpanRange` uses full grid width). **Gothic Stone Tower** and **Tall Watchtower** presets were adjusted to **odd** footprints (**11×11** and **9×9**) so a **3-wide** door stays bilaterally balanced. **`tryPlaceSymmetricOnAllowed`** now, for an **odd** requested bay count, picks the **allowed** along-index **nearest** the façade midpoint when the geometric center sits in the portal reserve (deterministic tie-break: smaller index).

---

## 2. Files changed

| File | Change |
|------|--------|
| `src/lib/generation/generators/generateMedievalTower.ts` | **Portal-reserved along indices** on the entrance façade: `portalAlongForbiddenInterior`, `buildAllowedInteriorAlong`, `symmetricAlongSlotsFromAllowed`, and `buildWindowColumnKeySet` now takes entrance span `(elx0, elx1, elz0, elz1)` and replaces only the façade slot list that matches `entranceSide` with symmetric slots filtered to **allowed** interior columns. Non-entrance façades and `front_only` (when entrance is front) use the same filtered candidate path for the relevant axis. **Supplement:** `tryPlaceSymmetricOnAllowed` odd-count path falls back to the **closest allowed** index to the façade center when the clamped center is not allowed (portal ate the midpoint). |
| `src/lib/blueprints/validateBlueprint.ts` | **Non-fatal** `notes.push` when square footprint **`W === D`**, valid `entranceWidth`, and **door width parity ≠ footprint width parity** (references **GENERATION_DESIGN_PRINCIPLES §7.2**). Does **not** fail validation. |
| `src/lib/blueprints/sampleBlueprints.ts` | **Gothic Stone Tower** footprint **10×10 → 11×11**; **Tall Watchtower** **8×8 → 9×9**; metadata notes call out odd footprint vs **3-wide** door parity. |

---

## 3. Root cause of the Gothic / front façade issue

Symmetric bay selection used the **full interior along-span** of each façade. On **Gothic Stone Tower** the door occupies a central span and the **left/right jamb** columns sit immediately outside that span but are still structurally part of the portal read. The symmetric picker could still choose those along indices as “wing” window columns because they were **interior** and **mirror-paired**, so **window glass** could appear in the same columns as **portal/jamb** stone after merge—visually **eating** the entrance.

Separately, **even `W` + odd `entranceWidth`** forces **unequal** wing column counts (e.g. 10-wide with a 3-wide door: margins differ by one voxel). That is a **grid parity** constraint, not a window-placement bug; fixing it requires **odd footprint**, **even door width**, or an explicit future **door offset** rule in the generator.

---

## 4. Portal zone / façade-zone logic

1. **`portalAlongForbiddenInterior(el0, el1, interiorLo, interiorHi)`** marks forbidden **along** indices: the **door aperture** `[el0, el1]` plus **jamb columns** `el0 - 1` and `el1 + 1` when each lies inside the façade’s interior along range (interior excludes outer shell corners).
2. **`buildAllowedInteriorAlong(lo, hi, forbidden)`** returns sorted allowed indices (portal reserve removed).
3. **`symmetricAlongSlotsFromAllowed`** mirrors **`tryPlaceSymmetricAlong` / `symmetricAlongSlots`**: same center-first and symmetric-pair rules and **stride / minGap** behavior, but candidates are drawn only from the **allowed** list (so bays are **wing windows** or counts **gracefully reduce** when pairs do not fit).
4. **`buildWindowColumnKeySet(r, W, D, elx0, elx1, elz0, elz1)`** still builds default **full-span** slot lists for all four faces; for the face matching **`openings.entranceSide`** (`front` / `back` / `left` / `right`), the corresponding **`slotsFrontX`**, **`slotsBackX`**, **`slotsLeftZ`**, or **`slotsRightZ`** is replaced with **`symmetricAlongSlotsFromAllowed`** on that face’s allowed along list.
5. **`front_only`** still limits glass seeds to **`lz = D - 1`**; when entrance is **front**, **`slotsFrontX`** is already portal-filtered—same reserve logic applies.
6. **No one-cell “breathing” margin** beyond door + jambs was added (optional in the plan only if still crowded).
7. **Portal/jamb merge priority** was **not** lowered; conflicts are avoided by **not** emitting window column keys in reserved columns on the entrance façade.
8. **`tryPlaceSymmetricOnAllowed` (odd count):** if the rounded façade center is not in `allowed`, the first pick is the **nearest** allowed along-coordinate to `(lo + hi) / 2` (same `minGap` rules as before for subsequent symmetric pairs).

---

## 5. Whether the schema changed

**No.**

---

## 6. Whether validation changed

**Yes — additive only.** A **non-fatal** note is appended when door width parity and footprint width parity disagree on a validated square tower blueprint. No new hard errors.

---

## 7. Whether presets changed

**Yes — partial (supplement).** **`GOTHIC_STONE_TOWER_BLUEPRINT`** and **`TALL_WATCHTOWER_BLUEPRINT`** dimensions were updated for **door vs footprint parity** (see §1 supplement). Other lab presets unchanged.

---

## 8. Manual QA notes (recommended on `/visualizer`)

| Preset | What to confirm |
|--------|------------------|
| **Gothic Stone Tower** | **11×11** footprint: portal **bilaterally centered** with **3-wide** door; wing windows mirror; portal/jambs not eaten by glass. |
| **Fortified Gate Tower** | Wide door remains readable; windows stay out of **portal reserve** on the entrance face. |
| **Tall Watchtower** | **9×9** footprint: equal margins around **3-wide** door; symmetric wing windows where stride allows; no one-sided “orphan” column from parity skew. |
| **Dark Wizard Tower** | No regression vs prior symmetric-bay behavior (reference). |
| **Northwatch** | Façade rhythm still reasonable. |
| **Compact Guard** | Small tower + **front_only** still reasonable; portal reserve when entrance is front. |
| **Global** | **No floating battlements**; **orbit / zoom / Refit camera** still behave as before. |

Automated spot-check (`npx tsx` validate → generate block counts): **northwatch 647**, **tall_watchtower 1930**, **fortified_gate 2055**, **gothic_stone 1706**, **compact_guard 134**, **dark_wizard 1438**. **Gothic** and **Tall** no longer hit the parity **note** (odd **W** matches odd **entranceWidth**).

---

## 9. Build result

| Check | Result |
|-------|--------|
| **`pnpm run build`** | **Passed** (Next.js 16.2.6, Turbopack), including after the **preset + `tryPlaceSymmetricOnAllowed`** supplement. |

---

## 10. Remaining weaknesses / follow-up ideas

- Custom blueprints with **even `W` + odd `entranceWidth`** still validate (parity **note** only); composition stays inherently skewed unless authors change dimensions or door width—or we add an explicit **door horizontal offset** field later.
- **`notes`** when `windowsCountPerSide` is **implicitly reduced** by slot math is still not emitted (silent graceful degradation).
- Rectangular **`W ≠ D`** (if ever added) may need **per-face** allowed spans independent of the square assumption.

---

*Initial milestone entry was overwritten once; later **supplement** (§1, §2, §3, §4 item 8, §7–§10) was merged in place to record preset parity and `tryPlaceSymmetricOnAllowed` updates.*
