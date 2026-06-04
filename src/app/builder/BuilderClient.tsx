"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BuilderSidebar } from "@/src/app/builder/components/BuilderSidebar";
import { BuilderWorkspace } from "@/src/app/builder/components/BuilderWorkspace";
import type { BuilderMessageView } from "@/src/app/builder/components/BuilderMessage";
import type { PendingImageReference } from "@/src/app/builder/components/BuilderPromptInput";
import { prepareMessagesForChatApi } from "@/src/lib/builder/builderChatGuardrails";
import { consumeBuilderChatSse } from "@/src/lib/builder/consumeBuilderChatStream";
import type {
  BuilderChatErrorResponse,
  BuilderChatSuccessResponse,
  BuilderChatWithToolSuccessResponse,
} from "@/src/lib/builder/builderChatTypes";
import { buildActivityEventsFromToolResult } from "@/src/lib/builder/builderActivityFromTool";
import { buildMockActivitySteps } from "@/src/lib/builder/mockBuilderActivity";
import { shouldRunGenerationTool } from "@/src/lib/builder/shouldRunGenerationTool";
import {
  shouldRunRefinementTool,
  shouldStrongCreatePrompt,
} from "@/src/lib/builder/shouldRunRefinementTool";
import {
  cloneChatMessages,
  createEmptyBuilderChat,
  DEFAULT_BUILDER_CHAT_ID,
  INITIAL_BUILDER_CHATS,
  type BuilderChat,
  type BuilderMessage,
} from "@/src/app/builder/mockBuilderData";

function cloneInitialChats(): BuilderChat[] {
  return INITIAL_BUILDER_CHATS.map((c) => ({
    ...c,
    messages: cloneChatMessages(c),
  }));
}

