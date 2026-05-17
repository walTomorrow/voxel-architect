# Project history screenshots

This folder stores **curated PNG captures** of Voxel Architect at meaningful milestones. Images are embedded in [`../DEVELOPMENT_TIMELINE.md`](../DEVELOPMENT_TIMELINE.md) and indexed here for teammates, instructors, and coding assistants.

There is **no** automated screenshot CI. Captures are taken from **Cloudflare Pages** deployments at the commit indicated in each filename suffix.

---

## Naming convention

```text
{two-digit-order}-{short-subject}-{git-short-sha}.png
```

The trailing **short SHA** is the deployment build the screenshot was taken from (not necessarily the only commit in that release).

Rules:

- Use **lowercase** words and **hyphens** in the descriptive segment.
- Keep the **commit suffix** aligned with the deployed revision when recapturing.

---

## Screenshot inventory

| # | Filename | Route | Commit | What it shows | Why it matters |
|---|----------|-------|--------|---------------|----------------|
| 01 | `01-landing-page-6969ede.png` | `/` (landing) | `6969ede` — Merge PR #1, voxel renderer | The **landing page** on the project’s **first Cloudflare deployment**. | Establishes the initial public entry point before structure tooling matured. |
| 02 | `02-preview-3d-visualization-6969ede.png` | `/preview` | `6969ede` | **Preview** with a **static demonstration build** used to verify **3D rendering** end to end. | Confirmed the viewer pipeline before preset-driven generation became the focus. |
| 03 | `03-visualizer-blueprint-template-6969ede.png` | `/visualizer` | `6969ede` | The **developer lab** (blueprint-driven editor) with a small set of **hardcoded tower templates**—the surface intended for **parameterizing buildings** (including future model-driven edits), not only human developers. | Early **semantic parameter** UI: blueprint fields as the control plane, not block placement. |
| 04 | `04-preview-onion-layers-be8de1d.png` | `/preview` | `be8de1d` — layer inspection + preview presets | **Preview** showing **tower presets**, **onion-layer** inspection (one horizontal layer at a time), **block counts**, and navigation to the developer lab. | First integrated **inspection UX** for reading massing layer by layer. |
| 06 | `06-preview-block-breakdown-f9d4137.png` | `/preview` | `f9d4137` — full structure block breakdown | Preview side panel with **block breakdown** sorted from **highest count to lowest** (also added to the developer lab). | Made material composition **legible** for demos and debugging. |
| 07 | `07-preview-collapsible-sidepanel-65a28f6.png` | `/preview` | `65a28f6` — collapsible side panels | Preview with a **collapsible** inspection side panel. | Improved viewport space for the 3D canvas on smaller layouts. |
| 08 | `08-visualizer-collapsed-sidepanel-65a28f6.png` | `/visualizer` | `65a28f6` | Developer lab with the **blueprint panel collapsed**, featuring the compact **Guard Tower** preset. | Shows **dense presets** and a cleaner canvas-first editing view. |
| 09 | `09-visualizer-blueprint-options-a5b3dce.png` | `/visualizer` | `a5b3dce` | Developer lab on the **Dark Wizard Tower** preset; blueprint sidebar adds **copy JSON** and **import JSON** for tower blueprints. | First **round-trip blueprint exchange** workflow in the lab (tower-only v1 envelope). |
| 10 | `10-preview-partial-blocks-05fbfe8.png` | `/preview` | `05fbfe8` — generic building component pipeline | Preview demonstrating **partial blocks**: fence **posts**, glass **panes**, and **half slabs**. | Validated the **partial-block model** in a full-structure viewer context. |
| 11 | `11-preview-new-generic-preset-05fbfe8.png` | `/preview` | `05fbfe8` | Preview after the pivot to a **component-based generic building** path (alongside towers), replacing the strategy of many **fixed archetype templates** for low-rise structures. | Marks the shift toward **`generic_building`** and composable components as the scalable low-rise architecture. |

**Omitted from the timeline:** `05-visualizer-onion-layers-be8de1d.png` — redundant with preview onion-layer work at the same commit; kept in the folder only as an archival duplicate.

---

## Capture checklist (for future screenshots)

1. **Route** — `/`, `/preview`, or `/visualizer`.
2. **Preset / mode** — tower preset name or Generic / Partials tab.
3. **Deployment** — Cloudflare URL and short commit SHA.
4. **Filename** — next sequence number, subject slug, commit suffix.

---

## Adding a new screenshot

1. Save as `{nn}-{subject}-{sha}.png` in this directory.
2. Add a row to the inventory table above.
3. Embed the image in [`../DEVELOPMENT_TIMELINE.md`](../DEVELOPMENT_TIMELINE.md) in chronological order.
4. Note the capture in root [`CHANGE.md`](../../CHANGE.md) when relevant.

---

## What not to store here

- Raw voxel dumps or full blueprint JSON archives (use git or issues).
- Secrets, API keys, or deployment tokens.
- Unlabeled ad-hoc filenames.
