'use client';

import React from 'react';
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from '@/components/ai-elements/checkpoint';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from '@/components/ai-elements/confirmation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import type { ChatMessage, ChatSession } from '@/lib/types';
import type { LangGraphTask } from '@/lib/types/langgraph';
import { cn } from '@/lib/utils';

type PendingConfirmation = {
  text: string;
  run_id: string;
  summary?: string;
  tasks?: LangGraphTask[];
  hasPreview?: boolean;
};

interface AgentAssistantProps {
  chatMessages: ChatMessage[];
  messagesLoading?: boolean;
  isAgentThinking: boolean;
  currentAgentStatus?: string;
  promptInput: string;
  setPromptInput: (value: string) => void;
  onSendPrompt: (e: React.FormEvent) => void;
  pendingConfirmation?: PendingConfirmation | null;
  onResume?: (decision: string) => void;
  hasPreviewContent?: boolean;
  onViewPreview?: () => void;
  chatSessions: ChatSession[];
  activeChatSessionId: string;
  onSwitchChatSession: (sessionId: string) => void;
  onNewChatSession: () => void;
  onClearChatSession: () => void;
}

const QUICK_PROMPTS = [
  'Draft the next chapter from the current outline',
  'Research continuity before writing',
  'Improve the pacing and voice of the latest draft',
];

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function messageRole(sender: ChatMessage['sender']): 'user' | 'assistant' {
  return sender === 'user' ? 'user' : 'assistant';
}

function senderLabel(sender: ChatMessage['sender']) {
  return sender === 'System' ? 'Bookish' : sender;
}

