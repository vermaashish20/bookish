'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';
import { useAuth } from '@/contexts/AuthProvider';
import { DEMO_PASSWORD, DEMO_USERNAME } from '@/lib/auth/constants';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get('redirect') || '/workspace';

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, redirect, router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (login(username, password)) {
      router.replace(redirect);
      return;
    }
    setError('Invalid username or password.');
  };

  return (
    <div className="bookish-public flex min-h-screen flex-col">
      <PublicNav />

      <main className="bookish-wrap flex-1 py-16">
        <div className="mx-auto max-w-md rounded-[24px] border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_78%,transparent)] p-8 shadow-[0_26px_80px_rgb(31_35_28/0.08)]">
          <h1 className="text-[clamp(28px,4vw,36px)] leading-none tracking-[-0.06em] text-[var(--bookish-ink)]">
            Sign in
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--bookish-muted)]">
            Use the demo account to access your workspace and create books with AI agents.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-[720] text-[var(--bookish-muted)]">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--bookish-line)] bg-[var(--bookish-paper)] px-4 py-3 text-sm text-[var(--bookish-ink)] outline-none focus:border-[var(--bookish-accent)]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-[720] text-[var(--bookish-muted)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--bookish-line)] bg-[var(--bookish-paper)] px-4 py-3 text-sm text-[var(--bookish-ink)] outline-none focus:border-[var(--bookish-accent)]"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button type="submit" className="bookish-cta w-full">
              Sign in
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-[var(--bookish-line)] bg-[rgb(255_255_251/0.34)] px-4 py-3 text-xs text-[var(--bookish-muted)]">
            Demo credentials: <strong className="text-[var(--bookish-ink)]">{DEMO_USERNAME}</strong> /{' '}
            <strong className="text-[var(--bookish-ink)]">{DEMO_PASSWORD}</strong>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--bookish-muted)]">
            <Link href="/" className="text-[var(--bookish-accent)] hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bookish-public min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
