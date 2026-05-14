# Voxel Architect Project Context

Voxel Architect is an AI-powered conversational system for generating constraint-aware voxel architecture from prompts and images, inspired by Minecraft-style building systems.

It is being built as a Stanford CS 153: Frontier Systems project.

## Current Goal

We are building the first non-AI product milestone:

Prompt/blueprint → voxel blocks → interactive 3D preview.

Do not add AI yet. Do not add Supabase yet. Do not add Cloudflare yet.

## Current Branch

feature/voxel-renderer

## Current Dependencies

The project is a Next.js app using:

- pnpm
- TypeScript
- Tailwind
- App Router
- src/app structure

3D dependencies installed:

- three
- @react-three/fiber
- @react-three/drei
- @types/three

## Immediate Next Task

Create a basic voxel renderer.

Files to create:

- src/lib/voxel/types.ts
- src/lib/voxel/sampleStructure.ts
- src/components/voxel/VoxelViewer.tsx

The renderer should:

- render a hardcoded voxel structure
- use React Three Fiber
- use OrbitControls
- group blocks by material
- prepare for InstancedMesh usage
- be client-side only
- work inside the existing landing page or a simple demo section

## Product Direction

The system should eventually support:

- chat-based design iteration
- uploaded reference images
- constraint-aware translation
- simplification notes
- voxel preview
- layer/cutaway views
- saved builds

But the current milestone is only:

hardcoded voxel structure → visible 3D preview → movable camera.