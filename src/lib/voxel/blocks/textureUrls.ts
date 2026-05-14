import type { BlockFaceBinding } from "./registry-types";

export const TEXTURES_PUBLIC_PREFIX = "/textures";

export function textureUrl(packId: string, filename: string): string {
  return `${TEXTURES_PUBLIC_PREFIX}/${packId}/${filename}`;
}

export function collectFilenamesFromFaces(faces: BlockFaceBinding): string[] {
  if (faces.kind === "uniform") return [faces.file];
  return [faces.top, faces.side, faces.bottom];
}
