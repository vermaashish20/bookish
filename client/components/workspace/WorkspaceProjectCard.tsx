'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { BookProject } from '@/lib/types';
import { COVER_TONES } from '@/lib/demo/publicBooks';

export function pickCoverTone(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COVER_TONES[h % COVER_TONES.length]!;
}

interface WorkspaceProjectCardProps {
  book: BookProject;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  compact?: boolean;
}

export function WorkspaceProjectCard({ book, onDelete, compact = false }: WorkspaceProjectCardProps) {
  const coverColor = pickCoverTone(book.id);
  const chapterCount = book.chapters?.length ?? book.chapterCount ?? 0;
  const assetCount = book.assetCount ?? book.assets?.length ?? 0;
  const date = new Date(book.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isComplete = book.status === 'Completed';

  return (
    <Link
      href={`/book/${book.id}`}
      className={`group relative flex flex-col overflow-hidden border border-black/5 bg-white shadow-sm transition-all duration-300 hover:border-[rgba(5,150,105,0.2)] hover:shadow-md ${
        compact
          ? 'rounded-xl hover:-translate-y-0.5'
          : 'rounded-2xl hover:-translate-y-1'
      }`}
    >
      <div
        className={`relative overflow-hidden ${compact ? 'h-[120px]' : 'h-[148px]'}`}
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.45), transparent 50%), radial-gradient(circle at 80% 15%, rgba(255,255,255,0.3), transparent 40%), ${coverColor}`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50" />
        <div className={`absolute right-3 left-3 ${compact ? 'bottom-2.5' : 'bottom-4'}`}>
          {book.genre && (
            <span
              className={`mb-0.5 block font-bold uppercase tracking-widest text-emerald-300 text-[10px]`}
            >
              {book.genre}
            </span>
          )}
          <h3
            className={`bookish-display line-clamp-2 font-medium leading-tight text-white ${
              compact ? 'text-lg' : 'text-xl'
            }`}
          >
            {book.title}
          </h3>
        </div>
      </div>

      <div className={`flex flex-1 flex-col justify-between ${compact ? 'p-3.5' : 'p-4'}`}>
        {book.brief ? (
          <p
            className={`leading-relaxed text-[var(--bookish-muted)] ${
              compact ? 'mb-2.5 line-clamp-2 text-xs' : 'mb-3 line-clamp-2 text-[13px]'
            }`}
          >
            {book.brief}
          </p>
        ) : (
          <p
            className={`italic text-[var(--bookish-muted)] ${
              compact ? 'mb-2.5 line-clamp-2 text-xs' : 'mb-3 line-clamp-2 text-[13px]'
            }`}
          >
            No brief yet — open to start writing.
          </p>
        )}

        <div
          className={`flex items-center justify-between border-t border-black/5 text-[var(--bookish-muted)] ${
            compact ? 'pt-2.5 text-[11px]' : 'pt-3 text-[11px]'
          }`}
        >
          <span>
            {chapterCount} ch · {assetCount} file{assetCount !== 1 ? 's' : ''}
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
              {book.status ?? 'Draft'}
            </span>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => onDelete(book.id, e)}
                className="rounded-full p-1 text-[var(--bookish-muted)] transition hover:bg-red-50 hover:text-red-600"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function WorkspaceProjectCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`overflow-hidden border border-black/5 bg-white animate-pulse ${
        compact ? 'rounded-xl' : 'rounded-2xl'
      }`}
    >
      <div className={`bg-[#f4f4f5] ${compact ? 'h-[120px]' : 'h-[148px]'}`} />
      <div className={`space-y-2 ${compact ? 'p-3.5' : 'p-4'}`}>
        <div className="h-3 w-3/4 rounded bg-[#f4f4f5]" />
        <div className="h-3 w-1/2 rounded bg-[#f4f4f5]" />
        <div className={`h-2 w-1/3 rounded bg-[#f4f4f5] ${compact ? 'mt-2' : 'mt-4'}`} />
      </div>
    </div>
  );
}
