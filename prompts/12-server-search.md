# 12 · Search on the server with Jev and embeddings

Status: done

## Goal
Search runs on the server. The app posts the guest's sentence to `POST /api/search`. The route checks the Clerk session, then asks Jev how the sentence treats every filter Roam knows (pets, each amenity, each type, each vibe) and what each number in it means. Code turns those typed answers into GROQ: hard filters only for confident asks, and ranking by embeddings plus probability-weighted boosts for the rest. It runs that GROQ through the `roam-record-search` Sanity Context endpoint. The screen, chips, sort and cards look the same as now.

## Decisions
- **Endpoint (your answer):** `roam-record-search`, the URL already in `SANITY_CONTEXT_MCP_URL`. It serves project `0z83ssmn` in GROQ mode, and its groqFilter limits it to `property`, `host` and `policy`. `roam-search` serves a different project (`z8iwmzg9`, with amenity values like `"hot tub"`), so it isn't used.
- **Calling Context:** a plain `fetch` JSON-RPC `tools/call` of `groq_query` (`{ query }`), with `Authorization: Bearer $SANITY_ORGANIZATION_TOKEN` and `Accept: application/json, text/event-stream`. No MCP client library. Tested: it's stateless (no `initialize` call), and it returns `result.content[0].text` as JSON `{ meta, result }`. A GROQ error comes back with `result.isError: true` and the parser message, which code turns into a thrown error. `text::semanticSimilarity()` works inside `score()` (embeddings on `production` are ready).
- **No params, so literals are built in code (your answer):** `groq_query` has no params, so values are written into the query by one function, `lit()`, that accepts only:
  - finite numbers
  - strings from code-owned enums (types, amenities, vibes)
  - place values from the server's known-place set
  - the guest sentence, encoded with `JSON.stringify`
  
  The sentence is first trimmed to 300 chars, with control characters and U+2028/2029 turned into spaces. Tested: an injection attempt (`\") || true || (\"`) stayed inside the string. This replaces the "values always as params" rule for queries sent through Context. The CDN reads (Home, stay details, places) keep params.
