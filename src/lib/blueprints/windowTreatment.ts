import type {
  WindowGroupComponentV2,
  WindowTreatmentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";

export type { WindowTreatmentV2 };

export const WINDOW_TREATMENTS = ["glass_block", "glass_pane", "open"] as const satisfies readonly WindowTreatmentV2[];

export const DEFAULT_WINDOW_TREATMENT: WindowTreatmentV2 = "glass_block";

export function isWindowTreatmentV2(value: unknown): value is WindowTreatmentV2 {
  return (
    typeof value === "string" &&
    (WINDOW_TREATMENTS as readonly string[]).includes(value)
  );
}

export function normalizeWindowTreatment(
  value: unknown,
): WindowTreatmentV2 {
  if (isWindowTreatmentV2(value)) return value;
  return DEFAULT_WINDOW_TREATMENT;
}

/** User-facing label for summaries. */
export function windowTreatmentLabel(treatment: WindowTreatmentV2): string {
  switch (treatment) {
    case "glass_block":
      return "glass-block";
    case "glass_pane":
      return "glass-pane";
    case "open":
      return "open";
  }
}

export function parseWindowTreatmentFromPrompt(
  prompt: string,
): WindowTreatmentV2 | undefined {
  const text = prompt.toLowerCase();
  if (
    /\b(open windows?|empty windows?|windows? without glass|no glass|hollow windows?|unfilled windows?)\b/.test(
      text,
    )
  ) {
    return "open";
  }
  if (/\b(glass pane windows?|pane windows?|window panes?|paned glass)\b/.test(text)) {
    return "glass_pane";
  }
  if (
    /\b(glass block windows?|solid glass windows?|full glass windows?|glass block style)\b/.test(
      text,
    )
  ) {
    return "glass_block";
  }
  return undefined;
}

export function withDefaultWindowTreatment(
  component: WindowGroupComponentV2,
): WindowGroupComponentV2 {
  return {
    ...component,
    windowTreatment: normalizeWindowTreatment(component.windowTreatment),
  };
}
