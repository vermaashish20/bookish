'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearChatThreadMessages,
  createChatThread,
  fetchChatThreads,
  fetchProject,
  fetchProjectBook,
  fetchProjectMemory,
  fetchProjectMessages,
} from '@/lib/api';
import type { BookProject, ChatMessage, ChatSession, WorkspaceTab } from '@/lib/types';
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

export function useProject(projectId: string, activeTab: WorkspaceTab) {
  const router = useRouter();
  const [book, setBook] = useState<BookProject | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatSession[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookSectionLoading, setBookSectionLoading] = useState(false);
  const [memorySectionLoading, setMemorySectionLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const sectionsLoaded = useRef({ book: false, memory: false });

  const updateBook = useCallback((updated: BookProject) => {
    setBook(updated);
    if (updated.chapters?.length) sectionsLoaded.current.book = true;
    if (updated.assets?.length || updated.memory?.characters?.length) {
      sectionsLoaded.current.memory = true;
    }
  }, []);

  const loadMessagesForThread = useCallback(async (threadId: string) => {
    const messages = await fetchProjectMessages(projectId, threadId).catch(() => []);
    setChatMessages(mapPersistedMessages(messages as PersistedChatMessage[]));
  }, [projectId]);

  const ensureBookLoaded = useCallback(async () => {
    if (sectionsLoaded.current.book) return;
    setBookSectionLoading(true);
    try {
      const section = await fetchProjectBook(projectId);
      sectionsLoaded.current.book = true;
      setBook((prev) => (prev ? { ...prev, ...section } : prev));
    } catch (err) {
      console.error('Failed to load book section', err);
    } finally {
      setBookSectionLoading(false);
    }
  }, [projectId]);

  const ensureMemoryLoaded = useCallback(async () => {
    if (sectionsLoaded.current.memory) return;
    setMemorySectionLoading(true);
    try {
      const section = await fetchProjectMemory(projectId);
      sectionsLoaded.current.memory = true;
      setBook((prev) => (prev ? { ...prev, ...section } : prev));
    } catch (err) {
      console.error('Failed to load memory section', err);
    } finally {
      setMemorySectionLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sectionsLoaded.current = { book: false, memory: false };
    setActiveThreadId(null);
    setChatMessages([]);

    Promise.all([
      fetchProject(projectId),
      fetchChatThreads(projectId).catch(() => []),
    ])
      .then(([shell, threads]) => {
        if (cancelled) return;
        setBook(shell);
        setChatThreads((threads as ChatSession[]).map(normalizeThread));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.push('/');
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  useEffect(() => {
    if (activeTab === 'Book') void ensureBookLoaded();
    if (activeTab === 'Memory') {
      void ensureMemoryLoaded();
      // Chapter summaries live in the book section; needed for Project knowledge.
      void ensureBookLoaded();
    }
  }, [activeTab, ensureBookLoaded, ensureMemoryLoaded]);

  const switchChatThread = useCallback(
    async (threadId: string) => {
      setActiveThreadId(threadId);
      setChatMessages([]);
      setMessagesLoading(true);
      try {
        await loadMessagesForThread(threadId);
      } finally {
        setMessagesLoading(false);
      }
    },
    [loadMessagesForThread],
  );

  const startNewChatThread = useCallback(async () => {
    const thread = normalizeThread(await createChatThread(projectId));
    setChatThreads((prev) => [thread, ...prev.filter((item) => item.id !== thread.id)]);
    setActiveThreadId(thread.id);
    setChatMessages([]);
    return thread.id;
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
    bookSectionLoading,
    memorySectionLoading,
    messagesLoading,
    ensureMemoryLoaded,
  };
}

export type UseProjectReturn = ReturnType<typeof useProject>;
