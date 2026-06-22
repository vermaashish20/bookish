'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BookProject, ChapterItem } from '@/lib/types';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';

function isReadableChapter(chapter: ChapterItem): boolean {
  return (
    Boolean((chapter.content ?? '').trim()) &&
    (chapter.status === 'published' || chapter.status === 'completed')
  );
}

interface PublicBookReaderProps {
  book: Pick<BookProject, 'id' | 'title' | 'subtitle' | 'genre' | 'brief' | 'chapters'>;
  author?: string;
}

export function PublicBookReader({ book, author = 'Bookish' }: PublicBookReaderProps) {
  const readableChapters = useMemo(
    () => book.chapters.filter(isReadableChapter).sort((a, b) => a.number - b.number),
    [book.chapters],
  );

  const [activeChapterId, setActiveChapterId] = useState<string>(
    readableChapters[0]?.id ?? '',
  );

  useEffect(() => {
    if (!readableChapters.some((ch) => ch.id === activeChapterId)) {
      setActiveChapterId(readableChapters[0]?.id ?? '');
    }
  }, [activeChapterId, readableChapters]);

  const activeChapter = readableChapters.find((ch) => ch.id === activeChapterId);

  return (
    <div className="bookish-public flex min-h-screen flex-col">
      <PublicNav />

      <div className="bookish-wrap flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/explore" className="text-xs font-[720] text-[var(--bookish-accent)] hover:underline">
              ← Back to shelf
            </Link>
            <h1 className="mt-2 text-[clamp(28px,4vw,42px)] leading-[1.02] tracking-[-0.06em] text-[var(--bookish-ink)]">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="mt-1 text-sm text-[var(--bookish-muted)] italic">{book.subtitle}</p>
            )}
            <p className="mt-2 text-xs text-[var(--bookish-muted)]">
              By {author}
              {book.genre ? ` · ${book.genre}` : ''}
            </p>
          </div>
        </div>

        {readableChapters.length === 0 ? (
          <div className="rounded-[18px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_64%,transparent)] p-10 text-center">
            <p className="text-sm text-[var(--bookish-muted)]">
              This book has no published chapters yet. Check back soon.
            </p>
            {book.brief && (
              <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-[var(--bookish-muted)]">
                {book.brief}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="h-fit rounded-[18px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_64%,transparent)] p-4 lg:sticky lg:top-[88px]">
              <h2 className="mb-3 text-[11px] font-[760] uppercase tracking-[0.12em] text-[var(--bookish-muted)]">
                Chapters
              </h2>
              <nav className="space-y-1" aria-label="Table of contents">
                {readableChapters.map((chapter) => {
                  const isActive = chapter.id === activeChapterId;
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => setActiveChapterId(chapter.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                        isActive
                          ? 'bg-[rgb(35_92_69/0.12)] font-[720] text-[var(--bookish-accent)]'
                          : 'text-[var(--bookish-muted)] hover:bg-[rgb(22_23_19/0.04)] hover:text-[var(--bookish-ink)]'
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-wide opacity-70">
                        Chapter {chapter.number}
                      </span>
                      <span className="line-clamp-2">{chapter.title}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <article className="min-w-0 rounded-[18px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_78%,transparent)] px-6 py-8 sm:px-10 sm:py-10">
              {activeChapter ? (
                <>
                  <header className="mb-8 border-b border-[var(--bookish-line)] pb-6">
                    <p className="text-[11px] font-[720] uppercase tracking-[0.14em] text-[var(--bookish-muted)]">
                      Chapter {activeChapter.number}
                    </p>
                    <h2 className="mt-2 text-[clamp(24px,3vw,34px)] leading-[1.05] tracking-[-0.05em] text-[var(--bookish-ink)]">
                      {activeChapter.title}
                    </h2>
                  </header>
                  <div className="bookish-prose max-w-none text-[15px] leading-[1.75] text-[var(--bookish-ink)]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeChapter.content ?? ''}
                    </ReactMarkdown>
                  </div>
                </>
              ) : null}
            </article>
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
