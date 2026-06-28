'use client';

import { FormEvent, useState } from 'react';
import { HomeHero } from '@/components/public/marketing/HomeHero';
import {
  FinalCtaSection,
  ImagineSection,
  LongBookSection,
  MemorySection,
  PlanSection,
  UseCasesSection,
} from '@/components/public/marketing/MarketingSections';
import { AuthenticatedDashboard } from '@/components/public/marketing/AuthenticatedDashboard';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';

const PROMPT_STORAGE_KEY = 'bookish-start-prompt';
const PROMPT_CHIPS = [
  'Build a character bible',
  'Outline a mystery novel',
  'Draft chapter one',
];

export default function PublicHomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [prompt, setPrompt] = useState('');

  const handleStartBook = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    sessionStorage.setItem(PROMPT_STORAGE_KEY, trimmed);

    if (isAuthenticated) {
      router.push(`/workspace?create=1&prompt=${encodeURIComponent(trimmed)}`);
      return;
    }

    router.push(
      `/sign-in?redirect_url=${encodeURIComponent(`/workspace?create=1&prompt=${encodeURIComponent(trimmed)}`)}`,
    );
  };

  return (
    <div className="bookish-public flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">
        <HomeHero
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={handleStartBook}
          isAuthenticated={isAuthenticated}
          username={user?.username}
          promptChips={PROMPT_CHIPS}
          onChipClick={setPrompt}
        />

        {isAuthenticated ? (
          /* Logged-in: show workspace cards + Get Inspired */
          <AuthenticatedDashboard />
        ) : (
          /* Logged-out: show marketing sections */
          <>
            <ImagineSection />
            <MemorySection />
            <UseCasesSection />
            <PlanSection />
            <LongBookSection />
            <FinalCtaSection />
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
