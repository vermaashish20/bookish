'use client';

import React from 'react';
import { BookProject } from '@/lib/types';
import UserContextTimeline from './UserContextTimeline';
import AgentMemoryStores from './AgentMemoryStores';
import ExecutionTimeline from './ExecutionTimeline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MemoryPanelProps {
  book: BookProject;
  memorySubTab: 'User' | 'AgentMemory' | 'Timeline';
  setMemorySubTab: (tab: 'User' | 'AgentMemory' | 'Timeline') => void;
  selectedPreviewItem: any;
  setSelectedPreviewItem: (item: any) => void;
  setIsAddAssetOpen: (open: boolean) => void;
}

export default function MemoryPanel({
  book,
  memorySubTab,
  setMemorySubTab,
  selectedPreviewItem,
  setSelectedPreviewItem,
  setIsAddAssetOpen
}: MemoryPanelProps) {
  const renderPreviewCanvasContent = () => {
    if (!selectedPreviewItem) return null;
    
    // Helper to strip JSON markdown and parse it into readable text
    const formatContentForPreview = (text: string) => {
      let cleanText = text;
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)```/);
      if (jsonMatch) cleanText = jsonMatch[1];
      
      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            if (typeof item === 'object' && item !== null) {
              return Object.entries(item).map(([k, v]) => {
                if (typeof v === 'object') {
                  return `**${k.charAt(0).toUpperCase() + k.slice(1)}**:\n` + Object.entries(v || {}).map(([vk, vv]) => `  - ${vk}: ${vv}`).join('\n');
                }
                return `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${v}`;
              }).join('\n\n');
            }
            return String(item);
          }).join('\n\n---\n\n');
        } else if (typeof parsed === 'object' && parsed !== null) {
          return Object.entries(parsed).map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n\n');
        }
      } catch (e) {
        return text;
      }
      return text;
    };
    
    const artifactContentToDisplay = selectedPreviewItem.artifactContent ? formatContentForPreview(selectedPreviewItem.artifactContent) : '';
    const fullContentToDisplay = selectedPreviewItem.content + (artifactContentToDisplay ? `\n\n---\n\n## Artifact Generated\n\n${artifactContentToDisplay}` : '');

    return (
      <div className="w-full h-full flex flex-col font-sans select-text relative">
        <div className="flex justify-between items-center bg-white/95 backdrop-blur px-8 py-6 border-b border-zinc-100 select-none text-[10px] shrink-0 text-zinc-500 font-semibold uppercase tracking-widest z-10">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-700">{selectedPreviewItem.title?.replace('Timeline Log: ', '') || selectedPreviewItem.subtitle?.split(' ')[0] || 'Node'}</span>
            <span>•</span>
            <span>{selectedPreviewItem.type?.replace('_', ' ') || 'Document'}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPreviewItem(null)}
            className="text-zinc-400 hover:text-zinc-700 text-sm font-bold transition focus:outline-none cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-100"
            title="Close Preview"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 text-justify leading-relaxed markdown-body prose prose-sm prose-zinc max-w-none break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-3 text-[13px]" {...props} />,
              h1: ({node, ...props}) => <h1 className="text-lg font-bold my-3" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-base font-bold my-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-[14px] font-bold my-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px]" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px]" {...props} />,
              li: ({node, ...props}) => <li className="ml-3" {...props} />,
              hr: ({node, ...props}) => <hr className="my-4 border-zinc-200" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
              pre: ({node, ...props}) => <pre className="text-[10px] bg-zinc-50/50 border border-zinc-100 rounded p-4" {...props} />,
              code: ({node, inline, ...props}: any) => inline 
                ? <code className="text-[10px] bg-zinc-100 px-1 py-0.5 rounded text-indigo-600 font-mono" {...props} /> 
                : <code className="text-[10px] font-mono" {...props} />,
            }}
          >
            {fullContentToDisplay}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Memory Header Tabs */}
      <div className="h-12 border-b border-zinc-200 bg-zinc-50 px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex gap-4 text-xs font-semibold text-zinc-400">
          <button
            type="button"
            onClick={() => setMemorySubTab('User')}
            className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
              memorySubTab === 'User' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
            }`}
          >
            User Context Feed
          </button>
          <button
            type="button"
            onClick={() => setMemorySubTab('AgentMemory')}
            className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
              memorySubTab === 'AgentMemory' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
            }`}
          >
            Agent Memory Stores
          </button>
          <button
            type="button"
            onClick={() => setMemorySubTab('Timeline')}
            className={`pb-3.5 pt-3.5 border-b-2 transition focus:outline-none cursor-pointer ${
              memorySubTab === 'Timeline' ? 'border-zinc-900 text-zinc-900 font-semibold' : 'border-transparent hover:text-zinc-600'
            }`}
          >
            Execution Timeline
          </button>
        </div>
        
        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest font-sans">Cognitive Checkpoint System</div>
      </div>

      {/* Sub tab grid container split layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`${selectedPreviewItem ? 'w-[60%]' : 'w-full'} border-r border-zinc-200 bg-zinc-50/30 flex flex-col overflow-hidden shrink-0 transition-all duration-300`}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {memorySubTab === 'User' && (
              <UserContextTimeline
                book={book}
                selectedPreviewItem={selectedPreviewItem}
                setSelectedPreviewItem={setSelectedPreviewItem}
                setIsAddAssetOpen={setIsAddAssetOpen}
              />
            )}

            {memorySubTab === 'AgentMemory' && (
              <AgentMemoryStores
                book={book}
                selectedPreviewItem={selectedPreviewItem}
                setSelectedPreviewItem={setSelectedPreviewItem}
              />
            )}

            {memorySubTab === 'Timeline' && (
              <ExecutionTimeline
                decisionLog={book.memory.decisionLog}
                selectedPreviewItem={selectedPreviewItem}
                setSelectedPreviewItem={setSelectedPreviewItem}
              />
            )}
          </div>
        </div>

        {selectedPreviewItem && (
          <div className="w-[40%] bg-white flex flex-col shrink-0 border-l border-zinc-200 transition-all duration-300 animate-fade-in relative overflow-hidden">
            {renderPreviewCanvasContent()}
          </div>
        )}
      </div>
    </div>
  );
}
