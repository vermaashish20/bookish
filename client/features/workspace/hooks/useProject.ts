'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearChatSessionMessages,
  createChatSession,
  fetchChatSessions,
  fetchProject,
  fetchProjectMessages,
} from '@/lib/api';
import type { BookProject, ChatMessage, ChatSession } from '@/lib/types';

const DEFAULT_CHAT_SESSION_ID = 'default';

type PersistedChatMessage = {
  id?: string;
  _id?: string;
  role?: string;
  content?: string;
  createdAt?: string;
};

function chatSenderFromRole(role?: string): ChatMessage['sender'] {
  if (role === 'user') return 'user';
  return 'System';
}

function mapPersistedMessages(messages: PersistedChatMessage[]): ChatMessage[] {
  return messages.map((message, index) => ({
    id: message.id ?? message._id ?? `persisted-${index}`,
    sender: chatSenderFromRole(message.role),
    text: message.content ?? '',
    timestamp: message.createdAt ?? new Date().toISOString(),
  }));
}

export function useProject(projectId: string) {
  const router = useRouter();
  const [book, setBook] = useState<BookProject | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState(DEFAULT_CHAT_SESSION_ID);
  const [loading, setLoading] = useState(true);

  const updateBook = useCallback((updated: BookProject) => {
    setBook(updated);
  }, []);

  const loadMessagesForSession = useCallback(async (sessionId: string) => {
    const messages = await fetchProjectMessages(projectId, sessionId).catch(() => []);
    setChatMessages(mapPersistedMessages(messages as PersistedChatMessage[]));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchProject(projectId),
      fetchChatSessions(projectId).catch(() => []),
    ])
      .then(async ([project, sessions]) => {
        if (cancelled) return;
        const normalizedSessions = (sessions as ChatSession[]);
        const initialSessionId = normalizedSessions[0]?.id ?? DEFAULT_CHAT_SESSION_ID;
        setBook(project);
        setChatSessions(
          normalizedSessions.length
            ? normalizedSessions
            : [{ id: DEFAULT_CHAT_SESSION_ID, title: 'Default chat', messageCount: 0 }],
        );
        setActiveChatSessionId(initialSessionId);
        const messages = await fetchProjectMessages(projectId, initialSessionId).catch(() => []);
        if (!cancelled) setChatMessages(mapPersistedMessages(messages as PersistedChatMessage[]));
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

  const switchChatSession = useCallback(async (sessionId: string) => {
    setActiveChatSessionId(sessionId);
    await loadMessagesForSession(sessionId);
  }, [loadMessagesForSession]);

  const startNewChatSession = useCallback(async () => {
    const session = await createChatSession(projectId);
    setChatSessions((prev) => [session, ...prev.filter((item) => item.id !== session.id)]);
    setActiveChatSessionId(session.id);
    setChatMessages([]);
  }, [projectId]);

  const clearActiveChatSession = useCallback(async () => {
    await clearChatSessionMessages(projectId, activeChatSessionId);
    setChatMessages([]);
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === activeChatSessionId
          ? { ...session, messageCount: 0, updatedAt: null }
          : session,
      ),
    );
  }, [activeChatSessionId, projectId]);

  return {
    book,
    setBook,
    updateBook,
    chatMessages,
    setChatMessages,
    chatSessions,
    activeChatSessionId,
    switchChatSession,
    startNewChatSession,
    clearActiveChatSession,
    loading,
  };
}

export type UseProjectReturn = ReturnType<typeof useProject>;
