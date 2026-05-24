'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { Feather } from 'lucide-react';

interface PublicNavProps {
  /** `app` = logo + user only (workspace). `marketing` = full public links. */
  variant?: 'marketing' | 'app';
}

export function PublicNav({ variant = 'marketing' }: PublicNavProps) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isApp = variant === 'app';
  const isWorkspaceSticky = isApp && pathname === '/workspace' && isSignedIn;

  const marketingNav = (
    <div className="flex h-14 items-center justify-center gap-5 sm:gap-6 md:gap-7">
      <Link
        href="/"
        className="bookish-display inline-flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-[var(--bookish-ink)]"
      >
        <Feather className="h-5 w-5 text-[var(--bookish-accent)]" />
        Bookish
      </Link>

      <span className="hidden h-5 w-px shrink-0 bg-[var(--bookish-line)] sm:block" aria-hidden="true" />

      <Link
        href="/about"
        className={`shrink-0 text-sm font-medium uppercase tracking-wider transition-colors hover:text-[var(--bookish-ink)] ${
          pathname === '/about' ? 'text-[var(--bookish-ink)]' : 'text-[var(--bookish-muted)]'
        }`}
      >
        About
      </Link>
      <Link
        href="/explore"
        className={`shrink-0 text-sm font-medium uppercase tracking-wider transition-colors hover:text-[var(--bookish-ink)] ${
          pathname === '/explore' ? 'text-[var(--bookish-ink)]' : 'text-[var(--bookish-muted)]'
        }`}
      >
        Community
      </Link>
      <Show when="signed-in">
        <Link
          href="/workspace"
          className={`shrink-0 text-sm font-medium uppercase tracking-wider transition-colors hover:text-[var(--bookish-ink)] ${
            pathname === '/workspace' ? 'text-[var(--bookish-ink)]' : 'text-[var(--bookish-muted)]'
          }`}
        >
          Workspace
        </Link>
      </Show>

      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="shrink-0 text-sm font-medium uppercase tracking-wider text-[var(--bookish-muted)] transition-colors hover:text-[var(--bookish-ink)]"
          >
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="shrink-0 rounded-full bg-[var(--bookish-ink)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--bookish-ink)]/80"
          >
            Get Started
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </Show>
    </div>
  );

  const workspaceNav = (
    <div className="flex h-14 w-full items-center justify-between gap-6">
      <Link
        href="/workspace"
        className="bookish-display inline-flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-[var(--bookish-ink)]"
      >
        <Feather className="h-5 w-5 text-[var(--bookish-accent)]" />
        Bookish
      </Link>

      <div className="flex shrink-0 items-center gap-5">
        <Link
          href="/explore"
          className={`text-sm font-medium uppercase tracking-wider transition-colors hover:text-[var(--bookish-ink)] ${
            pathname === '/explore' ? 'text-[var(--bookish-ink)]' : 'text-[var(--bookish-muted)]'
          }`}
        >
          Community
        </Link>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </div>
  );

  const navInner = isApp ? workspaceNav : marketingNav;

  if (isWorkspaceSticky) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[var(--bookish-line)] bg-white/90 backdrop-blur-md">
        <div className="bookish-wrap">{navInner}</div>
      </header>
    );
  }

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 sm:px-6">
      <div className="pointer-events-auto w-fit max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--bookish-line)] bg-white/88 px-5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.14)] backdrop-blur-md sm:px-7 md:px-8">
        {navInner}
      </div>
    </header>
  );
}
