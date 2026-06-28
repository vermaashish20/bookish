'use client';

import Link from 'next/link';
import { BookCard } from '@/components/public/BookCard';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';
import { usePublicShelfBooks } from '@/hooks/usePublicShelfBooks';

export default function ExplorePage() {
  const { shelfBooks, isLoading } = usePublicShelfBooks();

  return (
    <div className="bookish-public flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1 pb-[88px] pt-10">
        <div className="bookish-wrap">
          <div className="mb-8 max-w-[700px]">
            <p className="mb-2 text-[13px] font-[720] uppercase tracking-[0.12em] text-[var(--bookish-accent)]">
              Public shelf
            </p>
            <h1 className="text-[clamp(30px,4vw,50px)] leading-none tracking-[-0.065em] text-[var(--bookish-ink)]">
              Explore books
            </h1>
            <p className="mt-3 max-w-[470px] text-[15px] leading-[1.55] text-[var(--bookish-muted)]">
              Finished and in-progress works shared by writers using Bookish agents for planning,
              drafting, and revision.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-[var(--bookish-muted)]">Loading shelf…</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {shelfBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}

          <p className="mt-10 text-center text-[13px] text-[var(--bookish-muted)]">
            Want to write your own?{' '}
            <Link href="/" className="font-[720] text-[var(--bookish-accent)] hover:underline">
              Start a book on the home page
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
