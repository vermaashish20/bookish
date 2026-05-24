'use client';

import React from 'react';
import { BookProject } from '../types';
import UserContextTimeline from './UserContextTimeline';
import AgentMemoryStores from './AgentMemoryStores';
import ExecutionTimeline from './ExecutionTimeline';

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

    return (
      <div className="w-full h-full flex flex-col bg-white border border-zinc-250 rounded-lg shadow-xs overflow-hidden font-sans select-text">
        <div className="flex justify-between items-center bg-zinc-50 px-4 py-2 border-b border-zinc-200 select-none text-[10px] shrink-0 text-zinc-500 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-zinc-700 truncate max-w-[180px]">{selectedPreviewItem.title}</span>
            <span className="text-zinc-300">|</span>
            <span className="text-zinc-400 normal-case">{selectedPreviewItem.subtitle || selectedPreviewItem.type}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPreviewItem(null)}
            className="text-zinc-400 hover:text-zinc-700 text-xs font-bold transition focus:outline-none cursor-pointer"
            title="Close Preview"
          >
            x
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto bg-zinc-50/10 font-mono text-xs leading-relaxed text-zinc-800">
          <div className="space-y-3 font-sans">
            <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider select-none border-b border-zinc-100 pb-1 flex justify-between items-center">
              <span>{selectedPreviewItem.type.replace('_', ' ')} source stream</span>
              <span className="text-zinc-300 font-mono normal-case text-[8px] font-medium">UTF-8 File Layout</span>
            </div>
            <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-zinc-50/50 p-4 border border-zinc-100 rounded-md text-zinc-800 font-light max-h-[480px] overflow-y-auto">
              {selectedPreviewItem.content}
            </div>
          </div>
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
          <div className="w-[40%] bg-zinc-50 p-5 overflow-y-auto flex flex-col items-center shrink-0 border-l border-zinc-200 transition-all duration-300 animate-fade-in">
            {renderPreviewCanvasContent()}
          </div>
        )}
      </div>
    </div>
  );
}
