import { AMENITIES, MAX_SENTENCE, PROPERTY_TYPES, VIBES, type SearchIntent } from "@/lib/search/intent";
import type { SortOption } from "@/lib/search/query";

// Server only. Builds Search's GROQ from a SearchIntent. The Context endpoint's
// `groq_query` takes no params, so values are written into the query text,
// and only through `lit`: numbers must be finite, strings must come from a code
// list (or the known-place set), and the guest's sentence is JSON-encoded,
// which is a valid GROQ string literal. Nothing else reaches the query.

export const MAX_RESULTS = 50;

const byRating = "rating desc, reviewCount desc";
const orders: Record<Exclude<SortOption, "best">, string> = {
  priceAsc: `pricePerNight asc, ${byRating}`,
  priceDesc: `pricePerNight desc, ${byRating}`,
  rating: byRating,
};

const projection = /* groq */ `{
  "id": _id,
  "slug": slug.current,
  title,
  type,
  city,
  region,
  country,
  rating,
  reviewCount,
  pricePerNight,
  amenities,
  "petsAllowed": houseRules.petsAllowed == true,
  "imageUrl": photos[0].asset->url,
  "imageAlt": photos[0].alt
}`;

// Control characters and U+2028/2029, which JSON.stringify leaves unescaped.
const unsafeChars = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029]", "g");

class UnsafeLiteral extends Error {
  name = "UnsafeLiteral";
}

export const lit = {
  num(n: number) {
    if (!Number.isFinite(n)) throw new UnsafeLiteral();
    return String(n);
  },
  str(value: string, allowed: ReadonlySet<string> | readonly string[]) {
    const ok = allowed instanceof Set ? allowed.has(value) : (allowed as readonly string[]).includes(value);
    if (!ok) throw new UnsafeLiteral();
    return JSON.stringify(value);
  },
  list(values: readonly string[], allowed: ReadonlySet<string> | readonly string[]) {
    return `[${values.map((v) => lit.str(v, allowed)).join(", ")}]`;
  },
  /** The guest's sentence: capped, control and line-separator characters turned into spaces. */
  sentence(text: string) {
    return JSON.stringify(text.slice(0, MAX_SENTENCE).replace(unsafeChars, " "));
  },
};

const weight = (w: number, scale: number) => lit.num(Math.round(w * scale * 100) / 100);

/** `places`: every value a place filter may hold (`placeValueSet`). */
export function buildSearchGroq(intent: SearchIntent, sort: SortOption, places: ReadonlySet<string>): string {
  const { types, amenities, vibes } = intent;
  const filters = ['_type == "property"', "defined(slug.current)"];

  if (types.required.length) filters.push(`type in ${lit.list(types.required, PROPERTY_TYPES)}`);
  if (types.avoided.length) filters.push(`!(type in ${lit.list(types.avoided, PROPERTY_TYPES)})`);
  if (intent.maxPrice !== undefined) filters.push(`pricePerNight <= ${lit.num(intent.maxPrice)}`);
  if (intent.minPrice !== undefined) filters.push(`pricePerNight >= ${lit.num(intent.minPrice)}`);
  if (intent.guests !== undefined) filters.push(`maxGuests >= ${lit.num(intent.guests)}`);
  if (intent.bedrooms !== undefined) filters.push(`bedrooms >= ${lit.num(intent.bedrooms)}`);
  if (intent.pets === "wanted") filters.push("houseRules.petsAllowed == true");
  if (intent.pets === "avoided") filters.push("houseRules.petsAllowed != true");
  if (amenities.required.length) {
    filters.push(`count(amenities[@ in ${lit.list(amenities.required, AMENITIES)}]) == ${lit.num(amenities.required.length)}`);
  }
  if (amenities.avoided.length) filters.push(`count(amenities[@ in ${lit.list(amenities.avoided, AMENITIES)}]) == 0`);
  if (intent.place) {
    filters.push(
      `count([lower(city), lower(region), lower(country), lower(neighborhood)][@ in ${lit.list(intent.place.values, places)}]) > 0`,
    );
  }

  // Embeddings over the sentence, plus boosts weighted by how strongly Jev read
  // each preference. Negative boosts score 0, so avoided vibes are an order term.
  const scores = [
    ...(intent.text.trim() ? [`text::semanticSimilarity(${lit.sentence(intent.text)})`] : []),
    ...vibes.preferred.map((v) => `boost(vibes match ${lit.str(v.value, VIBES)}, ${weight(v.weight, 3)})`),
    ...amenities.preferred.map((a) => `boost(${lit.str(a.value, AMENITIES)} in amenities, ${weight(a.weight, 2)})`),
    ...types.preferred.map((t) => `boost(type == ${lit.str(t.value, PROPERTY_TYPES)}, ${weight(t.weight, 2)})`),
    ...(intent.petsWeight ? [`boost(houseRules.petsAllowed == true, ${weight(intent.petsWeight, 2)})`] : []),
  ];
  const demote = vibes.avoided.length ? `count(vibes[@ in ${lit.list(vibes.avoided, VIBES)}]) asc, ` : "";

  const ranked =
    sort !== "best"
      ? `| order(${orders[sort]})`
      : scores.length
        ? `| score(${scores.join(", ")}) | order(${demote}_score desc, ${byRating})`
        : `| order(${demote}${byRating})`;

  const filter = filters.join(" && ");
  return /* groq */ `{
    "total": count(*[${filter}]),
    "stays": *[${filter}] ${ranked} [0...${MAX_RESULTS}]${projection}
  }`;
}
