// Writes each stay's summary, description and highlights with Agent Actions,
// using only that stay's own fields and facts, then checks the copy before
// storing it: code checks first, then a Prompt that lists unsupported claims.
// Copy is regenerated only when the source changed (copyReview.sourceHash).

import {createHash} from 'node:crypto'

import type {SanityClient} from '@sanity/client'

import {amenities as amenityList, type Amenity} from '../schemaTypes/lists'
import {checkCopy, type Copy, type CopySource} from './copy-checks'

const SCHEMA_ID = '_.schemas.default'
const MAX_ATTEMPTS = 3

type StayRow = {
  _id: string
  title: string
  type: string
  city: string
  region?: string
  country: string
  neighborhood?: string
  maxGuests: number
  bedrooms: number
  beds: number
  bathrooms: number
  pricePerNight: number
  minNights?: number
  amenities: Amenity[]
  houseRules: {petsAllowed: boolean; maxPets?: number; checkInTime: string; checkOutTime: string}
  facts: string[]
  vibes?: string[]
  hostName: string
  slug: string
  copyReview?: {status?: string; sourceHash?: string}
}

const STAYS_QUERY = `*[_type == "property" && !(_id in path("drafts.**")) && (!defined($slug) || slug.current == $slug)]
  | order(slug.current asc){
    _id, title, type, city, region, country, neighborhood, maxGuests, bedrooms, beds, bathrooms,
    pricePerNight, minNights, amenities, houseRules, facts, vibes, copyReview,
    "slug": slug.current, "hostName": host->name
  }`

const amenityTitle = (a: Amenity) => amenityList.find((x) => x.value === a)?.title ?? a

// The only text the copy may draw on, as plain lines.
function sourceFor(s: StayRow): CopySource {
  const place = [s.neighborhood, s.city, s.region, s.country].filter(Boolean).join(', ')
  const lines = [
    `Title: ${s.title}`,
    `Type: ${s.type}`,
    `Place: ${place}`,
    `Sleeps ${s.maxGuests} guests in ${s.bedrooms === 0 ? 'a studio' : `${s.bedrooms} bedroom${s.bedrooms === 1 ? '' : 's'}`}, ${s.beds} bed${s.beds === 1 ? '' : 's'}, ${s.bathrooms} bathroom${s.bathrooms === 1 ? '' : 's'}`,
    `Amenities: ${s.amenities.map(amenityTitle).join(', ')}`,
    `Pets: ${s.houseRules.petsAllowed ? `allowed (up to ${s.houseRules.maxPets ?? 1})` : 'not allowed'}`,
    `Host: ${s.hostName}`,
    `Qualities: ${(s.vibes ?? []).join(', ')}`,
    'Facts:',
    ...s.facts.map((f) => `- ${f}`),
  ]
  return {
    title: s.title,
    city: s.city,
    region: s.region,
    country: s.country,
    neighborhood: s.neighborhood,
    amenities: s.amenities,
    petsAllowed: s.houseRules.petsAllowed,
    hostName: s.hostName,
    text: lines.join('\n'),
  }
}

const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)

const GENERATE_INSTRUCTION = `You write listing copy for Roam, a vacation rental app.

Write the summary, description and highlights for this stay using ONLY the information below. Every claim must come from it.
- Do not add anything that is not stated: no distances, times, numbers, amenities, views, rooms, furniture, nearby places, activities, history, awards or comparisons.
- You may rephrase and combine facts, and use the listed qualities to set the tone.
- Mention the host only by name, if at all. Never mention price.
- summary: one plain line under 80 characters, no ending period.
- description: 3 to 4 short sentences in a warm, plain voice. No exclamation marks, no superlatives such as "best" or "perfect".
- highlights: 3 or 4 short phrases (under 40 characters each), each taken from a different fact.

$source

$feedback`

const CHECK_INSTRUCTION = `You check vacation rental copy for invented claims.

Source (the only allowed information):
$source

Copy to check:
$copy

List every claim in the copy that the source does not support. A claim is unsupported if it adds a detail (a number, distance, amenity, view, room, object, place, activity or quality) that the source does not state or clearly imply. Rewording and tone are fine.

Respond in JSON with this format: {"unsupported": [{"claim": "the words from the copy", "reason": "why the source doesn't support it"}]}. Use an empty array if every claim is supported.`

