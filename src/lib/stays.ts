// Mirrors the Sanity `property` schema (studio/schemaTypes/property.ts).
export type PropertyType = "cabin" | "beach" | "city" | "villa";

export type Amenity =
  | "hotTub"
  | "pool"
  | "fireplace"
  | "firePit"
  | "sauna"
  | "wifi"
  | "kitchen"
  | "workspace"
  | "parking"
  | "washer"
  | "ac"
  | "oceanView"
  | "lakeView"
  | "beachAccess"
  | "mountainView"
  | "bbq"
  | "evCharger";

// What Home's photo card needs.
export type StayCardData = {
  id: string;
  title: string;
  city: string;
  region?: string | null;
  country?: string | null;
  rating: number;
  pricePerNight: number;
  imageUrl: string;
  imageAlt?: string | null;
};

export type HomeStay = StayCardData & { slug: string; type: PropertyType };

// "Lake Arrowhead, CA" when a region is set, otherwise "Lisbon, Portugal".
export const placeLabel = (stay: Pick<StayCardData, "city" | "region" | "country">) =>
  [stay.city, stay.region || stay.country].filter(Boolean).join(", ");

// A Search result row (src/lib/search/query.ts projects exactly this).
export type SearchStay = StayCardData & {
  slug: string;
  type: PropertyType;
  reviewCount: number;
  amenities: Amenity[] | null;
  petsAllowed: boolean;
};

// ---- Stay details (STAY_QUERY in src/lib/sanity/queries.ts projects exactly this)

export type HouseRules = {
  checkInTime: string;
  checkOutTime: string;
  quietHoursFrom?: string | null;
  quietHoursTo?: string | null;
  petsAllowed: boolean;
  maxPets?: number | null;
  petFee?: number | null;
  smokingAllowed?: boolean | null;
  partiesAllowed?: boolean | null;
  additionalRules?: string[] | null;
};

// The Portable Text the policy schema allows: paragraphs, h3, bullets, strong.
export type PolicySpan = { _key: string; text: string; marks?: string[] };
export type PolicyBlock = {
  _key: string;
  _type: string;
  style?: string;
  listItem?: string;
  children?: PolicySpan[];
};

export type Policy = { kind: string; title: string; summary?: string | null; body: PolicyBlock[] };

/** A Roam policy on its own (ROAM_POLICIES_QUERY); cancellation has one per tier. */
export type RoamPolicy = Policy & { slug: string };

export type ResponseTime = "withinHour" | "withinFewHours" | "withinDay";

export type StayHost = {
  name: string;
  photoUrl?: string | null;
  bio?: string | null;
  isSuperhost?: boolean | null;
  hostingSince?: string | null;
  responseTime?: ResponseTime | null;
  languages?: string[] | null;
};

export type StayDetails = {
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  city: string;
  region?: string | null;
  country?: string | null;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  cleaningFee?: number | null;
  minNights?: number | null;
  maxGuests?: number | null;
  amenities: Amenity[] | null;
  photos: { url: string; alt?: string | null }[];
  houseRules: HouseRules;
  host: StayHost | null;
  cancellationPolicy: Policy | null;
  /** Roam's policies that apply to every stay. */
  policies: Policy[];
};
