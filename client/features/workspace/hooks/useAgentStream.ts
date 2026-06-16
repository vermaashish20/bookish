'use client';

import React, { useCallback, useRef, useState } from 'react';
import { createAgentThread, streamAgentRun } from '@/lib/api';
import type { BookProject, ChatMessage } from '@/lib/types';
import type {
  LangGraphCustomPayload,
  LangGraphInterrupt,
  LangGraphStreamEvent,
  LangGraphStreamPart,
  LangGraphTask,
} from '@/lib/types/langgraph';

type PendingConfirmation = { text: string; run_id: string; summary?: string; tasks?: LangGraphTask[] };

function findInterrupt(value: unknown): LangGraphInterrupt | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  if (record.kind === 'plan_approval') {
    return record as LangGraphInterrupt;
  }

  if ('value' in record) {
    const nested = findInterrupt(record.value);
    if (nested) return nested;
  }

  for (const candidate of Object.values(record)) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const nested = findInterrupt(item);
        if (nested) return nested;
      }
    } else {
      const nested = findInterrupt(candidate);
      if (nested) return nested;
    }
  }

  return null;
}

function customPayload(part: LangGraphStreamPart): LangGraphCustomPayload | null {
  if (part.type !== 'custom' || !part.data || typeof part.data !== 'object') return null;
  return part.data as LangGraphCustomPayload;
}

export function useAgentStream(
  book: BookProject | null,
  _chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setBook: React.Dispatch<React.SetStateAction<BookProject | null>>,
  activeChatSessionId: string,
) {
  const [promptInput, setPromptInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [currentAgentStatus, setCurrentAgentStatus] = useState('');
  const [streamedDocumentText] = useState('');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);

  const updateAssistantMessage = useCallback(
    (messageId: string, text: string) => {
      setChatMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, text } : message,
        ),
      );
    },
    [setChatMessages],
  );

  const handleStreamEvent = useCallback(
    (event: LangGraphStreamEvent) => {
      if (event.event === 'error') {
        const messageId = assistantMessageIdRef.current;
        if (messageId) {
          updateAssistantMessage(messageId, `Orchestration error: ${event.error ?? 'Unknown error'}`);
        }
        return;
      }

      if (event.event !== 'langgraph') return;

      const interrupt = findInterrupt(event.part);
      if (interrupt) {
        if (interrupt.threadId) threadIdRef.current = interrupt.threadId;
        setPendingConfirmation({
          text: interrupt.prompt ?? 'Review the execution plan. Approve to continue?',
          run_id: interrupt.runId ?? '',
          summary: interrupt.summary,
          tasks: interrupt.tasks,
        });
        const messageId = assistantMessageIdRef.current;
        if (messageId) {
          updateAssistantMessage(messageId, interrupt.summary ?? 'Plan ready for approval.');
        }
        setCurrentAgentStatus('Waiting for plan approval.');
        return;
      }

      const payload = customPayload(event.part);
      if (!payload) return;

      if (payload.kind === 'plan_created') {
        const messageId = assistantMessageIdRef.current;
        if (messageId) {
          updateAssistantMessage(messageId, payload.summary ?? 'Plan created.');
        }
        setCurrentAgentStatus('Plan created.');
      }

      if (payload.kind === 'task_started') {
        setCurrentAgentStatus(`Running ${String(payload.agent ?? 'agent')}...`);
      }

      if (payload.kind === 'task_completed') {
        setCurrentAgentStatus(`${String(payload.agent ?? 'Agent')} completed.`);
      }

      if (payload.kind === 'run_completed' || payload.kind === 'run_rejected') {
        if (payload.projectState) {
          setBook((current) =>
            current ? { ...current, ...(payload.projectState as BookProject) } : current,
          );
        }
        const messageId = assistantMessageIdRef.current;
        if (messageId && typeof payload.reply === 'string') {
          updateAssistantMessage(messageId, payload.reply);
        }
      }
    },
    [setBook, updateAssistantMessage],
  );

  const sendPrompt = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!book || !promptInput.trim()) return;

      const captured = promptInput.trim();
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: captured,
        timestamp: new Date().toISOString(),
      };
      const assistantMessageId = `msg-${Date.now() + 1}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sender: 'System',
        text: '',
        timestamp: new Date().toISOString(),
        thinking: '',
        cost: 0,
        tokens: 0,
      };

      assistantMessageIdRef.current = assistantMessageId;
      setChatMessages((prev) => [...prev, userMessage, assistantMessage]);
      setPromptInput('');
      setPendingConfirmation(null);
      setCurrentAgentStatus('Starting LangGraph run...');
      setIsAgentThinking(true);

      try {
        const thread = await createAgentThread(book.id, activeChatSessionId);
        threadIdRef.current = thread.threadId;
        await streamAgentRun(
          thread.threadId,
          { projectId: book.id, message: captured, chatSessionId: activeChatSessionId },
          handleStreamEvent,
        );
      } catch {
        updateAssistantMessage(
          assistantMessageId,
          'Failed to connect to the LangGraph backend. Is the API running on port 8000?',
        );
      } finally {
        setIsAgentThinking(false);
        setCurrentAgentStatus('');
      }
    },
    [
      activeChatSessionId,
      book,
      handleStreamEvent,
      promptInput,
      setChatMessages,
      updateAssistantMessage,
    ],
  );

  const resume = useCallback(
    async (decision: string) => {
      const threadId = threadIdRef.current;
      if (!book || !threadId) return;

      setPendingConfirmation(null);
      setIsAgentThinking(true);
      setCurrentAgentStatus('Resuming LangGraph run...');
      try {
        await streamAgentRun(
          threadId,
          { command: { resume: decision === 'yes' ? 'approve' : 'reject' } },
          handleStreamEvent,
        );
      } catch (err) {
        console.error('Failed to resume LangGraph agent', err);
      } finally {
        setIsAgentThinking(false);
        setCurrentAgentStatus('');
      }
    },
    [book, handleStreamEvent],
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