async function generate(client: SanityClient, stay: StayRow, source: CopySource, feedback: string[]): Promise<Copy> {
  const doc = await client.agent.action.generate({
    schemaId: SCHEMA_ID,
    documentId: stay._id,
    noWrite: true,
    temperature: 0.2,
    instruction: GENERATE_INSTRUCTION,
    instructionParams: {
      source: {type: 'constant', value: source.text},
      feedback: {
        type: 'constant',
        value: feedback.length
          ? `A previous draft was rejected. Fix these problems:\n${feedback.map((f) => `- ${f}`).join('\n')}`
          : '',
      },
    },
    // 'set' replaces the old copy; the default appends to arrays.
    target: {include: ['summary', 'description', 'highlights'], operation: 'set'},
  })
  return {
    summary: String(doc.summary ?? '').trim(),
    description: String(doc.description ?? '').trim(),
    highlights: Array.isArray(doc.highlights) ? doc.highlights.map((h: unknown) => String(h).trim()) : [],
  }
}

async function unsupportedClaims(client: SanityClient, source: CopySource, copy: Copy): Promise<string[]> {
  const res = (await client.agent.action.prompt({
    instruction: CHECK_INSTRUCTION,
    instructionParams: {
      source: {type: 'constant', value: source.text},
      copy: {
        type: 'constant',
        value: `Summary: ${copy.summary}\nDescription: ${copy.description}\nHighlights:\n${copy.highlights.map((h) => `- ${h}`).join('\n')}`,
      },
    },
    format: 'json',
    temperature: 0,
  })) as {unsupported?: {claim: string; reason: string}[]}
  return (res.unsupported ?? []).map((u) => `"${u.claim}": ${u.reason}`)
}

export async function writeCopy(cliClient: SanityClient, opts: {slug?: string; force?: boolean} = {}) {
  const client = cliClient.withConfig({apiVersion: 'vX'})
  const rows = await client.fetch<StayRow[]>(STAYS_QUERY, {slug: opts.slug ?? null})
  const results: {slug: string; attempts: number; status: string; problems: string[]}[] = []

  console.log(`\nCopy: checking ${rows.length} stays…`)
  for (const stay of rows) {
    const source = sourceFor(stay)
    const sourceHash = hash(source.text)
    if (!opts.force && stay.copyReview?.status === 'passed' && stay.copyReview.sourceHash === sourceHash) {
      results.push({slug: stay.slug, attempts: 0, status: 'unchanged', problems: []})
      continue
    }

    let problems: string[] = []
    let copy: Copy | undefined
    let attempts = 0
    while (attempts < MAX_ATTEMPTS) {
      attempts++
      copy = await generate(client, stay, source, problems)
      problems = checkCopy(copy, source)
      if (!problems.length) problems = await unsupportedClaims(client, source, copy)
      if (!problems.length) break
      console.log(`    attempt ${attempts} rejected:\n${problems.map((p) => `      - ${p}`).join('\n')}`)
    }

    const passed = problems.length === 0
    const copyReview = {
      _type: 'object',
      status: passed ? 'passed' : 'failed',
      checkedAt: new Date().toISOString(),
      attempts,
      sourceHash,
      unsupportedClaims: problems,
    }
    // Failed copy is never stored, so nothing invented reaches guests.
    const patch = client.patch(stay._id).set({copyReview})
    if (passed && copy) patch.set(copy)
    await patch.commit()
    results.push({slug: stay.slug, attempts, status: copyReview.status, problems})
    console.log(`  ${passed ? '✓' : '✗'} ${stay.slug} (${attempts} attempt${attempts === 1 ? '' : 's'})`)
    if (copy && opts.slug) console.log(`\n${copy.summary}\n${copy.description}\n${copy.highlights.map((h) => `• ${h}`).join('\n')}\n`)
  }

  console.log('\nCopy results')
  for (const r of results) {
    console.log(`  ${r.status.padEnd(9)} ${String(r.attempts).padStart(2)}  ${r.slug}`)
    for (const p of r.problems) console.log(`             ${p}`)
  }
  const failed = results.filter((r) => r.status === 'failed').length
  console.log(`\n${results.length - failed} passed or unchanged, ${failed} failed.`)
  return results
}
