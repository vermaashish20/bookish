'use client';

import React from 'react';
import { BookProject } from '../types';
import MemoryPanel from '../components/MemoryPanel';

interface MemoryTabProps {
  book: BookProject;
  memorySubTab: 'User' | 'AgentMemory' | 'Timeline';
  setMemorySubTab: (tab: 'User' | 'AgentMemory' | 'Timeline') => void;
  selectedPreviewItem: any;
  setSelectedPreviewItem: (item: any) => void;
  setIsAddAssetOpen: (open: boolean) => void;
}

export default function MemoryTab({
  book,
  memorySubTab,
  setMemorySubTab,
  selectedPreviewItem,
  setSelectedPreviewItem,
  setIsAddAssetOpen
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
