'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProject, fetchProjectMessages } from '@/lib/api';
import type { BookProject, ChatMessage } from '@/lib/types';

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
  const [loading, setLoading] = useState(true);

  const updateBook = useCallback((updated: BookProject) => {
    setBook(updated);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchProject(projectId), fetchProjectMessages(projectId).catch(() => [])])
      .then(([project, messages]) => {
        if (cancelled) return;
        setBook(project);
        setChatMessages(mapPersistedMessages(messages as PersistedChatMessage[]));
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

  return {
    book,
    setBook,
    updateBook,
    chatMessages,
    setChatMessages,
    loading,
  };
}

export type UseProjectReturn = ReturnType<typeof useProject>;