- **Jev, through the AI SDK:** `experimental_decide` from `ai` with `typeSafeAi.decisionModel("jev-latest")` (`@ai-sdk/typesafe-ai`). `experimental_evaluate` is deprecated in `ai@7.0.137` (it's an alias of `experimental_decide`), so AGENTS.md is corrected. All questions go in one request with state `{ sentence }`. Measured: 39–41 questions in 480–780 ms, model `jev-1.13.0`.
- **Stance questions (your answer: four options plus a threshold):** one Choice per filter. There are 17 amenities, 4 types, 16 vibes and pets: 38 questions.
  - `instructions`: `{ task: "How does the guest's search sentence treat this feature of a rental stay?", feature: "<Kind>: <label>" }`.
  - `criteria`:
    - `wanted`: "The guest asks for this by name or with words that can only mean it."
    - `implied`: "The guest does not ask for it, but it fits what they describe."
    - `avoided`: "The guest says they do not want it or cannot have it."
    - `not_mentioned`: "Nothing in the sentence is about it."
  - Feature labels come from code: amenity titles from the schema list; types with synonyms (`Cabin (cabins, chalets, A-frames, lodges)`, `Beach house (beachfront, seaside, bungalows)`, `City stay (apartments, lofts, studios, condos)`, `Villa (villas, mansions)`); vibes as `Atmosphere: quiet`; pets as `Bringing pets (a pet-friendly stay that allows dogs or cats)`.
- **From probabilities to the query (code policy, tunable):** `w`, `i` and `a` are P(wanted), P(implied) and P(avoided).
  - Amenity, type or pets with `w ≥ 0.9`: required, which makes it a filter.
  - Amenity, type or pets with `a ≥ 0.9`: avoided, also a filter.
  - Anything else with `pref = w + 0.5·i ≥ 0.3`: preferred, so it boosts ranking with weight `2·pref`.
  - Vibes never filter. With `pref ≥ 0.3` they boost `vibes match "<v>"` with weight `3·pref`. With `a ≥ 0.8` they're demoted (see GROQ shape).
  - Measured examples:
    - "quiet pet friendly cabin with a hot tub under $300": hot tub, cabin and pets are required (all 1.0). Quiet and peaceful boost, and lively is demoted.
    - "bring my dog by the ocean": pets is required (1.0). Beach access (w 0.76), the beach type (w 0.59) and ocean view (implied) only boost.
    - "anything but a cabin… allergic to cats, need wifi": cabin is avoided (1.0), pets avoided (0.93), wifi required (1.0), and workspace (0.74) only boosts.
- **Numbers:**
  - Code finds the candidates: digits (`$300`, `1,200`, `1.5k`) and number words from one to twenty. Each candidate is passed to Jev as `{ number, occurrence }`.
  - Jev answers one Choice per number: `maxPrice` (most per night), `minPrice` (least per night), `guests`, `bedrooms`, or `other` (nights, dates, distance, names).
  - A role is used when its P ≥ 0.6. If two numbers get the same role, the higher probability wins.
  - Code parses the value and checks bounds: price 1–100000, guests 1–50, bedrooms 1–20. Anything out of bounds is ignored. Jev never produces a value.
  - Measured: "$300… for 4" gave maxPrice and guests. "2 bedrooms, between 150 and 250" gave bedrooms, minPrice and maxPrice. "for 2 nights" gave other.
- **New filters:** `pricePerNight >= minPrice` and `bedrooms >= n`. Both fields already exist on `property`.
- **Place stays in code:** `takePlace` from `parse.ts` runs on the server. Known places are fetched once from the CDN (`PLACES_QUERY`, params, no token) and cached in the module for 10 minutes. Jev doesn't judge place in this plan.
- **Fallback:** if Jev fails (network, 4xx/5xx, missing key), the route builds the intent from the existing regex parser (`parseQuery`), so search still works. The intent carries `source: "jev" | "parser"`, which the server logs (never the sentence). If Context fails, the route returns 502 and the app shows its existing error state.
- **GROQ shape:** `{ "total": count(*[F]), "stays": *[F] | score(text::semanticSimilarity("<sentence>"), boost(...)…) | order(<demote> asc, _score desc, rating desc, reviewCount desc)[0...50]{…same projection} }`.
  - Here `<demote>` is `count(vibes[@ in [<avoided vibes>]])`. It's left out when no vibes are avoided.
  - Empty sentence: no Jev call, no score, just `order(rating desc, reviewCount desc)`.
  - Non-best sorts: the existing `order()` for that sort, with no score.
  - Tested through Context: `boost("beachAccess" in amenities, 2)`, `boost(vibes match "nature", 1.4)` and the demote order all work. A negative boost weight scores 0, which is why avoided vibes use the order term.
- **Filters F:**
  - `_type == "property" && defined(slug.current)`
  - `type in [..]` for required types, and `!(type in [..])` for avoided types
  - `pricePerNight <= n`, `pricePerNight >= n`, `maxGuests >= n`, `bedrooms >= n`
  - pets: `houseRules.petsAllowed == true` when wanted, `houseRules.petsAllowed != true` when avoided
  - `count(amenities[@ in [..]]) == <n>` for required amenities, and `count(amenities[@ in [..]]) == 0` for avoided amenities
  - place: `count([lower(city), lower(region), lower(country), lower(neighborhood)][@ in [..]]) > 0`
- **API contract:** `POST /api/search` with body `{ q: string, sort }` or `{ intent: SearchIntent, sort }`.
  - The response is `{ intent, total, stays }`. `stays` keeps the current `SearchStay` shape; the server applies `imageUrl(url, 600)`.
  - Errors: 401 without a valid session, 400 for a bad body (zod), 502 when Context fails.
  - A `{ q }` request runs Jev. An `{ intent }` request (chip toggles, sort changes) skips Jev, so each sentence costs one Jev call.
  - A client intent is fully re-validated before any literal is built: enums via `z.enum`, bounded numbers, weights 0–1, text ≤ 300, and place values in the known-place set plus state codes and names.
- **`SearchIntent`** (shared type, `src/lib/search/intent.ts`): `{ text, source, place?, maxPrice?, minPrice?, guests?, bedrooms?, pets?: "wanted" | "avoided", types: { required, avoided, preferred: {value, weight}[] }, amenities: { required, avoided, preferred }, vibes: { preferred, avoided } }`. It replaces `ParsedQuery` in the app.
- **Chips, mapped onto the intent:**
  - Chips show: required type, maxPrice, guests, pets wanted, required amenities, and preferred vibes with weight ≥ 0.6 (from the known vibe list).
  - Toggling on: an amenity or type becomes required, a vibe becomes preferred with weight 1, pets become wanted.
  - Toggling off removes the item from every bucket.
  - Suggestions and labels are unchanged.
- **Empty state:** it also lists the avoided filters, so guests see what was read ("No Hot Tub", "Not Cabins", "No Pets"). `describeQuery` becomes `describeIntent`.
- **Card tags:** matched required amenities, then pets when wanted. The fill rules are unchanged.
- **Auth:** `verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })` from `@clerk/backend`, on `Authorization: Bearer <token>`. Clerk has no Expo API-route integration (clerk-expo skill). The app gets the token from `useAuth().getToken()` in `@clerk/expo`. I'll check the current `verifyToken` options in Clerk's docs during the build.
- **Expo:** SDK 57 has no `apiRoutes` plugin flag (that arrives in 58), so `app.json` sets `web.output: "server"`. That only changes web export. In development, the app's relative `fetch("/api/search")` goes to the dev server (Expo Go too). The production `origin` and hosting are out of scope.
- **Dependencies (your answer):**
  - `ai@7.0.137` and `@ai-sdk/typesafe-ai@3.0.17`, pinned exactly. Both are already in `node_modules` as extraneous; they'll be saved properly.
  - `zod`, the provider's peer dependency, also used for body validation.
  - `@clerk/backend`, a version matching the installed `@clerk/expo`.
  - All installed via `npx expo install`.
- **Secrets:** `TYPESAFE_AI_API_KEY`, `SANITY_ORGANIZATION_TOKEN`, `SANITY_CONTEXT_MCP_URL` and `CLERK_SECRET_KEY` are read only in `src/lib/server/*` (imported only by `+api.ts`). None are `EXPO_PUBLIC_`. Their names (without values) are added to `.env.example`.
- **PostHog:** unchanged (`search_submitted`, `search_chip_toggled`, `search_sorted`). The server sends no events.
- Defaults I picked: the thresholds above (0.9 filter, 0.3 boost, 0.8 vibe demote, 0.6 number role), the 300-char cap, the 10-minute places cache, and the parser fallback.

## Out of scope
- Production hosting and `origin` (EAS Hosting), and rate limiting.
- Jev for place or dates, and judging confidence beyond the thresholds.
- Moving Home or stay details to the server.
- Server analytics, and a UI showing "how we read your search" beyond the chips and the empty state.

## Steps
### 1. Dependencies, config and env
- Run `npx expo install ai@7.0.137 @ai-sdk/typesafe-ai@3.0.17 zod @clerk/backend`. Then check that `package.json` pins `ai` and `@ai-sdk/typesafe-ai` exactly (remove any `^`).
- Set `app.json` `web.output` to `"server"`.
- Add `SANITY_CONTEXT_MCP_URL=`, `SANITY_ORGANIZATION_TOKEN=` and `TYPESAFE_AI_API_KEY=` to `.env.example`.
- Done when `npx expo-doctor` shows no new issues and `npx expo start` still opens the app.

### 2. Shared intent types (`src/lib/search/intent.ts`)
- Add `SearchIntent`, `Weighted<T>`, `Vibe` (the 16 vibes), and the lists `PROPERTY_TYPES`, `AMENITIES` and `VIBES` with their Jev feature labels.
- Add `emptyIntent(text)` and `intentFromParsed(parsed)`, the fallback that maps `ParsedQuery` onto the intent (terms in the vibe list become preferred with weight 1).
- Add the zod `searchRequestSchema` (`{ q } | { intent }` plus `sort`). Place values aren't checked here; the route checks them against known places.
- Pure TypeScript with no server imports, so the app can import it.

### 3. Server modules (`src/lib/server/`)
- `auth.ts`: `requireSession(request)` reads the bearer token and calls `verifyToken`. It returns the `userId` or throws an `HttpError(401)`.
- `context.ts`: `contextQuery<T>(query, signal)` makes the JSON-RPC `tools/call` of `groq_query`. It throws `HttpError(502)` on a non-200 response, a JSON-RPC `error`, or `isError`, and returns `JSON.parse(text).result`.
- `places.ts`: `knownPlaces()` makes the CDN `PLACES_QUERY` call, caching the result for 10 minutes.
- `jev.ts`: `readIntent(sentence, places)` does the following, in order:
  - runs `takePlace`
  - finds the number candidates
  - builds the 38 stance questions and one question per number
  - calls `experimental_decide`
  - maps the answers with the thresholds into a `SearchIntent` (`source: "jev"`)
  
  On any error it logs `console.warn("jev fallback", err.name)` and returns `intentFromParsed(parseQuery(sentence, places))`.
- `search-groq.ts`: `lit()` and `buildSearchGroq(intent, sort)`, the shape in Decisions. Move `projection`, `orders` and `MAX_RESULTS` here from `src/lib/search/query.ts`, and delete `buildSearchQuery` from it.
- Done when a scratch script runs `readIntent` and `buildSearchGroq` on the five Verification sentences and prints sensible intents and GROQ.

### 4. API route (`src/app/api/search+api.ts`)
- `POST` runs these in order: `requireSession`, parse the body (400 on failure), get the intent (`readIntent` for `q`; for `intent`, validate place values against `knownPlaces()`), `buildSearchGroq`, `contextQuery`, map image URLs, return `Response.json({ intent, total, stays })`.
- An `HttpError` becomes its status with `{ error: <short code> }`; anything else becomes a 500. Never echo the sentence in errors or logs.
- Done when `curl` without a token returns 401, and `curl` with a test session token returns stays (Verification).

### 5. App: hook and screen
- Rewrite `src/hooks/use-search-stays.ts` as `useSearchStays(request: { q } | { intent } | undefined, sort)`:
  - `fetch("/api/search", { method: "POST", headers: { Authorization: Bearer await getToken(), "Content-Type": "application/json" } })`
  - throws `SearchError(status)` when the response isn't ok
  - keeps the same cache, abort, retry and "keep shown results" behaviour, keyed by `JSON.stringify([request, sort])`
  - returns `{ result: { key, intent, total, stays }, error, retry }`
- Remove `useKnownPlaces`.
- `search.tsx`:
  - A submitted `q` sends `{ q }`. The first result's `intent` is stored as `interpreted`.
  - A chip toggle sets `edited` (from `edited ?? interpreted`).
  - Sort and chips send `{ intent: edited ?? interpreted }`.
  - A new `q` resets `interpreted` and `edited`.
  - Chips come from `chipsFor(interpreted)`, selected state from `hasChip(edited ?? interpreted)`, and the empty-state badges from `describeIntent`.
- Port `chipsFor`, `hasChip`, `toggleChip`, `stayTags` and `describeQuery` → `describeIntent` to `SearchIntent`, in `src/lib/search/query.ts` and `parse.ts`.
- Done when the screen behaves as before with live server results.

### 6. Close out
Run the Verification checks, write the report, add `## Result` to this plan, and update AGENTS.md.

## Verification
- `npx expo lint` and `npx tsc --noEmit` pass. `npx expo-doctor` shows no new issues.
- **Auth:**
  - `curl -X POST localhost:8081/api/search -d '{"q":"cabin","sort":"best"}'` returns 401.
  - The same request with a bad token also returns 401.
  - With a session token for `name+clerk_test@example.com` (minted via the Clerk CLI or Backend API) it returns 200.
- **Bad body:** `{ "intent": { "types": { "required": ["cabin\") || true"] } } }` returns 400. A place value that isn't known returns 400.
- **Grep:** no secret names under `EXPO_PUBLIC_`. Nothing in `src/app/(app)` or `src/hooks` imports `src/lib/server`.
- **Realistic sentences** (log the intent and the top 3 results for each; explain any miss as missing data, Jev's decision, the query, or the code):
  1. "quiet pet friendly cabin with a hot tub under $300 a night". Expect: cabin, hot tub and pets required, max 300; quiet ranks; every result is a pet-friendly cabin with a hot tub at ≤ $300.
  2. "somewhere I can bring my dog by the ocean, 2 bedrooms, between 150 and 250". Expect: pets required; beach and ocean features only boost; bedrooms ≥ 2; price 150–250.
  3. "anything but a cabin, 6 of us, my partner is allergic to cats, need wifi to work". Expect: no cabins, no pet-friendly stays, wifi required, guests ≥ 6.
  4. "romantic getaway in Lisbon for 2 nights, lively area". Expect: place Lisbon; "2" read as other; romantic and lively rank.
  5. "no hot tub, villa with a pool in California". Expect: hot tub avoided, villa and pool required, place CA.
- **Fallback:** with `TYPESAFE_AI_API_KEY` blanked in a test run, sentence 1 still returns results with `source: "parser"`.
- **Simulator end to end:** sign in, search sentence 1 from Home, take a screenshot. Toggle "Hot Tub" off: results update with no Jev call (server log). Change sort. Search a sentence with no matches: badges include the avoided filters. Kill the dev server: the error state shows and "Try again" works after restart.

## AGENTS.md updates
- **Content:** replace "Search parses the sentence in code … until embeddings move into an API route" with this: Search posts to `POST /api/search` (`src/app/api/search+api.ts`). Jev reads the sentence (`src/lib/server/jev.ts`), code builds GROQ (`src/lib/server/search-groq.ts`), and it runs through the `roam-record-search` Context endpoint (`src/lib/server/context.ts`, JSON-RPC `groq_query`). `parse.ts` remains for place matching and as the fallback when Jev fails.
- **Exact constraints:** values go in as params on CDN reads. Context's `groq_query` takes no params, so queries sent through it write literals only through `lit()`: code enums, bounded numbers, known places, and the JSON-encoded sentence (≤ 300 chars). Add min price and bedrooms. Avoided amenities, types and pets filter too.
- **Soft intent:** search embeds the guest's sentence with `text::semanticSimilarity()` plus vibe and preferred-feature boosts weighted by Jev's probabilities. Avoided vibes are demoted with an `order()` term, because negative boosts score 0.
- **Typed decisions:** use `experimental_decide` (not the deprecated `experimental_evaluate`) with `typeSafeAi.decisionModel("jev-latest")`. Search stances are wanted/implied/avoided/not_mentioned. A feature filters only at P ≥ 0.9; otherwise it ranks. Number roles count at P ≥ 0.6.
- **Policy knowledge / Context:** note that `roam-record-search` (GROQ mode, project `0z83ssmn`) serves search. `roam-search` points at another project.
- **Rules:** API routes verify the session with `@clerk/backend` `verifyToken`. `src/lib/server/` is imported only by `+api.ts` files. `app.json` `web.output` is `"server"` for API routes (SDK 57).

## Result
Built as planned. Small differences:
- The zod request schema lives in `src/lib/server/search-request.ts`, not `intent.ts`, so zod stays out of the app bundle.
- `SearchIntent` gained `petsWeight`, for pets that are implied (ranked) rather than asked for.
- The app's hook caches a `{ q }` answer under its `{ intent }` key too, so storing the reading doesn't trigger a second request.

Measured on the dev server: Jev 300–680 ms, Context 400–1300 ms, 1.2–2.1 s end to end for a new sentence, and 0.4–0.8 s for chip and sort requests (no Jev).

All five Verification sentences read as expected. "no hot tub, villa with a pool in California" returns 0 because of the data: the only pool villa in CA has a hot tub.
