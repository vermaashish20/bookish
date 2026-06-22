'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthProvider';

export function PublicFooter() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_40%,transparent)]">
      <div className="bookish-wrap py-12">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-[11px] font-[760] tracking-[-0.04em] text-[var(--bookish-ink)]"
            >
              <span
                className="grid h-[30px] w-[30px] place-items-center rounded-[10px] border border-[rgb(22_23_19/0.12)] bg-[var(--bookish-paper)] text-[var(--bookish-accent)] shadow-[inset_0_-8px_18px_rgb(35_92_69/0.08)]"
                aria-hidden
              >
                B
              </span>
              <span>Bookish</span>
            </Link>
            <p className="mt-4 max-w-[32ch] text-[13px] leading-[1.6] text-[var(--bookish-muted)]">
              Write with agents. Read what others publish.
            </p>
          </div>

          <div>
            <p className="text-[12px] font-[720] text-[var(--bookish-ink)]">Product</p>
            <ul className="mt-3 space-y-2 text-[13px] text-[var(--bookish-muted)]">
              <li>
                <Link href="/" className="transition hover:text-[var(--bookish-ink)]">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/explore" className="transition hover:text-[var(--bookish-ink)]">
                  Explore books
                </Link>
              </li>
              <li>
                <Link
                  href={isAuthenticated ? '/workspace' : '/login'}
                  className="transition hover:text-[var(--bookish-ink)]"
                >
                  {isAuthenticated ? 'Workspace' : 'Start writing'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-[720] text-[var(--bookish-ink)]">Account</p>
            <ul className="mt-3 space-y-2 text-[13px] text-[var(--bookish-muted)]">
              {isAuthenticated ? (
                <li>
                  <Link href="/workspace" className="transition hover:text-[var(--bookish-ink)]">
                    Your projects
                  </Link>
                </li>
              ) : (
                <li>
                  <Link href="/login" className="transition hover:text-[var(--bookish-ink)]">
                    Sign in
                  </Link>
                </li>
              )}
              <li>
                <Link href="/explore" className="transition hover:text-[var(--bookish-ink)]">
                  Public shelf
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-[var(--bookish-line)] pt-6 text-[12px] text-[var(--bookish-muted)] sm:flex-row sm:items-center">
          <span>© {year} Bookish</span>
          <span>A quiet place to make books with AI.</span>
        </div>
      </div>
    </footer>
  );
}
