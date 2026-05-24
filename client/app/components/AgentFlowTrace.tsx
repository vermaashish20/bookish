'use client';

import React from 'react';
import { DecisionItem } from '../types';

interface AgentFlowTraceProps {
  decisionLog: DecisionItem[];
  isAgentThinking: boolean;
}

export default function AgentFlowTrace({ decisionLog, isAgentThinking }: AgentFlowTraceProps) {
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
                <span className="text-zinc-400 truncate">{log.resolution}</span>
              </div>
            ))
          )}
          {isAgentThinking && (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-zinc-700 font-semibold w-24">Running</span>
              <span className="text-zinc-400">Awaiting backend response.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
