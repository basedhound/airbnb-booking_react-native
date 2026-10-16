import type { Amenity, PropertyType } from "@/lib/stays";

import type { ParsedQuery } from "./parse";

// What the server read from a search sentence, and what it builds GROQ from.
// The app shows it as chips and sends it back (edited) on chip toggles and
// sort changes, so a sentence is only read once. Every value is from a list
// below, a bounded number, or a known place: the server re-checks all of it.

export const PROPERTY_TYPES = ["cabin", "beach", "city", "villa"] as const satisfies readonly PropertyType[];

export const AMENITIES = [
  "hotTub", "pool", "fireplace", "firePit", "sauna", "wifi", "kitchen", "workspace", "parking",
  "washer", "ac", "oceanView", "lakeView", "mountainView", "beachAccess", "bbq", "evCharger",
] as const satisfies readonly Amenity[];

// Vibe words stays are tagged with (`vibes` on the property).
export const VIBES = [
  "quiet", "cozy", "secluded", "romantic", "peaceful", "luxury", "family", "lively",
  "walkable", "rustic", "modern", "views", "nature", "minimal", "design", "laid-back",
] as const;
export type Vibe = (typeof VIBES)[number];

/** Longest sentence sent to embeddings. */
export const MAX_SENTENCE = 300;

/** `weight` is 0–1: how strongly the guest asked for it. It scales a ranking boost. */
export type Weighted<T> = { value: T; weight: number };

/** `required` and `avoided` filter; `preferred` only ranks. */
export type Buckets<T> = { required: T[]; avoided: T[]; preferred: Weighted<T>[] };

export type SearchIntent = {
  /** The sentence, for embeddings. Empty means "all stays by rating". */
  text: string;
  /** Who read the sentence: Jev, or the regex parser when Jev failed. */
  source: "jev" | "parser";
  place?: { label: string; values: string[] };
  maxPrice?: number;
  minPrice?: number;
  guests?: number;
  bedrooms?: number;
  pets?: "wanted" | "avoided";
  /** Pets fit what the guest describes but weren't asked for: ranks, doesn't filter. */
  petsWeight?: number;
  types: Buckets<PropertyType>;
  amenities: Buckets<Amenity>;
  vibes: { preferred: Weighted<Vibe>[]; avoided: Vibe[] };
};

const emptyBuckets = <T>(): Buckets<T> => ({ required: [], avoided: [], preferred: [] });

export function emptyIntent(text = "", source: SearchIntent["source"] = "parser"): SearchIntent {
  return { text, source, types: emptyBuckets(), amenities: emptyBuckets(), vibes: { preferred: [], avoided: [] } };
}

export const isVibe = (word: string): word is Vibe => (VIBES as readonly string[]).includes(word);

/** The fallback when Jev can't be reached: the regex parser's reading. */
export function intentFromParsed(parsed: ParsedQuery, text: string): SearchIntent {
  const intent = emptyIntent(text, "parser");
  intent.place = parsed.place;
  intent.maxPrice = parsed.maxPrice;
  intent.guests = parsed.guests;
  if (parsed.pets) intent.pets = "wanted";
  if (parsed.type) intent.types.required.push(parsed.type);
  intent.amenities.required.push(...parsed.amenities);
  intent.vibes.preferred.push(...parsed.terms.filter(isVibe).map((value) => ({ value, weight: 1 })));
  return intent;
}
