# Voxel Architect — development timeline

A **visual history** of the product from first Cloudflare deployment through the **generic_building** component pivot. Each step below is the screenshot; captions describe what you are looking at.

For generator architecture today, see [`../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md`](../generation/ARCHITECTURAL_COMPONENT_GRAMMAR.md). Filename index: [`screenshots/README.md`](screenshots/README.md).

---

## 1 — Landing page (first deployment)

<img src="screenshots/01-landing-page-6969ede.png" alt="Landing page on first Cloudflare deployment" width="900" />

The public **landing page** when the project was first deployed to **Cloudflare**.

---

## 2 — Preview: 3D rendering smoke test

<img src="screenshots/02-preview-3d-visualization-6969ede.png" alt="Preview with static demonstration build" width="900" />

**Preview** with a **static demonstration build** to verify that **3D rendering** worked end to end.

---

## 3 — Developer lab: blueprint templates

<img src="screenshots/03-visualizer-blueprint-template-6969ede.png" alt="Developer lab with tower blueprint templates" width="900" />

The **developer lab** (`/visualizer`): blueprint-driven **tower templates**—the surface meant for **parameterizing buildings** (including future model-driven edits), not only hand-tweaking by developers.

---

## 4 — Preview: tower presets and onion layers

<img src="screenshots/04-preview-onion-layers-be8de1d.png" alt="Preview with tower presets and onion layer inspection" width="900" />

**Preview** with **tower presets**, **onion-layer** inspection (one horizontal layer at a time), **block counts**, and a link to the developer lab.

---

## 5 — Preview: block breakdown by material

<img src="screenshots/06-preview-block-breakdown-f9d4137.png" alt="Preview side panel with block breakdown" width="900" />

Preview side panel showing **block breakdown** sorted from **most blocks to fewest** (also added to the developer lab).

---

## 6 — Preview: collapsible side panel

<img src="screenshots/07-preview-collapsible-sidepanel-65a28f6.png" alt="Preview with collapsible side panel" width="900" />

The preview **inspection panel** can be **collapsed** for a larger 3D viewport.

---

## 7 — Developer lab: collapsed panel and Guard Tower

<img src="screenshots/08-visualizer-collapsed-sidepanel-65a28f6.png" alt="Developer lab with collapsed blueprint panel" width="900" />

Developer lab with the **blueprint panel collapsed**, showing the compact **Guard Tower** preset.

---

## 8 — Developer lab: copy and import blueprint JSON

<img src="screenshots/09-visualizer-blueprint-options-a5b3dce.png" alt="Developer lab with blueprint JSON copy and import" width="900" />

Developer lab on the **Dark Wizard Tower** preset; the blueprint sidebar adds **copy JSON** and **import JSON** for tower blueprints.

---

## 9 — Preview: partial blocks

<img src="screenshots/10-preview-partial-blocks-05fbfe8.png" alt="Preview with partial blocks" width="900" />

**Preview** with **partial blocks**: fence **posts**, glass **panes**, and **half slabs**.

---

## 10 — Preview: generic building component pivot

<img src="screenshots/11-preview-new-generic-preset-05fbfe8.png" alt="Preview with generic building preset" width="900" />

**Preview** after pivoting from many **fixed archetype templates** to a **component-based** description of low-rise buildings (`generic_building`)—what the model will eventually edit via blueprint fields.

---

## Architecture milestones (no screenshots)

Short context for changes not tied to a single UI capture:

- **Medieval tower generator** — `MedievalTowerBlueprint` → deterministic `VoxelBlock[]`; still active on `/preview` → Towers and `/visualizer`.
- **Generator reliability** — Vitest hard invariants (26-connectivity, grounding, `maxBlockCount`, valid partial shapes).
- **Blacksmith workshop** — one-off low-rise experiment; **removed**; lessons folded into **generic_building**.
- **Generic component pipeline** — `GenericBuildingBlueprint` → internal `ComponentPlan` → component emitters; see screenshots **9–10** and the grammar doc.

**Current product:** `/preview` → Towers | Generic | Partials; tower-only blueprint JSON exchange in the lab; no AI runtime or InteriorPlan yet.

---

## Maintenance

Add the next screenshot as `screenshots/{nn}-{subject}-{sha}.png`, embed it in this file with the same `<img src="screenshots/…" width="900" />` pattern, and update [`screenshots/README.md`](screenshots/README.md).
