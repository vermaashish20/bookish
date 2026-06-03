'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { resumeAgent, submitMessageStream } from '@/lib/api';
import type {
  BookProject,
  ChapterItem,
  CharacterBibleItem,
  ChatMessage,
  DecisionItem,
  GeneratedArtifact,
} from '@/lib/types';
import type { StreamEvent } from '@/lib/types/sse';

type PendingConfirmation = { text: string; run_id: string };

const TYPEWRITER_FRAME_MS = 16;
const CHAT_CHARS_PER_FRAME = 4;
const DOCUMENT_CHARS_PER_FRAME = 10;
const STREAM_DEBUG = process.env.NEXT_PUBLIC_STREAM_DEBUG === '1';

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...items, item];
  return items.map((existing, idx) => (idx === index ? { ...existing, ...item } : existing));
}

function applySyncEvent(
  event: StreamEvent,
  setBook: React.Dispatch<React.SetStateAction<BookProject | null>>,
) {
  if (event.event !== 'sync_event') return;

  setBook((current) => {
    if (!current) return current;

    if (event.type === 'project_snapshot') {
      return { ...current, ...event.projectState };
    }

    if (event.type === 'artifact_created') {
      const artifact = event.artifact as GeneratedArtifact;
      return {
        ...current,
        artifacts: upsertById(current.artifacts ?? [], artifact),
      };
    }

    if (event.type === 'chapter_upserted') {
      const chapter = event.chapter as ChapterItem;
      return {
        ...current,
        chapters: upsertById(current.chapters, chapter).sort((a, b) => a.number - b.number),
      };
    }

    if (event.type === 'memory_upserted') {
      const item = event.item as CharacterBibleItem;
      return {
        ...current,
        memory: {
          ...current.memory,
          characterBible: upsertById(current.memory.characterBible, item),
        },
      };
    }

    if (event.type === 'memory_deleted') {
      return {
        ...current,
        memory: {
          ...current.memory,
          characterBible: current.memory.characterBible.filter((item) => item.id !== event.id),
        },
      };
    }

    if (event.type === 'timeline_updated') {
      const decisionLog = event.decisionLog as DecisionItem[];
      return {
        ...current,
        memory: {
          ...current.memory,
          decisionLog,
        },
      };
    }

    return current;
  });
}

