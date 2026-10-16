import { useAuth } from "@clerk/expo";
import { useCallback } from "react";

import type { AnswerCard } from "@/lib/ask";

/** What POST /api/ask returns: cards to show, and passage ids for analytics. */
export type AskAnswer = { cards: AnswerCard[]; topics: string[] };

export class AskError extends Error {
  constructor(public status: number) {
    super(`Ask failed (${status})`);
    this.name = "AskError";
  }
}

const TIMEOUT_MS = 10000;

// Answers already fetched this session, per stay and question. Read only when
// a question is sent, never during render.
const cache = new Map<string, AskAnswer>();

/** Sends one question about a stay to the server. Throws when it can't answer. */
export function useAsk() {
  const { getToken } = useAuth();

  return useCallback(
    async (slug: string, question: string, signal: AbortSignal): Promise<AskAnswer> => {
      const key = JSON.stringify([slug, question]);
      const cached = cache.get(key);
      if (cached) return cached;

      // One controller for the screen's abort and the timeout.
      const controller = new AbortController();
      const abort = () => controller.abort();
      const timer = setTimeout(abort, TIMEOUT_MS);
      signal.addEventListener("abort", abort);
      try {
        const token = await getToken();
        // Relative URLs go to the dev server in development (Expo Router API routes).
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ slug, question }),
          signal: controller.signal,
        });
        if (!res.ok) throw new AskError(res.status);
        const answer = (await res.json()) as AskAnswer;
        cache.set(key, answer);
        return answer;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
    [getToken],
  );
}
