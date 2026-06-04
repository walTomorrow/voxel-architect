"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BuilderSidebar } from "@/src/app/builder/components/BuilderSidebar";
import { BuilderWorkspace } from "@/src/app/builder/components/BuilderWorkspace";
import type { BuilderMessageView } from "@/src/app/builder/components/BuilderMessage";
import type { PendingImageReference } from "@/src/app/builder/components/BuilderPromptInput";
import { prepareMessagesForChatApi } from "@/src/lib/builder/builderChatGuardrails";
import type { BuilderChatErrorResponse, BuilderChatSuccessResponse } from "@/src/lib/builder/builderChatTypes";
import { buildMockActivitySteps } from "@/src/lib/builder/mockBuilderActivity";
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
  }, [syncViews]);

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
          }),
        });

        const data = (await res.json()) as
          | BuilderChatSuccessResponse
          | BuilderChatErrorResponse;

        const activitySteps = buildMockActivitySteps(image != null);

        if (!res.ok || !("message" in data) || typeof data.message !== "string") {
          const errText =
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Couldn't reach the building assistant. Try again.";
          appendAssistantError(chatId, withUser, errText, image != null);
          return;
        }

        const assistantMsg: BuilderMessageView = {
          id: newMessageId(),
          role: "assistant",
          content: data.message,
          createdAtLabel: "Just now",
          activitySteps,
        };
        const finalMsgs = [...withUser, assistantMsg];
        updateChat(chatId, (c) => ({ ...c, messages: finalMsgs }));
        syncViews(chatId, finalMsgs);
      } catch {
        appendAssistantError(
          chatId,
          withUser,
          "Couldn't reach the building assistant. Check your connection and server configuration.",
          image != null,
        );
      } finally {
        sendInFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [activeChatId, appendAssistantError, syncViews, updateChat],
  );

  const handleResetChat = useCallback(() => {
    const snapshot = resetSnapshots.current.get(activeChatId);
    if (!snapshot) return;
    const restored = snapshot.map((m) => ({ ...m }));
    updateChat(activeChatId, (c) => ({ ...c, messages: restored }));
    syncViews(activeChatId, restored);
  }, [activeChatId, syncViews, updateChat]);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="max-h-[36vh] shrink-0 lg:max-h-none lg:h-full lg:shrink-0">
        <BuilderSidebar
          chats={chats}
          activeChatId={activeChat.id}
          onSelectChat={setActiveChatId}
          onNewBuild={handleNewBuild}
        />
      </div>
      <BuilderWorkspace
        chat={activeChat}
        messages={displayMessages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onResetChat={handleResetChat}
      />
    </div>
  );
}
