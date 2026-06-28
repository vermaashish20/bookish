'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setTokenGetter } from '@/lib/api/auth';

/**
 * Invisible component — placed inside <ClerkProvider> in the root layout.
 * Keeps the module-level token getter in sync with the Clerk session so
 * every plain API call can attach an Authorization header.
 */
export function ClerkTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  return null;
}
