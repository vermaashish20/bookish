'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Feather } from 'lucide-react';

export function PublicNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit">
      <nav className="bookish-glass rounded-full px-5 py-2.5 flex items-center gap-6 shadow-sm transition-transform duration-500 hover:scale-[1.02] whitespace-nowrap">

        {/* Logo */}
        <Link
          href="/"
          className="bookish-display inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--bookish-ink)]"
        >
          <Feather className="h-5 w-5 text-[var(--bookish-accent)]" />
          Bookish
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-[var(--bookish-muted)] uppercase tracking-wider">
          <Link
            href="/explore"
            className={`transition-colors hover:text-[var(--bookish-ink)] ${
              pathname === '/explore' ? 'text-[var(--bookish-ink)]' : ''
            }`}
          >
            Explore
          </Link>
          <Show when="signed-in">
            <Link
              href="/workspace"
              className="transition-colors hover:text-[var(--bookish-ink)]"
            >
              Workspace
            </Link>
          </Show>
        </div>

        {/* Auth controls */}
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="bg-[var(--bookish-ink)] text-white hover:bg-[var(--bookish-ink)]/80 transition-colors px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2"
              >
                Enter
              </button>
            </SignInButton>
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
      </nav>
    </header>
  );
}
