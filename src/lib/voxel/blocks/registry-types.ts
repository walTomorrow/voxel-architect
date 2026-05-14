/**
 * Semantic voxel block registry — texture layout is pack-agnostic; packs supply
 * filenames resolved under `/textures/{packId}/`.
 */

/** `packId/localKey`, e.g. `classic/grass` */
export type BlockTypeId = `${string}/${string}`;

/** One texture on all six faces */
export type UniformFaces = {
  readonly kind: "uniform";
  readonly file: string;
};

/** Minecraft-style grass / log: distinct top, side, bottom */
export type TopSideBottomFaces = {
  readonly kind: "topSideBottom";
  readonly top: string;
  readonly side: string;
  readonly bottom: string;
};

export type BlockFaceBinding = UniformFaces | TopSideBottomFaces;

export interface BlockTypeDefinition {
  readonly faces: BlockFaceBinding;
  readonly metalness?: number;
  readonly roughness?: number;
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly alphaTest?: number;
  readonly depthWrite?: boolean;
}

export type BlockPackId = string;

export type BlockPackDefinitions = Readonly<
  Record<string, BlockTypeDefinition>
>;
