import { sanityQuery } from "@/lib/sanity/fetch";
import { PLACES_QUERY } from "@/lib/sanity/queries";

// Server only. Every stay's place names, lowercased, from the public CDN.
// Kept for 10 minutes. If the fetch fails, search still knows US states.
const TTL = 10 * 60 * 1000;
let cached: { at: number; names: Promise<string[]> } | undefined;

export function knownPlaces(): Promise<string[]> {
  if (!cached || Date.now() - cached.at > TTL) {
    const names = sanityQuery<string[]>(PLACES_QUERY)
      .then((list) => list.map((name) => name.toLowerCase()))
      .catch(() => {
        cached = undefined;
        return [];
      });
    cached = { at: Date.now(), names };
  }
  return cached.names;
}
