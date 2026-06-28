'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { Feather, ArrowRight } from 'lucide-react';

export function PublicNav() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    /* fixed top-4 — matches book_1.html exactly */
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

        {/* Nav links — uppercase tracking-wider like book_1.html */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-[var(--bookish-muted)] uppercase tracking-wider">
          <Link
            href="/explore"
            className={`transition-colors hover:text-[var(--bookish-ink)] ${
              pathname === '/explore' ? 'text-[var(--bookish-ink)]' : ''
            }`}
          >
            Explore
          </Link>
          {isAuthenticated && (
            <Link
              href="/workspace"
              className="transition-colors hover:text-[var(--bookish-ink)]"
            >
              Workspace
            </Link>
          )}
        </div>

        {/* Auth — black pill button like book_1.html */}
        <div className="flex items-center">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium text-[var(--bookish-muted)] uppercase tracking-wider transition-colors hover:text-[var(--bookish-ink)]"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-[var(--bookish-ink)] text-white hover:bg-[var(--bookish-ink)]/80 transition-colors px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2"
            >
              Enter <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
