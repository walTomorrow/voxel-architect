# Voxel Architect Blueprint Feature Catalog

## Purpose

This document defines a structured architectural feature catalog for **Voxel Architect**.

Voxel Architect should not treat building generation as a random collection of toggles such as:

```ts
features: {
  crenellations: true;
  cornerPillars: true;
  roofStyle: "stepped_pyramid";
}
```

Instead, the project should evolve toward a coherent architectural grammar:

```text
User intent
  → structured architectural blueprint
  → validation and normalization
  → deterministic generator rules
  → voxel blocks
  → renderer
```

The purpose of this catalog is to help future schema, generator, and AI work stay organized.

This is **not** intended to be an exhaustive encyclopedia of architecture. It is a living implementation taxonomy for a voxel architecture system.

---

## Core Principle

The blueprint should describe **architectural intent and constraints**.

The generator should produce **valid voxel geometry**.

The AI, when added later, should choose and modify blueprint fields. It should not place blocks individually.

```text
AI / user:
"Make a tall fortified gothic tower with narrow blue windows."

Blueprint:
structure type, massing, materials, openings, roof, facade, defensive features

Generator:
places walls, floors, roof layers, windows, door, supports, trim, crenellations

Renderer:
displays the voxel structure
```

---

## Responsibility split: blueprint, generator, voxels, AI

### Blueprints = semantic intent (not voxel grids)

A **blueprint** is **structured architectural intent and constraints**: building family, dimensions, semantic materials (classic-pack keys), massing, roof/crown, entrance and window parameters, features (e.g. crenellations), and global constraints (`maxBlockCount`, grounding, symmetry). Blueprints may someday describe **interior layout intent** (rooms, circulation, zones)—see **Future floor plans** below.

Blueprints are **not**:

- Raw **`VoxelBlock[]`** coordinates or block-by-block placement scripts  
- Minecraft schematics or arbitrary voxel dumps  
- Implicit “whatever the generator did last time” without a serialized authoring state  

### Generators = deterministic realization

**Generators** turn a **validated** blueprint (and resolved registry ids) into an inspectable **`VoxelBlock[]`**. They own exact lattice placement, merge/priority rules, **duplicate-cell prevention**, shell vs void carving where supported, openings, façade/roof/crown detail, **partial-block realization** (e.g. glass **pane** windows when material metadata allows), **`maxBlockCount`** compliance, and output checks exercised by automated tests. Validation occurs **before** generation; reliability tests additionally stress geometric and placement-semantics invariants.

### AI boundary

**Good AI (and human) outputs** operate on **blueprint-level intent**, for example:

- “Gothic tower, narrow glass windows, limestone accents.”  
- “Add a forge room and a storage zone upstairs.” (future, when interior schema exists)  
- “Stone walls, slate roof, oak trim; interior explorable with a central stair.” (future)  

**Poor primary outputs** for this system:

- Raw **`{ x, y, z, blockTypeId, … }`** streams as the main authoring path  
- Per-block placement commands without a structured blueprint  

The generator—not the AI—should remain the source of **exact** voxel geometry for deterministic, testable builds.

### Future floor plans and interior layouts (not implemented yet)

**Floor plans are blueprint-level semantic constraints.** **Floor-plan realization is generator-level deterministic geometry.** A future blueprint layer might describe, among other things:

- Floors / stories as organizational bands  
- Rooms, zones, and purposes (forge, storage, barracks, etc.)  
- Circulation (stairs, ladders, corridors) and door connections  
- Window/opening **intent** tied to rooms  
- Furniture/object **zones** or lightweight placement hints  
- Walkable regions  

The generator would then realize those into hollow interiors, partitions, doorways, stairs, placed props where supported, collision checks, reachability/walkability checks, and **`maxBlockCount`-safe** **`VoxelBlock[]`** output—including partial shapes where the block system allows.

**Today:** no **`floorPlan`**, **`interiorLayout`**, **`room`**, or furniture schema exists in code; **do not treat this catalog section as a specification to implement without a dedicated milestone.** Early work might prototype **deterministic layout templates** before exposing a full editable floor-plan schema. **AI-created floor plans are acceptable only as structured blueprint intent**, never as authoritative raw voxel output.

### Why interiors matter for demos

Explorable interiors need intentional **voids**, **rooms**, **openings**, **circulation**, and eventually **object placement**. Floor-plan-aware blueprints are how buildings become **usable volumes** rather than solid exterior masses—without replacing the generator’s role in realizing geometry.

### Current pipeline reality

The shipped **medieval tower** path is still primarily **exterior mass, shell, openings, roof/crown, and detail generation**. Hollow shells and thin interior floors exist in limited form; there is **no full interior layout or room system** yet. Partial blocks today include **cube / slab / pane / post**; the medieval generator emits **pane** windows when the resolved window material allows **pane**.

---

## What This Catalog Is For

This catalog should help answer:

1. What architectural systems should the blueprint understand?
2. Which features are universal across many structures?
3. Which features are specific to certain building types?
4. What dependencies and conflicts should validation catch?
5. How should a deterministic voxel generator approximate each feature?
6. Which features belong in near-term milestones?
7. Which features should be reserved for later or for AI-facing design richness?

