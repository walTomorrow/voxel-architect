# Block System Backlog

This document tracks follow-up ideas for Voxel Architect’s block vocabulary, partial block rendering, material metadata, and future Minecraft compatibility.

These are not active issues yet. They should be promoted into GitHub issues only when the milestone scope is ready.

## Render safety / validation

- Add generator-facing validation so invalid partial block shape/state combinations fail before render.
- Combine structural validation and material/shape validation before generators emit partial blocks.
- Current renderer skip/warn behavior is only a safety fallback, not correctness enforcement.

## Connection-aware blocks

- Add connection-aware partial blocks for fences, walls, iron bars, and possibly panes.
- Connections should be derived from neighboring cells when possible.
- Generators should place semantic blocks like fence or wall.
- A resolver/renderer should compute north/south/east/west arms from adjacent connectable blocks.
- Avoid manually storing stale connection flags unless there is a clear authoring reason.

## Texture expansion

- Add new textures only when required by a near-term generator feature or building family.
- Prefer existing classic textures for slabs, panes, and posts.
- First likely texture needs:
  - door
  - lantern/glow
  - flower/grass cross-plant
  - iron bars/grate
  - forge/furnace face
  - thatch/roof material if needed

## Minecraft compatibility

- Keep Voxel Architect’s internal block model native.
- Add optional compatibility metadata:
  - exact
  - approximate
  - composed
  - unsupported
- Future Minecraft-compatible mode should restrict generation to exportable blocks.
- Conversion mode should map VA-native blocks to Minecraft-compatible fallbacks.

## Future shape kinds

- door
- stair
- fence
- wall
- trapdoor
- cross_plant
- lantern
- sign
- bars