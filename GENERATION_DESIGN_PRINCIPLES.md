# Voxel Architect Generation Design Principles

## Purpose

This document defines the guiding design principles for Voxel Architect’s blueprint, generator, viewer, and future AI-agent behavior.

`docs/blueprints/BLUEPRINT_FEATURE_CATALOG.md` describes **what architectural features the system may understand**.

This document describes **how the system should behave when generating, validating, editing, and presenting architecture**.

The goal is to prevent the project from becoming a collection of random toggles or one-off visual fixes. Every new feature should improve architectural readability, deterministic generation, inspectability, or future AI controllability.

---

# 1. Core Philosophy

Voxel Architect should generate buildings through this chain:

```text
user intent
  → structured blueprint
  → validation and normalization
  → deterministic procedural generation
  → inspectable voxel structure
  → user refinement
```

The AI should eventually operate at the level of **architectural intent**, not raw block placement.

The generator should remain responsible for exact voxel geometry.

---

# 2. Foundational Principles

## 2.1 Architectural readability over feature quantity

A structure should first read clearly as a building.

A small number of well-composed features is better than many poorly arranged features.

Bad:

```text
Add door, windows, crenellations, trim, roof, pillars, and random accents wherever they fit.
```

Good:

```text
Define the building’s massing, entrance hierarchy, window rhythm, roofline, and major supports before adding details.
```

When in doubt, prefer fewer features with stronger composition.

---

## 2.2 Valid geometry is necessary but not sufficient

A structure can be technically valid and still look wrong.

Validation should eventually care about both:

```text
structural validity:
- no floating blocks
- no duplicate voxels
- block count under limit
- dimensions are legal

architectural validity:
- entrance is readable
- openings respect facade rhythm
- symmetry is intentional
- roofline is coherent
- features do not fight each other
```

The generator should not stop at “all blocks are attached.” It should aim for “this looks intentionally designed.”

---

## 2.3 Entrances define facade hierarchy

The main entrance is usually the strongest orientation cue.

For any facade with an entrance:

- reserve a portal zone
- center or intentionally offset the entrance
- keep nearby windows from crowding the doorway
- frame the entrance when style allows
- make the entrance readable from the default camera

The front facade should be composed around the entrance, not treated as a generic wall face.

---

## 2.4 Symmetry must be explicit

If a blueprint asks for symmetry, the generator should implement real symmetry, not accidental repeated rules.

For example:

```text
Bad:
place windows using modulo arithmetic and hope they look balanced

Good:
choose mirrored window bays from the facade centerline outward
```

Symmetry should be considered for:

- footprint
- entrance placement
- window bays
- roofline
- corner treatments
- towers or paired volumes
- decorative features

If symmetry cannot be achieved, the generator should degrade gracefully or validation should report a note.

---

## 2.5 Facades should be composed in zones

A facade should not be treated as a flat grid where every feature competes for cells.

Instead, generators should think in zones:

```text
left margin
left bay
central portal zone
right bay
right margin
top band
base band
corner zones
```

This allows doors, windows, trim, and supports to coexist.

For example, a front facade with a central entrance should reserve a larger vertical portal zone, then place windows around that zone.

---

## 2.6 Openings must respect structure and rhythm

Windows, doors, arches, and gates should not be placed just because a cell is available.

Openings should respect:

- wall thickness
- corner supports
- entrance zones
- vertical floor rhythm
- facade symmetry
- minimum spacing
- style-specific proportions
- nearby trim and frames

If a requested number of windows does not fit, the generator should place fewer readable windows rather than forcing broken placement.

---

## 2.7 Massing before detail

The generator should establish large architectural decisions before small ones.

Recommended generation order:

```text
1. footprint and foundation
2. primary massing
3. wall shell / structural system
4. levels and floors
5. major openings
6. roof / crown
7. facade articulation
8. ornament and details
9. validation / cleanup
```

Details should reinforce the massing, not obscure it.

---

## 2.8 Scale should change behavior

The same feature should not behave identically at every size.

Small buildings need simpler details.

Large buildings can support more rhythm, hierarchy, and repetition.

Examples:

```text
small tower:
- fewer windows
- simpler entrance
- thinner trim
- compact roofline

large tower:
- stronger portal
- repeated window bays
- horizontal bands
- clearer vertical zones
- larger roof/crown treatment
```

Generators should simplify automatically when scale is too small.

---

## 2.9 Graceful simplification over broken detail

When a requested feature does not fit, the system should simplify.

Examples:

- reduce window count instead of creating uneven windows
- use a simple door instead of a malformed arch
- omit crenellations instead of floating merlons
- reduce roof overhang instead of unsupported blocks
- remove trim before removing structural features

The system should prefer a simpler valid design over a complex broken one.

---

## 2.10 Materials should clarify structure

Materials are not just colors. They should communicate architectural roles.

Typical material roles:

- wall
- foundation
- roof
- floor
- trim
- accent
- door
- window
- structural support
- ornament

Avoid material noise. A building should usually have a clear primary material, one roof material, and one or two accent materials.

---

# 3. Blueprint Principles