---

## What This Catalog Is Not

This document is not:

- A complete architectural history reference
- A perfect taxonomy of all world architecture
- A guarantee that every feature will be implemented
- A public user-facing feature list
- A replacement for design judgment
- A prompt for an LLM to generate raw voxel blocks

---

## Confidence and Status Labels

Each feature can be tracked with two labels.

### Confidence

| Label | Meaning |
|---|---|
| High | Common architectural concept and easy to approximate in voxels. |
| Medium | Recognizable concept, but generator design requires judgment. |
| Low | Complex, style-specific, culturally specific, or hard to approximate cleanly. |

### Implementation Status

| Label | Meaning |
|---|---|
| Supported now | Exists in the current schema or generator. |
| Near-term | Good candidate for upcoming implementation. |
| Later | Useful, but not needed yet. |
| Research | Needs reference images, architectural research, or careful design. |
| Avoid for now | Too complex, too ambiguous, or likely to cause scope creep. |

---

# 1. Architectural Systems

The blueprint should be organized around architectural systems, not isolated toggles.

---

## 1.1 Structure Identity

Describes what kind of building is being generated.

Examples:

- Medieval tower
- Small house
- Castle gatehouse
- Bridge
- Chapel
- Cathedral
- Fortress wall
- Watchtower
- Keep
- Courtyard building

Primary questions:

- What generator should handle this blueprint?
- What architectural grammar applies?
- What features are allowed or expected?

Potential schema area:

```ts
structure: {
  type: "medieval_tower" | "small_house" | "gatehouse" | "bridge" | "chapel";
  style?: "medieval" | "gothic" | "rustic" | "fantasy" | "fortress" | "modern";
  scale?: "small" | "medium" | "large" | "monumental";
}
```

---

## 1.2 Massing

Massing describes the overall volume before details are added.

Examples:

- Square tower
- Rectangular house
- Long hall
- Cross-shaped cathedral
- Twin-tower gatehouse
- Bridge span
- L-shaped building
- Central tower plus annex

Primary questions:

- What is the footprint?
- Is the structure tall, squat, balanced, or monumental?
- Is it symmetrical?
- Is there one main volume or multiple masses?
- Is the interior hollow?

Potential schema area:

```ts
massing: {
  footprint: "square" | "rectangular" | "circularish" | "cross" | "l_shape";
  proportions: "squat" | "balanced" | "slender" | "monumental";
  symmetry: "none" | "bilateral" | "radial";
  hollowInterior: boolean;
  wallThickness: number;
}
```

---

## 1.3 Structural System

Describes the parts that make the building feel supported and buildable.

Examples:

- Foundation
- Walls
- Floors
- Columns
- Pillars
- Corner supports
- Buttresses
- Arches
- Beams
- Piers
- Retaining walls
- Bridge supports

Primary questions:

- What holds the structure up?
- Are walls thick enough?
- Are blocks grounded?
- Do openings weaken the walls too much?
- Are supports visually and logically placed?

Potential schema area:

```ts
structureSystem: {
  foundation: "none" | "slab" | "raised_plinth";
  cornerSupports: "none" | "pillars" | "quoins";
  wallSystem: "solid" | "hollow_shell" | "pier_and_wall";
  supports?: "none" | "buttresses" | "columns";
}
```

---

## 1.4 Levels and Vertical Organization

Describes how the building is divided vertically.

Examples:

- Floors
- Stories
- Floor height
- Tower body
- Roof body
- Basement
- Raised entry
- Observation level
- Attic
- Belfry

Primary questions:

- How many levels exist?
- How tall is each level?
- Where do windows align?
- Where do floors appear?
- Does the roof occupy part of the height?

Potential schema area:

```ts
levels: {
  floorCount: number;
  floorHeight?: number;
  includeInteriorFloors: boolean;
  verticalZones?: Array<"base" | "body" | "crown" | "roof">;
}
```

---

## 1.5 Openings

Openings include doors, windows, gates, and other intentional holes in the shell.

Examples:

- Simple door
- Arched door
- Recessed portal
- Double door
- Gate opening
- Narrow slit window
- Arched window
- Rose window
- Clerestory window
- Balcony opening
- Skylight

Primary questions:

- Where do openings belong?
- How large are they?
- Are they aligned with floors?
- Are they framed?
- Do they preserve wall integrity?
- Do they avoid corners and supports?

Potential schema area:

```ts
openings: {
  entrance: EntranceSpec;
  windows: WindowSpec;
  gates?: GateSpec;
}
```

---

## 1.6 Roof System

Describes how the building terminates at the top.

Examples:

- Flat roof
- Pitched roof
- Gabled roof
- Hipped roof
- Conical roof
- Stepped pyramid roof
- Spire
- Dome
- Parapet roof
- Battlement roofline

Primary questions:

- What is the roof shape?
- How tall is it?
- Does it overhang?
- Is it solid, hollow, stepped, or capped?
- Does it conflict with battlements or spires?

Potential schema area:

```ts
roof: {
  type: "flat" | "pitched" | "gabled" | "hipped" | "conical" | "stepped_pyramid" | "spire";
  height: number;
  overhang: number;
  cap?: "none" | "flat_cap" | "spire_tip";
}
```