export default function AgentAssistant({
  chatMessages,
  messagesLoading = false,
  isAgentThinking,
  currentAgentStatus,
  promptInput,
  setPromptInput,
  onSendPrompt,
  pendingConfirmation,
  onResume,
  hasPreviewContent,
  onViewPreview,
}: AgentAssistantProps) {
  const submitPromptInput = (_message: { text: string }, event: React.FormEvent<HTMLFormElement>) => {
    onSendPrompt(event);
  };

  return (
    <section className="min-w-0 flex-1 overflow-hidden bg-white">
      <div className="flex h-full flex-col">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-6 py-5">
            {messagesLoading ? (
              <div className="flex min-h-[420px] items-center justify-center text-xs text-zinc-500">
                Loading conversation…
              </div>
            ) : chatMessages.length === 0 ? (
              <ConversationEmptyState
                className="min-h-[420px]"
                description="The assistant can plan work, pause for approval, retrieve project knowledge, and draft into the workspace."
                icon={
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-xs font-semibold text-white">
                    AI
                  </div>
                }
                title="Start an agent run"
              >
                <div className="w-full max-w-sm space-y-5">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-xs font-semibold text-white">
                      AI
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-950">Start an agent run</h3>
                    <p className="text-xs leading-relaxed text-zinc-950">
                      Plan, approve, retrieve project memory, and draft with the LangGraph agent.
                    </p>
                  </div>
                  <Suggestions className="flex-col items-stretch whitespace-normal">
                    {QUICK_PROMPTS.map((prompt) => (
                      <Suggestion
                        key={prompt}
                        suggestion={prompt}
                        onClick={setPromptInput}
                        className="h-auto justify-start rounded-2xl px-3 py-2.5 text-left text-[11px]"
                      />
                    ))}
                  </Suggestions>
                </div>
              </ConversationEmptyState>
            ) : (
              chatMessages.map((message) => (
                <Message
                  key={message.id}
                  from={messageRole(message.sender)}
                  className={cn('gap-1', message.sender !== 'user' && 'max-w-full')}
                >
                  <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-black group-[.is-user]:justify-end">
                    <span className="font-semibold text-black">{senderLabel(message.sender)}</span>
                    <span>/</span>
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                  <MessageContent
                    className={cn(
                      message.sender === 'user'
                        ? 'gap-0 overflow-hidden rounded-xl rounded-tr-sm border border-zinc-300 bg-white px-3 py-1.5 text-sm leading-snug text-zinc-900 shadow-xs group-[.is-user]:bg-white group-[.is-user]:px-3 group-[.is-user]:py-1.5 group-[.is-user]:text-zinc-900'
                        : 'gap-0 overflow-visible rounded-none bg-transparent px-0 py-0 text-zinc-800 shadow-none',
                    )}
                  >
                    {message.text ? (
                      <MessageResponse
                        className={message.sender === 'user' ? '[&_p]:my-0' : undefined}
                      >
                        {message.text}
                      </MessageResponse>
                    ) : (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="size-1.5 rounded-full bg-zinc-300 animate-pulse" />
                        <span className="size-1.5 rounded-full bg-zinc-300 animate-pulse [animation-delay:120ms]" />
                        <span className="size-1.5 rounded-full bg-zinc-300 animate-pulse [animation-delay:240ms]" />
                      </div>
                    )}
                  </MessageContent>
                </Message>
              ))
            )}

            {isAgentThinking && (
              <Checkpoint className="mt-1">
                <CheckpointIcon className="text-emerald-600" />
                <CheckpointTrigger tooltip="Current graph status">
                  {currentAgentStatus || 'Running the LangGraph agent for this request.'}
                </CheckpointTrigger>
              </Checkpoint>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="bg-white px-4 pb-3 pt-1">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            {pendingConfirmation && (
              <ApprovalCard
                confirmation={pendingConfirmation}
                onResume={onResume}
                hasPreviewContent={hasPreviewContent}
                onViewPreview={onViewPreview}
              />
            )}
            <PromptInput
              className="overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 !shadow-none !ring-0 outline-none focus-within:border-zinc-400 focus-within:!ring-0 has-[[data-slot=input-group-control]:focus-visible]:!ring-0 [&_[data-slot=input-group]]:rounded-full [&_[data-slot=input-group]]:!border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:!shadow-none [&_[data-slot=input-group]]:!ring-0"
              onSubmit={submitPromptInput}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={promptInput}
                  onChange={(event) => setPromptInput(event.currentTarget.value)}
                  placeholder={pendingConfirmation ? 'Respond after approving or rejecting' : 'Ask anything'}
                  className="max-h-28 min-h-9 !border-0 px-1 py-2 text-sm !shadow-none outline-none placeholder:text-zinc-500 focus-visible:!border-0 focus-visible:!ring-0"
                />
              </PromptInputBody>
              <PromptInputSubmit
                className="size-9 shrink-0 overflow-hidden rounded-full bg-white text-zinc-950 shadow-sm hover:bg-white"
                disabled={isAgentThinking || !promptInput.trim()}
                size="icon-sm"
                status={isAgentThinking ? 'streaming' : undefined}
              />
            </PromptInput>
          </div>
        </div>
      </div>
    </section>
  );
}

function ApprovalCard({
  confirmation,
  onResume,
  hasPreviewContent,
  onViewPreview,
}: {
  confirmation: PendingConfirmation;
  onResume?: (decision: string) => void;
  hasPreviewContent?: boolean;
  onViewPreview?: () => void;
}) {
  const firstTask = confirmation.tasks?.[0];
  const taskLabel = firstTask?.agent ? `Node: ${firstTask.agent}` : confirmation.text;
  const showView = Boolean(hasPreviewContent || confirmation.hasPreview);

  return (
    <Confirmation
      approval={{ id: confirmation.run_id }}
      state="approval-requested"
      className="rounded-2xl px-4 py-3"
    >
      <ConfirmationTitle>
        <ConfirmationRequest className="text-sm leading-relaxed text-zinc-700">
          {confirmation.text}
          <span className="mt-1 block text-sm font-medium text-zinc-950">
            {taskLabel}
          </span>
          {confirmation.summary && (
            <span className="mt-1 block truncate text-xs text-zinc-500">
              {confirmation.summary}
            </span>
          )}
          {showView && (
            <span className="mt-1 block text-xs text-zinc-500">
              A draft is ready to review before you approve.
            </span>
          )}
        </ConfirmationRequest>
      </ConfirmationTitle>
      <ConfirmationActions>
        {showView && (
          <ConfirmationAction
            type="button"
            variant="outline"
            onClick={() => onViewPreview?.()}
            className="h-9 rounded-xl px-4 text-sm"
          >
            View
          </ConfirmationAction>
        )}
        <ConfirmationAction
          type="button"
          variant="outline"
          onClick={() => onResume?.('no')}
          className="h-9 rounded-xl px-4 text-sm"
        >
          Reject
        </ConfirmationAction>
        <ConfirmationAction
          type="button"
          onClick={() => onResume?.('yes')}
          className="h-9 rounded-xl px-4 text-sm"
        >
          Approve
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  );
}