## 3.1 Blueprints describe intent, not blocks

Blueprints should describe architectural decisions:

```ts
{
  structureType: "medieval_tower",
  massing: {
    verticalEmphasis: "tall",
    wallThickness: 2
  },
  openings: {
    entranceStyle: "arched",
    windowsPlacement: "symmetric"
  },
  roof: {
    style: "stepped_pyramid"
  }
}
```

Blueprints should not directly list every voxel.

Raw block placement belongs to the generator.

---

## 3.2 Schema fields should have architectural meaning

Do not add a field unless it has a clear design purpose.

Good fields:

```text
wallThickness
verticalEmphasis
windowsCountPerSide
entranceStyle
roofHeight
crenellations
```

Weak fields:

```text
randomDetailAmount
extraBlocks
decorationToggle1
weirdOffset
```

Every field should eventually map to:

```text
architectural concept
  → validation rule
  → generator behavior
  → visual effect
```

---

## 3.3 Avoid random toggle accumulation

A feature should not be added only because it looks cool.

Before adding a feature, answer:

1. What architectural role does it serve?
2. What blueprint field controls it?
3. What validation rules does it require?
4. How does the generator place it deterministically?
5. What presets or tests exercise it?
6. What can go wrong visually?

---

## 3.4 Prefer structured feature families

Features should be grouped by architectural system:

```text
massing
structure
levels
openings
roof
facade
ornament
materials
constraints
metadata
```

This keeps the schema understandable to both humans and future AI agents.

---

# 4. Generator Principles

## 4.1 Generators should be deterministic

Given the same validated blueprint, the generator should produce the same voxel structure every time.

Avoid:

- randomness
- time-based behavior
- nondeterministic ordering
- hidden global state

If variety is needed later, it should come from an explicit seed in the blueprint.

---

## 4.2 Validate before generating

Generation should use validated and resolved blueprint data whenever possible.

The flow should remain:

```text
raw blueprint
  → validateBlueprint()
  → resolved blueprint
  → generateStructureFromResolved()
```

Generators should not be responsible for guessing how to repair every invalid input.

---

## 4.3 Prefer architectural passes over cell-by-cell improvisation

Generation should use clear passes:

```text
foundation pass
wall pass
floor pass
opening pass
roof pass
trim pass
ornament pass
cleanup pass
```

This makes the system easier to debug and easier for future AI agents to reason about.

---

## 4.4 Merge priority must reflect architectural intent

When multiple features want the same voxel position, priority should be intentional.

Example priority logic:

```text
door/window openings override wall
trim frames openings
roof overrides upper wall where appropriate
crenellations sit above parapet
structural support should not be erased by decoration
```

Merge priority should not be accidental.

---

## 4.5 Generated blocks should eventually carry semantic metadata

Future selection and localized regeneration will require blocks to carry meaning.

Eventually, generated blocks or a parallel metadata map should include:

```ts
{
  role: "window_glass",
  region: "front_facade",
  sourceFeature: "openings.windows",
  level: 4
}
```

This will allow users to select a section and ask:

```text
Make these windows taller.
Make this roof more gothic.
Replace this facade with darker stone.
```

The AI should then edit blueprint intent, not arbitrary blocks.

---

## 4.6 Localized regeneration should preserve global coherence

When future AI edits a selected region, it should not break the rest of the building.

A localized edit should know:

- selected region
- source feature
- nearby dependencies
- symmetry relationships
- structural constraints
- whether the edit affects the whole blueprint or only a subregion

For example, editing one side’s windows may require updating the opposite side if symmetry is enabled.

---

# 5. Viewer and Interaction Principles

## 5.1 The viewer is for inspecting generated architecture

The viewer should help users understand the generated structure.

Priority viewer tools:

```text
orbit and zoom
refit camera
layer/onion view
preset selection
validation feedback
eventually semantic selection
```

Avoid turning the viewer into a game controller too early.

---

## 5.2 Orbit plus onion layers before fly mode

Default interaction should remain orbit-based.

WASD/fly mode is not needed until there are meaningful interiors or large environments.

Preferred sequence:

```text
1. orbit/zoom/refit
2. layer/onion viewer
3. semantic selection
4. optional fly mode much later, if needed
```

Layer/onion view is especially important because it matches the construction model:

```text
show all blocks up to layer N
```

---

## 5.3 Inspection tools should support debugging and explanation

The developer lab should make the system understandable.

Useful inspection tools:

- selected preset
- resolved blueprint summary
- validation issues
- block count
- layer slider
- current visible layer
- future role/region metadata display
- camera refit

These tools are not polish; they are part of making the generator explainable.

---

# 6. AI Agent Principles

## 6.1 AI should edit blueprints, not raw voxels

The AI should produce structured blueprint changes.

Good:

```json
{
  "roof": {
    "style": "spire",
    "height": 10
  },
  "features": {
    "crenellations": false
  }
}
```

Bad:

```json
[
  { "x": 1, "y": 2, "z": 3, "blockType": "stone" },
  { "x": 1, "y": 3, "z": 3, "blockType": "stone" }
]
```

Raw voxel editing should remain a generator responsibility.

