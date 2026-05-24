'use client';

import React from 'react';
import { ChapterItem } from '../types';

interface PreviewCanvasProps {
  chapter: ChapterItem | undefined;
  selectedPage: number;
  setSelectedPage: (page: number) => void;
  bookTitle: string;
}

export default function PreviewCanvas({ chapter, selectedPage, setSelectedPage, bookTitle }: PreviewCanvasProps) {
  const previewChunks = chapter?.content
    ? chapter.content.match(/[\s\S]{1,1200}/g) || []
    : [];
  const previewPages = Array.from({ length: Math.max(previewChunks.length, 1) }, (_, idx) => idx + 1);
  const activePreviewContent = previewChunks[selectedPage - 1] || '';

  return (
    <div className="flex flex-row items-stretch w-full h-full overflow-hidden">
      {/* Leftside thumbnail page panel (Scrollable) */}
      <div className="w-24 border-r border-zinc-200 bg-white p-2.5 flex flex-col gap-3 overflow-y-auto shrink-0 select-none">
        <span className="text-[7.5px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5 text-center">Pages</span>
        
        {/* Pages List */}
        {previewPages.map((pageNum) => {
          const isActive = selectedPage === pageNum;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => setSelectedPage(pageNum)}
              className={`flex flex-col items-center gap-1 p-1 rounded transition-all focus:outline-none ${
                isActive 
                  ? 'bg-zinc-100 text-zinc-950 font-bold border border-zinc-250 shadow-xxs' 
                  : 'text-zinc-500 hover:bg-zinc-50 border border-transparent'
              }`}
            >
              {/* Scaled-down miniature A4 canvas */}
              <div className={`w-[56px] h-[79px] bg-white border ${isActive ? 'border-zinc-800' : 'border-zinc-200'} rounded p-1 relative flex flex-col justify-between overflow-hidden`}>
                {/* Tiny page header */}
                <div className="flex justify-between items-center text-[2.5px] text-zinc-300 border-b border-zinc-100 pb-0.5 scale-90 origin-top">
                  <span>{chapter ? `Ch ${chapter.number}` : 'Book'}</span>
                  <span>p. {pageNum}</span>
                </div>
                
                {/* Tiny document lines */}
                <div className="space-y-[3px] my-0.5 scale-90 origin-center">
                  <div className="h-[1.5px] bg-zinc-200 rounded w-4/5 mx-auto" />
                  <div className="h-[1.5px] bg-zinc-150 rounded w-11/12" />
                  <div className="h-[1.5px] bg-zinc-100 rounded w-10/12" />
                  <div className="h-[1.5px] bg-zinc-100 rounded w-7/12" />
                </div>
                
                {/* Tiny footer */}
                <span className="text-[2px] text-zinc-300 tracking-wide text-center scale-75 origin-bottom">Draft</span>
              </div>
              <span className="text-[8px] uppercase font-bold tracking-wider">
                Page {pageNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rightside active A4 page view (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        {/* A4 Canvas Page frame */}
        <div className="w-[500px] min-h-[707px] bg-white border border-zinc-300 shadow-md p-10 font-serif leading-relaxed text-xs relative select-text mb-10">
          
          {/* Running Header */}
          <div className="flex justify-between text-[9px] font-sans text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-6 shrink-0">
            <span>{bookTitle}</span>
            <span>Preview Page {selectedPage} of {previewPages.length}</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-center font-sans text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              {chapter ? `Chapter ${chapter.number}` : 'Manuscript'} · Page {selectedPage}
            </h2>
            {chapter && activePreviewContent ? (
              <div className="space-y-4">
                <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">{chapter.title}</h1>
                <p className="indent-6 whitespace-pre-wrap text-justify leading-relaxed">{activePreviewContent}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-14 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                <span className="text-zinc-400 text-xs mb-2">No generated chapter preview yet</span>
                <p className="text-[10px] text-zinc-400 max-w-xs">Generated chapter text will render here in manuscript pages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
