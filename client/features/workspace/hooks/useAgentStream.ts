'use client';

import React, { useCallback, useRef, useState } from 'react';
import { createAgentThread, streamAgentRun } from '@/lib/api';
import {
  isPreviewableArtifactContent,
  sanitizeAssistantText,
} from '@/lib/agent/display';
import {
  effectsFromCustomPayload,
  handleAgentStreamEvent,
} from '@/lib/agent/streamEvents';
import type { BookProject, ChatMessage } from '@/lib/types';
import type { LangGraphCustomPayload, LangGraphInterrupt } from '@/lib/types/langgraph';

type PendingConfirmation = {
  text: string;
  run_id: string;
  summary?: string;
  tasks?: LangGraphCustomPayload['tasks'];
};

export function useAgentStream(
  book: BookProject | null,
  _chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setBook: React.Dispatch<React.SetStateAction<BookProject | null>>,
  activeChatSessionId: string | null,
) {
  const [promptInput, setPromptInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [currentAgentStatus, setCurrentAgentStatus] = useState('');
  const [streamedDocumentText, setStreamedDocumentText] = useState('');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);

  const updateAssistantMessage = useCallback(
    (messageId: string, text: string) => {
      const cleaned = sanitizeAssistantText(text);
      if (!cleaned) return;
      setChatMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, text: cleaned } : message,
        ),
      );
    },
    [setChatMessages],
  );

  const applyCustomPayload = useCallback(
    (payload: LangGraphCustomPayload) => {
      const effects = effectsFromCustomPayload(payload);
      const messageId = assistantMessageIdRef.current;

      if (effects.chatText && messageId) {
        updateAssistantMessage(messageId, effects.chatText);
      }
      if (effects.statusText) {
        setCurrentAgentStatus(effects.statusText);
      }
      if (effects.previewText) {
        const artifactType =
          payload.kind === 'artifact_created'
            ? String(payload.artifactType ?? '')
            : 'draft';
        if (isPreviewableArtifactContent(effects.previewText, artifactType)) {
          setStreamedDocumentText(effects.previewText);
        }
      }
      if (effects.clearPreview) {
        setStreamedDocumentText('');
      }
      if (effects.projectState) {
        setBook((current) =>
          current ? { ...current, ...effects.projectState } : current,
        );
      }
    },
    [setBook, updateAssistantMessage],
  );

  const applyInterrupt = useCallback(
    (interrupt: LangGraphInterrupt) => {
      if (interrupt.threadId) threadIdRef.current = interrupt.threadId;
      setPendingConfirmation({
        text: interrupt.prompt ?? 'Approve this action?',
        run_id: interrupt.runId ?? '',
        summary: interrupt.summary,
        tasks: interrupt.tasks,
      });
      const messageId = assistantMessageIdRef.current;
      if (messageId) {
        updateAssistantMessage(messageId, interrupt.summary ?? 'Approval needed.');
      }
      setCurrentAgentStatus('Waiting for approval.');
    },
    [updateAssistantMessage],
  );

  const handleStreamEvent = useCallback(
    (event: Parameters<typeof handleAgentStreamEvent>[0]) => {
      handleAgentStreamEvent(event, {
        onCustom: applyCustomPayload,
        onInterrupt: applyInterrupt,
        onDone: () => {
          /* run finished; isAgentThinking cleared in sendPrompt/resume finally */
        },
        onError: (message) => {
          const messageId = assistantMessageIdRef.current;
          if (messageId) {
            updateAssistantMessage(messageId, `Orchestration error: ${message}`);
          }
        },
      });
    },
    [applyCustomPayload, applyInterrupt, updateAssistantMessage],
  );

  const sendPrompt = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!book || !promptInput.trim() || !activeChatSessionId) return;

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
      setStreamedDocumentText('');
      setCurrentAgentStatus('Starting agent run...');
      setIsAgentThinking(true);

      try {
        let threadId = activeChatSessionId;
        if (!threadId) {
          const thread = await createAgentThread(book.id);
          threadId = thread.threadId;
        }
        threadIdRef.current = threadId;
        await streamAgentRun(
          threadId,
          { projectId: book.id, message: captured },
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
      setCurrentAgentStatus('Resuming agent run...');
      try {
        await streamAgentRun(
          threadId,
          { command: { resume: decision === 'yes' ? 'approve' : 'reject' }, projectId: book.id },
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
