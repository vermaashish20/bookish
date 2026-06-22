'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';

export function PublicNav() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bookish-nav sticky top-0 z-10 border-b border-[rgb(22_23_19/0.08)] backdrop-blur-[18px]">
      <div className="bookish-wrap flex h-[68px] items-center justify-between gap-6">
        <Link href="/" className="inline-flex items-center gap-[11px] font-[760] tracking-[-0.04em] text-[var(--bookish-ink)]">
          <span
            className="grid h-[30px] w-[30px] place-items-center rounded-[10px] border border-[rgb(22_23_19/0.12)] bg-[var(--bookish-paper)] text-[var(--bookish-accent)] shadow-[inset_0_-8px_18px_rgb(35_92_69/0.08)]"
            aria-hidden
          >
            B
          </span>
          <span>Bookish</span>
        </Link>

        <nav className="flex items-center gap-1.5" aria-label="Main navigation">
          <Link
            href="/explore"
            className={`bookish-nav-link ${pathname === '/explore' ? 'text-[var(--bookish-ink)] bg-[rgb(22_23_19/0.055)]' : ''}`}
          >
            Explore
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/workspace" className="bookish-nav-link">
                Workspace
              </Link>
              <button type="button" onClick={logout} className="bookish-nav-link">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="bookish-login-button">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
