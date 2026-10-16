// Home's stays: every published property, or one type when a category chip is
// selected ($type == "all" means no type filter).
export const HOME_STAYS_QUERY = /* groq */ `
  *[_type == "property" && defined(slug.current) && ($type == "all" || type == $type)]
    | order(rating desc, reviewCount desc)[0...30]{
      "id": _id,
      "slug": slug.current,
      title,
      type,
      city,
      region,
      country,
      rating,
      pricePerNight,
      "imageUrl": photos[0].asset->url,
      "imageAlt": photos[0].alt
    }
`;

// Every place name a stay has, so the search parser can tell "in Paris" (a
// place filter) from "in the woods" (a soft word).
export const PLACES_QUERY = /* groq */ `
  array::compact(array::unique(*[_type == "property" && defined(slug.current)]{ "p": [city, region, country, neighborhood] }.p[]))
`;

// One stay for its details screen, with its host, its cancellation policy and
// Roam's other policies, so the Policies sheet needs no second request.
export const STAY_QUERY = /* groq */ `
  *[_type == "property" && slug.current == $slug][0]{
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
    cleaningFee,
    minNights,
    maxGuests,
    amenities,
    "photos": photos[]{ "url": asset->url, alt },
    houseRules,
    "host": host->{ name, "photoUrl": photo.asset->url, bio, isSuperhost, hostingSince, responseTime, languages },
    "cancellationPolicy": cancellationPolicy->{ kind, title, summary, body },
    "policies": *[_type == "policy" && kind != "cancellation"]{ kind, title, summary, body }
  }
`;

// Every Roam policy, for the Roam policies sheet and Profile's policy card.
export const ROAM_POLICIES_QUERY = /* groq */ `
  *[_type == "policy"]{ "slug": slug.current, kind, title, summary, body }
`;

// What Ask's API route needs from one stay: its rules and cancellation policy.
export const ASK_STAY_QUERY = /* groq */ `
  *[_type == "property" && slug.current == $slug][0]{
    title,
    houseRules,
    "cancellationPolicy": cancellationPolicy->{ kind, title, summary, body }
  }
`;

// Every Roam policy as plain text, for checking Knowledge Base sections against
// the policies they were built from (src/lib/server/policy-kb.ts).
export const POLICY_TEXT_QUERY = /* groq */ `
  *[_type == "policy"]{ kind, title, "text": pt::text(body) }
`;
