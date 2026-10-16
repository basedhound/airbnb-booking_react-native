import { z } from "zod";

import { AMENITIES, MAX_SENTENCE, PROPERTY_TYPES, VIBES } from "@/lib/search/intent";

// Server only. The body of POST /api/search: a sentence for Jev to read, or an
// intent the app already has (chip toggles, sort changes). Intents come from
// the app, so every field is checked again here; place values are checked
// against known places in the route.

const weighted = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object({ value: z.enum(values), weight: z.number().min(0).max(1) });

const buckets = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object({
    required: z.array(z.enum(values)).max(values.length),
    avoided: z.array(z.enum(values)).max(values.length),
    preferred: z.array(weighted(values)).max(values.length),
  });

const price = z.number().int().min(1).max(100000);

const intentSchema = z.object({
  text: z.string().max(MAX_SENTENCE),
  source: z.enum(["jev", "parser"]),
  place: z.object({ label: z.string().max(80), values: z.array(z.string().max(80)).min(1).max(4) }).optional(),
  maxPrice: price.optional(),
  minPrice: price.optional(),
  guests: z.number().int().min(1).max(50).optional(),
  bedrooms: z.number().int().min(1).max(20).optional(),
  pets: z.enum(["wanted", "avoided"]).optional(),
  petsWeight: z.number().min(0).max(1).optional(),
  types: buckets(PROPERTY_TYPES),
  amenities: buckets(AMENITIES),
  vibes: z.object({ preferred: z.array(weighted(VIBES)).max(VIBES.length), avoided: z.array(z.enum(VIBES)).max(VIBES.length) }),
});

const sort = z.enum(["best", "priceAsc", "priceDesc", "rating"]);

export const searchRequestSchema = z.union([
  z.object({ q: z.string().max(1000), sort }),
  z.object({ intent: intentSchema, sort }),
]);
