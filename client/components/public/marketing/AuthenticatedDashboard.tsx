'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Plus } from 'lucide-react';
import { fetchProjects } from '@/lib/api';
import type { BookProject } from '@/lib/types';
import { COVER_TONES, SHOWCASE_BOOKS } from '@/lib/demo/publicBooks';
import { BookCard } from '@/components/public/BookCard';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function pickCover(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COVER_TONES[h % COVER_TONES.length]!;
}

/* ─── WorkspaceCard ───────────────────────────────────────────────────────── */

function WorkspaceCard({ book }: { book: BookProject }) {
  const coverColor = pickCover(book.id);
  const chapterCount = book.chapters?.length ?? book.chapterCount ?? 0;
  const date = new Date(book.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  const isComplete = book.status === 'Completed';

  return (
    <Link
      href={`/book/${book.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[rgba(5,150,105,0.2)]"
    >
      {/* Cover */}
      <div
        className="relative h-[160px] overflow-hidden"
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.45), transparent 50%), radial-gradient(circle at 80% 15%, rgba(255,255,255,0.3), transparent 40%), ${coverColor}`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50" />
        <div className="absolute bottom-4 left-4 right-4">
          {book.genre && (
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              {book.genre}
            </span>
          )}
          <h3 className="bookish-display text-xl font-medium leading-tight text-white line-clamp-2">
            {book.title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-4">
        {book.brief ? (
          <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--bookish-muted)]">
            {book.brief}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <div className="flex items-center justify-between border-t border-black/5 pt-3 text-[11px] text-[var(--bookish-muted)]">
          <span>
            {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <span>{date}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                isComplete
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-[#f4f4f5] text-[var(--bookish-muted)]'
              }`}
            >
              {book.status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white animate-pulse">
      <div className="h-[160px] bg-[#f4f4f5]" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-[#f4f4f5]" />
        <div className="h-3 w-1/2 rounded bg-[#f4f4f5]" />
        <div className="mt-4 h-2 w-1/3 rounded bg-[#f4f4f5]" />
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

const INSPIRED = SHOWCASE_BOOKS.slice(0, 8);

export function AuthenticatedDashboard() {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setProjects(await fetchProjects());
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      {/* ── Workspaces ─────────────────────────────────────────────────────── */}
      <section className="py-20 mt-10 bg-[#FAFAFA] border-t border-black/5">
        <div className="bookish-wrap">
          {/* header */}
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-accent)]">
                Your library
              </p>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-medium tracking-tight text-[var(--bookish-ink)]">
                Active workspaces
              </h2>
            </div>
            <Link
              href="/workspace"
              className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--bookish-ink)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" />
              New book
            </Link>
          </div>

          {/* content */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--bookish-line)] p-16 text-center">
              <BookOpen className="mb-4 h-8 w-8 text-[var(--bookish-muted)] opacity-40" />
              <h3 className="bookish-display mb-2 text-2xl font-medium text-[var(--bookish-ink)]">
                No books yet
              </h3>
              <p className="mb-6 max-w-[30ch] text-[14px] text-[var(--bookish-muted)]">
                Start one from the prompt above, or open your workspace.
              </p>
              <Link href="/workspace" className="bookish-cta">
                Open workspace
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((book) => (
                <WorkspaceCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Get Inspired ───────────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-t border-black/5">
        <div className="bookish-wrap">
          {/* header */}
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-accent)]">
                Public shelf
              </p>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-medium tracking-tight text-[var(--bookish-ink)]">
                Get Inspired
              </h2>
              <p className="mt-2 max-w-[44ch] text-[15px] text-[var(--bookish-muted)]">
                Stories written with Bookish agents, shared by the community.
              </p>
            </div>
            <Link
              href="/explore"
              className="flex shrink-0 items-center gap-2 border-b border-[var(--bookish-accent)]/30 pb-0.5 text-sm font-medium uppercase tracking-widest text-[var(--bookish-accent)] transition-colors hover:border-[var(--bookish-accent)] hover:text-[var(--bookish-accent-hover)]"
            >
              Browse all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* book grid — reuse the same BookCard used in /explore */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {INSPIRED.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
