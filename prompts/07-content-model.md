# 07 · Content model, seed, and live Home

Status: done

## Goal
Roam's content lives in Sanity. A schema covers stays, hosts, shared policies, and reviews, and it already holds everything the future Search results and stay details screens need. It's deployed with a Studio. 30 realistic stays are seeded by a script that's safe to rerun, each stay's copy is written by Agent Actions from that stay's own facts and checked for invented claims, and Dataset Embeddings are on. Home shows live stays from Sanity. Search keeps using local data for now.

## Decisions
- Sanity project `0z83ssmn` (roamd-record), dataset `production` (public ACL, so published documents are readable without a token). The Studio stays in `studio/` (Sanity 6.18).
- **Deploy path (your answer):** the schema lives in `studio/schemaTypes/` and deploys with the Studio CLI from `studio/` (`npx sanity schema deploy`, then `npx sanity deploy`). The MCP's `deploy_schema` refuses projects with a local Studio. The Sanity MCP does the rest: embeddings, queries, checks, schema inspection. Seeding and Agent Actions run as one rerunnable script through `npx sanity exec scripts/seed.ts --with-user-token`, which uses your CLI login, so no write token is created or stored.
- **Results card needs (your answers):** price per night, "why it matched" chips, a one-line summary, and guests · bedrooms · beds. "Why it matched" needs no new field: code compares the typed fields with the parsed query.
- **Details screen needs (your answers):** photo gallery, host card, amenities and layout, house rules and check-in, cancellation and policies, location with map, price breakdown, and reviews. These are modelled and seeded now. The screens themselves are out of scope.
- **Typed fields carry everything guests filter on:** `type`, `pricePerNight`, `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `amenities[]` (fixed list), `houseRules.petsAllowed`, and place (`city`, `region`, `country`, `neighborhood`). Values are always GROQ params.
- **Descriptive text lives on the property** (embeddings only see the document itself): `summary`, `description`, `highlights[]`, `vibes[]`, `facts[]`, `neighborhood`. Hosts, policies, and reviews aren't embedded.
- **Shared documents:** `host` (about 12, shared across stays) and `policy` (3 cancellation tiers plus 5 general Roam policies). Each stay references one host and one cancellation policy. General policies apply to every stay, so they aren't referenced. `review` documents reference their stay.
- **IDs:** Sanity generates every `_id`. Each seeded document has a stable content key that the seed looks up: `slug.current` for property, host, and policy, and a hidden read-only `seedKey` for review.
- **Rerun safety:** the seed looks up each document by key, creates it if it's missing, or patches only the seeded fields if it exists. It never deletes. Documents missing from the seed data are listed, not removed. Image uploads are looked up by `source.id` before uploading (Sanity also dedupes by content hash). Copy is regenerated only when a stay's source facts changed (`copyReview.sourceHash`). `--dry-run` prints the planned creates and updates and writes nothing.
- **Seed writes published documents** through the client, so Home sees them with no publish step. Agent Actions run with `noWrite: true`, and the script writes the checked copy itself, so drafts are never left behind.
- **Copy flow per stay (Agent Actions):**
  1. **Generate** (`noWrite`, temperature 0.2, target `summary`, `description`, `highlights`) with the stay document as `$stay`. The instruction says to use only the stay's typed fields, `facts`, and `vibes`, with no distances, numbers, amenities, views, or nearby places beyond them, and to describe the host only by name.
  2. **Check, in two layers:** (a) code checks: every number in the copy appears in the source; amenity and view words (hot tub, pool, sauna, ocean view…) appear only if they're in `amenities` or `facts`; pets are mentioned only if pets are allowed; place names are limited to the stay's own; length limits. (b) **Prompt** (`format: "json"`, temperature 0): "list every claim in $copy not supported by $source" → `{ "unsupported": [{ "claim", "reason" }] }`.
  3. Pass → patch the published stay with the copy plus `copyReview { status: "passed", checkedAt, sourceHash }`. Fail → retry up to 2 more times with the unsupported claims as extra instructions. Still failing → `copyReview.status = "failed"` with the claims, nothing is shown, and the stay is listed in the report.
  Agent Actions run at seed time only. No LLM runs in the app.
- **Hand-written seed content:** stay facts (typed fields, `facts[]`, `vibes[]`), host profiles, Roam's policy text, and 3 reviews per stay (90). Reviews are written from the stay's facts. `rating` and `reviewCount` on the property are stored aggregates, and the 3 reviews are "recent reviews" whose average stays within 0.3 of `rating`. The policy text is fictional Roam policy, written for word-for-word quoting later.
- **30 stays:** the 16 local stays (same titles and places, so Home and Search look consistent) plus 14 new ones: 8 cabins, 8 beach, 7 city, 7 villa. Prices $95–$850, 2–12 guests, a mix of pets and amenities, US and international.
- **Photos:** a cover plus about 4 more Unsplash photos per stay (Unsplash License), uploaded as Sanity image assets with required `alt`, each checked for HTTP 200 and viewed. Hosts get no photo (the Avatar shows an initial), to avoid stock portraits posing as real people. Missing photos are listed.
- **Prices are USD** for every stay, including international ones.
- **Place display:** `city, region` when `region` is set ("Lake Arrowhead, CA", "Seminyak, Bali"), otherwise `city, country` ("Lisbon, Portugal").
- **Embeddings:** enabled on `production` through the MCP's Sanity CLI (`datasets embeddings enable production --projection=…`). Projection (property only): `{ _type == "property" => { title, type, city, region, country, neighborhood, summary, description, highlights, vibes, facts, amenities } }`. Wait for `ready`.
- **Home reads Sanity directly:** a plain `fetch` to the public API CDN (`https://<id>.apicdn.sanity.io/v2026-10-08/data/query/<dataset>`), perspective `published`, with no token and no new app dependency. `EXPO_PUBLIC_SANITY_PROJECT_ID` and `EXPO_PUBLIC_SANITY_DATASET` aren't secrets. An API route isn't needed, since nothing secret or quota-billed runs. Semantic search will go through an API route later, because `text::semanticSimilarity` uses quota.
- **Home's category is a GROQ param** (`$type`, `"all"` for every stay). Lists are cached per category in memory. While a new category loads, the current cards stay up, then swap with the existing fade and reflow. States: loading on first load (3 `bg-surface-muted` card placeholders at `h-68 rounded-xl`), error (muted line plus a "Try again" secondary button), and empty ("No stays here yet").
- Image URLs come from GROQ (`photos[0].asset->url`) plus `?w=1200&auto=format&q=80`, with no `@sanity/image-url` in the app.
- `PropertyCard` takes a narrower `StayCardData` type (title, city, place label, rating, imageUrl, price). Both the local `Property` and live Home data satisfy it. Cards still don't navigate.
- `.gitignore` gets `.env` (it currently ignores only `.env*.local`).
- New Studio dependencies (please approve): `@sanity/client` and `@sanity/icons`, declared explicitly in `studio/package.json`. Both are already installed as transitive dependencies of `sanity`. The app gets no new dependencies.

