'use client';

import React from 'react';
import { BookProject, ChapterItem, FactItem } from '../types';

interface BookEditorProps {
  book: BookProject;
  activeSection: string;
  streamedDocumentText?: string;
}

export default function BookEditor({ book, activeSection, streamedDocumentText }: BookEditorProps) {
  return (
    <div className="flex-1 bg-zinc-100 p-8 overflow-y-auto flex flex-col items-center">
      <div className="flex flex-col items-center w-full">
        <div className="w-[595px] min-h-[842px] bg-white border border-zinc-300 shadow-md p-14 font-serif leading-relaxed text-xs relative select-text mb-10">
          
          {/* Running Header */}
          <div className="flex justify-between text-[9px] font-sans text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-8 shrink-0">
            <span>{book.title}</span>
            <span>Active Editor Draft</span>
          </div>

          {/* Editor Content Area */}
          <div className="flex-1 flex flex-col justify-start">
            {activeSection === 'half-title' && (
              <div className="text-center py-20 font-sans">
                <h1 className="text-xl font-light text-zinc-900 tracking-widest mb-2 uppercase">{book.title}</h1>
                {book.subtitle && <p className="text-[10px] text-zinc-400 italic tracking-wider">{book.subtitle}</p>}
              </div>
            )}

            {activeSection === 'title-page' && (
              <div className="text-center py-20 font-sans flex flex-col justify-between h-96">
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
                <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-8">Table of Contents</h2>
                <div className="font-sans text-xs space-y-2.5 max-w-md mx-auto">
                  <div className="flex justify-between border-b border-dashed border-zinc-200 pb-0.5">
                    <span>Introduction & Preface</span>
                    <span>v</span>
                  </div>
                  {book.chapters.map((ch: ChapterItem, idx: number) => (
                    <div key={ch.id} className="flex justify-between border-b border-dashed border-zinc-200 pb-0.5">
                      <span>Chapter {ch.number}: {ch.title}</span>
                      <span className={ch.status === 'completed' ? 'text-zinc-900 font-semibold' : 'text-zinc-300 italic'}>
                        {ch.status === 'completed' ? `${(idx + 1) * 12}` : 'Pending'}
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

            {/* Render Chapters */}
            {book.chapters.map((ch: ChapterItem) => {
              if (activeSection === ch.id) {
                return (
                  <div key={ch.id} className="space-y-4">
                    <h2 className="text-center font-sans text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Chapter {ch.number}</h2>
                    <h1 className="text-center text-sm font-semibold leading-snug tracking-tight text-zinc-900 mb-6">{ch.title}</h1>
                    {ch.status === 'completed' || streamedDocumentText ? (
                      <div className="text-xs leading-relaxed space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        <p className="indent-6 text-justify whitespace-pre-wrap">{ch.status === 'completed' ? ch.content : streamedDocumentText}</p>
                        {ch.status === 'completed' && <p className="text-[10px] text-zinc-400 font-sans italic mt-10">Word count: {ch.wordCount} words · Status: {ch.status}</p>}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 rounded bg-zinc-50 font-sans text-center">
                        <span className="text-zinc-400 text-xs mb-2">Chapter Content Empty</span>
                        <p className="text-[9px] text-zinc-400 max-w-xs">Generated content for this chapter will appear here.</p>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}

            {activeSection === 'glossary' && (
              <div className="space-y-4">
                <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">Glossary</h2>
                <div className="space-y-4 text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                  {book.memory.factRegistry.length > 0 ? (
                    book.memory.factRegistry.map((f: FactItem, idx: number) => (
                      <div key={f.id} className="border-b border-zinc-100 pb-2">
                        <strong className="text-zinc-900 font-sans text-[11px] block">{idx + 1}. Fact Assertion Audit</strong>
                        <p className="text-[11px] text-zinc-600 mt-1 italic">"{f.assertion}"</p>
                        <span className="text-[9px] text-zinc-400 block mt-1">Source: {f.source}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-400 text-center italic">No glossary definitions compiled yet. Drafting chapters registers key terms.</p>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'references' && (
              <div className="space-y-4">
                <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">References</h2>
                <div className="space-y-3 text-[10px] leading-relaxed max-w-md mx-auto font-sans">
                  {book.memory.factRegistry.map((f: FactItem) => (
                    <div key={f.id} className="text-zinc-600 pl-4 -indent-4">
                      - {f.source} (Verified by {f.verifiedBy} on {new Date(f.timestamp).toLocaleDateString()})
                    </div>
                  ))}
                  {book.memory.factRegistry.length === 0 && (
                    <div className="text-zinc-400 italic text-center">No references registered yet.</div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'about-author' && (
              <div className="space-y-4 text-xs leading-relaxed">
                <h2 className="text-center font-sans text-xs font-semibold uppercase tracking-widest mb-6">About the Author</h2>
                <p className="text-center text-zinc-400 italic font-sans">Author bio has not been added yet.</p>
              </div>
            )}
          </div>

          {/* Footer page number */}
          <div className="flex justify-center text-[10px] font-sans text-zinc-400 border-t border-zinc-100 pt-3 mt-8 shrink-0 select-none">
            <span>
              {activeSection === 'half-title' || activeSection === 'title-page' ? '' : '12'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
