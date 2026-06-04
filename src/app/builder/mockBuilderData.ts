import { DEFAULT_GENERIC_V2_PRESET_ID } from "@/src/lib/blueprints/sampleGenericBuildingBlueprintsV2";
import type { VoxelStructure } from "@/src/lib/voxel/types";

export type BuilderMessageRole = "user" | "assistant" | "system";

export type BuilderImageSource = "user_reference" | "canonical_render";

export interface BuilderAttachment {
  readonly id: string;
  readonly type: "image";
  readonly source: BuilderImageSource;
  readonly name: string;
  readonly previewUrl?: string;
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
  /** In-memory generated preview; lost on refresh. */
  readonly generatedStructure: VoxelStructure | null;
  /** Future: link to persisted blueprint record */
  readonly blueprintId?: string;
  readonly blueprintVersion?: number;
  readonly lastOperationSummary?: string;
}

export const BUILDER_DEFAULT_PRESET_ID = DEFAULT_GENERIC_V2_PRESET_ID;

export const DEFAULT_BUILDER_CHAT_ID = "chat-default";

/** No seeded user/assistant turns — system prompt is injected server-side only. */
export function createEmptyBuilderChat(
  id: string,
  title = "Untitled build",
): BuilderChat {
  return {
    id,
    title,
    subtitle: "Start describing your build",
    status: "empty",
    presetId: BUILDER_DEFAULT_PRESET_ID,
    messages: [],
    generatedStructure: null,
  };
}

export const INITIAL_BUILDER_CHATS: BuilderChat[] = [
  createEmptyBuilderChat(DEFAULT_BUILDER_CHAT_ID, "Untitled build"),
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

export function cloneChatMessages(chat: BuilderChat): BuilderMessage[] {
  return chat.messages.map((m) => ({ ...m }));
}

