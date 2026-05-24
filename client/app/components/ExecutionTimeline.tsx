'use client';

import React from 'react';
import { DecisionItem } from '../types';

interface ExecutionTimelineProps {
  decisionLog: DecisionItem[];
  selectedPreviewItem: any;
  setSelectedPreviewItem: (item: any) => void;
}

export default function ExecutionTimeline({ decisionLog, selectedPreviewItem, setSelectedPreviewItem }: ExecutionTimelineProps) {
  return (
    <div className="space-y-4 font-sans max-w-3xl">
      <div>
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Execution Timeline Logs</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">Chronological records of orchestrator node completions and outline self-heals.</p>
      </div>

      <div className="relative border-l border-zinc-200 pl-4 ml-2 space-y-4 py-1">
        {decisionLog.length === 0 ? (
          <p className="text-[10px] italic text-zinc-400">No logs in timeline yet.</p>
        ) : (
          decisionLog.map((log: DecisionItem, idx: number) => {
            const logId = `${idx}-${log.timestamp}`;
            const isActive = selectedPreviewItem?.id === logId;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPreviewItem({
                  type: 'timeline',
                  id: logId,
                  title: `Timeline Log: ${log.step}`,
                  subtitle: `${log.agent} Node Action`,
                  content: `**AGENT NODE:**\n${log.agent}\n\n**STEP ACTION:**\n${log.action}\n\n**TIME RESOLVED:**\n${new Date(log.timestamp).toLocaleString()}\n\n**SUMMARY:**\n${log.resolution}`,
                  artifactContent: log.artifactContent
                })}
                className={`w-full text-left p-3 rounded-lg border text-xs relative transition shadow-xxs cursor-pointer block ${
                  isActive
                    ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm'
                    : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 border'
                }`}
              >
                <span className={`absolute -left-[21.5px] top-4 w-2 h-2 rounded-full border ${
                  isActive ? 'border-zinc-950 bg-zinc-950' : 'border-zinc-300 bg-white'
                }`} />
                
                <div className="flex items-center justify-between text-[9px] opacity-70 mb-1 font-mono uppercase tracking-wider font-semibold">
                  <span>{log.agent} Node</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <h4 className="font-bold text-xs truncate">{log.step}</h4>
                <p className="line-clamp-1 text-[11px] opacity-75 italic mt-0.5">"{log.action}"</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
