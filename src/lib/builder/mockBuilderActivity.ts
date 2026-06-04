import type { BuilderImageAttachmentInput } from "@/src/lib/builder/builderChatTypes";

export type BuilderActivityStep = {
  readonly id: string;
  readonly label: string;
  readonly status: "success";
};

export function buildMockActivitySteps(
  hasImage: boolean,
): readonly BuilderActivityStep[] {
  const steps: BuilderActivityStep[] = [
    { id: "parsed", label: "Parsed building request", status: "success" },
  ];
  if (hasImage) {
    steps.push({
      id: "image",
      label: "Included user reference image",
      status: "success",
    });
  }
  steps.push(
    { id: "drafted", label: "Drafted component blueprint (demo)", status: "success" },
    { id: "validated", label: "Validated blueprint (demo)", status: "success" },
    {
      id: "preview",
      label: "Preview unchanged — static preset",
      status: "success",
    },
    { id: "assistant", label: "Assistant response ready", status: "success" },
  );
  return steps;
}

export function hasImageAttachment(
  attachment: BuilderImageAttachmentInput | null | undefined,
): boolean {
  return attachment != null && attachment.type === "image";
}
