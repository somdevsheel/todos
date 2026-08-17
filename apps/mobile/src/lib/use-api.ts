import { useCallback, useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "./api-client";

/**
 * Small shared data-fetching hook so every screen doesn't hand-roll its own
 * loading/error/reload plumbing — there's no server-component equivalent
 * on mobile the way apps/web has, so every fetch here is client-side.
 * Pass `path: null` to skip fetching (e.g. while a required id isn't known yet).
 */
export function useApiQuery<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : "Unable to reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, reloadKey, ...deps]);

  return { data, loading, error, reload };
}
