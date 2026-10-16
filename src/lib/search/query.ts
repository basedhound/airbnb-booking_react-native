import type { IconName } from "@/components/ui";
import type { Amenity, SearchStay } from "@/lib/stays";

import type { SearchIntent, Vibe } from "./intent";
import { amenityLabels, typeLabels } from "./parse";

// Search helpers for the app: sort options, chips over the SearchIntent the
// server returns, and "why it matched" card tags. The GROQ itself is built on
// the server (src/lib/server/search-groq.ts).

export type SortOption = "best" | "priceAsc" | "priceDesc" | "rating";

export const sortLabels: Record<SortOption, string> = {
  best: "Best match",
  priceAsc: "Price: low to high",
  priceDesc: "Price: high to low",
  rating: "Top rated",
};

// ---- Chips -----------------------------------------------------------------

export type SearchChip =
  | { kind: "type"; value: SearchIntent["types"]["required"][number] }
  | { kind: "price"; value: number }
  | { kind: "guests"; value: number }
  | { kind: "pets" }
  | { kind: "amenity"; value: Amenity }
  | { kind: "vibe"; value: Vibe };

// A vibe shows as a selected chip once Jev reads it this strongly.
const CHIP_VIBE_AT = 0.6;

const suggestions: SearchChip[] = [
  { kind: "price", value: 300 },
  { kind: "pets" },
  { kind: "vibe", value: "quiet" },
  { kind: "amenity", value: "hotTub" },
  { kind: "amenity", value: "pool" },
  { kind: "amenity", value: "fireplace" },
];
const MAX_SUGGESTIONS = 4;

export const chipKey = (chip: SearchChip) => ("value" in chip ? `${chip.kind}:${chip.value}` : chip.kind);

export function chipLabel(chip: SearchChip) {
  switch (chip.kind) {
    case "type":
      return typeLabels[chip.value];
    case "price":
      return `Under $${chip.value}`;
    case "guests":
      return `${chip.value}+ guests`;
    case "pets":
      return "Pet Friendly";
    case "amenity":
      return amenityLabels[chip.value];
    case "vibe":
      return chip.value[0].toUpperCase() + chip.value.slice(1);
  }
}

/**
 * The chip row for a submitted query: what was read from it, then suggestions
 * that don't conflict. Toggling doesn't reorder it; `hasChip` says what's selected.
 */
export function chipsFor(intent: SearchIntent): SearchChip[] {
  const active: SearchChip[] = [
    ...intent.types.required.map((value) => ({ kind: "type", value }) as const),
    ...(intent.maxPrice !== undefined ? [{ kind: "price", value: intent.maxPrice } as const] : []),
    ...(intent.guests !== undefined ? [{ kind: "guests", value: intent.guests } as const] : []),
    ...(intent.pets === "wanted" ? [{ kind: "pets" } as const] : []),
    ...intent.amenities.required.map((value) => ({ kind: "amenity", value }) as const),
    ...intent.vibes.preferred
      .filter((v) => v.weight >= CHIP_VIBE_AT)
      .map(({ value }) => ({ kind: "vibe", value }) as const),
  ];
  const activeKeys = new Set(active.map(chipKey));
  const extra = suggestions
    .filter((s) => !activeKeys.has(chipKey(s)) && !(s.kind === "price" && intent.maxPrice !== undefined))
    .slice(0, MAX_SUGGESTIONS);
  return [...active, ...extra];
}

export function hasChip(intent: SearchIntent, chip: SearchChip) {
  switch (chip.kind) {
    case "type":
      return intent.types.required.includes(chip.value);
    case "price":
      return intent.maxPrice === chip.value;
    case "guests":
      return intent.guests === chip.value;
    case "pets":
      return intent.pets === "wanted";
    case "amenity":
      return intent.amenities.required.includes(chip.value);
    case "vibe":
      return intent.vibes.preferred.some((v) => v.value === chip.value && v.weight >= CHIP_VIBE_AT);
  }
}

