import type { BlueprintConstraints } from "@/src/lib/blueprints/types";
import type { BlockTypeId } from "@/src/lib/voxel/blocks/registry-types";
import type { DerivedOpenings } from "./geometry/openingMask";

export type ComponentKind =
  | "rectangular_body"
  | "foundation"
  | "hollow_wall_shell"
  | "entrance_on_side"
  | "sparse_windows"
  | "pitched_gable_roof"
  | "shed_roof"
  | "chimney"
  | "front_step";

export interface RectangularBodyComponent {
  readonly id: "body_main";
  readonly kind: "rectangular_body";
  readonly target: "body_main";
  readonly params: {
    readonly width: number;
    readonly depth: number;
    readonly height: number;
    readonly wallThickness: number;
    readonly hollowInterior: boolean;
  };
}

export interface FoundationComponent {
  readonly id: "foundation_main";
  readonly kind: "foundation";
  readonly target: "body_main";
  readonly params: Record<string, never>;
}

export interface HollowWallShellComponent {
  readonly id: "shell_main";
  readonly kind: "hollow_wall_shell";
  readonly target: "body_main";
  readonly params: {
    readonly wallThickness: number;
    readonly hollowInterior: boolean;
  };
}

export interface EntranceOnSideComponent {
  readonly id: "entrance_main";
  readonly kind: "entrance_on_side";
  readonly target: "body_main";
  readonly params: {
    readonly side: "front" | "back" | "left" | "right";
    readonly width: number;
    readonly height: number;
  };
}

export interface SparseWindowsComponent {
  readonly id: "windows_main";
  readonly kind: "sparse_windows";
  readonly target: "body_main";
  readonly params: {
    readonly mode: "none" | "front_only" | "front_and_sides" | "all_sides";
    readonly count: number;
  };
}

export interface PitchedGableRoofComponent {
  readonly id: "roof_main";
  readonly kind: "pitched_gable_roof";
  readonly target: "body_main";
  readonly params: {
    readonly layers: number;
    readonly overhang: number;
  };
}

export interface ShedRoofComponent {
  readonly id: "roof_main";
  readonly kind: "shed_roof";
  readonly target: "body_main";
  readonly params: {
    readonly layers: number;
    readonly overhang: number;
  };
}

export interface ChimneyComponent {
  readonly id: "chimney_main";
  readonly kind: "chimney";
  readonly target: "body_main";
  readonly params: {
    readonly side: "left" | "right";
  };
}

export interface FrontStepComponent {
  readonly id: "front_step_main";
  readonly kind: "front_step";
  readonly target: "entrance_main";
  readonly params: Record<string, never>;
}

export type PlannedComponent =
  | RectangularBodyComponent
  | FoundationComponent
  | HollowWallShellComponent
  | EntranceOnSideComponent
  | SparseWindowsComponent
  | PitchedGableRoofComponent
  | ShedRoofComponent
  | ChimneyComponent
  | FrontStepComponent;

export interface ComponentPlan {
  readonly planVersion: 1;
  readonly sourceStructureType: "generic_building";
  readonly materials: {
    readonly wall: BlockTypeId;
    readonly floor: BlockTypeId;
    readonly roof: BlockTypeId;
    readonly window: BlockTypeId;
    readonly door: BlockTypeId;
    readonly accent: BlockTypeId;
  };
  readonly constraints: BlueprintConstraints;
  readonly grid: {
    readonly width: number;
    readonly depth: number;
    readonly bodyLayers: number;
    readonly roofLayers: number;
    readonly overhang: number;
  };
  readonly openings: DerivedOpenings;
  readonly components: readonly PlannedComponent[];
  readonly compileNotes?: readonly string[];
}

export type PlanContext = {
  readonly plan: ComponentPlan;
  readonly originX: number;
  readonly originZ: number;
};
