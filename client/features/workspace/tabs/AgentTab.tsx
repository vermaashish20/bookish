'use client';

import React, { useState, useEffect } from 'react';
import {
  BookProject,
  ChatMessage,
  ChatSession,
  ChapterItem,
  DecisionItem,
  GeneratedArtifact,
} from '@/lib/types';
import ChatInterface from '@/components/workspace/ChatInterface';
import AgentFlowTrace from '@/components/workspace/AgentFlowTrace';
import PreviewCanvas from '@/components/workspace/PreviewCanvas';

const isDisplayReadyChapter = (chapter: ChapterItem) =>
  Boolean((chapter.content ?? '').trim()) ||
  chapter.status === 'draft' ||
  chapter.status === 'completed' ||
  chapter.status === 'published';

const WRITING_ARTIFACT_TYPES = new Set(['draft', 'edited_content', 'humanized_content']);

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
  pendingConfirmation: { text: string, run_id: string } | null;
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
  const [studioTab, setStudioTab] = useState<'Flow' | 'Preview'>('Flow');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState(1);
  const [activePreviewArtifact, setActivePreviewArtifact] = useState<DecisionItem | null>(null);
  const artifacts = book.artifacts ?? [];
  const artifactItems = artifacts.map(artifactToDecisionItem);
  const artifactIds = new Set(artifactItems.map((artifact) => artifact.artifactId));
  const flowItems = [
    ...artifactItems,
    ...book.memory.decisionLog.filter((log) => !log.artifactId || !artifactIds.has(log.artifactId)),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Auto-switch to Preview Canvas when generation starts or completes
  useEffect(() => {
    if (streamedDocumentText) {
      setActivePreviewArtifact(null);
      setSelectedPreviewPage(1);
      setStudioTab('Preview');
    } else if (isAgentThinking) {
      setStudioTab('Flow');
    } else if (book.chapters?.some(isDisplayReadyChapter) || artifacts.length > 0) {
      setStudioTab('Preview');
    }
  }, [isAgentThinking, book.chapters, artifacts.length, streamedDocumentText]);

  useEffect(() => {
    if (!isAgentThinking) return;
    setActivePreviewArtifact(null);
    setSelectedPreviewPage(1);
  }, [isAgentThinking]);

  const previewChapter = book.chapters.find(isDisplayReadyChapter) || book.chapters[0];
  const latestArtifact =
    artifactItems
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .at(-1) ?? null;
  const activePreview = activePreviewArtifact ?? (!streamedDocumentText ? latestArtifact : null);
  const previewChapterForCanvas =
    activePreview && !WRITING_ARTIFACT_TYPES.has(activePreview.artifactType ?? '')
      ? undefined
      : previewChapter;

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-100">
      <ChatInterface
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

      {/* Right Column (60%) - Dynamic Studio Viewer (Flow & Preview tabs) */}
      <div className="w-[60%] flex flex-col bg-zinc-100 overflow-hidden shrink-0">
        <div className="h-12 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0 select-none">
          <div className="flex gap-4 text-xs font-semibold text-zinc-400">
            <button
              onClick={() => setStudioTab('Flow')}
              className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
                studioTab === 'Flow' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
              }`}
            >
              Agent Flow
            </button>
            <button
              onClick={() => setStudioTab('Preview')}
              className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
                studioTab === 'Preview' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
              }`}
            >
              Preview Canvas
            </button>
          </div>
        </div>

        <div className={`flex-1 ${studioTab === 'Preview' ? 'overflow-hidden' : 'overflow-y-auto p-6 flex flex-col items-center'}`}>
          {studioTab === 'Flow' && (
            <AgentFlowTrace
              decisionLog={flowItems}
              isAgentThinking={isAgentThinking}
              currentAgentStatus={currentAgentStatus}
              onPreviewArtifact={(artifact) => {
                setActivePreviewArtifact(artifact);
                setStudioTab('Preview');
                setSelectedPreviewPage(1);
              }}
            />
          )}

          {studioTab === 'Preview' && (
            <PreviewCanvas
              chapter={previewChapterForCanvas}
              selectedPage={selectedPreviewPage}
              setSelectedPage={setSelectedPreviewPage}
              bookTitle={book.title}
              streamedDocumentText={streamedDocumentText}
              activePreviewArtifact={activePreview}
            />
          )}
        </div>
      </div>
    </div>
  );
}
