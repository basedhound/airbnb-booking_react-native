import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_decide, type Experimental_DecisionQuestion } from "ai";

import {
  AMENITIES,
  MAX_SENTENCE,
  PROPERTY_TYPES,
  VIBES,
  emptyIntent,
  intentFromParsed,
  type Buckets,
  type SearchIntent,
} from "@/lib/search/intent";
import { amenityLabels, findPlace, parseQuery } from "@/lib/search/parse";
import type { PropertyType } from "@/lib/stays";

// Server only. Jev reads a search sentence into typed answers; code owns every
// option, number and threshold, and turns the answers into a SearchIntent.
// One request: a stance question per filter Roam knows, plus a role question
// per number code found. Place stays with the parser.

const MODEL = "jev-latest";
const TIMEOUT_MS = 5000;

// Tuned on realistic sentences (prompts/12-server-search.md). Hard filters need
// a confident, explicit ask; anything weaker only ranks.
const FILTER_AT = 0.9;
const PREFER_AT = 0.3;
const DEMOTE_VIBE_AT = 0.8;
const ROLE_AT = 0.6;

const typeFeatures: Record<PropertyType, string> = {
  cabin: "Cabin (cabins, chalets, A-frames, lodges)",
  beach: "Beach house (beachfront, seaside, bungalows)",
  city: "City stay (apartments, lofts, studios, condos)",
  villa: "Villa (villas, mansions)",
};

const stanceCriteria = {
  wanted: "The guest asks for this by name or with words that can only mean it.",
  implied: "The guest does not ask for it, but it fits what they describe.",
  avoided: "The guest says they do not want it or cannot have it.",
  not_mentioned: "Nothing in the sentence is about it.",
};

const stance = (feature: string): Experimental_DecisionQuestion => ({
  type: "choice",
  instructions: { task: "How does the guest's search sentence treat this feature of a rental stay?", feature },
  criteria: stanceCriteria,
});

const numberCriteria = {
  maxPrice: "The most they want to pay per night.",
  minPrice: "The least they want to pay per night.",
  guests: "How many people are staying.",
  bedrooms: "How many bedrooms they need.",
  other: "Something else, such as nights, dates, a distance or a name.",
};
type NumberRole = Exclude<keyof typeof numberCriteria, "other">;

const bounds: Record<NumberRole, [number, number]> = {
  maxPrice: [1, 100000],
  minPrice: [1, 100000],
  guests: [1, 50],
  bedrooms: [1, 20],
};

const wordNumbers: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};

type NumberCandidate = { raw: string; value: number; index: number };

/** Every number in the sentence ("$300", "1,200", "1.5k", "four"), found by code. */
export function findNumbers(sentence: string): NumberCandidate[] {
  const pattern = new RegExp(`\\$?\\d[\\d,]*(?:\\.\\d+)?k?\\b|\\b(?:${Object.keys(wordNumbers).join("|")})\\b`, "gi");
  return [...sentence.matchAll(pattern)].flatMap((match) => {
    const raw = match[0];
    const word = wordNumbers[raw.toLowerCase()];
    const digits = Number(raw.replace(/[$,k]/gi, ""));
    const value = word ?? Math.round(/k$/i.test(raw) ? digits * 1000 : digits);
    return Number.isFinite(value) ? [{ raw, value, index: match.index }] : [];
  });
}

type Probabilities = Record<string, number>;

