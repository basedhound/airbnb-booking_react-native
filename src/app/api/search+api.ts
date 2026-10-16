import { imageUrl } from "@/lib/sanity/fetch";
import type { SearchIntent } from "@/lib/search/intent";
import { placeValueSet } from "@/lib/search/parse";
import { requireSession } from "@/lib/server/auth";
import { contextQuery } from "@/lib/server/context";
import { HttpError, errorResponse } from "@/lib/server/http";
import { readIntent } from "@/lib/server/jev";
import { knownPlaces } from "@/lib/server/places";
import { buildSearchGroq } from "@/lib/server/search-groq";
import { searchRequestSchema } from "@/lib/server/search-request";
import type { SearchStay } from "@/lib/stays";

// POST /api/search: { q, sort } reads the sentence with Jev; { intent, sort }
// reuses an intent the app already has. Either way code builds the GROQ and it
// runs through the Context endpoint with embeddings. Never logs the sentence.
export async function POST(request: Request) {
  try {
    await requireSession(request);

    const body = searchRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) throw new HttpError(400, "bad_request");

    const known = await knownPlaces();
    const places = placeValueSet(known);
    const started = Date.now();

    let intent: SearchIntent;
    if ("q" in body.data) {
      intent = await readIntent(body.data.q, known, request.signal);
    } else {
      intent = body.data.intent;
      if (intent.place && !intent.place.values.every((v) => places.has(v))) throw new HttpError(400, "bad_request");
    }
    const read = Date.now();

    const result = await contextQuery<{ total: number; stays: SearchStay[] }>(
      buildSearchGroq(intent, body.data.sort, places),
      request.signal,
    );
    console.info("search", { source: "q" in body.data ? intent.source : "intent", readMs: read - started, queryMs: Date.now() - read });

    const stays: SearchStay[] = result.stays.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      type: s.type,
      city: s.city,
      region: s.region,
      country: s.country,
      rating: s.rating,
      reviewCount: s.reviewCount,
      pricePerNight: s.pricePerNight,
      amenities: s.amenities,
      petsAllowed: s.petsAllowed,
      imageUrl: s.imageUrl ? imageUrl(s.imageUrl, 600) : "",
      imageAlt: s.imageAlt,
    }));
    return Response.json({ intent, total: result.total, stays });
  } catch (error) {
    return errorResponse(error);
  }
}
