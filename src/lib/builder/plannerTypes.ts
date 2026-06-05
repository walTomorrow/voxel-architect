import type { BuilderBlueprint } from "@/src/lib/builder/builderToolTypes";
import type {
  AddableComponentKind,
  ApplyableBlueprintOperationV2,
  BlueprintOperationV2,
} from "@/src/lib/builder/blueprintOperationsV2";
export type PlannerMode = "auto" | "deterministic" | "llm";

export const MAX_PLANNER_OPERATIONS = 3;

export type BlueprintPlannerComponentSummary = {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly details: string;
};

export type BlueprintPlannerSummary = {
  readonly schemaVersion: 2;
  readonly presetSource?: string;
  readonly materials: Readonly<Record<string, string>>;
  readonly constraints: {
    readonly maxBlockCount: number;
    readonly generatedBlockCount?: number;
  };
  readonly components: readonly BlueprintPlannerComponentSummary[];
};

export type AllowedOperationsSchema = {
  readonly maxOperations: number;
  readonly allowedOpTypes: readonly (
    | "setMaterialPalette"
    | "updateComponent"
    | "addComponent"
    | "removeComponent"
  )[];
  readonly addableComponentTypes: readonly AddableComponentKind[];
  readonly componentAllowlist: readonly { readonly id: string; readonly type: string }[];
  readonly materialKeys: readonly string[];
  readonly roofKinds: readonly string[];
  readonly roomPatch: { readonly width: { min: number; max: number }; readonly depth: { min: number; max: number }; readonly wallHeight: { min: number; max: number } };
  readonly windowCount: { min: number; max: number };
  readonly porchDepth: { min: number; max: number };
  readonly roofLayers: { min: number; max: number };
  readonly unsupported: readonly string[];
};

export type PlannerJsonOk = {
  readonly status: "ok";
  readonly operations: BlueprintOperationV2[];
  readonly rationaleSummary: string;
};

export type PlannerJsonUnsupported = {
  readonly status: "unsupported";
  readonly unsupportedReason: string;
};

export type PlannerJsonResponse = PlannerJsonOk | PlannerJsonUnsupported;

export type PlannerResult =
  | {
      readonly ok: true;
      readonly operations: readonly ApplyableBlueprintOperationV2[];
      readonly rationaleSummary: string;
    }  | {
      readonly ok: false;
      readonly unsupportedReason: string;
      readonly rejectionCode?: import("@/src/lib/builder/plannerRejection").PlannerRejectionCode;
      readonly rejectionDetail?: string;
    };

export type PlanRefineRequest = {
  readonly prompt: string;
  readonly blueprint: BuilderBlueprint;
  readonly plannerMode?: PlannerMode;
  readonly presetId?: string;
};
