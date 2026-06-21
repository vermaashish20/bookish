'use client';

import React from 'react';
import { ChapterItem } from '@/lib/types';
import { prepareChapterForDisplay } from '@/lib/book/pagination';

const isDisplayReadyChapter = (chapter: ChapterItem) =>
  Boolean((chapter.content ?? '').trim()) ||
  chapter.status === 'draft' ||
  chapter.status === 'completed' ||
  chapter.status === 'published';

function isPublishedChapter(status?: string): boolean {
  return status === 'published' || status === 'completed';
}

interface BookOutlineProps {
  chapters: ChapterItem[];
  activeSection: string;
  selectedPage: number;
  onSelectSection: (section: string, page?: number) => void;
  totalWordCount: number;
}

export default function BookOutline({
  chapters,
  activeSection,
  selectedPage,
  onSelectSection,
  totalWordCount,
}: BookOutlineProps) {
  const frontMatter = ['half-title', 'title-page', 'copyright', 'contents', 'preface'];
  const backMatter = ['glossary', 'references', 'about-author'];

  return (
    <div className="w-64 border-r border-zinc-200 bg-white p-4 flex flex-col shrink-0 justify-between h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <h3 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Table of Contents</h3>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">
            Front Matter
          </span>
          {frontMatter.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => onSelectSection(sec, 1)}
              className={`w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                activeSection === sec ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {sec.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">
            Body Chapters
          </span>
          {chapters.map((ch: ChapterItem) => {
            const isChapterActive = activeSection === ch.id;
            const pageCount = ch.content?.trim()
              ? prepareChapterForDisplay(ch.content, { number: ch.number, title: ch.title }).length
              : 0;

            return (
              <div key={ch.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => onSelectSection(ch.id, 1)}
                  className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                    isChapterActive
                      ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className="truncate pr-1">Ch {ch.number}: {ch.title.split(':')[0]}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[8px] uppercase tracking-wide shrink-0 ${
                      isPublishedChapter(ch.status)
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : isDisplayReadyChapter(ch)
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-zinc-100 text-zinc-400 border border-zinc-100'
                    }`}
                    title={ch.status}
                  >
                    {isPublishedChapter(ch.status) ? 'published' : ch.status || 'draft'}
                  </span>
                </button>

                {pageCount > 0 && (
                  <div className="ml-3 border-l border-zinc-200 pl-2 space-y-0.5">
                    {Array.from({ length: pageCount }, (_, idx) => {
                      const pageNum = idx + 1;
                      const isPageActive = isChapterActive && selectedPage === pageNum;
                      return (
                        <button
                          key={`${ch.id}-page-${pageNum}`}
                          type="button"
                          onClick={() => onSelectSection(ch.id, pageNum)}
                          className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors focus:outline-none cursor-pointer ${
                            isPageActive
                              ? 'bg-zinc-100 text-zinc-950 font-semibold'
                              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'
                          }`}
                        >
                          Page {pageNum}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-2 block">
            Back Matter
          </span>
          {backMatter.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => onSelectSection(sec, 1)}
              className={`w-full text-left px-2 py-1 text-xs rounded transition-colors focus:outline-none cursor-pointer ${
                activeSection === sec ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {sec.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 text-[10px] text-zinc-400 space-y-1 shrink-0">
        <div>
          Word Count: <strong>{totalWordCount}</strong>
        </div>
        <div>
          Chapters: <strong>{chapters.length}</strong>
        </div>
      </div>
    </div>
  );
}