## Content model
All types use `defineType` / `defineField` / `defineArrayMember` and have an icon.

**property** (`HomeIcon`). Groups: Basics, Place, Layout, Price, Rules, Copy, Media.
| Field | Type | Notes |
| --- | --- | --- |
| title | string, required, max 60 | |
| slug | slug from title, required, unique | seed key; future route `/stay/[slug]` |
| type | string list `cabin · beach · city · villa`, radio, required | filter |
| city, region, country | string (`city` and `country` required) | filter on place |
| neighborhood | string | e.g. "Alfama" |
| location | geopoint | map pin |
| maxGuests, bedrooms, beds, bathrooms | number, required, ints ≥ 0 (baths allow .5) | filter and facts line |
| pricePerNight | number, required, USD | filter |
| cleaningFee | number, USD | price breakdown |
| minNights | number, int ≥ 1 | |
| weeklyDiscountPercent | number 0–50 | |
| amenities | array of string, fixed list, unique | `hotTub pool fireplace firePit sauna wifi kitchen workspace parking washer ac oceanView lakeView beachAccess mountainView bbq evCharger` |
| houseRules | object: `checkInTime` "15:00", `checkOutTime` "11:00", `quietHoursFrom`, `quietHoursTo`, `petsAllowed` bool, `maxPets` int, `petFee` USD, `smokingAllowed` bool, `partiesAllowed` bool, `additionalRules` array of string | the pets filter is `houseRules.petsAllowed` |
| cancellationPolicy | reference → policy (kind == cancellation), required | |
| host | reference → host, required | |
| rating | number 0–5, 2 decimals | stored aggregate |
| reviewCount | number int | stored aggregate |
| vibes | array of string (tags) | soft words: quiet, cozy… |
| facts | array of string | the stay's facts, the source for copy ("Cedar hot tub on the back deck") |
| summary | string, max 90 | one-line, generated |
| description | text, 3–5 sentences | generated |
| highlights | array of string, max 4 | generated |
| copyReview | object, `readOnly`: `status` (passed/failed), `checkedAt`, `sourceHash`, `unsupportedClaims[]` | Agent Actions skip read-only fields |
| photos | array of image (hotspot) with required `alt`, min 1; first = cover | |

