import type {
  BuilderActivityEvent,
  GenerateBuildingPreviewResult,
} from "@/src/lib/builder/builderToolTypes";

export function buildActivityEventsFromToolResult(
  result: GenerateBuildingPreviewResult,
  hasImage: boolean,
): readonly BuilderActivityEvent[] {
  const events: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed building request", status: "success" },
  ];

  if (hasImage) {
    events.push({
      id: "image",
      label: "Included user reference image (chat only)",
      status: "success",
    });
  }

  for (const step of result.activityEvents) {
    if (step.id === "parsed" || step.id === "image") continue;
    events.push(step);
  }

  events.push({
    id: "assistant",
    label: "Assistant response ready",
    status: result.ok ? "success" : "error",
  });

  return events;
}

export function buildChatOnlyActivitySteps(
  hasImage: boolean,
): readonly BuilderActivityEvent[] {
  const steps: BuilderActivityEvent[] = [
    { id: "parsed", label: "Parsed message", status: "success" },
  ];
  if (hasImage) {
    steps.push({
      id: "image",
      label: "Included user reference image",
      status: "success",
    });
  }
  steps.push({
    id: "assistant",
    label: "Assistant response ready",
    status: "success",
  });
  return steps;
}
