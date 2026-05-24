'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function BookWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <RequireAuth>{children}</RequireAuth>
    </Suspense>
  );
}