Preview: title, `city · $price`, cover photo.

**host** (`UserIcon`): `name` (required), `slug` (seed key), `photo` (image, optional), `bio` (text), `isSuperhost` (bool), `hostingSince` (date), `responseTime` (list: within an hour, within a few hours, within a day), `languages` (array of string).

**policy** (`DocumentTextIcon`): `title`, `slug` (seed key), `kind` (list: `cancellation`, `booking`, `payment`, `pets`, `damage`, `checkIn`, `guestRefund`), `summary` (string, one line), `body` (Portable Text, normal paragraphs, h3, and bullet lists only). Seeded: Flexible, Moderate, and Strict cancellation, plus Booking & payment, Pets, Damage & security deposit, Check-in & check-out, and the Guest refund policy. Written so a future Context endpoint (Knowledge Base mode) can quote whole paragraphs.

**review** (`CommentIcon`): `property` (reference, required), `guestName` (first name only), `rating` (int 1–5), `stayedAt` (date, month precision), `text` (text, required), `seedKey` (string, hidden, read-only).

## Out of scope
- Search moving to GROQ and embeddings, Jev, and API routes. Search keeps `src/data/properties.ts` and `src/lib/search/`.
- Stay details screen, card navigation, and the Search results card redesign. Their fields exist now.
- The Sanity Context endpoint for policies (created in the Dashboard later) and the policy Q&A.
- Availability, dates, booking, and dark mode.
- PostHog events.

