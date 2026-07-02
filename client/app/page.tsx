'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeHero } from '@/components/public/marketing/HomeHero';
import {
  FinalCtaSection,
  ImagineSection,
  LongBookSection,
  MemorySection,
  PlanSection,
  UseCasesSection,
} from '@/components/public/marketing/MarketingSections';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';
import { useAuth } from '@/contexts/AuthProvider';

const PROMPT_STORAGE_KEY = 'bookish-start-prompt';
const PROMPT_CHIPS = [
  'Build a character bible',
  'Outline a mystery novel',
  'Draft chapter one',
];

export default function PublicHomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/workspace');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleStartBook = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    sessionStorage.setItem(PROMPT_STORAGE_KEY, trimmed);
    router.push(
      `/sign-in?redirect_url=${encodeURIComponent(`/workspace?create=1&prompt=${encodeURIComponent(trimmed)}`)}`,
    );
  };

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="bookish-public flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">
        <HomeHero
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={handleStartBook}
          promptChips={PROMPT_CHIPS}
          onChipClick={setPrompt}
        />

        <ImagineSection />
        <MemorySection />
        <UseCasesSection />
        <PlanSection />
        <LongBookSection />
        <FinalCtaSection />
      </main>

      <PublicFooter />
    </div>
  );
}
