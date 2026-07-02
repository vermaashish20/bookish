'use client';

import React, { useEffect } from 'react';
import { BookProject, ChapterItem } from '@/lib/types';
import {
  MANUSCRIPT_HEADER_BAND_PX,
  MANUSCRIPT_MARGIN_BOTTOM_PX,
  MANUSCRIPT_MARGIN_TOP_PX,
  MANUSCRIPT_MARGIN_X_PX,
  MANUSCRIPT_PAGE_HEIGHT_PX,
  MANUSCRIPT_PAGE_WIDTH_PX,
  formatChapterHeading,
  prepareChapterForDisplay,
  stripManuscriptMarkdown,
} from '@/lib/book/pagination';

const MANUSCRIPT_BODY_HEIGHT_PX =
  MANUSCRIPT_PAGE_HEIGHT_PX -
  MANUSCRIPT_MARGIN_TOP_PX -
  MANUSCRIPT_MARGIN_BOTTOM_PX -
  MANUSCRIPT_HEADER_BAND_PX -
  8;

const isDisplayReadyChapter = (chapter: ChapterItem) =>
  Boolean((chapter.content ?? '').trim()) ||
  chapter.status === 'draft' ||
  chapter.status === 'completed' ||
  chapter.status === 'published';

const hasChapterContent = (chapter: ChapterItem) =>
  Boolean((chapter.content ?? '').trim());

function isPublishedChapter(status?: string): boolean {
  return status === 'published' || status === 'completed';
}

interface BookEditorProps {
  book: BookProject;
  activeSection: string;
  streamedDocumentText?: string;
  selectedPage: number;
  setSelectedPage: (page: number) => void;
}

function ManuscriptPage({
  bookTitle,
  pageNumber,
  showPageNumber,
  footerNote,
  children,
}: {
  bookTitle: string;
  pageNumber?: number;
  showPageNumber?: boolean;
  footerNote?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white border border-zinc-300 shadow-md font-serif relative select-text mb-10 overflow-hidden shrink-0"
      style={{
        width: MANUSCRIPT_PAGE_WIDTH_PX,
        height: MANUSCRIPT_PAGE_HEIGHT_PX,
        paddingLeft: MANUSCRIPT_MARGIN_X_PX,
        paddingRight: MANUSCRIPT_MARGIN_X_PX,
        paddingTop: MANUSCRIPT_MARGIN_TOP_PX,
        paddingBottom: MANUSCRIPT_MARGIN_BOTTOM_PX,
      }}
    >
      <header
        className="border-b border-zinc-100 overflow-hidden"
        style={{ height: MANUSCRIPT_HEADER_BAND_PX }}
      >
        <div className="flex h-full items-end justify-between pb-0.5 text-[7px] font-sans text-zinc-400 uppercase tracking-widest leading-none">
          <span className="truncate pr-4">{bookTitle}</span>
          <span className="shrink-0">Manuscript</span>
        </div>
      </header>

      <div className="overflow-hidden pt-2" style={{ height: MANUSCRIPT_BODY_HEIGHT_PX }}>
        {children}
      </div>

      {(footerNote || (showPageNumber && pageNumber)) && (
        <div
          className="pointer-events-none absolute inset-x-0 flex items-center justify-between px-0 text-[7px] font-sans leading-none text-zinc-400"
          style={{
            left: MANUSCRIPT_MARGIN_X_PX,
            right: MANUSCRIPT_MARGIN_X_PX,
            bottom: 4,
            height: 8,
          }}
        >
          <span className="truncate italic">{footerNote ?? ''}</span>
          <span className="shrink-0 tabular-nums">{showPageNumber && pageNumber ? pageNumber : ''}</span>
        </div>
      )}
    </div>
  );
}