function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function toApiMessages(
  messages: readonly BuilderMessage[],
): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m): m is BuilderMessage & { role: "user" | "assistant" } =>
      m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export function BuilderClient() {
  const [chats, setChats] = useState<BuilderChat[]>(cloneInitialChats);
  const [activeChatId, setActiveChatId] = useState(DEFAULT_BUILDER_CHAT_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [messageViews, setMessageViews] = useState<Record<string, BuilderMessageView[]>>({});
  const [validationWarnings, setValidationWarnings] = useState<readonly string[]>([]);
  const [previewGenerationNonce, setPreviewGenerationNonce] = useState(0);
  const resetSnapshots = useRef(
    new Map(INITIAL_BUILDER_CHATS.map((c) => [c.id, cloneChatMessages(c)])),
  );
  const sendInFlightRef = useRef(false);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? chats[0]!,
    [chats, activeChatId],
  );

  const displayMessages = useMemo((): BuilderMessageView[] => {
    const extra = messageViews[activeChat.id];
    if (!extra) {
      return activeChat.messages.map((m) => ({ ...m }));
    }
    return extra;
  }, [activeChat.id, activeChat.messages, messageViews]);

  const updateChat = useCallback((chatId: string, updater: (c: BuilderChat) => BuilderChat) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? updater(c) : c)));
  }, []);

  const syncViews = useCallback((chatId: string, messages: readonly BuilderMessage[]) => {
    setMessageViews((prev) => ({
      ...prev,
      [chatId]: messages.map((m) => ({ ...m })),
    }));
  }, []);

  const handleNewBuild = useCallback(() => {
    const id = `chat-${Date.now()}`;
    const chat = createEmptyBuilderChat(id, "Untitled build");
    resetSnapshots.current.set(id, cloneChatMessages(chat));
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(id);
    syncViews(id, chat.messages);
    setValidationWarnings([]);
  }, [syncViews]);

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setValidationWarnings([]);
  }, []);

  const appendAssistantError = useCallback(
    (
      chatId: string,
      withUser: BuilderMessage[],
      errText: string,
      hasImage: boolean,
    ) => {
      const errMsg: BuilderMessageView = {
        id: newMessageId(),
        role: "assistant",
        content: errText,
        createdAtLabel: "Just now",
        isError: true,
        activitySteps: buildMockActivitySteps(hasImage),
      };
      const finalMsgs = [...withUser, errMsg];
      updateChat(chatId, (c) => ({ ...c, messages: finalMsgs }));
      syncViews(chatId, finalMsgs);
    },
    [syncViews, updateChat],
  );

  const handleSendMessage = useCallback(
    async (text: string, image: PendingImageReference | null) => {
      if (sendInFlightRef.current) return;
      const chatId = activeChatId;

      const content =
        text.trim() ||
        (image ? "Please interpret this reference image for building intent." : "");
      if (!content && !image) return;

      const userMsg: BuilderMessage = {
        id: newMessageId(),
        role: "user",
        content,
        createdAtLabel: "Just now",
        attachments: image
          ? [
              {
                id: newMessageId(),
                type: "image",
                source: "user_reference",
                name: image.name,
                previewUrl: image.previewUrl,
              },
            ]
          : undefined,
      };

      let withUser: BuilderMessage[] = [];
      updateChat(chatId, (c) => {
        withUser = [...c.messages, userMsg];
        return {
          ...c,
          status: c.status === "empty" ? "draft" : c.status,
          messages: withUser,
        };
      });
      syncViews(chatId, withUser);

      const prepared = prepareMessagesForChatApi(toApiMessages(withUser));
      if (!prepared.ok) {
        appendAssistantError(chatId, withUser, prepared.error, image != null);
        return;
      }

      sendInFlightRef.current = true;
      setIsLoading(true);

      let attachmentPayload: {
        type: "image";
        source: "user_reference";
        mimeType: PendingImageReference["mimeType"];
        dataBase64: string;
        name: string;
      } | null = null;

      const assistantId = newMessageId();
      const hasImage = image != null;
      const hasBlueprint = activeChat.activeBlueprint != null;
      const willRunRefine = shouldRunRefinementTool(content, hasBlueprint, hasImage);
      const willRunGenerate =
        shouldRunGenerationTool(content, hasImage) &&
        (!hasBlueprint || shouldStrongCreatePrompt(content));
      const willRunTool = willRunRefine || willRunGenerate;
      const activitySteps = buildMockActivitySteps(hasImage);

      const patchAssistant = (patch: Partial<BuilderMessageView>) => {
        updateChat(chatId, (c) => {
          const messages = c.messages.map((m) =>
            m.id === assistantId ? { ...m, ...patch } : m,
          ) as BuilderMessage[];
          syncViews(chatId, messages);
          return { ...c, messages };
        });
      };

      const assistantPlaceholder: BuilderMessageView = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAtLabel: "Just now",
        isStreaming: !hasImage && !willRunTool,
      };
      const withAssistant = [...withUser, assistantPlaceholder];
      updateChat(chatId, (c) => ({ ...c, messages: withAssistant }));
      syncViews(chatId, withAssistant);

      try {
        if (image) {
          const dataBase64 = await fileToBase64(image.file);
          attachmentPayload = {
            type: "image",
            source: "user_reference",
            mimeType: image.mimeType,
            dataBase64,
            name: image.name,
          };
        }

        const res = await fetch("/api/builder/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: prepared.messages,
            attachment: attachmentPayload,
            currentBlueprint: activeChat.activeBlueprint,
            ...(activeChat.generatedStructure?.blocks.length != null
              ? { currentBlockCount: activeChat.generatedStructure.blocks.length }
              : {}),
          }),
        });

        const chatMode = res.headers.get("X-Builder-Chat-Mode");
        const isStream =
          chatMode === "stream" ||
          (res.headers.get("Content-Type") ?? "").includes("text/event-stream");

        if (isStream) {
          let content = "";
          let streamFailed = false;
          const { completed } = await consumeBuilderChatSse(res, {
            onChunk: (text) => {
              content += text;
              patchAssistant({ content, isStreaming: true });
            },
            onDone: () => {
              patchAssistant({
                content: content.trim() || "No response from the assistant.",
                isStreaming: false,
                activitySteps,
              });
            },
            onError: (errText) => {
              streamFailed = true;
              patchAssistant({
                content: errText,
                isStreaming: false,
                isError: true,
                activitySteps,
              });
            },
          });
          if (!streamFailed && !completed && content.trim().length > 0) {
            patchAssistant({
              content: content.trim(),
              isStreaming: false,
              activitySteps,
            });
          } else if (!streamFailed && !completed && content.trim().length === 0) {
            patchAssistant({
              content: "The assistant stream ended without a response. Try again.",
              isStreaming: false,
              isError: true,
              activitySteps,
            });
          }
          return;
        }

        const data = (await res.json()) as
          | BuilderChatSuccessResponse
          | BuilderChatWithToolSuccessResponse
          | BuilderChatErrorResponse;

        if (!res.ok || !("message" in data) || typeof data.message !== "string") {
          const errText =
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Couldn't reach the building assistant. Try again.";
          patchAssistant({
            content: errText,
            isStreaming: false,
            isError: true,
            activitySteps,
          });
          return;
        }

        const toolResult =
          "toolResult" in data && data.toolResult != null ? data.toolResult : null;
        const steps = toolResult
          ? buildActivityEventsFromToolResult(toolResult, hasImage)
          : activitySteps;

        if (toolResult?.ok && toolResult.blocks && toolResult.blocks.length > 0) {
          const structure = { blocks: [...toolResult.blocks] };
          const presetId = toolResult.presetId ?? activeChat.presetId;
          updateChat(chatId, (c) => ({
            ...c,
            presetId,
            status: "preview_ready",
            generatedStructure: structure,
            activeBlueprint: toolResult.blueprint ?? c.activeBlueprint,
            lastOperationSummary: toolResult.assistantSummary,
            lastRejectionCode: undefined,
            lastRejectionDetail: undefined,
          }));
          setValidationWarnings(
            (toolResult.validationIssues ?? [])
              .filter((i) => i.severity === "warning")
              .map((i) => i.message),
          );
          setPreviewGenerationNonce((n) => n + 1);
        } else if (toolResult && !toolResult.ok) {
          setValidationWarnings([]);
          updateChat(chatId, (c) => ({
            ...c,
            lastRejectionCode: toolResult.rejectionCode,
            lastRejectionDetail: toolResult.rejectionDetail,
          }));
        }

        patchAssistant({
          content: data.message,
          isStreaming: false,
          activitySteps: steps,
        });
      } catch {
        patchAssistant({
          content:
            "Couldn't reach the building assistant. Check your connection and server configuration.",
          isStreaming: false,
          isError: true,
          activitySteps,
        });
      } finally {
        sendInFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [activeChat.activeBlueprint, activeChatId, activeChat.presetId, appendAssistantError, syncViews, updateChat],
  );

  const handleResetChat = useCallback(() => {
    const snapshot = resetSnapshots.current.get(activeChatId);
    if (!snapshot) return;
    const restored = snapshot.map((m) => ({ ...m }));
    updateChat(activeChatId, (c) => ({
      ...c,
      messages: restored,
      generatedStructure: null,
      activeBlueprint: null,
      status: "empty",
    }));
    syncViews(activeChatId, restored);
    setValidationWarnings([]);
  }, [activeChatId, syncViews, updateChat]);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="max-h-[36vh] shrink-0 lg:max-h-none lg:h-full lg:shrink-0">
        <BuilderSidebar
          chats={chats}
          activeChatId={activeChat.id}
          onSelectChat={handleSelectChat}
          onNewBuild={handleNewBuild}
        />
      </div>
      <BuilderWorkspace
        chat={activeChat}
        messages={displayMessages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onResetChat={handleResetChat}
        validationWarnings={validationWarnings}
        previewGenerationNonce={previewGenerationNonce}
      />
    </div>
  );
}
