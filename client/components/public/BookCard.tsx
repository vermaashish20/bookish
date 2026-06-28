import Link from 'next/link';
import type { PublicBookCard } from '@/lib/demo/publicBooks';

interface BookCardProps {
  book: PublicBookCard;
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link
      href={`/read/${book.id}`}
      className="group flex min-w-0 flex-col gap-2 transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--bookish-line)_80%,transparent)] shadow-[0_4px_14px_rgb(31_35_28/0.06)] transition-[border-color,box-shadow] group-hover:border-[color-mix(in_srgb,var(--bookish-accent)_28%,var(--bookish-line))] group-hover:shadow-[0_8px_22px_rgb(31_35_28/0.1)]"
        style={{
          background: `linear-gradient(160deg, rgb(255 255 251 / 0.45), transparent 50%), radial-gradient(circle at 80% 15%, rgb(255 255 251 / 0.4), transparent 40%), ${book.coverTone}`,
        }}
      >
        <div className="pointer-events-none absolute inset-2 rounded-md border border-[rgb(22_23_19/0.06)]" />
      </div>

      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 text-[13px] font-[720] leading-snug tracking-[-0.02em] text-[var(--bookish-ink)]">
          {book.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--bookish-muted)]">{book.genre}</p>
      </div>
    </Link>
  );
}