---

## 6.2 AI output must be validated

Every AI-proposed blueprint or edit must go through validation before generation.

The AI should not bypass:

- schema checks
- material checks
- dimension checks
- block count checks
- grounded structure checks
- feature compatibility rules

---

## 6.3 AI should explain design intent

AI-generated changes should eventually include a short rationale.

Example:

```text
I increased the tower height, switched the roof to a spire, and reduced crenellations because the user asked for a more gothic silhouette.
```

This helps users understand why the building changed.

---

## 6.4 AI should support accept/reject workflows

For significant changes, especially selected-region regeneration, the user should be able to preview and accept or reject the result.

Preferred flow:

```text
user request
  → AI proposes blueprint edit
  → validation
  → preview
  → user accepts or rejects
```

---

## 6.5 AI should respect existing structure unless asked otherwise

If a user asks to edit a selected section, the AI should preserve unrelated parts of the building.

Example:

```text
Selected: roof
Request: make it more dramatic

AI should edit:
- roof style
- roof height
- crown details

AI should not unexpectedly change:
- wall material
- entrance side
- tower footprint
- window count
```

---

# 7. Facade Composition Rules

These rules should guide near-term generator improvements.

## 7.1 Front facade rule

If a facade contains the main entrance, it should be treated as a special composition surface.

The generator should reserve a portal zone:

```text
portal zone:
- entrance aperture
- door material
- side jambs
- lintel or arch
- optional vertical clearance above the door
```

Window placement should avoid this portal zone unless intentionally designed.

---

## 7.2 Door parity rule

Door width should visually align with facade width.

Recommended default:

```text
odd facade width  → odd door width
even facade width → even door width
```

If the requested width has awkward parity, validation or generation should either adjust it or warn.

---

## 7.3 Window bay rule

Windows should be selected from valid facade bays.

A valid bay should avoid:

- corners
- corner pillars
- door aperture
- portal zone
- unsupported wall cells
- overly tight spacing

Symmetric placement should choose bays from the center outward.

---

## 7.4 Vertical rhythm rule

Windows should form readable vertical or horizontal rhythm.

Avoid:

- windows shifting left/right between floors without reason
- isolated accidental windows
- windows that collide with doors
- windows so dense they look like damage

---

## 7.5 Trim supports hierarchy

Trim should clarify important elements.

Priority:

```text
1. entrance frame
2. window frame
3. base band
4. floor bands
5. roof/crown band
6. decorative accents
```

Trim should not overwhelm the wall or hide the building’s massing.

---

# 8. Preset Principles

## 8.1 Presets are regression examples

Hand-authored presets are not just demos. They are regression cases.

Each preset should test something:

- scale
- vertical emphasis
- entrance size
- window rhythm
- material contrast
- roof behavior
- battlements
- wall thickness
- validation limits

---

## 8.2 Presets should reveal generator weaknesses

If a preset looks bad, do not immediately delete it.

First ask:

```text
Is the preset bad, or is the generator exposing a real weakness?
```

Presets are valuable because they reveal where the generator needs architectural rules.

---

## 8.3 Presets should remain editable

Loading a preset should not lock the blueprint.

The developer lab should allow:

```text
load preset
edit fields
validate
regenerate
reset/reload preset
```

---

# 9. Testing Principles

## 9.1 Visual QA is part of testing

Voxel architecture requires visual inspection.

Build success is not enough.

For each major generator change, inspect:

- default preset
- smallest preset
- tallest preset
- widest preset
- densest-window preset
- stepped roof with crenellations
- unusual material preset

---

## 9.2 Important visual failures should become regression checks

When a visual bug is fixed, add it to manual or automated checks.

Examples:

- no floating battlements
- windows align vertically
- front facade entrance is centered/readable
- large towers can be zoomed out
- camera can inspect foundation
- reset camera works

---

## 9.3 Block counts are useful but not sufficient

Block counts can catch major changes, but identical counts can still look different.

Use block counts as rough regression signals, not proof of visual correctness.

---

# 10. Near-Term Implications

Based on these principles, the next project goals should be:

```text
1. Finish current window/camera fixes.
2. Add this design principles document.
3. Plan facade composition improvements, especially:
   - portal zone
   - door parity
   - front facade window exclusion
   - facade hierarchy
4. Add layer/onion viewer.
5. Add semantic block metadata planning.
6. Add blueprint JSON import/export.
7. Add tests and regression checks.
8. Later: selected-region editing.
9. Later: AI prompt-to-blueprint generation and localized AI regeneration.
```

The most immediate architectural problem is no longer basic block validity. It is facade composition.

The next generator improvements should therefore focus on:

```text
front facade hierarchy
entrance symmetry
window bay placement around entrances
style-aware proportions
graceful simplification
```

---

# 11. Maintenance Rules

Update this document when:

- a recurring visual issue reveals a missing design principle
- a new structure type is added
- AI editing behavior is introduced
- selection or localized regeneration is implemented
- validation expands beyond geometry into architectural quality
- project priorities change

This document should guide Cursor prompts, generator changes, and future AI-agent behavior.