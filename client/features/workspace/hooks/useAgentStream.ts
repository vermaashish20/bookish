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
  hasPreview?: boolean;
};

export function useAgentStream(
  book: BookProject | null,
  _chatMessages: ChatMessage[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setBook: React.Dispatch<React.SetStateAction<BookProject | null>>,
  activeChatSessionId: string | null,
  startNewChatSession?: () => Promise<string | void>,
) {
  const [promptInput, setPromptInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [currentAgentStatus, setCurrentAgentStatus] = useState('');
  const [streamedDocumentText, setStreamedDocumentText] = useState('');
  const [streamedArtifactType, setStreamedArtifactType] = useState<string>('draft');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const chatStreamBufferRef = useRef('');
  const previewStreamBufferRef = useRef('');

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

  const resetStreamBuffers = useCallback(() => {
    chatStreamBufferRef.current = '';
    previewStreamBufferRef.current = '';
  }, []);

  const applyCustomPayload = useCallback(
    (payload: LangGraphCustomPayload) => {
      const effects = effectsFromCustomPayload(payload);
      const messageId = assistantMessageIdRef.current;

      if (effects.textDelta && effects.streamTarget === 'chat' && messageId) {
        chatStreamBufferRef.current += effects.textDelta;
        updateAssistantMessage(messageId, chatStreamBufferRef.current);
      }
      if (effects.textDelta && effects.streamTarget === 'preview') {
        previewStreamBufferRef.current += effects.textDelta;
        setStreamedDocumentText(previewStreamBufferRef.current);
      }
      if (effects.chatText && messageId) {
        chatStreamBufferRef.current = effects.chatText;
        updateAssistantMessage(messageId, effects.chatText);
      }
      if (effects.statusText) {
        setCurrentAgentStatus(effects.statusText);
      }
      if (payload.kind === 'task_started' && payload.agent === 'world_builder') {
        setStreamedArtifactType('world_building');
      } else if (payload.kind === 'task_started' && payload.agent === 'writer') {
        setStreamedArtifactType('draft');
      }
      if (payload.kind === 'artifact_created' && payload.artifactType) {
        setStreamedArtifactType(String(payload.artifactType));
      }
      if (effects.previewText) {
        const artifactType =
          payload.kind === 'artifact_created'
            ? String(payload.artifactType ?? '')
            : 'draft';
        if (isPreviewableArtifactContent(effects.previewText, artifactType)) {
          const incoming = effects.previewText;
          const current = previewStreamBufferRef.current;
          // Keep streamed content; only fill in when buffer is empty or incoming is fuller.
          if (!current.trim() || incoming.length >= current.length) {
            previewStreamBufferRef.current = incoming;
            setStreamedDocumentText(incoming);
          }
        }
      }
      if (effects.clearPreview) {
        previewStreamBufferRef.current = '';
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

      const pendingWrite = interrupt.pendingWrite;
      const interruptFull =
        pendingWrite && typeof pendingWrite.content === 'string'
          ? pendingWrite.content
          : '';
      const interruptPreview =
        typeof pendingWrite?.preview === 'string'
          ? pendingWrite.preview
          : '';
      const bestPreview = interruptFull || interruptPreview;
      const hasPreview = Boolean(
        previewStreamBufferRef.current.trim() || bestPreview.trim(),
      );

      if (bestPreview) {
        const current = previewStreamBufferRef.current;
        if (!current.trim() || bestPreview.length >= current.length) {
          previewStreamBufferRef.current = bestPreview;
          setStreamedDocumentText(bestPreview);
        }
      }

      setPendingConfirmation({
        text: interrupt.prompt ?? 'Approve this action?',
        run_id: interrupt.runId ?? '',
        summary: interrupt.summary,
        tasks: interrupt.tasks,
        hasPreview,
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
      if (!book || !promptInput.trim()) return;

      let sessionId = activeChatSessionId;
      if (!sessionId && startNewChatSession) {
        sessionId = (await startNewChatSession()) ?? null;
      }
      if (!sessionId) return;

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
      resetStreamBuffers();
      setStreamedDocumentText('');
      setStreamedArtifactType('draft');
      setCurrentAgentStatus('Starting agent run...');
      setIsAgentThinking(true);

      try {
        let threadId = sessionId;
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
      resetStreamBuffers,
      setChatMessages,
      startNewChatSession,
      updateAssistantMessage,
    ],
  );

  const resume = useCallback(
    async (decision: string) => {
      const threadId = threadIdRef.current;
      if (!book || !threadId) return;

      setPendingConfirmation(null);
      resetStreamBuffers();
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
    [book, handleStreamEvent, resetStreamBuffers],
  );

  return {
    promptInput,
    setPromptInput,
    isAgentThinking,
    currentAgentStatus,
    streamedDocumentText,
    streamedArtifactType,
    pendingConfirmation,
    sendPrompt,
    resume,
  };
}