---

## 1.7 Facade Articulation

Facade articulation describes how walls are visually organized.

Examples:

- Trim bands
- Base band
- Cornice
- Sill
- Lintel
- Window frame
- Door frame
- Recessed panels
- Vertical strips
- Pilasters
- Corner quoins
- Material bands

Primary questions:

- Does the wall look flat or articulated?
- Are openings visually framed?
- Are levels readable?
- Are corners emphasized?
- Is the facade rhythm clear?

Potential schema area:

```ts
facade: {
  baseBand: boolean;
  horizontalBands?: "none" | "floor_lines" | "top_and_base";
  verticalAccents?: "none" | "corners" | "regular_bays";
  openingFrames: boolean;
  materialVariation?: "none" | "bands" | "accents";
}
```

---

## 1.8 Circulation

Circulation describes movement through or around the structure.

This is mostly future work.

Examples:

- Stairs
- Ladders
- Ramps
- Corridors
- Bridges
- Balconies
- Walkways
- Wall walks
- Spiral stairs
- Trapdoors

Primary questions:

- Can a person move through the structure?
- How are levels connected?
- Does the interior make sense?
- Are there cutaway or layer views?

Potential schema area:

```ts
circulation: {
  verticalAccess?: "none" | "ladder" | "stairs" | "spiral_stair";
  walkways?: boolean;
  balconies?: boolean;
}
```

---

## 1.9 Ornament and Identity Features

Ornament gives the structure a recognizable style.

Examples:

- Crenellations
- Merlons
- Battlements
- Spires
- Finials
- Banners
- Statues
- Tracery
- Rose windows
- Chimneys
- Dormers
- Lanterns
- Weather vanes

Primary questions:

- What makes the structure recognizable?
- Does the ornament match the building type?
- Is the feature supported physically?
- Does it create too much block noise?

Potential schema area:

```ts
ornament: {
  defensive?: DefensiveFeatureSpec;
  gothic?: GothicFeatureSpec;
  domestic?: DomesticFeatureSpec;
}
```

---

## 1.10 Materials

Materials describe semantic block types, not raw colors.

Examples:

- Wall material
- Foundation material
- Accent material
- Trim material
- Roof material
- Floor material
- Window material
- Door material
- Decorative material

Primary questions:

- What material conveys the main structure?
- What material conveys trim or support?
- What materials should be transparent?
- Are materials valid block types?
- Are material choices style-appropriate?

Potential schema area:

```ts
materials: {
  wall: BlockType;
  foundation?: BlockType;
  floor: BlockType;
  roof: BlockType;
  window: BlockType;
  door: BlockType;
  accent: BlockType;
  trim?: BlockType;
}
```

---

## 1.11 Constraints

Constraints keep the design valid and controllable.

Examples:

- Max block count
- Bounding box
- Minimum interior space
- Require grounded structure
- Enforce symmetry
- Allow overhangs
- Simplify at small sizes
- Avoid floating blocks
- Avoid duplicate voxels

Primary questions:

- Does the structure fit?
- Is the block count reasonable?
- Are openings valid?
- Are decorative features supported?
- Can the generator simplify safely?

Potential schema area:

```ts
constraints: {
  maxBlockCount?: number;
  requireGroundedStructure: boolean;
  allowFloatingBlocks: boolean;
  enforceSymmetry: boolean;
  minInteriorWidth?: number;
  simplificationLevel?: "low" | "medium" | "high";
}
```

---

# 2. Feature Definition Template

Every major feature should eventually be described using this template.

```md
## Feature: [Name]

System:
[Architectural system: openings, roof, facade, structure, ornament, etc.]

Purpose:
[What role does this feature play architecturally or visually?]

Applies to:
[Which structure types can use it?]

Inputs:
[Blueprint fields needed to configure it.]

Dependencies:
[What must exist for this feature to be valid?]

Conflicts:
[What features or conditions make this invalid or awkward?]

Validation rules:
[Rules validateBlueprint should enforce or simplify.]

Voxel generation strategy:
[How deterministic code should approximate this feature.]

Aesthetic goal:
[What should the user visually recognize?]

Implementation status:
[Supported now / Near-term / Later / Research / Avoid for now]

Confidence:
[High / Medium / Low]
```

---

# 3. Universal Feature Families

These features can apply across many building types.

---

## 3.1 Dimensions and Bounding Box

System:
Massing / constraints

Purpose:
Defines the maximum space the structure can occupy.

Applies to:
All structures.

Inputs:

- Width
- Length or depth
- Height
- Optional maximum block count

Dependencies:
None.

Conflicts:

- Very small dimensions conflict with complex features.
- Large dimensions may exceed block count or performance limits.

Validation rules:

- Dimensions must be positive integers.
- Minimum dimensions depend on structure type.
- Height must leave space for body and roof.
- Width and depth must support wall thickness and openings.

Voxel generation strategy:
All generated features must fit within or intentionally extend from the bounding box.

Aesthetic goal:
The structure should honor requested scale and proportions.

Implementation status:
Supported now.

Confidence:
High.

---

