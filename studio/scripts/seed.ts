// Seeds Roam's content. Safe to rerun: every document is found by a content
// key (slug, or seedKey for reviews), created only if missing, and patched only
// where seeded fields differ. Nothing is ever deleted.
//
//   npx sanity exec scripts/seed.ts --with-user-token                 seed + copy
//   npx sanity exec scripts/seed.ts --with-user-token -- --dry-run    print the plan, write nothing
//   npx sanity exec scripts/seed.ts --with-user-token -- --skip-copy  seed only
//   npx sanity exec scripts/seed.ts --with-user-token -- --only-copy [--slug <slug>] [--force]

import {createHash} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

import {hosts} from '../seed/hosts'
import {photos, photoUrl, type PhotoKey} from '../seed/photos'
import {policies} from '../seed/policies'
import {reviews} from '../seed/reviews'
import {stays} from '../seed/stays'
import {writeCopy} from './copy'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipCopy = args.includes('--skip-copy')
const onlyCopy = args.includes('--only-copy')
const force = args.includes('--force')
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : undefined

const client = getCliClient({apiVersion: '2026-10-08'})

type Doc = Record<string, unknown>
type Counts = {created: number; updated: number; unchanged: number}
const report: Record<string, Counts> = {}

// Stable _keys, so a rerun produces byte-identical arrays and no diff.
const key = (...parts: unknown[]) => createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 12)
const ref = (_ref: string) => ({_type: 'reference', _ref})
const slug = (current: string) => ({_type: 'slug', current})

function blocks(paragraphs: string[]) {
  return paragraphs.map((text, i) => {
    const heading = text.startsWith('## ')
    const bullet = text.startsWith('- ')
    const body = heading ? text.slice(3) : bullet ? text.slice(2) : text
    return {
      _type: 'block',
      _key: key(i, text),
      style: heading ? 'h3' : 'normal',
      ...(bullet ? {listItem: 'bullet', level: 1} : {}),
      markDefs: [],
      children: [{_type: 'span', _key: key(i, 'span'), text: body, marks: []}],
    }
  })
}

// Content Lake doesn't keep object key order, so compare with sorted keys.
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]))
      : value
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

// Finds a published document by key and creates or patches it. `fields` lists
// every seeded field; one set to undefined is unset if present.
async function upsert(type: string, filter: string, params: Doc, fields: Doc): Promise<string> {
  const counts = (report[type] ??= {created: 0, updated: 0, unchanged: 0})
  const existing = await client.fetch<Doc | null>(
    `*[_type == $type && !(_id in path("drafts.**")) && ${filter}][0]`,
    {type, ...params},
  )

  if (!existing) {
    counts.created++
    const doc = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
    if (dryRun) return `dry-run.${type}.${counts.created}`
    const created = await client.create({_type: type, ...doc})
    return created._id
  }

  const set: Doc = {}
  const unset: string[] = []
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) {
      if (existing[name] !== undefined) unset.push(name)
    } else if (!same(existing[name], value)) {
      set[name] = value
    }
  }
  if (!Object.keys(set).length && !unset.length) {
    counts.unchanged++
  } else {
    counts.updated++
    console.log(`  update ${type} ${existing._id}: ${[...Object.keys(set), ...unset].join(', ')}`)
    if (!dryRun) await client.patch(existing._id as string).set(set).unset(unset).commit()
  }
  return existing._id as string
}

async function imageAsset(photoKey: PhotoKey): Promise<string> {
  const photo = photos[photoKey]
  const counts = (report['sanity.imageAsset'] ??= {created: 0, updated: 0, unchanged: 0})
  const existing = await client.fetch<string | null>(
    `*[_type == "sanity.imageAsset" && source.name == "unsplash" && source.id == $id][0]._id`,
    {id: photo.id},
  )
  if (existing) {
    counts.unchanged++
    return existing
  }
  counts.created++
  if (dryRun) return `dry-run.image.${photo.id}`
  const res = await fetch(`${photoUrl(photo)}?w=2000&q=80&fm=jpg`)
  if (!res.ok) throw new Error(`Photo ${photoKey} (${photo.id}) returned ${res.status}`)
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {
    filename: `${photoKey}.jpg`,
    source: {name: 'unsplash', id: photo.id, url: `https://unsplash.com/photos/${photo.id}`},
  })
  return asset._id
}

