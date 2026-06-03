import { DEFAULT_GENERIC_PRESET_ID } from "@/src/lib/blueprints/sampleGenericBuildingBlueprints";

export type BuilderMessageRole = "user" | "assistant" | "system";

export interface BuilderAttachment {
  readonly id: string;
  readonly type: "image";
  readonly name: string;
  readonly previewUrl?: string;
  readonly status: "mock" | "pending" | "uploaded";
}

export interface BuilderMessage {
  readonly id: string;
  readonly role: BuilderMessageRole;
  readonly content: string;
  readonly createdAtLabel: string;
  readonly attachments?: readonly BuilderAttachment[];
}

export type BuilderChatStatus = "empty" | "draft" | "preview_ready";

export interface BuilderChat {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly status: BuilderChatStatus;
  readonly presetId: string;
  readonly messages: readonly BuilderMessage[];
  /** Future: link to persisted blueprint record */
  readonly blueprintId?: string;
  readonly blueprintVersion?: number;
  readonly lastOperationSummary?: string;
}

export const BUILDER_DEFAULT_PRESET_ID = DEFAULT_GENERIC_PRESET_ID;

export const CANNED_ASSISTANT_RESPONSES = [
  "I can turn that into a structured building plan. For now, this demo keeps the preview static while we build the AI workflow.",
  "Got it — future versions will translate this request into blueprint edits and regenerate the voxel structure.",
  "I'll eventually use this instruction to update the building components instead of placing blocks directly.",
] as const;

const ASSISTANT_GREETING: BuilderMessage = {
  id: "msg-greeting",
  role: "assistant",
  content:
    "Describe the building you want — size, materials, porch, windows, roof style. I'll turn your words into a structured plan and voxel preview once AI generation is connected.",
  createdAtLabel: "Just now",
};

function msg(
  id: string,
  role: BuilderMessageRole,
  content: string,
  label: string,
): BuilderMessage {
  return { id, role, content, createdAtLabel: label };
}

export function createEmptyBuilderChat(id: string, title = "New build"): BuilderChat {
  return {
    id,
    title,
    subtitle: "Start describing your build",
    status: "empty",
    presetId: BUILDER_DEFAULT_PRESET_ID,
    messages: [ASSISTANT_GREETING],
  };
}

export const INITIAL_BUILDER_CHATS: BuilderChat[] = [
  {
    id: "chat-cottage",
    title: "Cozy Stone Cottage",
    subtitle: "Rustic cabin · front porch",
    status: "preview_ready",
    presetId: "simple_rustic_cabin",
    messages: [
      ASSISTANT_GREETING,
      msg(
        "cottage-u1",
        "user",
        "A small stone cottage with a dark oak roof, two front windows, and a front step.",
        "Yesterday",
      ),
      msg(
        "cottage-a1",
        "assistant",
        "Here's a starting point using our rustic cabin preset — chimney on the right, gable roof, cobblestone walls.",
        "Yesterday",
      ),
    ],
  },
  {
    id: "chat-workshop",
    title: "Riverside Workshop",
    subtitle: "Wide shed roof · side windows",
    status: "preview_ready",
    presetId: "shed_roof_workshop",
    messages: [
      ASSISTANT_GREETING,
      msg(
        "work-u1",
        "user",
        "A wide workshop with a shed roof, limestone walls, and windows on the front and sides.",
        "2 days ago",
      ),
      msg(
        "work-a1",
        "assistant",
        "This demo maps that description to our shed-roof workshop preset. Refinement will update blueprint fields, not individual blocks.",
        "2 days ago",
      ),
    ],
  },
  {
    id: "chat-cabin",
    title: "Small Oak Cabin",
    subtitle: "Compact retreat",
    status: "draft",
    presetId: "simple_rustic_cabin",
    messages: [
      ASSISTANT_GREETING,
      msg(
        "cabin-u1",
        "user",
        "Make it feel like a forest cabin — warm wood, modest footprint.",
        "Last week",
      ),
    ],
  },
  createEmptyBuilderChat("chat-new", "Empty new build"),
];

export function statusLabel(status: BuilderChatStatus): string {
  switch (status) {
    case "empty":
      return "Draft";
    case "draft":
      return "Draft";
    case "preview_ready":
      return "Preview ready";
  }
}

export function pickCannedResponse(index: number): string {
  return CANNED_ASSISTANT_RESPONSES[index % CANNED_ASSISTANT_RESPONSES.length]!;
}

export function cloneChatMessages(chat: BuilderChat): BuilderMessage[] {
  return chat.messages.map((m) => ({ ...m }));
}