## 3.2 Footprint

System:
Massing

Purpose:
Defines the plan shape of the building.

Applies to:
All structures.

Common values:

- Square
- Rectangular
- Circular-ish
- Cross-shaped
- L-shaped
- Linear/span

Dependencies:

- Dimensions
- Structure type

Conflicts:

- Circular-ish footprints are harder in low resolution.
- Cross-shaped footprints require enough width and depth.
- Bridges require span logic rather than enclosed massing.

Validation rules:

- Footprint must be compatible with structure type.
- Minimum size varies by footprint.
- Symmetry rules should match footprint.

Voxel generation strategy:
Compute a footprint mask over x/z coordinates. Shell, floors, openings, and roof rules reference this mask.

Aesthetic goal:
The building should have a recognizable overall plan.

Implementation status:
Square and rectangular are near-supported; others later.

Confidence:
High.

---

## 3.3 Wall Thickness

System:
Structure

Purpose:
Controls structural mass, interior space, and visual weight.

Applies to:
Most enclosed structures.

Inputs:

- Wall thickness
- Hollow interior

Dependencies:

- Dimensions
- Footprint

Conflicts:

- Small buildings with thick walls may have no interior.
- Large openings may conflict with thick walls.

Validation rules:

- Wall thickness must leave minimum interior void if hollow.
- Openings must cut through the wall thickness.
- Supports should not be overwritten by windows.

Voxel generation strategy:
Generate shell cells based on distance from footprint boundary.

Aesthetic goal:
Walls should feel substantial but not fill the whole building.

Implementation status:
Supported now for medieval tower.

Confidence:
High.

---

## 3.4 Foundation / Base

System:
Structure / massing

Purpose:
Grounds the building visually and structurally.

Applies to:
Most structures.

Common values:

- None
- Slab
- Raised plinth
- Stepped base
- Pier foundation

Dependencies:

- Footprint
- Material

Conflicts:

- Bridges may need piers instead of slab.
- Floating/fantasy structures are out of scope for now.

Validation rules:

- Base should be at or below y = 0.
- Must support all major vertical loads.
- Should not exceed footprint unless overhang is allowed.

Voxel generation strategy:
Place a ground-level slab, plinth, or support pattern under the footprint.

Aesthetic goal:
The structure should look grounded.

Implementation status:
Supported now as simple foundation.

Confidence:
High.

---

## 3.5 Floors / Levels

System:
Levels

Purpose:
Divides vertical space and aligns features like windows.

Applies to:
Towers, houses, gatehouses, keeps, chapels, cathedrals.

Inputs:

- Floor count
- Floor height
- Include interior floors

Dependencies:

- Body height
- Hollow interior
- Wall thickness

Conflicts:

- Too many floors for height.
- Floors may block windows or doors if not coordinated.

Validation rules:

- Floor count must fit body height.
- Floor slabs should not block entrance aperture.
- Floor positions should align with window rules.

Voxel generation strategy:
Place slabs at deterministic y levels inside the shell.

Aesthetic goal:
Windows and horizontal trim should reveal a readable story rhythm.

Implementation status:
Supported now, but visibility is limited.

Confidence:
High.

---

## 3.6 Entrance

System:
Openings

Purpose:
Provides the primary access point and front orientation.

Applies to:
Most structures.

Common values:

- Simple door
- Arched door
- Double door
- Recessed portal
- Gate opening
- Portcullis gate

Inputs:

- Side
- Width
- Height
- Style
- Material
- Frame material

Dependencies:

- Wall shell
- Ground/foundation
- Enough facade width
- Wall thickness

Conflicts:

- Too-small facade
- Corner supports
- Low body height
- Windows occupying same cells

Validation rules:

- Entrance must be on an exterior face.
- Entrance must reach ground or a valid step/platform.
- Entrance width must fit between corners/supports.
- Arched styles require minimum height.

Voxel generation strategy:
Leave aperture in wall shell, then add door material, threshold, jambs, lintel, arch, or gate elements.

Aesthetic goal:
The entrance should be readable from the default camera.

Implementation status:
Supported now, needs refinement.

Confidence:
High.

---

## 3.7 Windows

System:
Openings / facade

Purpose:
Adds scale, rhythm, light, and style.

Applies to:
Most structures.

Common values:

- Small square window
- Narrow slit window
- Vertical window
- Arched window
- Rose window
- Clerestory window
- Balcony window
- Stained glass

Inputs:

- Style
- Placement
- Floors/bands
- Count per side
- Height
- Width
- Frame material
- Glass material

Dependencies:

- Wall shell
- Floor levels
- Enough wall area
- Material support for transparent blocks

Conflicts:

- Corners
- Door aperture
- Structural supports
- Very small walls

Validation rules:

- Windows should avoid corners unless intended.
- Windows should not overwrite doors.
- Windows should align by floor or facade rhythm.
- Window sizes should fit wall dimensions.

Voxel generation strategy:
Replace selected shell cells with window material and optionally add sill, lintel, jambs, or frames.

Aesthetic goal:
Windows should read as intentional openings, not random holes.

Implementation status:
Supported now, needs richer placement.

Confidence:
High.

---

## 3.8 Roof