async function seed() {
  console.log(dryRun ? 'Dry run: nothing will be written.\n' : 'Seeding…\n')

  const policyIds = new Map<string, string>()
  for (const p of policies) {
    const fields = {title: p.title, slug: slug(p.slug), kind: p.kind, summary: p.summary, body: blocks(p.body)}
    policyIds.set(p.slug, await upsert('policy', 'slug.current == $slug', {slug: p.slug}, fields))
  }

  const hostIds = new Map<string, string>()
  for (const h of hosts) {
    const fields = {
      name: h.name,
      slug: slug(h.slug),
      bio: h.bio,
      isSuperhost: h.isSuperhost,
      hostingSince: h.hostingSince,
      responseTime: h.responseTime,
      languages: h.languages,
    }
    hostIds.set(h.slug, await upsert('host', 'slug.current == $slug', {slug: h.slug}, fields))
  }

  const stayIds = new Map<string, string>()
  for (const s of stays) {
    const host = hostIds.get(s.host)
    const cancellation = policyIds.get(s.cancellation)
    if (!host || !cancellation) throw new Error(`${s.slug}: unknown host or cancellation policy`)

    const photoFields = []
    for (const k of s.photos) {
      photoFields.push({_type: 'image', _key: key(k), asset: ref(await imageAsset(k)), alt: photos[k].alt})
    }

    const fields = {
      title: s.title,
      slug: slug(s.slug),
      type: s.type,
      host: ref(host),
      rating: s.rating,
      reviewCount: s.reviewCount,
      city: s.city,
      region: s.region,
      country: s.country,
      neighborhood: s.neighborhood,
      location: {_type: 'geopoint', lat: s.location[0], lng: s.location[1]},
      maxGuests: s.maxGuests,
      bedrooms: s.bedrooms,
      beds: s.beds,
      bathrooms: s.bathrooms,
      amenities: s.amenities,
      pricePerNight: s.pricePerNight,
      cleaningFee: s.cleaningFee,
      minNights: s.minNights,
      weeklyDiscountPercent: s.weeklyDiscountPercent,
      houseRules: s.houseRules,
      cancellationPolicy: ref(cancellation),
      facts: s.facts,
      vibes: s.vibes,
      photos: photoFields,
    }
    stayIds.set(s.slug, await upsert('property', 'slug.current == $slug', {slug: s.slug}, fields))
  }

  for (const [staySlug, rows] of Object.entries(reviews)) {
    const property = stayIds.get(staySlug)
    if (!property) throw new Error(`Reviews for unknown stay ${staySlug}`)
    for (const [guestName, rating, stayedAt, text] of rows) {
      const seedKey = `${staySlug}:${guestName}:${stayedAt}`
      const fields = {property: ref(property), guestName, rating, stayedAt: `${stayedAt}-01`, text, seedKey}
      await upsert('review', 'seedKey == $seedKey', {seedKey}, fields)
    }
  }

  // Report documents of seeded types that the seed data no longer lists.
  const extra = await client.fetch<{_type: string; _id: string; key?: string}[]>(
    `*[_type in ["policy", "host", "property", "review"] && !(_id in path("drafts.**"))
      && !(coalesce(slug.current, seedKey) in $keys)]{_type, _id, "key": coalesce(slug.current, seedKey)}`,
    {
      keys: [
        ...policies.map((p) => p.slug),
        ...hosts.map((h) => h.slug),
        ...stays.map((s) => s.slug),
        ...Object.entries(reviews).flatMap(([s, rows]) => rows.map(([g, , d]) => `${s}:${g}:${d}`)),
      ],
    },
  )

  console.log('\nDocuments      created  updated  unchanged')
  for (const [type, c] of Object.entries(report)) {
    console.log(`${type.padEnd(18)} ${String(c.created).padStart(4)} ${String(c.updated).padStart(8)} ${String(c.unchanged).padStart(10)}`)
  }
  if (extra.length) {
    console.log(`\nNot in seed data (left untouched): ${extra.map((d) => `${d._type} ${d.key ?? d._id}`).join(', ')}`)
  }
}

async function main() {
  if (!onlyCopy) await seed()
  if (!skipCopy && !dryRun) {
    await writeCopy(client, {slug: slugArg, force})
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
