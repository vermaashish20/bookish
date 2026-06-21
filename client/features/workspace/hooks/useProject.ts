'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearChatThreadMessages,
  createChatThread,
  fetchChatThreads,
  fetchProject,
  fetchProjectMessages,
} from '@/lib/api';
import type { BookProject, ChatMessage, ChatSession } from '@/lib/types';
import { sanitizeAssistantText } from '@/lib/agent/display';

type PersistedChatMessage = {
  id?: string;
  _id?: string;
  role?: string;
  content?: string;
  createdAt?: string;
};

function normalizeThread(session: ChatSession & { threadId?: string }): ChatSession {
  return {
    ...session,
    id: session.id ?? session.threadId ?? 'unknown',
  };
}

function chatSenderFromRole(role?: string): ChatMessage['sender'] {
  if (role === 'user') return 'user';
  return 'System';
}

function mapPersistedMessages(messages: PersistedChatMessage[]): ChatMessage[] {
  return messages.map((message, index) => ({
    id: message.id ?? message._id ?? `persisted-${index}`,
    sender: chatSenderFromRole(message.role),
    text:
      message.role === 'user'
        ? message.content ?? ''
        : sanitizeAssistantText(message.content ?? ''),
    timestamp: message.createdAt ?? new Date().toISOString(),
  }));
}

export function useProject(projectId: string) {
  const router = useRouter();
  const [book, setBook] = useState<BookProject | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatSession[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const updateBook = useCallback((updated: BookProject) => {
    setBook(updated);
  }, []);

  const loadMessagesForThread = useCallback(async (threadId: string) => {
    const messages = await fetchProjectMessages(projectId, threadId).catch(() => []);
    setChatMessages(mapPersistedMessages(messages as PersistedChatMessage[]));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchProject(projectId),
      fetchChatThreads(projectId).catch(() => []),
    ])
      .then(async ([project, threads]) => {
        if (cancelled) return;
        const normalizedThreads = (threads as ChatSession[]).map(normalizeThread);
        const initialThreadId = normalizedThreads[0]?.id ?? null;
        setBook(project);
        setChatThreads(normalizedThreads);
        setActiveThreadId(initialThreadId);
        if (initialThreadId) {
          const messages = await fetchProjectMessages(projectId, initialThreadId).catch(() => []);
          if (!cancelled) setChatMessages(mapPersistedMessages(messages as PersistedChatMessage[]));
        } else {
          setChatMessages([]);
        }
      })
      .catch(() => {
        if (!cancelled) router.push('/');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  const switchChatThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId);
    await loadMessagesForThread(threadId);
  }, [loadMessagesForThread]);

  const startNewChatThread = useCallback(async () => {
    const thread = normalizeThread(await createChatThread(projectId));
    setChatThreads((prev) => [thread, ...prev.filter((item) => item.id !== thread.id)]);
    setActiveThreadId(thread.id);
    setChatMessages([]);
  }, [projectId]);

  const clearActiveChatThread = useCallback(async () => {
    if (!activeThreadId) return;
    await clearChatThreadMessages(projectId, activeThreadId);
    setChatMessages([]);
    setChatThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? { ...thread, messageCount: 0, updatedAt: null }
          : thread,
      ),
    );
  }, [activeThreadId, projectId]);

  return {
    book,
    setBook,
    updateBook,
    chatMessages,
    setChatMessages,
    chatThreads,
    chatSessions: chatThreads,
    activeThreadId,
    activeChatSessionId: activeThreadId,
    switchChatThread,
    switchChatSession: switchChatThread,
    startNewChatThread,
    startNewChatSession: startNewChatThread,
    clearActiveChatThread,
    clearActiveChatSession: clearActiveChatThread,
    loading,
  };
}

export type UseProjectReturn = ReturnType<typeof useProject>;