export default function BookEditor({
  book,
  activeSection,
  streamedDocumentText,
  selectedPage,
  setSelectedPage,
}: BookEditorProps) {
  const activeChapter = book.chapters.find((ch) => ch.id === activeSection);
  const rawChapterContent =
    activeChapter && hasChapterContent(activeChapter)
      ? activeChapter.content!
      : streamedDocumentText ?? '';
  const isChapterView = Boolean(activeChapter);
  const chapterPages =
    isChapterView && activeChapter && rawChapterContent
      ? prepareChapterForDisplay(rawChapterContent, {
          number: activeChapter.number,
          title: activeChapter.title,
        })
      : [];
  const pageCount = Math.max(chapterPages.length, 1);

  useEffect(() => {
    if (selectedPage > pageCount) {
      setSelectedPage(pageCount);
    }
  }, [pageCount, selectedPage, setSelectedPage]);

  const activePageContent = stripManuscriptMarkdown(chapterPages[selectedPage - 1] ?? '');

  const renderStaticSection = () => (
    <div className="flex-1 bg-zinc-100 p-8 overflow-y-auto flex flex-col items-center">
      <ManuscriptPage
        bookTitle={book.title}
        showPageNumber={activeSection !== 'half-title' && activeSection !== 'title-page'}
        pageNumber={12}
      >
        <div className="h-full overflow-hidden text-xs leading-relaxed">
          {activeSection === 'half-title' && (
            <div className="text-center py-20 font-sans">
              <h1 className="text-xl font-light text-zinc-900 tracking-widest mb-2 uppercase">{book.title}</h1>
              {book.subtitle && <p className="text-[10px] text-zinc-400 italic tracking-wider">{book.subtitle}</p>}
            </div>
          )}

          {activeSection === 'title-page' && (
            <div className="text-center py-20 font-sans flex flex-col justify-between h-full">
              <div>
                <h1 className="text-2xl font-light text-zinc-950 tracking-widest uppercase">{book.title}</h1>
                {book.subtitle && <p className="text-[10px] text-zinc-500 italic mt-2 tracking-wider">{book.subtitle}</p>}
              </div>
              <div className="text-[10px] text-zinc-400 tracking-wider">
                <p className="font-semibold text-zinc-800">Author / Publisher</p>
                <p className="mt-1">Publication details will appear here.</p>
              </div>
            </div>
          )}

          {activeSection === 'copyright' && (
            <div className="text-left font-sans text-[10px] text-zinc-500 max-w-md py-10 space-y-4">
              <h2 className="text-xs font-bold text-zinc-800">COPYRIGHT REGISTRATION</h2>
              <p>Copyright, ISBN, edition, and rights information will appear here when supplied.</p>
            </div>
          )}

          {activeSection === 'contents' && (
            <div className="space-y-6">
              <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-8">
                Table of Contents
              </h2>
              <div className="font-sans text-xs space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between border-b border-dashed border-zinc-200 pb-0.5">
                  <span>Introduction & Preface</span>
                  <span>v</span>
                </div>
                {book.chapters.map((ch: ChapterItem, idx: number) => (
                  <div key={ch.id} className="flex justify-between border-b border-dashed border-zinc-200 pb-0.5">
                    <span>
                      Chapter {ch.number}: {ch.title}
                    </span>
                    <span
                      className={
                        isDisplayReadyChapter(ch) ? 'text-zinc-900 font-semibold' : 'text-zinc-300 italic'
                      }
                    >
                      {isDisplayReadyChapter(ch) ? `${(idx + 1) * 12}` : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'preface' && (
            <div className="space-y-4 leading-relaxed text-xs">
              <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">Preface</h2>
              <p className="text-center text-zinc-400 italic font-sans">Preface content has not been generated yet.</p>
            </div>
          )}

          {activeSection === 'glossary' && (
            <div className="space-y-4">
              <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">Glossary</h2>
              <div className="space-y-4 text-xs leading-relaxed">
                {book.memory.characters.length > 0 || book.memory.worldEntities.length > 0 ? (
                  <>
                    {book.memory.characters.map((character) => (
                      <div key={character.id} className="border-b border-zinc-100 pb-2">
                        <strong className="text-zinc-900 font-sans text-[11px] block">{character.name}</strong>
                        <p className="text-[11px] text-zinc-600 mt-1">
                          {character.role}
                          {character.arc ? ` — ${character.arc}` : ''}
                        </p>
                      </div>
                    ))}
                    {book.memory.worldEntities.map((entity) => (
                      <div key={entity.id} className="border-b border-zinc-100 pb-2">
                        <strong className="text-zinc-900 font-sans text-[11px] block">{entity.name}</strong>
                        <p className="text-[11px] text-zinc-600 mt-1">{entity.description || entity.type}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-zinc-400 text-center italic">
                    No glossary entries yet. World builder approvals add characters and lore here.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'references' && (
            <div className="space-y-4">
              <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">References</h2>
              <div className="space-y-3 text-[10px] leading-relaxed max-w-md mx-auto font-sans">
                {book.assets
                  .filter((asset) => asset.name !== 'Project Initial Brief')
                  .map((asset) => (
                    <div key={asset.id} className="text-zinc-600 pl-4 -indent-4">
                      - {asset.name} ({asset.type})
                    </div>
                  ))}
                {book.assets.filter((asset) => asset.name !== 'Project Initial Brief').length === 0 && (
                  <div className="text-zinc-400 italic text-center">No reference documents uploaded yet.</div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'about-author' && (
            <div className="space-y-4 text-xs leading-relaxed">
              <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">
                About the Author
              </h2>
              <p className="text-center text-zinc-400 italic font-sans">Author bio has not been added yet.</p>
            </div>
          )}
        </div>
      </ManuscriptPage>
    </div>
  );

  if (!activeChapter) {
    return renderStaticSection();
  }

  const ch = activeChapter;
  const footerNote =
    selectedPage === pageCount && hasChapterContent(ch)
      ? `${ch.wordCount.toLocaleString()} words · ${isPublishedChapter(ch.status) ? 'published' : ch.status}`
      : undefined;

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-100">
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        <ManuscriptPage
          bookTitle={book.title}
          showPageNumber
          pageNumber={selectedPage}
          footerNote={footerNote}
        >
          <div className="overflow-hidden text-xs leading-relaxed">
            {selectedPage === 1 && (
              <h1 className="mb-4 text-center text-base font-bold leading-snug tracking-tight text-zinc-900">
                {formatChapterHeading(ch.number, ch.title)}
              </h1>
            )}

            {rawChapterContent ? (
              <p className="indent-6 text-justify whitespace-pre-wrap leading-[1.65]">{activePageContent}</p>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center p-8">
                <span className="text-zinc-400 text-xs mb-2">Chapter Content Empty</span>
                <p className="text-[9px] text-zinc-400 max-w-xs">Generated content for this chapter will appear here.</p>
              </div>
            )}
          </div>
        </ManuscriptPage>
      </div>
    </div>
  );
}
