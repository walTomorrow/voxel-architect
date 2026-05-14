"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SAMPLE_STRUCTURE } from "@/src/lib/voxel/sampleStructure";
import {
  VOXEL_MATERIAL_ORDER,
  VOXEL_MATERIAL_VISUAL,
  type VoxelBlock,
  type VoxelMaterialId,
  type VoxelStructure,
} from "@/src/lib/voxel/types";

function groupBlocksByMaterial(
  structure: VoxelStructure,
): Map<VoxelMaterialId, VoxelBlock[]> {
  const map = new Map<VoxelMaterialId, VoxelBlock[]>();
  for (const block of structure.blocks) {
    const list = map.get(block.materialId);
    if (list) list.push(block);
    else map.set(block.materialId, [block]);
  }
  return map;
}

/** One InstancedMesh per material — same pattern drei `Instances` uses under the hood */
function InstancedVoxelBatch({
  blocks,
  materialId,
}: {
  blocks: readonly VoxelBlock[];
  materialId: VoxelMaterialId;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const vis = VOXEL_MATERIAL_VISUAL[materialId];

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: vis.color,
        metalness: vis.metalness,
        roughness: vis.roughness,
        transparent: vis.transparent ?? false,
        opacity: vis.opacity ?? 1,
        depthWrite: vis.depthWrite ?? true,
      }),
    [vis],
  );

  const count = blocks.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    for (let i = 0; i < count; i++) {
      const b = blocks[i]!;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = count;
  }, [blocks, count, dummy]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
}

function SceneContent({ structure }: { structure: VoxelStructure }) {
  const byMaterial = useMemo(() => groupBlocksByMaterial(structure), [structure]);

  return (
    <>
      <color attach="background" args={["#0c0c0e"]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[8, 14, 6]}
        intensity={1.15}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.25} />

      <group position={[0, -1.25, 0]}>
        {VOXEL_MATERIAL_ORDER.map((materialId) => {
          const blocks = byMaterial.get(materialId);
          if (!blocks?.length) return null;
          return (
            <InstancedVoxelBatch
              key={materialId}
              materialId={materialId}
              blocks={blocks}
            />
          );
        })}
      </group>

      <OrbitControls
        enablePan
        enableZoom
        minDistance={4}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2 - 0.08}
        target={[0, 1.5, 0]}
        makeDefault
      />
    </>
  );
}

export function VoxelViewer({
  className,
  structure = SAMPLE_STRUCTURE,
}: {
  className?: string;
  structure?: VoxelStructure;
}) {
  return (
    <div className={className}>
      <Canvas
        shadows
        className="touch-none"
        camera={{ position: [11, 9, 11], fov: 42, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <SceneContent structure={structure} />
        </Suspense>
      </Canvas>
    </div>
  );
}
