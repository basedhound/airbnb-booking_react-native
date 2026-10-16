import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";

import type { SearchIntent } from "@/lib/search/intent";
import type { SortOption } from "@/lib/search/query";
import type { SearchStay } from "@/lib/stays";

/** A sentence for the server to read, or an intent it already read (chips, sort). */
export type SearchRequest = { q: string } | { intent: SearchIntent };

/** `key` identifies the request and sort these results answer. */
export type SearchResult = { key: string; intent: SearchIntent; total: number; stays: SearchStay[] };

export class SearchError extends Error {
  constructor(public status: number) {
    super(`Search failed (${status})`);
    this.name = "SearchError";
  }
}

// Results already fetched this session, per request and sort.
const cache = new Map<string, SearchResult>();

async function fetchResults(
  request: SearchRequest,
  sort: SortOption,
  key: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<SearchResult> {
  // Relative URLs go to the dev server in development (Expo Router API routes).
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ ...request, sort }),
    signal,
  });
  if (!res.ok) throw new SearchError(res.status);
  const body = (await res.json()) as Omit<SearchResult, "key">;
  const next = { key, ...body };
  cache.set(key, next);
  // The screen sends this reading back next ({ intent }); it answers that too.
  if ("q" in request) cache.set(JSON.stringify([{ intent: body.intent }, sort]), next);
  return next;
}

// Like Home: the results on screen stay until the next ones arrive, and
// `pending` says newer ones are on the way. `result` is undefined before the
// first load and after a failed one. A failed refresh keeps the results and
// reports `refreshError` instead.
export function useSearchStays(request: SearchRequest | undefined, sort: SortOption) {
  const { getToken } = useAuth();
  const key = request ? JSON.stringify([request, sort]) : undefined;
  // The latest result lives in state, not only in the module cache: the React
  // Compiler memoizes `cache.get(key)` by key and would miss a refresh.
  const [loaded, setLoaded] = useState<SearchResult>();
  const [failed, setFailed] = useState<{ key: string; error: Error } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState<{ key: string; error: Error } | null>(null);

  useEffect(() => {
    if (!request || !key || cache.has(key)) return;
    const controller = new AbortController();
    (async () => {
      const next = await fetchResults(request, sort, key, await getToken(), controller.signal);
      setLoaded(next);
      setFailed(null);
    })().catch((error: Error) => {
      if (error.name !== "AbortError") setFailed({ key, error });
    });
    return () => controller.abort();
    // `key` captures `request` and `sort`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const error = failed && failed.key === key ? failed.error : null;
  const current = key && loaded?.key === key ? loaded : key ? cache.get(key) : undefined;
  // The last results on screen, kept while the next request loads.
  const [shown, setShown] = useState(current);
  if (current && current !== shown) setShown(current);

  const retry = useCallback(() => {
    setFailed(null);
    setAttempt((n) => n + 1);
  }, []);

  const refresh = useCallback(async () => {
    if (!request || !key) return;
    setRefreshing(true);
    setRefreshFailed(null);
    try {
      setLoaded(await fetchResults(request, sort, key, await getToken()));
      setFailed(null);
    } catch (e) {
      // With nothing on screen, the error state shows it; otherwise the results stay.
      if (cache.has(key)) setRefreshFailed({ key, error: e as Error });
      else setFailed({ key, error: e as Error });
    } finally {
      setRefreshing(false);
    }
    // `key` captures `request` and `sort`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, getToken]);

  const clearRefreshError = useCallback(() => setRefreshFailed(null), []);

  return {
    result: current ?? (error ? undefined : shown),
    pending: !!key && !current && !error,
    error,
    retry,
    refresh,
    refreshing,
    refreshError: refreshFailed && refreshFailed.key === key ? refreshFailed.error : null,
    clearRefreshError,
  };
}
