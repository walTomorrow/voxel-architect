import type { GenericBuildingBlueprintV2 } from "@/src/lib/blueprints/types/genericBuildingV2";
import {
  type BlueprintAffordancesForPlanner,
  type ChimneyAffordance,
  type PorchAffordance,
  type WindowSurfaceAffordance,
  getBlueprintAffordancesForPlanner,
  renderAffordancesText,
} from "@/src/lib/builder/getBlueprintAffordancesForPlanner";

export type AffordanceAction = {
  readonly available: boolean;
  readonly reason?: string;
  readonly alternatives?: readonly string[];
};

export type RichWindowSurfaceAffordance = WindowSurfaceAffordance & {
  readonly addGroup: AffordanceAction;
  readonly increaseCount: AffordanceAction;
  readonly removeGroup: AffordanceAction;
};

export type RichPorchAffordance = PorchAffordance & {
  readonly add: AffordanceAction;
  readonly widen: AffordanceAction;
  readonly deepen: AffordanceAction;
  readonly remove: AffordanceAction;
};

export type RichChimneyAffordance = ChimneyAffordance & {
  readonly add: AffordanceAction;
  readonly remove: AffordanceAction;
};

/** Wraps legacy affordances with explanatory reasons; preserves base fields for compatibility. */
export type RichBlueprintAffordancesForPlanner = BlueprintAffordancesForPlanner & {
  readonly porchRich: RichPorchAffordance;
  readonly chimneyRich: RichChimneyAffordance;
  readonly windowsRich: readonly RichWindowSurfaceAffordance[];
};

function alt(...items: string[]): readonly string[] {
  return items.filter((s) => s.length > 0);
}

function buildPorchRich(
  base: BlueprintAffordancesForPlanner,
  porch: PorchAffordance,
): RichPorchAffordance {
  const id = porch.id ?? "front-porch";
  const add: AffordanceAction = base.canAdd.porch
    ? { available: true }
    : {
        available: false,
        reason: porch.present
          ? "porch already exists"
          : "cannot add porch without a front door",
        alternatives: alt(
          porch.present && porch.canWiden ? "widen porch to full_facade" : "",
          porch.present && porch.canDeepen ? "deepen existing porch" : "",
          porch.present ? `remove porch (${id}) first` : "",
        ),
      };

  const widen: AffordanceAction = porch.canWiden
    ? { available: true }
    : {
        available: false,
        reason: porch.present
          ? porch.widthMode === "full_facade"
            ? "porch already spans full_facade"
            : "porch cannot widen"
          : "no porch to widen",
        alternatives: alt(base.canAdd.porch ? "add porch" : ""),
      };

  const deepen: AffordanceAction = porch.canDeepen
    ? { available: true }
    : {
        available: false,
        reason: porch.present ? "porch depth at planner maximum" : "no porch to deepen",
        alternatives: alt(porch.canWiden ? "widen porch instead" : ""),
      };

  const remove: AffordanceAction = porch.present
    ? { available: true }
    : {
        available: false,
        reason: "no porch to remove",
        alternatives: alt(base.canAdd.porch ? "add porch" : ""),
      };

  return { ...porch, add, widen, deepen, remove };
}

function buildChimneyRich(
  base: BlueprintAffordancesForPlanner,
  chimney: ChimneyAffordance,
): RichChimneyAffordance {
  const id = chimney.id ?? "chimney";
  const add: AffordanceAction = chimney.canAdd
    ? { available: true }
    : {
        available: false,
        reason: "chimney already exists",
        alternatives: alt(`remove chimney (${id}) first`, "move chimney via updateComponent"),
      };

  const remove: AffordanceAction = chimney.canRemove
    ? { available: true }
    : {
        available: false,
        reason: "no chimney to remove",
        alternatives: alt("add chimney"),
      };

  return { ...chimney, add, remove };
}

