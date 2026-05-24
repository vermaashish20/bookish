'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { PublicBookReader } from '@/components/public/PublicBookReader';
import { getDemoBook, isDemoBookId } from '@/lib/demo/publicBooks';
import { useProject } from '@/features/workspace/hooks/useProject';

function ApiBookReader({ id }: { id: string }) {
  const { book, loading, bookSectionLoading } = useProject(id, 'Book');

  if (loading || bookSectionLoading) {
    return (
      <div className="bookish-public flex min-h-screen items-center justify-center text-sm text-[var(--bookish-muted)]">
        Loading book…
      </div>
    );
  }

  if (!book) {
    notFound();
  }

  return <PublicBookReader book={book} author="Bookish" />;
}

export default function ReadBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (isDemoBookId(id)) {
    const demoBook = getDemoBook(id);
    if (!demoBook) notFound();

    return (
      <PublicBookReader
        book={{
          id: demoBook.id,
          title: demoBook.title,
          subtitle: demoBook.subtitle ?? '',
          genre: demoBook.genre,
          brief: '',
          chapters: demoBook.chapters,
        }}
        author={demoBook.author}
      />
    );
  }

  return <ApiBookReader id={id} />;
}
