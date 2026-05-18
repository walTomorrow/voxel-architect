"use client";

import type {
  ComponentId,
  GenericBuildingComponentV2,
  HorizontalPlacementV2,
  PorchWidthModeV2,
  RoofKindV2,
  RoomSurfaceRef,
  ShedOrientationV2,
  WindowHeightBandV2,
  WindowLayoutV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ClassicMaterialKey } from "@/src/lib/blueprints/types";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import { CLASSIC_MATERIAL_KEYS } from "@/src/app/generic-lab/genericLabUtils";
import {
  doorComponentIds,
  patchComponent,
  setComponentMaterialOverride,
  targetSurfaceOptions,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";

const INPUT_CLASS =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100";
const SELECT_CLASS = INPUT_CLASS;

const ROOF_KINDS: readonly RoofKindV2[] = ["pitched_gable", "shed", "none"];
const SHED_ORIENTATIONS: readonly ShedOrientationV2[] = ["front_back", "left_right"];
const HORIZONTAL_PLACEMENTS: readonly HorizontalPlacementV2["horizontal"][] = [
  "left",
  "center",
  "right",
];
const WINDOW_LAYOUTS: readonly WindowLayoutV2[] = ["symmetric", "even"];
const WINDOW_BANDS: readonly WindowHeightBandV2[] = ["auto", "mid", "upper"];
const PORCH_WIDTH_MODES: readonly PorchWidthModeV2[] = ["door_only", "full_facade"];

const MATERIAL_SLOTS = [
  ["wall", "Wall"],
  ["floor", "Floor"],
  ["roof", "Roof"],
  ["window", "Window"],
  ["door", "Door"],
  ["accent", "Accent"],
] as const;

type Props = {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly selectedComponentId: ComponentId | null;
  readonly onDraftChange: (draft: GenericBuildingBlueprintV2Draft) => void;
};

function FieldLabel({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      {children}
    </label>
  );
}

function SurfaceSelect({
  value,
  options,
  onChange,
}: {
  readonly value: RoomSurfaceRef;
  readonly options: readonly RoomSurfaceRef[];
  readonly onChange: (ref: RoomSurfaceRef) => void;
}) {
  return (
    <select
      className={SELECT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value as RoomSurfaceRef)}
    >
      {options.map((ref) => (
        <option key={ref} value={ref}>
          {ref}
        </option>
      ))}
    </select>
  );
}