System:
Roof

Purpose:
Terminates the building and strongly defines silhouette.

Applies to:
Most structures.

Common values:

- Flat
- Pitched
- Gabled
- Hipped
- Conical
- Stepped pyramid
- Spire
- Dome
- Parapet roof

Inputs:

- Type
- Height
- Overhang
- Material
- Cap
- Pitch/stepping

Dependencies:

- Footprint
- Body height
- Wall support

Conflicts:

- Crenellations may conflict with steep roofs.
- Overhangs may violate grounded constraints.
- Domes are hard at low voxel resolution.

Validation rules:

- Roof must fit within height budget.
- Roof should be supported.
- Roof style must be compatible with footprint.
- Overhang should be clamped or supported.

Voxel generation strategy:
Generate layers above body based on footprint shrink/expand rules.

Aesthetic goal:
The roof should make the building type recognizable.

Implementation status:
Flat and stepped pyramid supported now.

Confidence:
High.

---

## 3.9 Parapet

System:
Roofline / structure / defensive

Purpose:
Creates a low protective wall at the roof edge.

Applies to:
Towers, gatehouses, fortress walls, flat-roofed buildings.

Inputs:

- Enabled
- Height
- Material
- Placement
- Thickness

Dependencies:

- Flat roof or supported roof edge
- Wall top
- Enough perimeter space

Conflicts:

- Steep roofs
- Spires unless adapted

Validation rules:

- Parapet must be supported.
- Must not float above missing roof/wall cells.
- Should preserve access/walkway if circulation is modeled.

Voxel generation strategy:
Place a supported ring along the roof or wall perimeter.

Aesthetic goal:
The roofline should look fortified or enclosed.

Implementation status:
Supported now for tower battlements.

Confidence:
High.

---

## 3.10 Crenellations / Battlements

System:
Roofline / defensive ornament

Purpose:
Creates a recognizable medieval defensive silhouette.

Applies to:
Towers, gatehouses, fortress walls, keeps.

Inputs:

- Enabled
- Spacing
- Merlon height
- Include corners
- Material

Dependencies:

- Parapet or wall top
- Supported roofline
- Enough perimeter length

Conflicts:

- Steep roofs
- Very small structures
- Delicate spires

Validation rules:

- Merlons must sit directly on supported parapet or wall cells.
- Alternating pattern must fit footprint.
- No floating blocks.

Voxel generation strategy:
Place parapet ring, then alternating raised merlons on supported cells.

Aesthetic goal:
The top should read as battlements, not random rim noise.

Implementation status:
Supported now, recently fixed for floating blocks.

Confidence:
High.

---

## 3.11 Corner Treatment

System:
Facade / structure

Purpose:
Emphasizes corners and gives the structure visual strength.

Applies to:
Towers, houses, gatehouses, keeps, chapels.

Common values:

- None
- Corner pillars
- Quoins
- Buttressed corners
- Corner turrets

Inputs:

- Style
- Material
- Width
- Height
- Capstone

Dependencies:

- Footprint
- Wall shell
- Enough size

Conflicts:

- Windows at corners
- Highly irregular footprints

Validation rules:

- Corners should not be overwritten by windows.
- Corner elements should be supported.
- Should not consume too much interior space.

Voxel generation strategy:
Place vertical accent/support blocks at footprint corners, optionally with caps.

Aesthetic goal:
The silhouette should feel anchored.

Implementation status:
Corner pillars supported now.

Confidence:
High.

---

## 3.12 Facade Trim

System:
Facade articulation

Purpose:
Makes flat voxel walls more readable.

Applies to:
Most structures.

Common values:

- Base band
- Top band
- Floor bands
- Window frames
- Door frames
- Vertical strips
- Corner quoins
- Cornice

Inputs:

- Style
- Material
- Placement
- Frequency
- Thickness

Dependencies:

- Wall shell
- Facade face
- Enough surface area

Conflicts:

- Excessive trim can create visual noise.
- Trim may overlap windows/doors.

Validation rules:

- Trim should not block openings.
- Trim must remain supported or attached.
- Trim density should scale with building size.

Voxel generation strategy:
Add or replace shell-adjacent blocks using priority rules.

Aesthetic goal:
Walls should show hierarchy: base, body, crown, openings.

Implementation status:
Partially supported through accents.

Confidence:
High.

---

# 4. Structure-Specific Feature Sets

These are not exhaustive. They define practical subsets for generator modules.

---

## 4.1 Medieval Tower

Purpose:
A vertical fortified structure with readable medieval/fantasy identity.

Core systems:

- Square or circular-ish footprint
- Thick hollow shell
- Foundation/base
- Floors
- Front entrance
- Narrow windows
- Roof or parapet
- Crenellations
- Corner pillars
- Accent trim

Near-term features:

| Feature | Priority | Notes |
|---|---|---|
| Square footprint | High | Already supported. |
| Hollow shell | High | Already supported. |
| Interior floors | Medium | Supported but hard to see. |
| Arched entrance | High | Should be visually readable. |
| Narrow windows | High | Should align by floor. |
| Window frames | High | Needed for exterior readability. |
| Corner pillars | High | Already supported. |
| Crenellations | High | Must be grounded. |
| Parapet | High | Needed for battlements. |
| Stepped roof | Medium | Supported; could improve massing. |
| Conical roof | Later | Better fantasy tower option. |
| Buttresses | Later | Useful for gothic/fortress tower. |
| Spiral stairs | Later | Interior/cutaway feature. |
| Observation deck | Later | Could pair with parapet. |

Recommended `medieval_tower_v1` subset:

```ts
medievalTower: {
  massing: {
    footprint: "square";
    wallThickness: number;
    hollowInterior: boolean;
    verticalEmphasis: "low" | "medium" | "tall";
  };
  entrance: {
    side: "front" | "back" | "left" | "right";
    style: "simple" | "arched";
    width: number;
    height: number;
    frame: boolean;
  };
  windows: {
    style: "small" | "narrow" | "arched";
    placement: "none" | "front_only" | "symmetric";
    floors: "none" | "upper" | "all";
    countPerSide: number;
    framed: boolean;
  };
  roofline: {
    roofStyle: "flat" | "stepped_pyramid";
    crenellations: boolean;
    parapet: boolean;
    cornerPillars: boolean;
  };
}
```

---

## 4.2 Small Medieval House

Purpose:
A compact domestic building with pitched roof and simple openings.

Core systems:

- Rectangular footprint
- Lower height
- Wall shell
- Pitched or gabled roof
- Front door
- Windows
- Chimney
- Optional porch
- Interior room layout later

Near-term features:

| Feature | Priority | Notes |
|---|---|---|
| Rectangular footprint | High | Basic massing. |
| Pitched/gabled roof | High | Essential identity. |
| Door | High | Front orientation. |
| Windows | High | Domestic rhythm. |
| Chimney | Medium | Strong visual identity. |
| Roof overhang | Medium | Makes house more readable. |
| Porch | Later | Adds complexity but useful. |
| Rooms | Later | Interior logic. |
| Dormers | Later | Roof/window interaction. |

Potential generator notes:

- Use roof ridge along the longer axis.
- Use windows symmetrically on front facade.
- Use chimney on one side of roof.
- Use material contrast for walls and roof.

---

## 4.3 Castle Gatehouse

Purpose:
A defensive entrance structure, often with twin towers and central gate.

Core systems:

- Twin vertical masses
- Central gate opening
- Bridge/path alignment
- Battlements
- Portcullis
- Arrow slit windows
- Parapet walkway

Near-term features:

| Feature | Priority | Notes |
|---|---|---|
| Twin towers | High | Primary identity. |
| Central gate arch | High | Must be readable. |
| Portcullis | Medium | Strong identity. |
| Crenellations | High | Defensive silhouette. |
| Arrow slits | High | Small windows. |
| Wall walk | Later | Circulation feature. |
| Drawbridge | Later | Site/interactive feature. |

Potential generator notes:

- Generate left and right tower volumes first.
- Carve central arch/gate.
- Add battlements across towers and connecting wall.
- Add portcullis bars using door/accent material.

---

## 4.4 Stone Bridge

Purpose:
A span connecting two sides across empty space or terrain.

Core systems:

- Span
- Supports/piers
- Arches
- Deck
- Railings/parapets
- Abutments

Near-term features:

| Feature | Priority | Notes |
|---|---|---|
| Linear footprint | High | Not a building shell. |
| Deck | High | Main traversable surface. |
| Piers | High | Support logic. |
| Railings | High | Readability. |
| Arch span | Medium | More complex. |
| Multiple arches | Later | Requires span subdivision. |
| Terrain integration | Later | Needs site model. |

Potential generator notes:

- Bridge generation should not use standard hollow shell logic.
- Must reason about supports and spans.
- Floating blocks may be allowed only if interpreted as an arch/deck supported by piers.

---

## 4.5 Chapel / Small Church

Purpose:
A small religious building with recognizable roof, windows, and front emphasis.

Core systems:

- Rectangular nave
- Pitched/gabled roof
- Front entrance
- Arched windows
- Small tower or bellcote
- Stained glass

Near-term features:

| Feature | Priority | Notes |
|---|---|---|
| Rectangular nave | High | Main mass. |
| Pitched roof | High | Essential silhouette. |
| Arched windows | High | Strong identity. |
| Stained glass | Medium | Material feature. |
| Small bell tower | Medium | Adds identity. |
| Apse | Later | More advanced massing. |
| Buttresses | Later | Gothic variant. |

Potential generator notes:

- Use long-axis symmetry.
- Place entrance on short front side.
- Place windows rhythmically along long walls.
- Use higher roof pitch than house.

---

## 4.6 Cathedral

Purpose:
A large, complex sacred structure with monumental scale.

Status:
Future / research.

Core systems:

- Nave
- Aisles
- Transept
- Crossing
- Apse
- Towers
- Rose window
- Buttresses
- Flying buttresses
- Spires
- Stained glass
- Vaulted interior

Near-term suitability:
Avoid for now as a generator target. It is useful as a long-term demo vision but too complex for early milestones.

Potential decomposition:

```text
cathedral
  → main nave generator
  → tower generator
  → transept massing
  → window system
  → buttress system
  → roof/spire system
```

