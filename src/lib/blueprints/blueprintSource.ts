import type { MedievalTowerBlueprint } from "./types";

/** UI-only lab provenance; never serialized into blueprint exchange JSON. */
export type BlueprintSource =
  | {
      readonly kind: "preset";
      readonly presetId: string;
      readonly label: string;
      readonly baseline: MedievalTowerBlueprint;
    }
  | {
      readonly kind: "imported";
      readonly baseline: MedievalTowerBlueprint;
    }
  | {
      readonly kind: "custom";
      readonly baseline?: MedievalTowerBlueprint;
    };

/** Stable deep equality for authoring snapshots (lab-only; not a schema validator). */
export function blueprintsDeepEqual(
  a: MedievalTowerBlueprint,
  b: MedievalTowerBlueprint,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isBlueprintModified(
  current: MedievalTowerBlueprint,
  baseline: MedievalTowerBlueprint,
): boolean {
  return !blueprintsDeepEqual(current, baseline);
}

/** Human-readable status for the /visualizer blueprint workflow sidebar. */
export function formatBlueprintSourceStatus(
  source: BlueprintSource,
  current: MedievalTowerBlueprint,
): string {
  switch (source.kind) {
    case "preset": {
      const modified = isBlueprintModified(current, source.baseline);
      return modified
        ? `Modified preset — ${source.label}`
        : `Preset — ${source.label}`;
    }
    case "imported": {
      const modified = isBlueprintModified(current, source.baseline);
      return modified ? "Modified imported blueprint" : "Imported blueprint";
    }
    case "custom": {
      if (source.baseline) {
        const modified = isBlueprintModified(current, source.baseline);
        return modified ? "Modified custom blueprint" : "Custom blueprint";
      }
      return "Custom blueprint";
    }
  }
}

export function createPresetBlueprintSource(
  presetId: string,
  label: string,
  blueprint: MedievalTowerBlueprint,
): BlueprintSource {
  return {
    kind: "preset",
    presetId,
    label,
    baseline: structuredClone(blueprint) as MedievalTowerBlueprint,
  };
}

export function createImportedBlueprintSource(
  blueprint: MedievalTowerBlueprint,
): BlueprintSource {
  return {
    kind: "imported",
    baseline: structuredClone(blueprint) as MedievalTowerBlueprint,
  };
}