export function ComponentInspectorPanel({
  draft,
  selectedComponentId,
  onDraftChange,
}: Props) {
  const component = selectedComponentId
    ? draft.components.find((c) => c.id === selectedComponentId)
    : undefined;

  const surfaceOptions = targetSurfaceOptions(draft);
  const doorIds = doorComponentIds(draft);

  function update(next: GenericBuildingComponentV2) {
    onDraftChange(patchComponent(draft, next.id, next));
  }

  if (!selectedComponentId) {
    return (
      <section className="space-y-2 border-t border-zinc-800/80 pt-4">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Inspector
        </h2>
        <p className="text-xs text-zinc-500">Select a component in the tree.</p>
      </section>
    );
  }

  if (!component) {
    return (
      <section className="space-y-2 border-t border-zinc-800/80 pt-4">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Inspector
        </h2>
        <p className="text-xs text-amber-300/90">
          Component &quot;{selectedComponentId}&quot; not found.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 border-t border-zinc-800/80 pt-4">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Inspector
      </h2>

      <FieldLabel label="Component id (read-only)">
        <input type="text" readOnly className={INPUT_CLASS} value={component.id} />
      </FieldLabel>

      <FieldLabel label="Type (read-only)">
        <input type="text" readOnly className={INPUT_CLASS} value={component.type} />
      </FieldLabel>

      {component.type === "room" ? (
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Width">
            <input
              type="number"
              className={INPUT_CLASS}
              value={component.width}
              onChange={(e) =>
                update({
                  ...component,
                  width: Number.parseInt(e.target.value, 10) || component.width,
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Depth">
            <input
              type="number"
              className={INPUT_CLASS}
              value={component.depth}
              onChange={(e) =>
                update({
                  ...component,
                  depth: Number.parseInt(e.target.value, 10) || component.depth,
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Wall height">
            <input
              type="number"
              className={INPUT_CLASS}
              value={component.wallHeight}
              onChange={(e) =>
                update({
                  ...component,
                  wallHeight:
                    Number.parseInt(e.target.value, 10) || component.wallHeight,
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Wall thickness">
            <input
              type="number"
              className={INPUT_CLASS}
              value={component.wallThickness}
              onChange={(e) =>
                update({
                  ...component,
                  wallThickness:
                    Number.parseInt(e.target.value, 10) || component.wallThickness,
                })
              }
            />
          </FieldLabel>
          <label className="col-span-2 flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={component.hollowInterior}
              onChange={(e) =>
                update({ ...component, hollowInterior: e.target.checked })
              }
            />
            Hollow interior
          </label>
        </div>
      ) : null}

      {component.type === "roof" ? (
        <div className="space-y-3">
          <FieldLabel label="Kind">
            <select
              className={SELECT_CLASS}
              value={component.kind}
              onChange={(e) =>
                update({ ...component, kind: e.target.value as RoofKindV2 })
              }
            >
              {ROOF_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Layers">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={component.layers ?? 1}
              onChange={(e) =>
                update({
                  ...component,
                  layers: Number.parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Overhang">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={component.overhang ?? 0}
              onChange={(e) =>
                update({
                  ...component,
                  overhang: Number.parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </FieldLabel>
          {component.kind === "shed" ? (
            <FieldLabel label="Orientation">
              <select
                className={SELECT_CLASS}
                value={component.orientation ?? "front_back"}
                onChange={(e) =>
                  update({
                    ...component,
                    orientation: e.target.value as ShedOrientationV2,
                  })
                }
              >
                {SHED_ORIENTATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FieldLabel>
          ) : null}
        </div>
      ) : null}

      {component.type === "door" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Width">
              <input
                type="number"
                className={INPUT_CLASS}
                value={component.width}
                onChange={(e) =>
                  update({
                    ...component,
                    width: Number.parseInt(e.target.value, 10) || component.width,
                  })
                }
              />
            </FieldLabel>
            <FieldLabel label="Height">
              <input
                type="number"
                className={INPUT_CLASS}
                value={component.height}
                onChange={(e) =>
                  update({
                    ...component,
                    height: Number.parseInt(e.target.value, 10) || component.height,
                  })
                }
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Target surface">
            <SurfaceSelect
              value={component.attach.targetSurface}
              options={surfaceOptions}
              onChange={(targetSurface) =>
                update({
                  ...component,
                  attach: { ...component.attach, targetSurface },
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Horizontal placement">
            <select
              className={SELECT_CLASS}
              value={component.attach.placement?.horizontal ?? "center"}
              onChange={(e) =>
                update({
                  ...component,
                  attach: {
                    ...component.attach,
                    placement: {
                      horizontal: e.target.value as HorizontalPlacementV2["horizontal"],
                    },
                  },
                })
              }
            >
              {HORIZONTAL_PLACEMENTS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
      ) : null}

      {component.type === "window_group" ? (
        <div className="space-y-3">
          <FieldLabel label="Count">
            <input
              type="number"
              min={0}
              className={INPUT_CLASS}
              value={component.count}
              onChange={(e) =>
                update({
                  ...component,
                  count: Number.parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Layout">
            <select
              className={SELECT_CLASS}
              value={component.layout}
              onChange={(e) =>
                update({ ...component, layout: e.target.value as WindowLayoutV2 })
              }
            >
              {WINDOW_LAYOUTS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Height band">
            <select
              className={SELECT_CLASS}
              value={component.heightBand ?? "auto"}
              onChange={(e) =>
                update({
                  ...component,
                  heightBand: e.target.value as WindowHeightBandV2,
                })
              }
            >
              {WINDOW_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Target surface">
            <SurfaceSelect
              value={component.attach.targetSurface}
              options={surfaceOptions}
              onChange={(targetSurface) =>
                update({
                  ...component,
                  attach: { ...component.attach, targetSurface },
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Horizontal placement">
            <select
              className={SELECT_CLASS}
              value={component.attach.placement?.horizontal ?? "center"}
              onChange={(e) =>
                update({
                  ...component,
                  attach: {
                    ...component.attach,
                    placement: {
                      horizontal: e.target.value as HorizontalPlacementV2["horizontal"],
                    },
                  },
                })
              }
            >
              {HORIZONTAL_PLACEMENTS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
      ) : null}

      {component.type === "porch" ? (
        <div className="space-y-3">
          <FieldLabel label="Depth">
            <input
              type="number"
              min={1}
              className={INPUT_CLASS}
              value={component.depth}
              onChange={(e) =>
                update({
                  ...component,
                  depth: Number.parseInt(e.target.value, 10) || component.depth,
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Width mode">
            <select
              className={SELECT_CLASS}
              value={component.widthMode}
              onChange={(e) =>
                update({
                  ...component,
                  widthMode: e.target.value as PorchWidthModeV2,
                })
              }
            >
              {PORCH_WIDTH_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Target surface">
            <SurfaceSelect
              value={component.attach.targetSurface}
              options={surfaceOptions}
              onChange={(targetSurface) =>
                update({
                  ...component,
                  attach: { ...component.attach, targetSurface },
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Around door (optional)">
            <select
              className={SELECT_CLASS}
              value={component.aroundDoor ?? ""}
              onChange={(e) =>
                update({
                  ...component,
                  aroundDoor: e.target.value || undefined,
                })
              }
            >
              <option value="">(none)</option>
              {doorIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
      ) : null}

      {component.type === "chimney" ? (
        <div className="space-y-3">
          <FieldLabel label="Target surface">
            <SurfaceSelect
              value={component.attach.targetSurface}
              options={surfaceOptions}
              onChange={(targetSurface) =>
                update({
                  ...component,
                  attach: { ...component.attach, targetSurface },
                })
              }
            />
          </FieldLabel>
          <FieldLabel label="Horizontal placement">
            <select
              className={SELECT_CLASS}
              value={component.attach.placement?.horizontal ?? "center"}
              onChange={(e) =>
                update({
                  ...component,
                  attach: {
                    ...component.attach,
                    placement: {
                      horizontal: e.target.value as HorizontalPlacementV2["horizontal"],
                    },
                  },
                })
              }
            >
              {HORIZONTAL_PLACEMENTS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
      ) : null}

      {component.type === "step" ? (
        <FieldLabel label="Target door">
          <select
            className={SELECT_CLASS}
            value={component.attach.targetDoor}
            onChange={(e) =>
              update({
                ...component,
                attach: { targetDoor: e.target.value },
              })
            }
          >
            {doorIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </FieldLabel>
      ) : null}

      <div className="space-y-2 border-t border-zinc-800/60 pt-3">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Material overrides
        </h3>
        <p className="text-[10px] text-zinc-600">
          Empty inherits from blueprint palette.
        </p>
        {MATERIAL_SLOTS.map(([slot, label]) => {
          const inherited = draft.materials[slot];
          const override = component.materials?.[slot];
          return (
            <FieldLabel key={slot} label={`${label} (palette: ${inherited})`}>
              <select
                className={SELECT_CLASS}
                value={override ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onDraftChange(
                    setComponentMaterialOverride(
                      draft,
                      component.id,
                      slot,
                      v ? (v as ClassicMaterialKey) : undefined,
                    ),
                  );
                }}
              >
                <option value="">(inherit)</option>
                {CLASSIC_MATERIAL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </FieldLabel>
          );
        })}
      </div>
    </section>
  );
}
