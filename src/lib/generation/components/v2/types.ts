/**
 * ComponentPlan v2 — internal compiler IR only. Not public authoring JSON.
 * Lowering and emitters are Phase 3–4.
 */

import type { BlueprintConstraints } from "@/src/lib/blueprints/types";
import type { ComponentId } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";

export type PlanComponentKindV2 =
  | "room_shell"
  | "roof"
  | "door"
  | "window_group"
  | "porch"
  | "chimney"
  | "step";

/** Derived aperture masks — populated by Phase 3 lowering. */
export interface DerivedOpeningsV2 {
  readonly shellSkipMask: ReadonlySet<string>;
  readonly windowMask: ReadonlySet<string>;
  readonly doorMask: ReadonlySet<string>;
}

export interface PlanBoundsV2 {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly width: number;
  readonly depth: number;
  readonly bodyLayers: number;
  readonly roofLayers: number;
  readonly overhang: number;
}

export interface ResolvedMaterialPaletteV2 {
  readonly wall: BlockTypeId;
  readonly floor: BlockTypeId;
  readonly roof: BlockTypeId;
  readonly window: BlockTypeId;
  readonly door: BlockTypeId;
  readonly accent: BlockTypeId;
}

export interface PlanRoomShellV2 {
  readonly kind: "room_shell";
  readonly sourceComponentId: ComponentId;
  readonly params: {
    readonly width: number;
    readonly depth: number;
    readonly wallHeight: number;
    readonly wallThickness: number;
    readonly hollowInterior: boolean;
  };
}

export interface PlanRoofV2 {
  readonly kind: "roof";
  readonly sourceComponentId: ComponentId;
  readonly params: {
    readonly kind: "pitched_gable" | "shed" | "none";
    readonly layers: number;
    readonly overhang: number;
  };
}

export interface PlanDoorV2 {
  readonly kind: "door";
  readonly sourceComponentId: ComponentId;
}

export interface PlanWindowGroupV2 {
  readonly kind: "window_group";
  readonly sourceComponentId: ComponentId;
}

export interface PlanPorchV2 {
  readonly kind: "porch";
  readonly sourceComponentId: ComponentId;
}

export interface PlanChimneyV2 {
  readonly kind: "chimney";
  readonly sourceComponentId: ComponentId;
}

export interface PlanStepV2 {
  readonly kind: "step";
  readonly sourceComponentId: ComponentId;
  readonly targetDoorId: ComponentId;
}

export type PlanComponentV2 =
  | PlanRoomShellV2
  | PlanRoofV2
  | PlanDoorV2
  | PlanWindowGroupV2
  | PlanPorchV2
  | PlanChimneyV2
  | PlanStepV2;

export interface ComponentPlanV2 {
  readonly planVersion: 2;
  readonly sourceSchemaVersion: 2;
  readonly rootRoomId: ComponentId;
  readonly bounds: PlanBoundsV2;
  readonly materials: ResolvedMaterialPaletteV2;
  readonly constraints: BlueprintConstraints;
  readonly openings: DerivedOpeningsV2;
  readonly components: readonly PlanComponentV2[];
  readonly compileNotes?: readonly string[];
}
