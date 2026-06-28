/**
 * Module-level token getter.
 * Wired by <ClerkTokenSync> in the layout so plain async functions
 * (fetchProjects, createProject, …) can attach auth headers without
 * being React hooks.
 */
let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (!_getToken) return null;
  try {
    return await _getToken();
  } catch {
    return null;
  }
}
