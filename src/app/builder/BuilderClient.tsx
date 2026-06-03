"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BuilderSidebar } from "@/src/app/builder/components/BuilderSidebar";
import { BuilderWorkspace } from "@/src/app/builder/components/BuilderWorkspace";
import {
  cloneChatMessages,
  createEmptyBuilderChat,
  INITIAL_BUILDER_CHATS,
  pickCannedResponse,
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

export function BuilderClient() {
  const [chats, setChats] = useState<BuilderChat[]>(cloneInitialChats);
  const [activeChatId, setActiveChatId] = useState(INITIAL_BUILDER_CHATS[0]!.id);
  const [replyIndex, setReplyIndex] = useState(0);
  const resetSnapshots = useRef(
    new Map(INITIAL_BUILDER_CHATS.map((c) => [c.id, cloneChatMessages(c)])),
  );

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? chats[0]!,
    [chats, activeChatId],
  );

  const updateChat = useCallback((chatId: string, updater: (c: BuilderChat) => BuilderChat) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? updater(c) : c)));
  }, []);

  const handleNewBuild = useCallback(() => {
    const id = `chat-${Date.now()}`;
    const chat = createEmptyBuilderChat(id, "Untitled build");
    resetSnapshots.current.set(id, cloneChatMessages(chat));
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(id);
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      const userMsg: BuilderMessage = {
        id: newMessageId(),
        role: "user",
        content: text,
        createdAtLabel: "Just now",
      };
      const assistantMsg: BuilderMessage = {
        id: newMessageId(),
        role: "assistant",
        content: pickCannedResponse(replyIndex),
        createdAtLabel: "Just now",
      };
      setReplyIndex((i) => i + 1);

      updateChat(activeChatId, (c) => ({
        ...c,
        status: c.status === "empty" ? "draft" : c.status,
        messages: [...c.messages, userMsg, assistantMsg],
      }));

      // Future: POST /api/blueprint/generate or /api/blueprint/refine
      // → validateBlueprint() → generateStructure() → update preview state
    },
    [activeChatId, replyIndex, updateChat],
  );

  const handleResetChat = useCallback(() => {
    const snapshot = resetSnapshots.current.get(activeChatId);
    if (!snapshot) return;
    updateChat(activeChatId, (c) => ({
      ...c,
      messages: snapshot.map((m) => ({ ...m })),
    }));
  }, [activeChatId, updateChat]);

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
        onSendMessage={handleSendMessage}
        onResetChat={handleResetChat}
      />
    </div>
  );
}
