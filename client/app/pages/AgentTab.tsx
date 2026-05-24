'use client';

import React, { useState, useEffect } from 'react';
import { BookProject, ChatMessage, ChapterItem } from '../types';
import ChatInterface from '../components/ChatInterface';
import AgentFlowTrace from '../components/AgentFlowTrace';
import PreviewCanvas from '../components/PreviewCanvas';

interface AgentTabProps {
  book: BookProject;
  chatMessages: ChatMessage[];
  isAgentThinking: boolean;
  promptInput: string;
  setPromptInput: (value: string) => void;
  onSendPrompt: (e: React.FormEvent) => void;
}

export default function AgentTab({
  book,
  chatMessages,
  isAgentThinking,
  promptInput,
  setPromptInput,
  onSendPrompt
}: AgentTabProps) {
  const [studioTab, setStudioTab] = useState<'Flow' | 'Preview'>('Flow');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState(1);

  // Auto-switch to Preview Canvas when generation starts or completes
  useEffect(() => {
    if (isAgentThinking) {
      setStudioTab('Flow');
    } else if (book.chapters?.some((c) => c.status === 'completed')) {
      setStudioTab('Preview');
    }
  }, [isAgentThinking, book.chapters]);

  const previewChapter = book.chapters.find((ch) => ch.status === 'completed') || book.chapters[0];

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-100">
      <ChatInterface
        chatMessages={chatMessages}
        isAgentThinking={isAgentThinking}
        promptInput={promptInput}
        setPromptInput={setPromptInput}
        onSendPrompt={onSendPrompt}
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
              decisionLog={book.memory.decisionLog}
              isAgentThinking={isAgentThinking}
            />
          )}

          {studioTab === 'Preview' && (
            <PreviewCanvas
              chapter={previewChapter}
              selectedPage={selectedPreviewPage}
              setSelectedPage={setSelectedPreviewPage}
              bookTitle={book.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
