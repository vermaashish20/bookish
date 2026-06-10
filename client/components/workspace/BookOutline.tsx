'use client';

import React from 'react';
import { ChapterItem } from '@/lib/types';

const isDisplayReadyChapter = (chapter: ChapterItem) =>
  Boolean((chapter.content ?? '').trim()) ||
  chapter.status === 'draft' ||
  chapter.status === 'completed' ||
  chapter.status === 'published';

interface BookOutlineProps {
  chapters: ChapterItem[];
  activeSection: string;
  setActiveSection: (section: string) => void;
  totalWordCount: number;
}

export default function BookOutline({ chapters, activeSection, setActiveSection, totalWordCount }: BookOutlineProps) {
  return (
    <div className="w-64 border-r border-zinc-200 bg-white p-4 flex flex-col shrink-0 justify-between h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <h3 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Book Layout Nodes</h3>
        
        {/* Front Matter Tree */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">Front Matter</span>
          {['half-title', 'title-page', 'copyright', 'contents', 'preface'].map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                activeSection === sec ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {sec.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* Body Chapters Tree */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">Body Chapters</span>
          {chapters.map((ch: ChapterItem) => (
            <button
              key={ch.id}
              onClick={() => setActiveSection(ch.id)}
              className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                activeSection === ch.id ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-200' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <span className="truncate pr-1">Ch {ch.number}: {ch.title.split(':')[0]}</span>
              <span className={`rounded px-1.5 py-0.5 text-[8px] uppercase tracking-wide shrink-0 ${
                ch.status === 'published' || ch.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : isDisplayReadyChapter(ch)
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'bg-zinc-100 text-zinc-400 border border-zinc-100'
              }`} title={ch.status}>
                {ch.status || 'draft'}
              </span>
            </button>
          ))}
        </div>

        {/* Back Matter Tree */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">Back Matter</span>
          {['glossary', 'references', 'about-author'].map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                activeSection === sec ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {sec.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 text-[10px] text-zinc-400 space-y-1 shrink-0">
        <div>Word Count: <strong>{totalWordCount}</strong></div>
        <div>Chapters: <strong>{chapters.length}</strong></div>
      </div>
    </div>
  );
}