## Steps
### 1. Schema in `studio/`
Run `npm install @sanity/client @sanity/icons` in `studio/` (pinned to the installed versions). Write `studio/schemaTypes/{property,host,policy,review}.ts` and `index.ts` per the Content model, with Studio structure grouping Stays, Hosts, Policies, and Reviews. Run `npx sanity schema deploy` and `npx sanity deploy` (hostname: `roam-record`, or ask if it's taken). Check with the MCP that `get_schema` returns all four types, and record the schema ID. Done when the Studio loads and shows the empty types.

### 2. Seed data
Under `studio/seed/`, add `hosts.ts`, `policies.ts`, `stays.ts` (30 stays with `facts`, `vibes`, typed fields, photo sources and alt, host slug, and cancellation slug), and `reviews.ts`. Find and view every Unsplash photo, and check each returns HTTP 200. Make sure the data covers the filters: each type appears at several price points, at least 10 pet-friendly stays, at least 8 with a hot tub, a mix of pool, sauna, and fireplace, and 2–12 guests.

### 3. Seed script (structure, no copy yet)
Add `studio/scripts/seed.ts` (`getCliClient({ apiVersion: '2026-10-08' })`). Order: policies, hosts, image assets, properties (resolving references from looked-up `_id`s), then reviews. It accepts `--dry-run` and prints a summary of created / updated / unchanged / not in seed data. Run it twice: the second run must report 0 created and 0 changed fields.

### 4. Agent Actions copy
Add `studio/scripts/copy.ts`, which `seed.ts` calls after properties (or runs alone with `--only-copy` and `--slug <slug>`). Use a `vX` client for `client.agent.action.generate` and `.prompt` with the deployed schema ID. Implement the copy flow from Decisions, with the code checks in `studio/scripts/copy-checks.ts`. Try one stay first, read its copy and the checker output, then run all 30. Print a table of slug, attempts, status, and any unsupported claims.

### 5. Embeddings
Enable embeddings through the MCP Sanity CLI with the projection from Decisions, and poll `datasets embeddings status production` until `ready`. Spot-check with MCP `query_documents`, for example `*[_type == "property"] | score(text::semanticSimilarity("quiet place to unplug in the woods")) | order(_score desc)[0...5]{title, _score}`, and check that secluded cabins rank first.

### 6. Home on live content
Load the `expo-data-fetching` skill. Add `src/lib/sanity/config.ts` (env), `src/lib/sanity/fetch.ts` (`sanityQuery<T>(query, params)`, which encodes params as `$name=JSON`, checks `res.ok`, and returns `result`), `src/lib/sanity/queries.ts` (`HOME_STAYS_QUERY`: `*[_type == "property" && defined(slug.current) && ($type == "all" || type == $type)] | order(rating desc, reviewCount desc)[0...30]{ "id": _id, "slug": slug.current, title, city, region, country, rating, pricePerNight, "imageUrl": photos[0].asset->url }`), and `src/hooks/use-home-stays.ts` (per-category cache, loading/error/retry). Add `StayCardData` and the place label helper to `src/lib/stays.ts`. Update `PropertyCard` and Home. Add the env names to `.env.example` and the values to `.env`, and add `.env` to `.gitignore`.

### 7. Check in the simulator
Screenshot Home with live data, switch chips, and screenshot each category. Turn off networking (or point at a bad dataset) to screenshot the error state, then recover with Try again. Compare against the Home design from plan 06. Nothing visual should change except the photos.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, and `npx expo-doctor` pass. In `studio/`: `npx tsc --noEmit` and `npx sanity schema validate`.
- Schema: the MCP `get_schema` lists property, host, policy, and review with their fields. The Studio opens a stay with every group filled.
- Seed: counts via the MCP are 30 properties, about 12 hosts, 8 policies, and 90 reviews, with no drafts (`count(*[_id in path("drafts.**")]) == 0`). Every stay has a host, a cancellation policy, ≥ 3 photos with alt, and a summary and description. A second run reports nothing created or changed. `--dry-run` writes nothing (`_rev`s unchanged).
- Copy: every stay's `copyReview.status == "passed"`, or any failures are listed by cause. I'll read 5 stays' copy against their facts by hand and report what I found.
- Filters (GROQ via the MCP with params): "pet-friendly cabins with a hot tub ≤ $300", "beach stays for 6+", "villas with a pool", and "city ≤ $150" each return sensible, non-empty sets.
- Embeddings: status `ready`. Semantic spot checks for "quiet place to unplug in the woods", "lively walkable neighborhood", and "romantic getaway with a view", each with the top 3 reported.
- App: Home shows the 30 live stays in rating order, each chip filters through GROQ, the loading, error, and empty states render, and photos load. No Sanity token reaches the app: `grep -rn "process.env" src/` shows only `EXPO_PUBLIC_*` names.
- End to end: edit one stay's title in the Studio, pull to reload or relaunch Home, and see the new title.

## AGENTS.md updates
- Who owns what → Content: replace "Until it's seeded…" with the following. Stays, hosts, policies, and reviews live in Sanity (`property`, `host`, `policy`, `review`). Home reads published content from the public API CDN with no token. Search still uses `src/data/properties.ts` until it moves to GROQ and embeddings. Schema changes deploy with the Studio CLI from `studio/` (the MCP's `deploy_schema` refuses local Studios). The MCP handles embeddings, queries, and checks. Seeding and copy run with `npx sanity exec scripts/seed.ts --with-user-token` from `studio/`, which is safe to rerun.
- Who owns what → Soft intent: embeddings are enabled on `production` with a property-only projection (record the projection).
- Rules: seeded documents are found by content key (`slug.current`, or `seedKey` for reviews), never by `_id`. Generated copy (`summary`, `description`, `highlights`) is written only from the stay's own fields and `facts`, and is stored only after the code checks and the Prompt check pass.
- Rules: `.env` is gitignored.

## Result
Built as planned. Changes made while building:
- Env values went into `.env.local` (the project's existing, gitignored env file), not `.env`. `.env` was still added to `.gitignore`.
- `sanity.cli.ts` now sets `studioHost: 'roam-record'` and the Studio `appId`, so deploys don't prompt. The Studio title is "Roam".
- Unsplash's search API is behind a bot check, so photos were found through the Unsplash site in Chrome. 150 photos were viewed and their alts corrected against the images (one was a "Restrooms" sign and was replaced). 140 are used: 30 covers and 2–4 gallery photos per stay (Maui and Smoky Mountain have 2, a few have 3).
- Seed comparison sorts object keys. Content Lake reorders keys, so the first rerun reported false updates (same values, rewritten). Reruns now report 0 created and 0 updated.
- Generate needs `operation: 'set'`: on a document with existing copy, the default appended to `highlights` (8 items). The length check caught it, and nothing was stored.
- Name check matches each highlight line separately (it flagged "Set" at the start of a line). The pets check no longer exempts every stay. The source text always contains "Pets:", so it never fired before.
- The Mexico City studio's fact said "bedroom" on a 0-bedroom studio. It now says "sleeping area", and only that stay's copy was regenerated.
- `useHomeStays` derives the cached list during render: `react-hooks/set-state-in-effect` rejects setting state from an effect.
- The MCP CLI drops double quotes inside args, so the embeddings projection uses single-quoted GROQ strings.
Copy: 30/30 passed (Santorini needed 2 attempts after the code check caught "steps from"). Embeddings `ready`. Lint, tsc (app and studio), expo-doctor 18/18, schema validate, and the drift greps pass. Home was screenshotted on live data. Chip taps and the error state UI weren't driven in the simulator (no tap automation). Their requests were checked with curl.
