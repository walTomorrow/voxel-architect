"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlockTypeDefinition, BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import {
  collectTextureUrlsForBlockTypes,
  getBlockDefinition,
  sortBlockTypesForRender,
} from "@/src/lib/voxel/blocks/registry";
import { textureUrl } from "@/src/lib/voxel/blocks/textureUrls";
import { SAMPLE_STRUCTURE } from "@/src/lib/voxel/sampleStructure";
import type { VoxelBlock, VoxelStructure } from "@/src/lib/voxel/types";

/** Shared unit cube; InstancedMesh only mutates instance matrices. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** Pixel-art: nearest sampling, no mip chain (avoids blur at oblique angles), minimal anisotropy. */
function configureTerrainTexture(t: THREE.Texture): void {
  t.generateMipmaps = false;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.anisotropy = 1;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
}

function groupBlocksByType(
  structure: VoxelStructure,
): Map<string, VoxelBlock[]> {
  const map = new Map<string, VoxelBlock[]>();
  for (const block of structure.blocks) {
    const list = map.get(block.blockTypeId);
    if (list) list.push(block);
    else map.set(block.blockTypeId, [block]);
  }
  return map;
}

function getPackId(blockTypeId: string): string {
  const i = blockTypeId.indexOf("/");
  return i > 0 ? blockTypeId.slice(0, i) : "classic";
}

/**
 * Multi-material box: `THREE.BoxGeometry` assigns one material index per face, in this order:
 *   0: +X   1: -X   2: +Y (world up / “top”)   3: -Y (“bottom”)   4: +Z   5: -Z
 *
 * `topSideBottom` registry faces map to materials as:
 *   - `side`  → vertical faces (+X, -X, +Z, -Z)
 *   - `top`   → +Y
 *   - `bottom`→ -Y
 * Logs and similar blocks use the same binding (often `bottom` reuses the end-grain / top file in pack data).
 *
 * `uniform` repeats one texture on all six faces.
 */
function buildMaterialsForBlock(
  def: BlockTypeDefinition,
  packId: string,
  textureByUrl: Map<string, THREE.Texture>,
  blockTypeIdForDev?: string,
): THREE.MeshStandardMaterial[] {
  const common = {
    metalness: def.metalness ?? 0.05,
    roughness: def.roughness ?? 0.92,
    transparent: def.transparent ?? false,
    opacity: def.opacity ?? 1,
    depthWrite: def.depthWrite ?? true,
    color: 0xffffff,
  } as const;

  const tex = (file: string) => {
    const url = textureUrl(packId, file);
    const t = textureByUrl.get(url);
    if (!t) {
      if (process.env.NODE_ENV === "development") {
        console.error("[VoxelViewer] Missing texture map entry", {
          url,
          blockTypeId: blockTypeIdForDev,
          file,
        });
      }
      throw new Error(`Missing texture for ${url}`);
    }
    return t;
  };

  if (def.faces.kind === "uniform") {
    const map = tex(def.faces.file);
    const mat = new THREE.MeshStandardMaterial({
      ...common,
      map,
      ...(def.alphaTest != null ? { alphaTest: def.alphaTest } : {}),
    });
    return [mat, mat, mat, mat, mat, mat];
  }

  const sideMap = tex(def.faces.side);
  const topMap = tex(def.faces.top);
  const bottomMap = tex(def.faces.bottom);
  const matSide = new THREE.MeshStandardMaterial({
    ...common,
    map: sideMap,
    ...(def.alphaTest != null ? { alphaTest: def.alphaTest } : {}),
  });
  const matTop = new THREE.MeshStandardMaterial({
    ...common,
    map: topMap,
    ...(def.alphaTest != null ? { alphaTest: def.alphaTest } : {}),
  });
  const matBottom = new THREE.MeshStandardMaterial({
    ...common,
    map: bottomMap,
    ...(def.alphaTest != null ? { alphaTest: def.alphaTest } : {}),
  });
  return [
    matSide,
    matSide,
    matTop,
    matBottom,
    matSide,
    matSide,
  ];
}

function TexturedVoxelBatch({
  blockTypeId,
  blocks,
  textureByUrl,
}: {
  blockTypeId: BlockTypeId;
  blocks: readonly VoxelBlock[];
  textureByUrl: Map<string, THREE.Texture>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const def = getBlockDefinition(blockTypeId);
  const count = blocks.length;

  const materials = useMemo(() => {
    if (!def || count === 0) return [];
    const packId = getPackId(blockTypeId);
    return buildMaterialsForBlock(def, packId, textureByUrl, blockTypeId);
  }, [blockTypeId, count, def, textureByUrl]);

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

  if (!def || count === 0 || materials.length !== 6) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[UNIT_BOX, materials, count]}
      castShadow
      receiveShadow
    />
  );
}

function TexturedScene({ structure }: { structure: VoxelStructure }) {
  const byType = useMemo(() => groupBlocksByType(structure), [structure]);

  const sortedTypeIds = useMemo(() => {
    const ids = [...byType.keys()].filter((id) => byType.get(id)?.length);
    return sortBlockTypesForRender(ids) as BlockTypeId[];
  }, [byType]);

  const textureUrls = useMemo(
    () => collectTextureUrlsForBlockTypes(sortedTypeIds),
    [sortedTypeIds],
  );

  if (textureUrls.length === 0) {
    return (
      <>
        <color attach="background" args={["#0c0c0e"]} />
        <ambientLight intensity={0.26} />
      </>
    );
  }

  return (
    <TexturedSceneWithTextures
      byType={byType}
      sortedTypeIds={sortedTypeIds}
      textureUrls={textureUrls}
    />
  );
}

function TexturedSceneWithTextures({
  byType,
  sortedTypeIds,
  textureUrls,
}: {
  byType: Map<string, VoxelBlock[]>;
  sortedTypeIds: BlockTypeId[];
  textureUrls: string[];
}) {
  const loaded = useTexture(textureUrls) as THREE.Texture[];
  const textureByUrl = useMemo(() => {
    const m = new Map<string, THREE.Texture>();
    textureUrls.forEach((url, i) => {
      const tex = loaded[i];
      if (tex) {
        configureTerrainTexture(tex);
        m.set(url, tex);
      }
    });
    if (process.env.NODE_ENV === "development") {
      for (const url of textureUrls) {
        if (!m.has(url)) {
          console.warn("[VoxelViewer] Texture URL not mapped after load", url);
        }
      }
      if (textureUrls.length > 0) {
        console.debug(
          "[VoxelViewer] Loaded voxel texture count:",
          textureUrls.length,
        );
      }
    }
    return m;
  }, [textureUrls, loaded]);

  return (
    <>
      <color attach="background" args={["#0c0c0e"]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        castShadow
        color="#fff1e0"
        position={[10, 16, 8]}
        intensity={1.05}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        color="#c8d8f0"
        position={[-8, 5, -6]}
        intensity={0.14}
      />

      <group position={[0, -1.25, 0]}>
        {sortedTypeIds.map((id) => {
          const blocks = byType.get(id);
          if (!blocks?.length) return null;
          return (
            <TexturedVoxelBatch
              key={id}
              blockTypeId={id}
              blocks={blocks}
              textureByUrl={textureByUrl}
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
          <TexturedScene structure={structure} />
        </Suspense>
      </Canvas>
    </div>
  );
}
