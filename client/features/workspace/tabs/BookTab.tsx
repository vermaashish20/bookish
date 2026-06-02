'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BookProject, ChapterItem } from '@/lib/types';
import BookOutline from '@/components/workspace/BookOutline';
import BookEditor from '@/components/workspace/BookEditor';

interface BookTabProps {
  book: BookProject;
  streamedDocumentText?: string;
}

export default function BookTab({ book, streamedDocumentText }: BookTabProps) {
  const firstChapterId = book.chapters[0]?.id;
  const hasAutoSelectedChapter = useRef(Boolean(firstChapterId));
  const [activeBookSection, setActiveBookSection] = useState<string>(
    firstChapterId ?? 'title-page',
  );

  useEffect(() => {
    if (!hasAutoSelectedChapter.current && firstChapterId) {
      hasAutoSelectedChapter.current = true;
      setActiveBookSection(firstChapterId);
      return;
    }
    if (book.chapters.some((chapter) => chapter.id === activeBookSection)) return;
    if (['half-title', 'title-page', 'copyright', 'contents', 'preface', 'glossary', 'references', 'about-author'].includes(activeBookSection)) return;
    setActiveBookSection(firstChapterId ?? 'title-page');
  }, [activeBookSection, book.chapters, firstChapterId]);

  const totalWordCount = book.chapters.reduce(
    (sum: number, ch: ChapterItem) => sum + ch.wordCount,
    0
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      <BookOutline
        chapters={book.chapters}
        activeSection={activeBookSection}
        setActiveSection={setActiveBookSection}
        totalWordCount={totalWordCount}
      />
      <BookEditor book={book} activeSection={activeBookSection} streamedDocumentText={streamedDocumentText} />
    </div>
  );
}
