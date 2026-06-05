import type { RoomFace } from "@/src/lib/blueprints/types/genericBuildingV2";
import type { WindowTreatmentV2 } from "@/src/lib/blueprints/windowTreatment";

export type FacadeCountMode = "total" | "delta" | "unspecified";

export type FacadeWindowPlurality = "single" | "plural" | "unspecified";

export type FacadeWindowIntentConfidence = "high" | "medium" | "low";

export type FacadeWindowOperationScope = "window_only";

export type FacadeWindowIntent = {
  readonly kind: "window_intent";
  /** Faces explicitly mentioned in the prompt (add, remove, or move). */
  readonly requestedFaces: readonly RoomFace[];
  readonly excludedFaces: readonly RoomFace[];
  /** @deprecated Prefer addOrUpdateFaces — kept for compatibility with early callers. */
  readonly targetFaces: readonly RoomFace[];
  readonly removeFaces: readonly RoomFace[];
  readonly addOrUpdateFaces: readonly RoomFace[];
  readonly sourceFaces: readonly RoomFace[];
  readonly removeAllWindows: boolean;
  readonly countMode: FacadeCountMode;
  readonly requestedCount?: number;
  readonly perFaceRequestedCounts?: Partial<Record<RoomFace, number>>;
  readonly plurality: FacadeWindowPlurality;
  readonly operationScope: FacadeWindowOperationScope;
  readonly confidence: FacadeWindowIntentConfidence;
  readonly windowTreatment?: WindowTreatmentV2;
  readonly rawMatches: readonly string[];
};