/** On: the chip's constraint becomes required (vibes: preferred, full weight). Off: it's dropped everywhere. */
export function toggleChip(intent: SearchIntent, chip: SearchChip, on: boolean): SearchIntent {
  const without = <T>(b: SearchIntent["types"] | SearchIntent["amenities"], value: T) => ({
    required: b.required.filter((x) => x !== value),
    avoided: b.avoided.filter((x) => x !== value),
    preferred: b.preferred.filter((x) => x.value !== value),
  });
  const next: SearchIntent = { ...intent };
  switch (chip.kind) {
    case "type": {
      const types = without(intent.types, chip.value) as SearchIntent["types"];
      next.types = on ? { ...types, required: [...types.required, chip.value] } : types;
      break;
    }
    case "amenity": {
      const amenities = without(intent.amenities, chip.value) as SearchIntent["amenities"];
      next.amenities = on ? { ...amenities, required: [...amenities.required, chip.value] } : amenities;
      break;
    }
    case "price":
      next.maxPrice = on ? chip.value : undefined;
      break;
    case "guests":
      next.guests = on ? chip.value : undefined;
      break;
    case "pets":
      next.pets = on ? "wanted" : undefined;
      next.petsWeight = undefined;
      break;
    case "vibe": {
      const preferred = intent.vibes.preferred.filter((v) => v.value !== chip.value);
      next.vibes = {
        preferred: on ? [...preferred, { value: chip.value, weight: 1 }] : preferred,
        avoided: intent.vibes.avoided.filter((v) => v !== chip.value),
      };
      break;
    }
  }
  return next;
}

/** Every filter in words, for the empty state: what stays must have, then what they mustn't. */
export function describeIntent(intent: SearchIntent): string[] {
  return [
    ...intent.types.required.map((t) => typeLabels[t]),
    intent.place?.label,
    intent.maxPrice !== undefined && `Under $${intent.maxPrice}`,
    intent.minPrice !== undefined && `From $${intent.minPrice}`,
    intent.guests !== undefined && `${intent.guests}+ guests`,
    intent.bedrooms !== undefined && `${intent.bedrooms}+ bedrooms`,
    intent.pets === "wanted" && "Pet Friendly",
    ...intent.amenities.required.map((a) => amenityLabels[a]),
    ...intent.types.avoided.map((t) => `Not ${typeLabels[t]}`),
    intent.pets === "avoided" && "No Pets",
    ...intent.amenities.avoided.map((a) => `No ${amenityLabels[a]}`),
  ].filter((label): label is string => !!label);
}

/** What the guest asked for, for card tags. */
export const askedFor = (intent: SearchIntent) => ({
  amenities: intent.amenities.required,
  pets: intent.pets === "wanted",
});

// ---- Card tags ("why it matched") -------------------------------------------

export type StayTag = { key: string; label: string; icon: IconName };

const amenityIcons: Partial<Record<Amenity, IconName>> = {
  hotTub: "hotTub",
  pool: "pool",
  sauna: "sauna",
  fireplace: "fireplace",
  oceanView: "water",
  lakeView: "water",
  mountainView: "mountain",
  beachAccess: "beachAccess",
  firePit: "firePit",
};
// Standout amenities, best first.
const tagOrder = Object.keys(amenityIcons) as Amenity[];
// Everyday amenities only fill a card that has nothing standout.
const everydayIcons: Partial<Record<Amenity, IconName>> = {
  workspace: "workspace",
  wifi: "wifi",
  kitchen: "kitchen",
  ac: "ac",
};

const amenityTag = (a: Amenity): StayTag => ({
  key: a,
  label: amenityLabels[a],
  icon: amenityIcons[a] ?? everydayIcons[a] ?? "success",
});
const petsTag: StayTag = { key: "pets", label: "Pet Friendly", icon: "pets" };

/**
 * Two tags per card: what the guest asked for first, then the stay's best
 * amenity, Pet Friendly when pets are allowed, then its next amenity, then an
 * everyday one.
 */
export function stayTags(
  stay: Pick<SearchStay, "amenities" | "petsAllowed">,
  asked: { amenities: Amenity[]; pets: boolean },
  max = 2,
): StayTag[] {
  const tags: StayTag[] = [
    ...asked.amenities.filter((a) => stay.amenities?.includes(a)).map(amenityTag),
    ...(asked.pets && stay.petsAllowed ? [petsTag] : []),
  ];
  const standout = tagOrder.filter((a) => stay.amenities?.includes(a));
  const fill = [
    ...standout.slice(0, 1).map(amenityTag),
    ...(stay.petsAllowed ? [petsTag] : []),
    ...standout.slice(1).map(amenityTag),
    ...(Object.keys(everydayIcons) as Amenity[]).filter((a) => stay.amenities?.includes(a)).map(amenityTag),
  ];
  for (const tag of fill) {
    if (tags.length >= max) break;
    if (!tags.some((t) => t.key === tag.key || t.label === tag.label)) tags.push(tag);
  }
  return tags.slice(0, max);
}
