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
  const [selectedPage, setSelectedPage] = useState(1);

  useEffect(() => {
    setSelectedPage(1);
  }, [activeBookSection]);

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

  const selectSection = (section: string, page = 1) => {
    setActiveBookSection(section);
    setSelectedPage(page);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <BookOutline
        chapters={book.chapters}
        activeSection={activeBookSection}
        selectedPage={selectedPage}
        onSelectSection={selectSection}
        totalWordCount={totalWordCount}
      />
      <BookEditor
        book={book}
        activeSection={activeBookSection}
        streamedDocumentText={streamedDocumentText}
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
      />
    </div>
  );
}
