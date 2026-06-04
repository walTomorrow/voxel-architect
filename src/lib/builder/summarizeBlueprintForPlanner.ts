import type {
  ChimneyComponentV2,
  DoorComponentV2,
  GenericBuildingBlueprintV2,
  GenericBuildingComponentV2,
  PorchComponentV2,
  RoofComponentV2,
  RoomComponentV2,
  StepComponentV2,
  WindowGroupComponentV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type {
  BlueprintPlannerComponentSummary,
  BlueprintPlannerSummary,
} from "@/src/lib/builder/plannerTypes";

function formatComponent(c: GenericBuildingComponentV2): BlueprintPlannerComponentSummary {
  const label = c.label ? ` (${c.label})` : "";
  switch (c.type) {
    case "room": {
      const r = c as RoomComponentV2;
      return {
        id: r.id,
        type: r.type,
        label: r.label,
        details: `width ${r.width}, depth ${r.depth}, wallHeight ${r.wallHeight}${r.role === "root" ? ", role root" : ""}`,
      };
    }
    case "roof": {
      const r = c as RoofComponentV2;
      const parts = [
        `kind ${r.kind}`,
        r.layers != null ? `layers ${r.layers}` : null,
        r.overhang != null ? `overhang ${r.overhang}` : null,
        r.orientation ? `orientation ${r.orientation}` : null,
        `targetRoom ${r.targetRoom}`,
      ].filter(Boolean);
      return { id: r.id, type: r.type, label: r.label, details: parts.join(", ") };
    }
    case "door": {
      const d = c as DoorComponentV2;
      return {
        id: d.id,
        type: d.type,
        label: d.label,
        details: `surface ${d.attach.targetSurface}, width ${d.width}, height ${d.height}`,
      };
    }
    case "window_group": {
      const w = c as WindowGroupComponentV2;
      return {
        id: w.id,
        type: w.type,
        label: w.label,
        details: `count ${w.count}, layout ${w.layout}, surface ${w.attach.targetSurface}`,
      };
    }
    case "porch": {
      const p = c as PorchComponentV2;
      return {
        id: p.id,
        type: p.type,
        label: p.label,
        details: `depth ${p.depth}, widthMode ${p.widthMode}, surface ${p.attach.targetSurface}`,
      };
    }
    case "chimney": {
      const ch = c as ChimneyComponentV2;
      const h = ch.attach.placement?.horizontal ?? "center";
      return {
        id: ch.id,
        type: ch.type,
        label: ch.label,
        details: `surface ${ch.attach.targetSurface}, horizontal ${h}`,
      };
    }
    case "step": {
      const s = c as StepComponentV2;
      return {
        id: s.id,
        type: s.type,
        label: s.label,
        details: `targetDoor ${s.attach.targetDoor}`,
      };
    }
  }
}

export function summarizeBlueprintForPlanner(
  blueprint: GenericBuildingBlueprintV2,
  options?: { presetId?: string; generatedBlockCount?: number },
): BlueprintPlannerSummary {
  const presetSource =
    options?.presetId?.trim() ||
    blueprint.metadata.name?.trim() ||
    undefined;

  const materials: Record<string, string> = {};
  for (const [key, value] of Object.entries(blueprint.materials)) {
    materials[key] = String(value);
  }

  return {
    schemaVersion: 2,
    presetSource,
    materials,
    constraints: {
      maxBlockCount: blueprint.constraints.maxBlockCount,
      ...(options?.generatedBlockCount != null && options.generatedBlockCount >= 0
        ? { generatedBlockCount: options.generatedBlockCount }
        : {}),
    },
    components: blueprint.components.map(formatComponent),
  };
}

export function renderBlueprintSummaryText(summary: BlueprintPlannerSummary): string {
  const lines: string[] = [
    "Current build:",
    `- schemaVersion: ${summary.schemaVersion}`,
  ];
  if (summary.presetSource) {
    lines.push(`- source: ${summary.presetSource}`);
  }
  lines.push("- components:");
  for (const c of summary.components) {
    lines.push(`  - ${c.type} ${c.id}: ${c.details}`);
  }
  lines.push("- materials:");
  for (const [key, value] of Object.entries(summary.materials)) {
    lines.push(`  - ${key} ${value}`);
  }
  lines.push("- constraints:");
  lines.push(`  - block budget (maxBlockCount): ${summary.constraints.maxBlockCount}`);
  if (summary.constraints.generatedBlockCount != null) {
    lines.push(`  - generated blocks: ${summary.constraints.generatedBlockCount}`);
  }
  return lines.join("\n");
}
