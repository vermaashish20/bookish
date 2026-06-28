'use client';

import Link from 'next/link';
import { Feather, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';

export function PublicFooter() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="pt-20 pb-10 border-t border-black/5 bg-[#FAFAFA]">
      <div className="bookish-wrap">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-12 mb-16">

          {/* Brand & newsletter */}
          <div className="flex flex-col">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-medium text-2xl tracking-tight text-[var(--bookish-ink)] bookish-display mb-5"
            >
              <Feather className="h-5 w-5 text-[var(--bookish-accent)]" />
              Bookish
            </Link>
            <p className="text-[var(--bookish-muted)] text-base leading-relaxed max-w-[34ch] mb-8">
              A magical workspace where your ideas become legendary manuscripts.
            </p>

            <div className="mt-auto">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-ink)] mb-3">
                Join the Guild
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  className="flex-1 min-w-0 rounded-full border border-[var(--bookish-line)] bg-[color-mix(in_srgb,var(--bookish-paper)_90%,transparent)] px-4 py-2.5 text-sm outline-none focus:border-[var(--bookish-accent)] transition-colors text-[var(--bookish-ink)] placeholder:text-[var(--bookish-muted)]"
                />
                <button
                  type="button"
                  className="bookish-cta px-4 py-2.5 flex items-center justify-center"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product links */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-ink)] mb-5">
              Product
            </p>
            <ul className="flex flex-col gap-3 text-[15px] text-[var(--bookish-muted)]">
              <li>
                <Link href="/" className="transition hover:text-[var(--bookish-accent)]">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/explore" className="transition hover:text-[var(--bookish-accent)]">
                  Explore books
                </Link>
              </li>
              <li>
                <Link
                  href={isAuthenticated ? '/workspace' : '/login'}
                  className="transition hover:text-[var(--bookish-accent)]"
                >
                  {isAuthenticated ? 'Workspace' : 'Start writing'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account links */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--bookish-ink)] mb-5">
              Account
            </p>
            <ul className="flex flex-col gap-3 text-[15px] text-[var(--bookish-muted)]">
              {isAuthenticated ? (
                <li>
                  <Link href="/workspace" className="transition hover:text-[var(--bookish-accent)]">
                    Your projects
                  </Link>
                </li>
              ) : (
                <li>
                  <Link href="/login" className="transition hover:text-[var(--bookish-accent)]">
                    Sign in
                  </Link>
                </li>
              )}
              <li>
                <Link href="/explore" className="transition hover:text-[var(--bookish-accent)]">
                  Public shelf
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-[var(--bookish-line)] text-xs text-[var(--bookish-muted)]">
          <p>&copy; {year} Bookish AI. All rights reserved.</p>
          <div className="flex gap-6 font-medium">
            <Link href="#" className="transition hover:text-[var(--bookish-ink)]">
              Privacy Policy
            </Link>
            <Link href="#" className="transition hover:text-[var(--bookish-ink)]">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