export function useChatStream(
  book: BookProject | null,
  chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setBook: React.Dispatch<React.SetStateAction<BookProject | null>>,
  activeChatSessionId: string,
) {
  const [promptInput, setPromptInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [currentAgentStatus, setCurrentAgentStatus] = useState('');
  const [streamedDocumentText, setStreamedDocumentText] = useState('');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const chatQueuesRef = useRef<Record<string, string>>({});
  const documentQueueRef = useRef('');
  const typewriterTimerRef = useRef<number | null>(null);

  const hasQueuedText = useCallback(() => {
    return (
      documentQueueRef.current.length > 0 ||
      Object.values(chatQueuesRef.current).some((text) => text.length > 0)
    );
  }, []);

  const stopTypewriter = useCallback(() => {
    if (typewriterTimerRef.current !== null) {
      window.clearTimeout(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
  }, []);

  const tickTypewriter = useCallback(() => {
    let emitted = false;

    const chatEntries = Object.entries(chatQueuesRef.current);
    for (const [messageId, queuedText] of chatEntries) {
      if (!queuedText) continue;
      const nextChunk = queuedText.slice(0, CHAT_CHARS_PER_FRAME);
      chatQueuesRef.current[messageId] = queuedText.slice(CHAT_CHARS_PER_FRAME);
      emitted = true;
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, text: msg.text + nextChunk } : msg,
        ),
      );
    }

    if (documentQueueRef.current) {
      const nextChunk = documentQueueRef.current.slice(0, DOCUMENT_CHARS_PER_FRAME);
      documentQueueRef.current = documentQueueRef.current.slice(DOCUMENT_CHARS_PER_FRAME);
      emitted = true;
      setStreamedDocumentText((prev) => prev + nextChunk);
    }

    if (emitted && hasQueuedText()) {
      typewriterTimerRef.current = window.setTimeout(tickTypewriter, TYPEWRITER_FRAME_MS);
    } else {
      typewriterTimerRef.current = null;
    }
  }, [hasQueuedText, setChatMessages]);

  const startTypewriter = useCallback(() => {
    if (typewriterTimerRef.current !== null) return;
    typewriterTimerRef.current = window.setTimeout(tickTypewriter, TYPEWRITER_FRAME_MS);
  }, [tickTypewriter]);

  const queueChatText = useCallback(
    (messageId: string, text: string) => {
      if (!text) return;
      chatQueuesRef.current[messageId] = (chatQueuesRef.current[messageId] ?? '') + text;
      startTypewriter();
    },
    [startTypewriter],
  );

  const queueDocumentText = useCallback(
    (text: string) => {
      if (!text) return;
      documentQueueRef.current += text;
      startTypewriter();
    },
    [startTypewriter],
  );

  useEffect(() => {
    return () => stopTypewriter();
  }, [stopTypewriter]);

  const sendPrompt = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!book || !promptInput.trim()) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: promptInput,
        timestamp: new Date().toISOString(),
      };

      const agentMsgId = `msg-${Date.now() + 1}`;
      const agentMsg: ChatMessage = {
        id: agentMsgId,
        sender: 'System',
        text: '',
        timestamp: new Date().toISOString(),
        thinking: '',
        cost: 0,
        tokens: 0,
      };

      setChatMessages((prev) => [...prev, userMsg, agentMsg]);
      const captured = promptInput;
      setPromptInput('');
      setIsAgentThinking(true);
      setCurrentAgentStatus('');
      setStreamedDocumentText('');
      chatQueuesRef.current = {};
      documentQueueRef.current = '';
      stopTypewriter();
      setPendingConfirmation(null);

      try {
        await submitMessageStream(book.id, captured, activeChatSessionId, (chunk: StreamEvent) => {
          if (STREAM_DEBUG) console.log('[SSE DEBUG] route_event', chunk);
          if (chunk.event === 'chat_message') {
            queueChatText(agentMsgId, chunk.text ?? '');
          } else if (chunk.event === 'document_stream') {
            queueDocumentText(chunk.text ?? '');
          } else if (chunk.event === 'agent_status') {
            setCurrentAgentStatus(chunk.text ?? '');
          } else if (chunk.event === 'user_confirmation') {
            setPendingConfirmation({
              text: chunk.text ?? 'Do you approve?',
              run_id: chunk.run_id ?? '',
            });
          } else if (chunk.event === 'sync_event') {
            applySyncEvent(chunk, setBook);
          } else if (chunk.event === 'done') {
            if (chunk.projectState) {
              setBook((curr) =>
                curr ? { ...curr, ...(chunk.projectState as BookProject) } : curr,
              );
            }
            documentQueueRef.current = '';
            setStreamedDocumentText('');
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMsgId
                  ? {
                      ...msg,
                      text:
                        msg.text || chatQueuesRef.current[agentMsgId]
                          ? msg.text
                          : chunk.reply ?? msg.text,
                      thinking: chunk.thinking ?? '',
                      cost: chunk.cost ?? 0,
                      tokens: chunk.tokens ?? 0,
                    }
                  : msg,
              ),
            );
          } else if (chunk.event === 'error') {
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMsgId
                  ? { ...msg, text: `Orchestration error: ${chunk.error}` }
                  : msg,
              ),
            );
          }
        });
      } catch {
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMsgId
              ? {
                  ...msg,
                  text: 'Failed to connect to the backend. Is the API running on port 8000?',
                }
              : msg,
          ),
        );
      } finally {
        setIsAgentThinking(false);
        setCurrentAgentStatus('');
        setPendingConfirmation(null);
      }
    },
    [
      book,
      promptInput,
      queueChatText,
      queueDocumentText,
      setChatMessages,
      setBook,
      stopTypewriter,
      activeChatSessionId,
    ],
  );

  const resume = useCallback(
    async (decision: string) => {
      if (!book || !pendingConfirmation) return;
      try {
        await resumeAgent(book.id, pendingConfirmation.run_id, decision);
        setPendingConfirmation(null);
      } catch (err) {
        console.error('Failed to resume agent', err);
      }
    },
    [book, pendingConfirmation],
  );

  return {
    promptInput,
    setPromptInput,
    isAgentThinking,
    currentAgentStatus,
    streamedDocumentText,
    pendingConfirmation,
    sendPrompt,
    resume,
  };
}
