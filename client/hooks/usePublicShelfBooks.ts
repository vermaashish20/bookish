'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { fetchProjects } from '@/lib/api';
import { pickCoverTone, SHOWCASE_BOOKS, type PublicBookCard } from '@/lib/demo/publicBooks';

export function usePublicShelfBooks() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [apiBooks, setApiBooks] = useState<PublicBookCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPublicBooks = useCallback(async () => {
    if (!isAuthenticated) {
      setApiBooks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const projects = await fetchProjects();
      const published = projects
        .filter((project) => (project.publishedChapterCount ?? 0) > 0)
        .map((project, index) => ({
          id: project.id,
          title: project.title,
          genre: project.genre || 'Book',
          author: 'Bookish',
          chapterCount: project.publishedChapterCount ?? project.chapterCount ?? 0,
          coverTone: pickCoverTone(index + SHOWCASE_BOOKS.length),
        }));
      setApiBooks(published);
    } catch {
      setApiBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    void loadPublicBooks();
  }, [authLoading, loadPublicBooks]);

  const shelfBooks = useMemo(() => {
    const seen = new Set<string>();
    const merged: PublicBookCard[] = [];
    for (const book of [...apiBooks, ...SHOWCASE_BOOKS]) {
      if (seen.has(book.id)) continue;
      seen.add(book.id);
      merged.push(book);
    }
    return merged;
  }, [apiBooks]);

  return { shelfBooks, isLoading, reload: loadPublicBooks };
}
