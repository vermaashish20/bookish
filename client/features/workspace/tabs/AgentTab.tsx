'use client';

import React, { useEffect, useState } from 'react';
import {
  BookProject,
  ChatMessage,
  ChatSession,
  ChapterItem,
  DecisionItem,
  GeneratedArtifact,
} from '@/lib/types';
import type { LangGraphTask } from '@/lib/types/langgraph';
import AgentAssistant from '@/components/workspace/AgentAssistant';
import PreviewCanvas from '@/components/workspace/PreviewCanvas';
import { fetchArtifact } from '@/lib/api';

const isDisplayReadyChapter = (chapter: ChapterItem) =>
  Boolean((chapter.content ?? '').trim()) ||
  chapter.status === 'draft' ||
  chapter.status === 'completed' ||
  chapter.status === 'published';

const WRITING_ARTIFACT_TYPES = new Set(['draft', 'edited_content']);

function formatAgentName(agentName: string) {
  return agentName
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function artifactToDecisionItem(artifact: GeneratedArtifact): DecisionItem {
  return {
    timestamp: artifact.createdAt,
    step: artifact.artifactType.replace(/_/g, ' '),
    agent: formatAgentName(artifact.agentName),
    action:
      typeof artifact.metadata?.task === 'string'
        ? artifact.metadata.task
        : `Generated ${artifact.artifactType.replace(/_/g, ' ')} artifact`,
    resolution: 'Artifact stored in project memory',
    artifactId: artifact.id,
    artifactType: artifact.artifactType,
    artifactContent: artifact.content,
  };
}

interface AgentTabProps {
  book: BookProject;
  chatMessages: ChatMessage[];
  isAgentThinking: boolean;
  currentAgentStatus: string;
  promptInput: string;
  setPromptInput: (value: string) => void;
  onSendPrompt: (e: React.FormEvent) => void;
  pendingConfirmation: { text: string, run_id: string, summary?: string, tasks?: LangGraphTask[] } | null;
  onResume: (decision: string) => void;
  streamedDocumentText?: string;
  chatSessions: ChatSession[];
  activeChatSessionId: string;
  onSwitchChatSession: (sessionId: string) => void;
  onNewChatSession: () => void;
  onClearChatSession: () => void;
}

export default function AgentTab({
  book,
  chatMessages,
  isAgentThinking,
  currentAgentStatus,
  promptInput,
  setPromptInput,
  onSendPrompt,
  pendingConfirmation,
  onResume,
  streamedDocumentText,
  chatSessions,
  activeChatSessionId,
  onSwitchChatSession,
  onNewChatSession,
  onClearChatSession,
}: AgentTabProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreviewPage, setSelectedPreviewPage] = useState(1);
  const [hydratedArtifact, setHydratedArtifact] = useState<GeneratedArtifact | null>(null);
  const artifacts = book.artifacts ?? [];
  const artifactItems = artifacts.map(artifactToDecisionItem);
  const previewChapter = book.chapters.find(isDisplayReadyChapter) || book.chapters[0];
  const latestArtifact =
    artifactItems
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .at(-1) ?? null;
  const activePreview = !streamedDocumentText ? latestArtifact : null;
  const activePreviewArtifact =
    activePreview && hydratedArtifact && hydratedArtifact.id === activePreview.artifactId
      ? { ...activePreview, artifactContent: hydratedArtifact.content ?? activePreview.artifactContent }
      : activePreview;
  const previewChapterForCanvas =
    activePreviewArtifact && !WRITING_ARTIFACT_TYPES.has(activePreviewArtifact.artifactType ?? '')
      ? undefined
      : previewChapter;
  const hasPreview = Boolean(streamedDocumentText || activePreview || previewChapterForCanvas);

  useEffect(() => {
    if (!isPreviewOpen || !activePreview?.artifactId) return;
    if (hydratedArtifact?.id === activePreview.artifactId || activePreview.artifactContent) return;

    let cancelled = false;
    fetchArtifact(book.id, activePreview.artifactId)
      .then((artifact) => {
        if (!cancelled) setHydratedArtifact(artifact);
      })
      .catch(() => {
        if (!cancelled) setHydratedArtifact(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activePreview, book.id, hydratedArtifact, isPreviewOpen]);

  return (
    <div className="relative flex flex-1 overflow-hidden bg-zinc-100">
      <AgentAssistant
        chatMessages={chatMessages}
        isAgentThinking={isAgentThinking}
        currentAgentStatus={currentAgentStatus}
        promptInput={promptInput}
        setPromptInput={setPromptInput}
        onSendPrompt={onSendPrompt}
        pendingConfirmation={pendingConfirmation}
        onResume={onResume}
        chatSessions={chatSessions}
        activeChatSessionId={activeChatSessionId}
        onSwitchChatSession={onSwitchChatSession}
        onNewChatSession={onNewChatSession}
        onClearChatSession={onClearChatSession}
      />

      <button
        type="button"
        onClick={() => setIsPreviewOpen((open) => !open)}
        disabled={!hasPreview}
        className="absolute right-5 bottom-5 z-20 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPreviewOpen ? 'Close Preview' : 'Open Preview'}
      </button>

      {isPreviewOpen && (
        <aside className="w-[40%] min-w-[420px] shrink-0 border-l border-zinc-200 bg-white shadow-[-16px_0_40px_-28px_rgba(0,0,0,0.35)]">
          <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-5">
            <div>
              <h2 className="text-xs font-semibold text-zinc-950">Preview Canvas</h2>
              <p className="text-[10px] text-zinc-400">Latest draft or generated artifact</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-hidden">
            <PreviewCanvas
              chapter={previewChapterForCanvas}
              selectedPage={selectedPreviewPage}
              setSelectedPage={setSelectedPreviewPage}
              bookTitle={book.title}
              streamedDocumentText={streamedDocumentText}
              activePreviewArtifact={activePreviewArtifact}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