Implementation status:
Later / research.

Confidence:
Medium.

---

# 5. Feature Dependencies and Conflicts

This section helps validation avoid impossible or ugly combinations.

---

## 5.1 Common Dependencies

| Feature | Depends on |
|---|---|
| Crenellations | Parapet, flat roofline, or supported wall top |
| Merlons | Supported parapet or wall cells below |
| Arched entrance | Sufficient entrance height and width |
| Door frame | Valid entrance aperture |
| Window frame | Valid window cell |
| Buttress | Exterior wall face and ground support |
| Flying buttress | Wall, external pier, enough horizontal distance |
| Chimney | Roof or wall support |
| Balcony | Door/window opening and support brackets |
| Spire | Tower/roof top and enough height |
| Rose window | Large front facade and enough width/height |
| Interior floors | Hollow interior and sufficient body height |
| Spiral stairs | Hollow interior and enough footprint width |
| Bridge arch | Span, supports, and enough vertical clearance |

---

## 5.2 Common Conflicts

| Feature | Conflicts with |
|---|---|
| Thick walls | Very small footprints |
| Large entrance | Narrow facade |
| Many windows | Structural supports and small walls |
| Crenellations | Steep roofs unless adapted |
| Conical roof | Square battlements unless transition layer exists |
| Rose window | Small structures |
| Flying buttresses | Small footprints and lack of side space |
| Chimney | Flat battlement roof unless placed carefully |
| Balcony | Strict no-overhang constraints |
| Hollow interior | Very thick walls or tiny dimensions |
| Symmetry | Asymmetric doors, chimneys, annexes |

---

## 5.3 Simplification Rules

Generators should degrade gracefully.

Examples:

- If the tower is too small for arched windows, use narrow slit windows.
- If the door is too wide for the facade, reduce entrance width.
- If battlements do not fit, place a simple parapet.
- If roof height is too small, use a flat cap.
- If block count is too high, remove trim before removing structural features.
- If hollow interior is impossible, return a validation error or reduce wall thickness.
- If a feature would float, either add support or omit the feature with a note.

---

# 6. Implementation Priority Tiers

---

## Tier 1: Core Architectural Readability

These are required to make generated structures feel like buildings.

- Dimensions
- Footprint
- Wall shell
- Wall thickness
- Hollow interior
- Foundation/base
- Floors
- Entrance
- Windows
- Roof
- Materials
- Grounded constraints
- Duplicate coordinate handling

Status:
Current tower supports many Tier 1 features.

---

## Tier 2: Strong Visual Identity

These make structures recognizable and visually satisfying.

- Door frames
- Window frames
- Corner pillars
- Facade trim
- Base bands
- Roof cap
- Parapet
- Crenellations
- Chimney
- Gabled roof
- Arched windows
- Material variation
- Vertical accents

Status:
Good next area for implementation.

---

## Tier 3: Structure-Specific Identity

These distinguish building types.

- Tower battlements
- Gatehouse portcullis
- House chimney
- Chapel bell tower
- Bridge arches
- Cathedral rose window
- Buttresses
- Spires
- Dormers
- Turrets

Status:
Implement only when tied to a specific structure generator.

---

## Tier 4: Advanced Spatial Logic

These require more complex 3D reasoning.

- Interior rooms
- Stairs
- Spiral stairs
- Corridors
- Balconies
- Wall walks
- Cutaway layers
- Multi-volume buildings
- Terrain integration
- Procedural ruins
- Bridges with real spans
- Flying buttresses

Status:
Later.

---

## Tier 5: AI-Facing Design Richness

These help future prompt-to-blueprint generation.

- Mood: bright, dark, ruined, ornate, austere
- Style: gothic, rustic, fortress, fantasy, modern
- Complexity: simple, medium, detailed
- Silhouette: squat, balanced, slender, monumental
- Material palette: warm, cold, dark, light, stone-heavy, wood-heavy
- Historical reference: medieval, romanesque, gothic, industrial
- Simplification notes
- Design rationale

Status:
Useful later, but should not drive geometry until core rules are stable.

---

# 7. Current Medieval Tower Assessment

The current medieval tower blueprint is a good first generator because it exercises many foundational systems:

- Dimensions
- Materials
- Shell generation
- Hollow interior
- Floors
- Door aperture
- Windows
- Roof
- Crenellations
- Corner pillars
- Validation
- Grounded filtering
- Merge priority

However, the current tower schema and generator should be viewed as `medieval_tower_v1`, not as the final architecture model.

Current strengths:

- Deterministic generation
- Semantic materials
- Validation before generation
- No AI block placement
- Editable blueprint in developer visualizer
- Grounded filtering
- Duplicate coordinate merge priority

Current weaknesses:

- Interior is hard to see
- Floor system is not visually important yet
- Window rhythm is still simple
- Roof options are limited
- Facade articulation is basic
- No circulation system
- No room/interior semantics
- No second structure type yet

Recommended next improvements for medieval tower:

