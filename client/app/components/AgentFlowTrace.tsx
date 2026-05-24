'use client';

import React from 'react';
import { DecisionItem } from '../types';

interface AgentFlowTraceProps {
  decisionLog: DecisionItem[];
  isAgentThinking: boolean;
  currentAgentStatus?: string;
  onPreviewArtifact?: (artifact: DecisionItem) => void;
}

export default function AgentFlowTrace({ decisionLog, isAgentThinking, currentAgentStatus, onPreviewArtifact }: AgentFlowTraceProps) {
  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Orchestration Graph Trace</h3>
          <span className="text-[10px] text-zinc-400 font-semibold uppercase">{decisionLog.length} real events</span>
        </div>
        
        <div className="space-y-3 font-sans text-xs">
          {decisionLog.length === 0 && !isAgentThinking ? (
            <p className="text-[11px] text-zinc-400 italic">No graph events yet. Run an agent prompt to populate this trace.</p>
          ) : (
            decisionLog.map((log, idx) => (
              <div key={`${log.timestamp}-${idx}`} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-700 font-semibold w-24 truncate">{log.agent}</span>
                <span className="text-zinc-400 truncate flex-1">{log.resolution}</span>
                {log.artifactContent && onPreviewArtifact && (
                  <button
                    onClick={() => onPreviewArtifact(log)}
                    className="ml-auto text-[10px] font-bold text-zinc-600 bg-white border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50 hover:text-zinc-900 transition shadow-sm flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Preview
                  </button>
                )}
              </div>
            ))
          )}
          {isAgentThinking && (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-zinc-700 font-semibold w-24">Running</span>
              <span className="text-zinc-400">{currentAgentStatus || 'Awaiting backend response.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