function buildWindowRich(
  base: BlueprintAffordancesForPlanner,
  w: WindowSurfaceAffordance,
): RichWindowSurfaceAffordance {
  const sideFaces = base.windows
    .filter((x) => x.face !== w.face && x.canAddGroup)
    .map((x) => x.face);

  const addGroup: AffordanceAction = w.canAddGroup
    ? { available: true }
    : {
        available: false,
        reason: w.hasGroup
          ? `window_group already on ${w.surface} (${w.groupId})`
          : w.maxSlots <= 0
            ? "no window capacity on this façade"
            : "cannot add window_group",
        alternatives: alt(
          w.hasGroup && w.groupId ? `updateComponent count on ${w.groupId}` : "",
          sideFaces.length > 0 ? `add windows on ${sideFaces.join(" or ")}` : "",
        ),
      };

  const increaseCount: AffordanceAction = w.canIncreaseCount
    ? { available: true }
    : {
        available: false,
        reason: w.atCapacity
          ? `${w.face} windows at capacity (${w.currentCount}/${w.maxSlots})`
          : w.hasGroup
            ? "count cannot increase further"
            : "no window_group on this surface",
        alternatives: alt(
          w.canAddGroup ? `add window_group on ${w.face}` : "",
          sideFaces.length > 0 ? `add windows on ${sideFaces.join(" or ")}` : "",
          base.frontWindowsAtCapacity && w.face === "front"
            ? "front full — use side/back surfaces"
            : "",
        ),
      };

  const removeGroup: AffordanceAction = w.hasGroup && w.groupId
    ? {
        available: true,
        alternatives: alt(`removeComponent id ${w.groupId}`),
      }
    : {
        available: false,
        reason: `no window_group on ${w.face}`,
      };

  return { ...w, addGroup, increaseCount, removeGroup };
}

export function getRichBlueprintAffordancesForPlanner(
  blueprint: GenericBuildingBlueprintV2,
): RichBlueprintAffordancesForPlanner {
  const base = getBlueprintAffordancesForPlanner(blueprint);
  return {
    ...base,
    porchRich: buildPorchRich(base, base.porch),
    chimneyRich: buildChimneyRich(base, base.chimney),
    windowsRich: base.windows.map((w) => buildWindowRich(base, w)),
  };
}

export function renderRichAffordancesText(
  rich: RichBlueprintAffordancesForPlanner,
): string {
  const lines: string[] = ["Rich blueprint affordances:"];

  const fmt = (label: string, action: AffordanceAction) => {
    if (action.available) {
      lines.push(`- ${label}: available`);
    } else {
      const alts =
        action.alternatives && action.alternatives.length > 0
          ? ` Alternatives: ${action.alternatives.join("; ")}.`
          : "";
      lines.push(`- ${label}: false — ${action.reason ?? "unavailable"}.${alts}`);
    }
  };

  fmt("porch.add", rich.porchRich.add);
  fmt("porch.widen", rich.porchRich.widen);
  fmt("porch.deepen", rich.porchRich.deepen);
  fmt("porch.remove", rich.porchRich.remove);

  fmt("chimney.add", rich.chimneyRich.add);
  fmt("chimney.remove", rich.chimneyRich.remove);

  for (const w of rich.windowsRich) {
    fmt(`window.${w.face}.addGroup`, w.addGroup);
    fmt(`window.${w.face}.increaseCount`, w.increaseCount);
  }

  if (rich.frontWindowsAtCapacity) {
    lines.push("- note: frontWindowsAtCapacity=true — do not increase front-windows count");
  }

  if (rich.removableIds.chimney) {
    lines.push(`- removable chimney id: ${rich.removableIds.chimney}`);
  }
  if (rich.removableIds.porch) {
    lines.push(`- removable porch id: ${rich.removableIds.porch}`);
  }

  return lines.join("\n");
}

/** Re-export for callers that only need the legacy shape. */
export { getBlueprintAffordancesForPlanner, renderAffordancesText };
