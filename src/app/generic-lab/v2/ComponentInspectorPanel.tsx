"use client";

import type {
  ComponentId,
  GenericBuildingComponentV2,
  HorizontalPlacementV2,
  RoomSurfaceRef,
  RoofKindV2,
  ShedOrientationV2,
  WindowHeightBandV2,
  WindowLayoutV2,
} from "@/src/lib/blueprints/types/genericBuildingV2";
import type { ClassicMaterialKey } from "@/src/lib/blueprints/types";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import type { GenericBuildingBlueprintV2Draft } from "@/src/lib/blueprints/validateGenericBuildingV2";
import { CLASSIC_MATERIAL_KEYS } from "@/src/app/generic-lab/genericLabUtils";
import {
  buildSelectedComponentPreview,
  componentDisplayName,
  faceDisplayLabel,
  faceFromComponent,
  horizontalPlacementLabel,
  issuesForComponent,
} from "@/src/app/generic-lab/v2/genericLabV2Display";
import {
  SegmentedHorizontal,
  SurfaceTargetPicker,
  TypeBadge,
  v2Panel,
} from "@/src/app/generic-lab/v2/genericLabV2Ui";
import {
  doorComponentIds,
  patchComponent,
  setComponentMaterialOverride,
} from "@/src/app/generic-lab/v2/genericLabV2Utils";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100";
const SELECT_CLASS = INPUT_CLASS;

const ROOF_KINDS: readonly RoofKindV2[] = ["pitched_gable", "shed", "none"];
const SHED_ORIENTATIONS: readonly ShedOrientationV2[] = ["front_back", "left_right"];
const WINDOW_LAYOUTS: readonly WindowLayoutV2[] = ["symmetric", "even"];
const WINDOW_BANDS: readonly WindowHeightBandV2[] = ["auto", "mid", "upper"];

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
  readonly allIssues: readonly ValidationIssue[];
};

function FieldLabel({
  label,
  hint,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-zinc-400">
      <span className="font-medium text-zinc-300">{label}</span>
      {hint ? <span className="mt-0.5 block text-[10px] text-zinc-600">{hint}</span> : null}
      {children}
    </label>
  );
}

function AttachSection({
  draft,
  component,
  update,
}: {
  readonly draft: GenericBuildingBlueprintV2Draft;
  readonly component: GenericBuildingComponentV2 & {
    readonly attach: {
      readonly targetSurface: RoomSurfaceRef;
      readonly placement?: { readonly horizontal: HorizontalPlacementV2["horizontal"] };
    };
  };
  readonly update: (next: GenericBuildingComponentV2) => void;
}) {
  const face = faceFromComponent(component);
  const h = component.attach.placement?.horizontal ?? "center";

  return (
    <div className="space-y-3 rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-3">
      {face ? (
        <p className="text-xs text-zinc-400">
          Attached to{" "}
          <span className="font-medium text-zinc-200">{faceDisplayLabel(face)}</span>
        </p>
      ) : null}
      <FieldLabel label="Target surface">
        <SurfaceTargetPicker
          draft={draft}
          selectedRef={component.attach.targetSurface}
          onChange={(targetSurface) =>
            update({
              ...component,
              attach: { ...component.attach, targetSurface },
            } as GenericBuildingComponentV2)
          }
        />
      </FieldLabel>
      <FieldLabel label="Horizontal placement">
        <p className="mb-1.5 text-[10px] text-zinc-600">
          Placement: {horizontalPlacementLabel(h)}
        </p>
        <SegmentedHorizontal
          value={h}
          onChange={(horizontal) =>
            update({
              ...component,
              attach: { ...component.attach, placement: { horizontal } },
            } as GenericBuildingComponentV2)
          }
        />
      </FieldLabel>
    </div>
  );
}

export function ComponentInspectorPanel({
  draft,
  selectedComponentId,
  onDraftChange,
  allIssues,
}: Props) {
  const component = selectedComponentId
    ? draft.components.find((c) => c.id === selectedComponentId)
    : undefined;

  const doorIds = doorComponentIds(draft);

  function update(next: GenericBuildingComponentV2) {
    onDraftChange(patchComponent(draft, next.id, next));
  }

  if (!selectedComponentId) {
    return (
      <div className={`${v2Panel()} flex h-full items-center justify-center p-6 text-xs text-zinc-500`}>
        Select a component in the semantic map.
      </div>
    );
  }

  if (!component) {
    return (
      <div className={`${v2Panel()} p-4 text-xs text-amber-300/90`}>
        Component &quot;{selectedComponentId}&quot; not found.
      </div>
    );
  }

  const compIssues = issuesForComponent(allIssues, component.id);
  const preview = buildSelectedComponentPreview(draft, component.id);
  const face = faceFromComponent(component);

  return (
    <div className={`${v2Panel()} flex h-full min-h-0 flex-col`}>
      <div className="shrink-0 border-b border-zinc-700/60 px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <TypeBadge type={component.type} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">
              {componentDisplayName(component)}
            </h2>
            <p className="font-mono text-[10px] text-zinc-600">id: {component.id}</p>
            {face ? (
              <p className="mt-1 text-[11px] text-zinc-400">
                {faceDisplayLabel(face)}
                {preview?.details ? (
                  <span className="text-zinc-600"> · {preview.details}</span>
                ) : null}
              </p>
            ) : preview?.details ? (
              <p className="mt-1 text-[11px] text-zinc-500">{preview.details}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {compIssues.length > 0 ? (
          <ul className="space-y-1">
            {compIssues.map((issue, idx) => (
              <li
                key={`${issue.code}-${idx}`}
                className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-2 py-1.5 text-[10px] text-amber-200/90"
              >
                [{issue.code}] {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

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
            <AttachSection draft={draft} component={component} update={update} />
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
            <AttachSection draft={draft} component={component} update={update} />
          </div>
        ) : null}

        {component.type === "porch" ? (
          <div className="space-y-3">
            <AttachSection draft={draft} component={component} update={update} />
            <FieldLabel label="Width mode">
              <div className="mt-1 inline-flex rounded-lg border border-zinc-600/80 bg-zinc-950/60 p-0.5">
                {(
                  [
                    ["door_only", "Door only"],
                    ["full_facade", "Full facade"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update({ ...component, widthMode: mode })}
                    className={[
                      "rounded-md px-3 py-1.5 text-[11px] font-medium transition",
                      component.widthMode === mode
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-500 hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FieldLabel>
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
            <FieldLabel label="Around door" hint="Optional when width mode is door only">
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
          <AttachSection draft={draft} component={component} update={update} />
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

        <details className="rounded-lg border border-zinc-700/50 bg-zinc-950/30">
          <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Material overrides
          </summary>
          <div className="space-y-2 border-t border-zinc-700/50 p-3">
            {MATERIAL_SLOTS.map(([slot, label]) => {
              const inherited = draft.materials[slot];
              const override = component.materials?.[slot];
              return (
                <FieldLabel key={slot} label={`${label}`} hint={`Palette: ${inherited}`}>
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
        </details>
      </div>
    </div>
  );
}
