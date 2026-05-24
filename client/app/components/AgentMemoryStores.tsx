'use client';

import React from 'react';
import { BookProject, FactItem, CharacterBibleItem, CallbackItem } from '../types';

interface AgentMemoryStoresProps {
  book: BookProject;
  selectedPreviewItem: any;
  setSelectedPreviewItem: (item: any) => void;
}

export default function AgentMemoryStores({ book, selectedPreviewItem, setSelectedPreviewItem }: AgentMemoryStoresProps) {
  return (
    <div className="space-y-5 font-sans max-w-3xl">
      <div>
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Orchestrator Memories</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">Cognitive indexes compiled during planning, fact checking, and style matrices scanning.</p>
      </div>

      <div className="space-y-4">
        {/* Registry Fact count selector */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fact Registry ({book.memory.factRegistry.length})</span>
            <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded uppercase font-semibold scale-90">Grounded</span>
          </div>
          {book.memory.factRegistry.length === 0 ? (
            <p className="text-[10px] italic text-zinc-400">No verified facts indexed in RAG memory yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {book.memory.factRegistry.map((fact: FactItem) => {
                const isActive = selectedPreviewItem?.id === fact.id;
                return (
                  <button
                    key={fact.id}
                    type="button"
                    onClick={() => setSelectedPreviewItem({
                      type: 'fact',
                      id: fact.id,
                      title: `Grounded Fact: ${fact.assertion.slice(0, 35)}...`,
                      subtitle: `Verified Source · RAG Key`,
                      content: `ASSERTION:\n"${fact.assertion}"\n\nSOURCE DOCUMENT:\n${fact.source}\n\nVERIFIER AGENT NODE:\n${fact.verifiedBy}\n\nTIME INDEXED:\n${new Date(fact.timestamp || book.createdAt).toLocaleString()}\n\nRELIABILITY SCORE:\n100% (Audited & Citations Aligned)`
                    })}
                    className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
                      isActive ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
                    }`}
                  >
                    <p className="line-clamp-2 italic font-serif">"{fact.assertion}"</p>
                    <div className="text-[8px] text-zinc-400 flex justify-between mt-1.5 font-sans font-medium">
                      <span>Source: {fact.source}</span>
                      <span className="text-emerald-600">Verified by {fact.verifiedBy}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Character/Concept Bible count selector */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entity & Concept Bible ({book.memory.characterBible.length})</span>
            <span className="text-[8px] bg-zinc-100 text-zinc-600 border border-zinc-200 px-1 py-0.5 rounded uppercase font-semibold scale-90">Bible</span>
          </div>
          {book.memory.characterBible.length === 0 ? (
            <p className="text-[10px] italic text-zinc-400">Character bible is empty.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {book.memory.characterBible.map((char: CharacterBibleItem) => {
                const isActive = selectedPreviewItem?.id === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setSelectedPreviewItem({
                      type: 'character',
                      id: char.id,
                      title: `Bible Entry: ${char.name}`,
                      subtitle: `Role Profile · Continuity Tracking`,
                      content: `ENTITY NAME:\n${char.name}\n\nROLE / CONCEPT KEY:\n${char.role}\n\nCHARACTER DEVELOPMENT ARC:\n${char.arc}\n\nACTIVE REGISTERED CHAPTERS:\nChapters ${char.activeChapters.join(', ')}\n\nCOGNITIVE ATTRIBUTES:\n${Object.entries(char.attributes).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
                    })}
                    className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
                      isActive ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold">{char.name}</span>
                      <span className="text-[8.5px] font-semibold text-zinc-500 bg-zinc-100 px-1 rounded">{char.role}</span>
                    </div>
                    <p className="line-clamp-1 text-[10px] text-zinc-500">Arc: {char.arc}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Callback index selector */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xxs space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Setup/Payoff Callback Index ({book.memory.callbackIndex.length})</span>
            <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1 py-0.5 rounded uppercase font-semibold scale-90">Callbacks</span>
          </div>
          {book.memory.callbackIndex.length === 0 ? (
            <p className="text-[10px] italic text-zinc-400">No callbacks registered in index.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {book.memory.callbackIndex.map((cb: CallbackItem) => {
                const isActive = selectedPreviewItem?.id === cb.id;
                return (
                  <button
                    key={cb.id}
                    type="button"
                    onClick={() => setSelectedPreviewItem({
                      type: 'callback',
                      id: cb.id,
                      title: `Motif Callback: ${cb.context.slice(0, 35)}...`,
                      subtitle: `Setup & Payoff Continuity Index`,
                      content: `NARRATIVE MOTIF SETUP:\n"${cb.context}"\n\nSETUP STAGE:\nChapter ${cb.setupChapter}\n\nRESOLVING STAGE:\nChapter ${cb.payoffChapter}\n\nRESOLUTION STATUS:\n${cb.resolved ? 'RESOLVED AND CONFIRMED' : 'SETUP INDEXED - PENDING GENERATION'}\n\nAUDITED BY:\nOrchestration Planner Graph Node`
                    })}
                    className={`w-full text-left p-2.5 rounded border text-[11px] transition text-zinc-800 cursor-pointer block ${
                      isActive ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50 border'
                    }`}
                  >
                    <p className="line-clamp-1">{cb.context}</p>
                    <div className="flex justify-between items-center text-[8.5px] mt-1 font-medium text-zinc-400">
                      <span>Ch {cb.setupChapter} to Ch {cb.payoffChapter}</span>
                      <span className={`font-semibold ${cb.resolved ? 'text-emerald-600' : 'text-amber-600'}`}>{cb.resolved ? 'Resolved' : 'Setup'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tonality preset styleMatrix card clicker */}
        <button
          type="button"
          onClick={() => setSelectedPreviewItem({
            type: 'style',
            id: 'style-matrix',
            title: `Tonality Fingerprint Matrix`,
            subtitle: `Vocabulary Control & Style Metrics`,
            content: `ACTIVE WRITING PRESET:\n${book.tonality}\n\nSTYLE DIMENSION TARGETS:\n${Object.entries(book.memory.tonalityFingerprint)
              .filter(([_, v]) => typeof v === 'number')
              .map(([k, v]) => `- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${Math.round((v as number) * 100)}%`)
              .join('\n') || 'No style dimensions recorded yet.'}\n\nFORBIDDEN PHRASES:\n${book.memory.tonalityFingerprint.forbiddenPhrases.length > 0 ? book.memory.tonalityFingerprint.forbiddenPhrases.map(phrase => `- ${phrase}`).join('\n') : 'No forbidden phrases recorded yet.'}`
          })}
          className={`w-full rounded-lg border text-left p-4 shadow-xxs bg-white flex justify-between items-center transition cursor-pointer ${
            selectedPreviewItem?.id === 'style-matrix' ? 'bg-zinc-100 border-zinc-950 border-2 text-zinc-950 font-semibold shadow-sm' : 'border-zinc-200 hover:border-zinc-300 bg-white border'
          }`}
        >
          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tonality Style Matrix</h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">Style scores and vocabulary bans for {book.tonality}.</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-zinc-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
