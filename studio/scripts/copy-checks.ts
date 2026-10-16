// Code checks on generated copy. They catch the claims an LLM most often
// invents for a listing (numbers, amenities, views, pets, places) before the
// Prompt check reads the copy as a whole.

import type {Amenity} from '../schemaTypes/lists'

export type Copy = {summary: string; description: string; highlights: string[]}

export type CopySource = {
  title: string
  city: string
  region?: string
  country: string
  neighborhood?: string
  amenities: Amenity[]
  petsAllowed: boolean
  hostName: string
  /** Every string the copy may draw on: typed fields rendered as text, facts, vibes. */
  text: string
}

// Words that claim an amenity or view. Each is allowed only when the stay has
// the amenity, or when its own facts use the same words.
const claims: {pattern: RegExp; amenity?: Amenity}[] = [
  {pattern: /\bhot ?tubs?\b|\bjacuzzis?\b|\bspa\b/i, amenity: 'hotTub'},
  {pattern: /\bpools?\b/i, amenity: 'pool'},
  {pattern: /\bsaunas?\b/i, amenity: 'sauna'},
  {pattern: /\bfireplaces?\b|\bwood ?stoves?\b/i, amenity: 'fireplace'},
  {pattern: /\bfire ?pits?\b/i, amenity: 'firePit'},
  {pattern: /\bocean views?\b|\bsea views?\b/i, amenity: 'oceanView'},
  {pattern: /\blake views?\b/i, amenity: 'lakeView'},
  {pattern: /\bmountain views?\b/i, amenity: 'mountainView'},
  {pattern: /\bgrill\b|\bbbq\b|\bbarbecue\b/i, amenity: 'bbq'},
  {pattern: /\bev charg/i, amenity: 'evCharger'},
  {pattern: /\bair[- ]?condition|\bA\/C\b/i, amenity: 'ac'},
  {pattern: /\bwasher\b|\blaundry\b/i, amenity: 'washer'},
  {pattern: /\bparking\b|\bgarage\b/i, amenity: 'parking'},
  {pattern: /\bgym\b|\btennis\b|\bbalcon(y|ies)\b|\bterrace\b|\bgarden\b|\bdock\b|\bkayaks?\b|\bcanoes?\b|\bbikes?\b/i},
  {pattern: /\bwalk(ing)? distance\b|\bsteps from\b/i},
]

const words = (s: string) => s.toLowerCase()

export function checkCopy(copy: Copy, source: CopySource): string[] {
  const problems: string[] = []
  const all = [copy.summary, copy.description, ...copy.highlights].join('\n')
  const src = words(source.text)

  if (!copy.summary?.trim()) problems.push('summary is empty')
  if (copy.summary && copy.summary.length > 90) problems.push(`summary is ${copy.summary.length} characters (max 90)`)
  const sentences = copy.description?.split(/(?<=[.!?])\s+/).filter(Boolean).length ?? 0
  if (sentences < 2 || sentences > 6) problems.push(`description has ${sentences} sentences (want 3–5)`)
  if (!copy.highlights?.length || copy.highlights.length > 4) problems.push(`${copy.highlights?.length ?? 0} highlights (want 1–4)`)

  // Every number must appear in the source, so no invented distances or counts.
  for (const n of new Set(all.match(/\d+(?:[.,]\d+)?/g) ?? [])) {
    if (!src.includes(n)) problems.push(`number "${n}" is not in the stay's facts`)
  }

  for (const {pattern, amenity} of claims) {
    const match = all.match(pattern)
    if (!match) continue
    const allowed = (amenity && source.amenities.includes(amenity)) || pattern.test(source.text)
    if (!allowed) problems.push(`mentions "${match[0]}", which the stay doesn't list`)
  }

  if (/\b(pets?|dogs?|cats?|pet-friendly)\b/i.test(all) && !source.petsAllowed) {
    problems.push('mentions pets, but pets are not allowed')
  }

  // Capitalized words mid-sentence are usually place or brand names. Each must
  // come from the source.
  // Lines (highlights) are matched separately so a line's first word isn't one.
  const names = all.split('\n').flatMap((line) => line.match(/(?<=[a-z,;] )[A-Z][a-zà-ÿ]+(?: [A-Z][a-zà-ÿ]+)*/g) ?? [])
  for (const name of new Set(names)) {
    if (!src.includes(words(name))) problems.push(`name "${name}" is not in the stay's facts`)
  }

  return problems
}
