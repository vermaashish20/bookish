'use client';

import React from 'react';
import { BookProject, MemorySubTab, PreviewItem } from '@/lib/types';
import MemoryPanel from '@/components/workspace/MemoryPanel';

interface MemoryTabProps {
  book: BookProject;
  memorySubTab: MemorySubTab;
  setMemorySubTab: (tab: MemorySubTab) => void;
  selectedPreviewItem: PreviewItem | null;
  setSelectedPreviewItem: (item: PreviewItem | null) => void;
  setIsAddAssetOpen: (open: boolean) => void;
}

export default function MemoryTab({
  book,
  memorySubTab,
  setMemorySubTab,
  selectedPreviewItem,
  setSelectedPreviewItem,
  setIsAddAssetOpen,
}: MemoryTabProps) {
  return (
    <MemoryPanel
      book={book}
      memorySubTab={memorySubTab}
      setMemorySubTab={setMemorySubTab}
      selectedPreviewItem={selectedPreviewItem}
      setSelectedPreviewItem={setSelectedPreviewItem}
      setIsAddAssetOpen={setIsAddAssetOpen}
    />
  );
}