function probabilities(answer: unknown): Probabilities {
  const a = answer as { type?: string; choice?: string; probabilities?: Probabilities } | undefined;
  if (a?.type !== "choice" || !a.choice) return {};
  return a.probabilities ?? { [a.choice]: 1 };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function readStance(p: Probabilities) {
  const wanted = p.wanted ?? 0;
  const avoided = p.avoided ?? 0;
  return { wanted, avoided, pref: round2(wanted + 0.5 * (p.implied ?? 0)) };
}

function sortInto<T>(buckets: Buckets<T>, value: T, p: Probabilities) {
  const s = readStance(p);
  if (s.wanted >= FILTER_AT) buckets.required.push(value);
  else if (s.avoided >= FILTER_AT) buckets.avoided.push(value);
  else if (s.pref >= PREFER_AT) buckets.preferred.push({ value, weight: Math.min(1, s.pref) });
}

/** Reads the sentence with Jev. Falls back to the regex parser if Jev fails. */
export async function readIntent(input: string, places: string[], signal?: AbortSignal): Promise<SearchIntent> {
  const sentence = input.trim().slice(0, MAX_SENTENCE);
  if (!sentence) return emptyIntent("", "jev");

  const numbers = findNumbers(sentence);
  const questions: Record<string, Experimental_DecisionQuestion> = { pets: stance("Bringing pets (a pet-friendly stay that allows dogs or cats)") };
  for (const a of AMENITIES) questions[`amenity:${a}`] = stance(`Amenity: ${amenityLabels[a]}`);
  for (const t of PROPERTY_TYPES) questions[`type:${t}`] = stance(`Type of stay: ${typeFeatures[t]}`);
  for (const v of VIBES) questions[`vibe:${v}`] = stance(`Atmosphere: ${v}`);
  numbers.forEach((n, i) => {
    questions[`number:${i}`] = {
      type: "choice",
      instructions: {
        task: "What does the number marked with [[ ]] mean in the guest's search sentence?",
        marked: `${sentence.slice(0, n.index)}[[${n.raw}]]${sentence.slice(n.index + n.raw.length)}`,
      },
      criteria: numberCriteria,
    };
  });

  try {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const result = await experimental_decide({
      model: typeSafeAi.decisionModel(MODEL),
      state: { sentence },
      questions,
      maxRetries: 1,
      abortSignal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const answers = result.answers as Record<string, unknown>;
    const intent = emptyIntent(sentence, "jev");
    intent.place = findPlace(sentence, places);

    const pets = readStance(probabilities(answers.pets));
    if (pets.wanted >= FILTER_AT) intent.pets = "wanted";
    else if (pets.avoided >= FILTER_AT) intent.pets = "avoided";
    else if (pets.pref >= PREFER_AT) intent.petsWeight = Math.min(1, pets.pref);

    for (const a of AMENITIES) sortInto(intent.amenities, a, probabilities(answers[`amenity:${a}`]));
    for (const t of PROPERTY_TYPES) sortInto(intent.types, t, probabilities(answers[`type:${t}`]));
    for (const v of VIBES) {
      const s = readStance(probabilities(answers[`vibe:${v}`]));
      if (s.pref >= PREFER_AT) intent.vibes.preferred.push({ value: v, weight: Math.min(1, s.pref) });
      else if (s.avoided >= DEMOTE_VIBE_AT) intent.vibes.avoided.push(v);
    }

    // The most likely number for each role wins; Jev picks the role, code owns the value.
    const best: Partial<Record<NumberRole, { value: number; p: number }>> = {};
    numbers.forEach((n, i) => {
      const p = probabilities(answers[`number:${i}`]);
      const [role, prob] = Object.entries(p).sort((x, y) => y[1] - x[1])[0] ?? [];
      if (!role || role === "other" || !(role in bounds) || prob < ROLE_AT) return;
      const [min, max] = bounds[role as NumberRole];
      if (n.value < min || n.value > max) return;
      if (!best[role as NumberRole] || best[role as NumberRole]!.p < prob) best[role as NumberRole] = { value: n.value, p: prob };
    });
    intent.maxPrice = best.maxPrice?.value;
    intent.minPrice = best.minPrice?.value;
    intent.guests = best.guests?.value;
    intent.bedrooms = best.bedrooms?.value;
    if (intent.minPrice !== undefined && intent.maxPrice !== undefined && intent.minPrice > intent.maxPrice) {
      [intent.minPrice, intent.maxPrice] = [intent.maxPrice, intent.minPrice];
    }
    return intent;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn("jev fallback", error instanceof Error ? error.name : typeof error);
    return intentFromParsed(parseQuery(sentence, places), sentence);
  }
}
