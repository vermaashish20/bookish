'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage, ChatSession } from '@/lib/types';

interface ChatInterfaceProps {
  chatMessages: ChatMessage[];
  isAgentThinking: boolean;
  currentAgentStatus?: string;
  promptInput: string;
  setPromptInput: (value: string) => void;
  onSendPrompt: (e: React.FormEvent) => void;
  pendingConfirmation?: { text: string, run_id: string } | null;
  onResume?: (decision: string) => void;
  chatSessions: ChatSession[];
  activeChatSessionId: string;
  onSwitchChatSession: (sessionId: string) => void;
  onNewChatSession: () => void;
  onClearChatSession: () => void;
}

export default function ChatInterface({
  chatMessages,
  isAgentThinking,
  currentAgentStatus,
  promptInput,
  setPromptInput,
  onSendPrompt,
  pendingConfirmation,
  onResume,
  chatSessions,
  activeChatSessionId,
  onSwitchChatSession,
  onNewChatSession,
  onClearChatSession
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update (streaming)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="w-[40%] flex flex-col justify-between bg-white border-r border-zinc-200 overflow-hidden shrink-0">
      <div className="border-b border-zinc-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={activeChatSessionId}
            onChange={(event) => onSwitchChatSession(event.target.value)}
            disabled={isAgentThinking}
            className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] font-medium text-zinc-700 outline-none focus:border-zinc-400 disabled:opacity-50"
            title="Current chat session"
          >
            {chatSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title || 'Chat'} ({session.id === activeChatSessionId ? chatMessages.length : session.messageCount ?? 0})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onNewChatSession}
            disabled={isAgentThinking}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            title="Start a fresh chat session"
          >
            New
          </button>
          <button
            type="button"
            onClick={onClearChatSession}
            disabled={isAgentThinking || chatMessages.length === 0}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
            title="Clear this chat session only"
          >
            Clear
          </button>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-400">
          Chat sessions only reset conversation display. Project memory stays in assets, chapters, and KB tools.
        </p>
      </div>

      {/* Chat Message Stream */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {chatMessages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-xs rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5">
              <h3 className="text-xs font-semibold text-zinc-800">No agent conversation yet</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                Send a prompt to plan, draft, revise, or repair this project. Real agent replies will appear here.
              </p>
            </div>
          </div>
        )}
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-2.5 max-w-full ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
              {/* Custom minimal icon avatar */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                isUser ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}>
                {msg.sender.charAt(0)}
              </div>

              {/* Text bubble space */}
              <div className="space-y-1 max-w-[82%]">
                <div className={`flex items-center gap-1.5 text-[9px] text-zinc-400 font-medium ${isUser ? 'justify-end' : ''}`}>
                  <span className="text-zinc-600 font-semibold">{msg.sender}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className={`text-xs px-3 py-2 rounded-lg leading-relaxed shadow-xs ${
                  isUser ? 'bg-zinc-950 text-white rounded-tr-none' : 'bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap">
                    {msg.text}
                    {!isUser && isAgentThinking && msg.text && (
                      <span className="inline-block w-1.5 h-3 bg-zinc-400 ml-0.5 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Lightweight agent status metadata */}
        {isAgentThinking && (
          <div className="flex items-center gap-1.5 px-1 text-[10px] italic text-zinc-400">
            <span className="h-1 w-1 rounded-full bg-zinc-400 animate-pulse" />
            <span>{currentAgentStatus || "Running the orchestration graph for this request."}</span>
          </div>
        )}
        
        {/* Invisible anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Unified Prompt Entry Input Bar or HITL Confirmation */}
      {pendingConfirmation ? (
        <div className="p-5 border-t border-zinc-100 bg-orange-50 flex flex-col items-center shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
          <p className="text-sm font-semibold text-orange-900 mb-4 text-center">{pendingConfirmation.text}</p>
          <div className="flex gap-3">
            <button
              onClick={() => onResume && onResume('yes')}
              className="rounded-md bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm cursor-pointer"
            >
              Approve
            </button>
            <button
              onClick={() => onResume && onResume('no')}
              className="rounded-md bg-zinc-100 border border-zinc-300 px-6 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition shadow-sm cursor-pointer"
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSendPrompt} className="p-4 border-t border-zinc-100 flex gap-2 items-center bg-zinc-50">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask the agent to plan, draft, revise, or repair outlines..."
            className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none shadow-xs"
          />
          <button
            type="submit"
            disabled={isAgentThinking || !promptInput.trim()}
            className="rounded-md bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-50 shadow-xs cursor-pointer shrink-0"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