1. Expose and refine entrance width/height.
2. Expose windows count and floors in the developer lab.
3. Add explicit facade trim settings later.
4. Add conical roof or spire option.
5. Add buttresses as a structure/facade feature.
6. Add layer/cutaway visualization before deep interior work.
7. Add curated tower presets.
8. Add snapshot tests for validation and voxel output.

---

# 8. Future AI-Facing Vocabulary

When an AI model is added, it should output structured fields like:

```ts
{
  structureType: "medieval_tower",
  style: "gothic",
  scale: "medium",
  mood: "dark",
  massing: {
    proportions: "slender",
    symmetry: "radial"
  },
  materials: {
    wall: "stone",
    roof: "dark_slate",
    window: "blue_stained_glass",
    accent: "limestone"
  },
  openings: {
    entrance: {
      style: "arched",
      side: "front"
    },
    windows: {
      style: "narrow",
      placement: "symmetric",
      floors: "upper"
    }
  },
  roof: {
    type: "spire"
  },
  features: {
    crenellations: true,
    buttresses: true
  }
}
```

The model should not output:

```ts
[
  { x: 0, y: 0, z: 0, blockType: "stone" },
  { x: 1, y: 0, z: 0, blockType: "stone" }
]
```

The AI should operate at the architectural design level. The generator should handle exact voxel placement.

---

# 9. How to Add New Features Safely

When adding a new feature:

1. Add or update the feature entry in this catalog.
2. Decide whether it is universal or structure-specific.
3. Define dependencies and conflicts.
4. Add validation rules.
5. Implement deterministic generator logic.
6. Add or update sample blueprints.
7. Test default blueprint output.
8. Check block count.
9. Check no duplicate coordinates.
10. Check no floating blocks.
11. Update CHANGE.md.
12. Consider whether the feature belongs in the developer visualizer.

Do not add a new feature only because it seems visually cool. Add it because it strengthens the architectural grammar.

---

# 10. Near-Term Roadmap Suggested by This Catalog

Recommended pre-AI sequence:

1. Stabilize medieval tower generator.
2. Add missing developer controls for important existing fields:
   - Entrance width/height
   - Window floors
   - Window count per side
   - Wall thickness
   - Hollow interior
   - Vertical emphasis
3. Add curated medieval tower presets.
4. Add blueprint JSON import/export.
5. Add snapshot tests for validation and generation.
6. Create a polished non-AI `/demo` page separate from `/visualizer`.
7. Add a second structure type:
   - Recommended: `small_medieval_house`
   - Alternative: `castle_gatehouse`
8. Add local rule-based prompt-to-blueprint prototype.
9. Add real LLM prompt-to-blueprint generation only after deterministic generation is strong.

---

# 11. References to Check Later

This catalog is an implementation taxonomy, not a scholarly reference. Before adding complex or style-specific architectural features, check architectural references.

Useful reference categories:

- Architectural glossaries
- Architectural element dictionaries
- Historical building diagrams
- Style guides for medieval, gothic, romanesque, vernacular, and modern architecture
- Image references for specific structure types
- Voxel/Minecraft-style build references, using original or legally safe assets

Potential reference sources:

- Getty Art & Architecture Thesaurus
- Architectural dictionaries
- Public architecture glossaries
- Museum education resources
- Wikimedia Commons architectural element categories
- Books such as visual dictionaries of architecture

Use references to clarify terminology and visual intent, but translate features into voxel-friendly rules rather than copying exact structures.

---

# 12. Glossary of Key Terms for This Project

## Blueprint

A structured object describing architectural intent, materials, dimensions, constraints, and features.

## Generator

Deterministic code that turns a validated blueprint into voxel blocks.

## VoxelBlock

A single placement with integer lattice coordinates and a semantic **`blockTypeId`** (registry id). May optionally include **`shapeKind`** / **`state`** for partial shapes (e.g. **pane**, **slab**) realized by the generator and renderer—not authored as raw coordinates in blueprints.

## Massing

The overall volume and footprint of the structure.

## Shell

The exterior wall layer or layers of a hollow structure.

## Aperture

An opening cut into a wall, such as a door or window.

## Parapet

A low wall at the edge of a roof or elevated platform.

## Merlon

The raised part of a battlement.

## Crenellation

The alternating pattern of raised merlons and gaps along a parapet.

## Quoin

A visually emphasized corner block or corner treatment.

## Buttress

An external support attached to a wall.

## Lintel

A horizontal element above a door or window.

## Jamb

A vertical side element of a door or window opening.

## Sill

A horizontal lower element of a window.

## Spire

A tall pointed roof or tower termination.

## Gable

The triangular wall end formed by a pitched roof.

## Nave

The main central space of a church or cathedral.

## Transept

A crosswise volume in a church or cathedral plan.

## Apse

A rounded or polygonal end volume, often in church architecture.

---

# 13. Maintenance Rules

This catalog should be updated when:

- A new structure type is added
- A new blueprint field is introduced
- A generator feature is implemented
- Validation rules change
- A feature is removed or deferred
- A recurring design issue appears in generated buildings

Each update should preserve the distinction between:

```text
architectural concept
  → blueprint field
  → validation rule
  → deterministic voxel generation strategy
```

Do not let the catalog become a random wishlist. Keep it organized by architectural system, structure type, dependencies, and implementation priority.