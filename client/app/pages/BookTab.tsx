'use client';

import React, { useState } from 'react';
import { BookProject, ChapterItem } from '../types';
import BookOutline from '../components/BookOutline';
import BookEditor from '../components/BookEditor';

interface BookTabProps {
  book: BookProject;
}

export default function BookTab({ book }: BookTabProps) {
  const [activeBookSection, setActiveBookSection] = useState<string>('ch1');

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
      <BookEditor book={book} activeSection={activeBookSection} />
    </div>
  );
}
