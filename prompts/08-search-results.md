# 08 · Search results on Sanity

Status: done

## Goal
Search matches the attached results design. It has a back button, a gray search bar with the query, toggleable constraint chips, a count with a working Sort menu, and compact horizontal stay cards (photo, title, place, rating with review count, two "why it matched" tags, price, heart). Results come live from Sanity through GROQ filters built in code, ranked by GROQ `score()` for soft words. `src/data/properties.ts` and the local ranker are retired.

## Decisions
- Source: the Search results design, attached in chat. Ask for it again when building in a new session. The phone frame is 712 px wide in the image. At a 402 pt frame (iPhone 17 Pro) that's about 1.77 px/pt. Values marked * are estimates.
- **Ranking (your answer):** the app queries the public API CDN directly (existing `sanityQuery`, no token, no quota, no new dependency). Code parses the sentence. Exact constraints become GROQ filters with values as params. Soft words rank through GROQ `score()` with `boost()`: vibes match ×3, and `title, summary, description, highlights, neighborhood` match ×1. Ties go to `rating desc, reviewCount desc`. Embeddings (`text::semanticSimilarity`) through a Clerk-verified API route come in a later plan.
- GROQ shape: `{ "total": count(*[F]), "stays": *[F] | score(...) | order(_score desc, rating desc, reviewCount desc)[0...50]{…} }`. `F` is built from fragments that only reference params (`$type`, `$maxPrice`, `$guests`, `$amenities`, `$place`, …). For soft words the builder writes one `boost(vibes match $t0, 3), boost([title, summary, description, highlights, neighborhood] match $t0, 1)` pair per word. Param names are code-generated, and values are never interpolated. With no soft words, it uses `order(rating desc, reviewCount desc)`. Check during build that `[…] match $t` scores rather than requiring every field (via MCP `query_documents`). If not, split it into one boost per field.
- Filters: `type == $type`, `pricePerNight <= $maxPrice`, `maxGuests >= $guests`, `houseRules.petsAllowed == true`, `count(amenities[@ in $amenities]) == count($amenities)`, and place (below).
- **Place parsing (new, in code):** "in/near <place>" plus bare US state and country names. US state names map to their codes ("California" → `CA`). The filter is `$place in [lower(city), lower(region), lower(country), lower(neighborhood)]`, plus `$placeAlt` for the state code or full name. Parsed place words don't become soft terms. "Cabins in California" → type cabin, place CA → Lake Arrowhead, Big Bear Lake, Guerneville (checked against live data).
- **Sort (your answer):** a native menu, `@expo/ui` (already installed, in Expo Go). On iOS it's the SwiftUI `Menu` with an `RNHostView` label (`sort-menu.ios.tsx`). On Android it's the Jetpack Compose `DropdownMenu` (`sort-menu.tsx`), checked against its v57 page during build. Options: Best match (default, the score order), Price: low to high, Price: high to low, Top rated. Each sort is an `order()` in GROQ, so the top 50 are right for every sort. The label shows "Sort by **{option}**" with `chevronDown`.
- **Chips (your answer):** constraints parsed from the query come first, selected (`lavender`). Order: type, price, guests, pets, amenities, then known vibe words (quiet, cozy, secluded, romantic, peaceful, luxury, family, lively, walkable, rustic, modern, views). Then up to 4 unselected suggestions from the fixed list Under $300, Pet Friendly, Quiet, Hot Tub, Pool, Fireplace, skipping ones that conflict (no "Under $300" once a price is set). Tapping toggles the constraint on the structured query and re-runs the search. The bar keeps the typed text. Toggles are local state, reset when `q` changes. Place isn't a chip, since it stays in the bar as in the design. A selected chip fires `selectionAsync`.
- Labels: type `Cabins/Beach/City/Villas`, price `Under $300`, guests `4+ guests`, pets `Pet Friendly`, amenities title case (`Hot Tub`, `Ocean View`), vibes capitalized (`Quiet`).
- **Card tags ("why it matched", max 2):** matched amenities and pets first. Otherwise the stay's first amenity in the order hotTub, pool, sauna, fireplace, oceanView, lakeView, mountainView, beachAccess, firePit, then Pet Friendly if pets are allowed, then the next amenity. This reproduces the design: Hot Tub + Pet Friendly, Pool + Ocean View, Fireplace + Pet Friendly.
- **Heart (your answer):** toggles in memory for the session (a module-level `Set`, not persisted). `heart` ↔ `heartFill` tone `danger`, `selectionAsync` once, with `accessibilityState.selected`. **Filter icon:** shown and disabled (`accessibilityState.disabled`, no press), until a filters plan.
- Back button: `router.navigate("/home")`. Search is a tab, so this switches to Home instead of popping history.
- The search bar is an editable `TextInput` (`returnKeyType="search"`, `submitBehavior="blurAndSubmit"`). Submitting runs `router.setParams({ q })` and the existing `search_submitted` event. When opened empty (tab or Home's search button), it focuses and shows all stays by rating. The placeholder is `Search stays`.
- Cards don't navigate yet (no stay details screen). Card press feedback stays off, like Home.
- States: loading on the first load (3 skeleton rows: `size` image block plus 3 `bg-surface-muted` bars). A new query or toggle keeps the current results up until the new ones arrive (same as Home). Error: muted line plus "Try again". Empty: the existing "No stays match that yet" block with constraint badges and "Clear search", which clears `q` and the toggles.
- Count line: `{total} stays` (`1 stay`) from `count()`, live region polite.
- Data: `src/hooks/use-search-stays.ts`, keyed by `JSON.stringify(structuredQuery + sort)`, with a small in-memory cache, `AbortController`, and retry, following `use-home-stays.ts`. Images use `imageUrl(url, 600)`, since the photo is 148 pt wide.
- Types move into `src/lib/stays.ts`: `PropertyType`, and `Amenity` with the full schema list (`hotTub pool fireplace firePit sauna wifi kitchen workspace parking washer ac oceanView lakeView beachAccess mountainView bbq evCharger`). `src/data/properties.ts` and `src/lib/search/search.ts` are deleted (local stand-in code, not Sanity data). Home's `PropertyCard` is unchanged.
- PostHog: `search_sorted { sort }` and `search_chip_toggled { chip: "type" | "price" | "pets" | "amenity" | "vibe" | "guests", on }`. Neither event includes typed text. `search_submitted` stays as it is.
- **Pool icon deviation:** the design shows a Wi-Fi glyph on the "Pool" tag and a mountain on "Ocean View". These look like mistakes in the design, so the tags use the real glyphs (`figure.pool.swim`, `water.waves`). Tell me if you want the design's glyphs instead.
- **Tab bar:** stays native Liquid Glass. The yellow selected circle is the deviation already accepted in plan 06.

### Motion (per the expo-animation skill)
| What | Purpose | Implementation |
| --- | --- | --- |
| Results arrive for a new query, toggle or sort | spatial consistency | Existing `FadeInDown` stagger (250 ms, 40 ms apart, capped at 6), keyed by the request key |
| Chip selected ↔ unselected | state | Existing `Chip` background transition |
| Heart toggle | state | Icon swap, no scale animation. `PressableScale` press feedback |
| Back, sort label, heart, chips | feedback | `PressableScale` (0.97, 120 ms). Sort's native menu animates itself |
| Tab switch, first paint of the cached list | none | No animation |
Reduced motion: builders keep `ReduceMotion.System`, the same as now.

### Layout (pt, 402 wide frame)
- Screen `bg-surface`, `px-4`* (16). ScrollView content: top = safe area + `pt-2`, `pb-8`, `contentInsetAdjustmentBehavior="automatic"`.
- Top row `flex-row items-center gap-3`*: back `IconButton` (new size `bar`: `size-13` (52)*, icon 22, variant `muted`, icon `chevronLeft`). Search bar `flex-1 h-13`* `rounded-full bg-surface-muted pl-5 pr-4 flex-row items-center gap-3`: `search` icon 24, `TextInput` `flex-1 h-full font-jakarta-medium text-ink` (size below), and the `filters` icon 24 (disabled).
- Chips `mt-3`*: horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`, bleeds to the screen edges with `-mx-4 px-4`), `gap-2.5`* (10). New `Chip` size `xs`: `h-9` (36)*, `px-4`*, text `label`, no icon. Variant `filled`, selected tone `lavender`.
- Count row `mt-5`* `flex-row items-center justify-between`: `{n} stays` in `lead`. Sort label `flex-row items-center gap-1`: "Sort by" `lead`, the option in `subtitle`, `chevronDown` 18.
- List `mt-4`*, `gap-4`* (16). Card `flex-row gap-3.5`* (14) `rounded-xl bg-surface shadow-card`* (the faint panel behind each card in the design):
  - Photo `w-37 h-38`* (148×152) `rounded-md` (12)* `bg-surface-muted`, `expo-image` cover, alt from `photos[0].alt`.
  - Column `flex-1 py-1 justify-between`*. Title row `flex-row items-start gap-2`: title `cardTitle` (new, 2 lines max) `flex-1`, heart `size-11` (44)* `rounded-full bg-surface-muted` with icon 22.
  - Place row `mt-1.5`* `gap-1.5`: `marker` 16 tone `subtle`, `label` tone `subtle`, 1 line.
  - Rating row `mt-1.5`* `gap-1.5`: `star` 18 tone `primary`, `lead` "4.9", `lead` tone `subtle` "(214)".
  - Tags `mt-2`* `flex-row gap-2`: `h-6.5` (26)* `px-2.5`* `gap-1.5` `rounded-full bg-surface-muted`, icon 16, `caption`.
  - Price `mt-2`* `flex-row items-baseline gap-1.5`: `title` "$289", `label` tone `subtle` "/ night".

### Proposed new tokens and registry entries
- `--text-card-title: 19px`* with `--text-card-title--line-height: 1.0526` (20 px)* and `--letter-spacing: -0.3px`*, plus `Text` variant `cardTitle` (`font-jakarta-bold`). `title` (20/26) wraps too tall for the two-line block.
- `--text-input: 17px`*, line height left unset, for the search bar's `TextInput` (design ≈17 pt, RN default is 14). The rule "single-line TextInputs take no text-* size class" came from the line-height token wrapping on iOS. This token has no line height, so verify in the simulator that it draws one line. If it doesn't, drop the token, keep RN's 14 pt and list it as a deviation. If it works, the rule in AGENTS.md becomes "only `text-input`".
- Icons: `chevronLeft` (`chevron.left` / `chevron_left`), `chevronDown` (`chevron.down` / `expand_more`), `heartFill` (`heart.fill` / `favorite`), `pool` (`figure.pool.swim` / `pool`), `fireplace` (`fireplace.fill` / `fireplace`), `firePit` (`flame.fill` / `local_fire_department`), `sauna` (`humidity.fill` / `sauna`), `water` (`water.waves` / `waves`, for ocean and lake view), `mountain` (`mountain.2.fill` / `landscape`), `beachAccess` (`beach.umbrella` / `beach_access`). Check each SF name renders in the simulator. If one doesn't, substitute it and mark it.
- `Chip` size `xs`. `IconButton` size `bar`. No new colors, radii or shadows.

## Out of scope
- Embeddings, API routes, Jev. Stay details and card navigation. Persisted favorites. The filters sheet behind the filter icon. Pagination past 50 (total still shows the full count). Dates and availability. Changing Home.

## Steps
### 1. Types, parser, query builder
Move `PropertyType`/`Amenity` into `src/lib/stays.ts` (full amenity list) and repoint imports (`category-chips.tsx`, `parse.ts`). Extend `parse.ts`: amenity words for `mountainView`, `bbq`, `evCharger`, and `place` parsing (US state name → code table, "in/near X", country names). Add `src/lib/search/query.ts`: `buildSearchQuery(parsed, sort) → { query, params }` and chip helpers (`chipsFor(parsed)`, `toggleChip(parsed, chip)`) and `matchTags(stay, parsed)`. Delete `src/lib/search/search.ts` and `src/data/properties.ts`. Run the Verification inputs through the builder and through MCP `query_documents` with the same params. Lint and tsc pass.

### 2. Design-system pieces
Add the tokens, `cardTitle`, the icons, `Chip` size `xs` and `IconButton` size `bar`. Add a "Search" section to `/design-system` that shows the xs chips, the tag and the result card with sample data.

### 3. Components
`src/components/search/search-bar.tsx`, `result-card.tsx` (with `ResultTag`), `sort-menu.ios.tsx` + `sort-menu.tsx`, `search-chips.tsx`, `src/lib/favorites.ts` (in-memory `Set` + `useFavorite(id)` through `useSyncExternalStore`). Read the v57 `@expo/ui` Menu and Compose DropdownMenu pages first.

### 4. Hook and screen
`src/hooks/use-search-stays.ts`, then rewrite `src/app/(app)/search.tsx` per Layout and States, with motion and events.

### 5. Compare with the design
`xcrun simctl openurl booted "airbnbrecord://search?q=Cabins%20in%20California"`, then screenshot and compare: top row, chips, count/sort, card (photo crop and radius, title wrap, place, rating, tags, price, heart, panel shadow) and spacing. List each difference, fix it, and repeat. Also screenshot the opened Sort menu, an empty result, the skeleton (throttled), and "quiet pet friendly cabin with a hot tub under $300 a night".

## Verification
- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` pass. Drift greps: no hex, `fontSize`/`fontFamily` literals or arbitrary `[..]` classes outside `src/global.css`. `grep -rn "data/properties" src` is empty.
- Query checks (log parsed query, params and top results, and run the same through MCP):
  - "Cabins in California" → 3 CA cabins.
  - "quiet pet friendly cabin with a hot tub under $300 a night" → pet-friendly cabins with a hot tub ≤ $300 (Lake Arrowhead, Big Bear, Gatlinburg), quiet ones first.
  - "beach house for 6" → beach stays sleeping ≥ 6.
  - "villa with pool in Greece" → Mykonos only.
  - "romantic stay in Italy" → Italian stays, romantic first.
  - "city loft under 150" → Mexico City, Tokyo, Lisbon.
  - "igloo on the moon under $10" → empty state.
- Injection: a query containing `"] | *[` returns a normal result or empty, and never a GROQ error (values are params).
- Chips: toggling Cabins off widens to every CA stay. Toggling "Under $300" on narrows it. Sort options reorder (price ascending is checked in the data).
- Simulator: Search matches the design (differences listed). Back goes Home. Heart toggles and survives scrolling away and back. Filter icon does nothing. Loading, error (bad dataset env) and empty states render. Photos load.
- Not judgeable here: haptics and the Android menu (no Android run). These are reported as ❌.

## AGENTS.md updates
- Who owns what → Content: replace "Search still uses `src/data/properties.ts` and `src/lib/search/`…" with: Search parses the sentence in code (`src/lib/search/parse.ts`) and queries the public CDN with GROQ filters from params (`src/lib/search/query.ts`), ranking soft words with `score()`/`boost()` over vibes and copy until embeddings move into an API route.
- Exact constraints: add place (US state names map to codes).
- Design system: card titles use `cardTitle`. Sort and other dropdowns use `@expo/ui` `Menu` (iOS) / `DropdownMenu` (Android). Favorites are in memory only until persisted. Update the TextInput rule if `text-input` works.

## Result
Built as planned. Changes made while building:
- Places are matched against every stay's real place names (`PLACES_QUERY`, fetched once), plus US state names and codes and "USA". "Cabin in the woods" stays a soft word and isn't a place filter. Two-letter codes only count after "in/near", so "or" and "hi" stay words.
- Chips come from the submitted query and keep their order. `hasChip` reads selection from the current, toggled query, so a suggestion turned on doesn't jump to the front.
- Card tags fall back to everyday amenities (workspace, Wi-Fi, kitchen, A/C) when a stay has nothing standout. Plant-Filled Studio would otherwise show no tags. New icons: `workspace`, `wifi`, `kitchen`, `ac`.
- The design's typeface is narrower than Plus Jakarta Sans, so card text was sized to keep the design's fit, not its cap heights: `card-title` 18/19.2*, place `caption`, rating `label`, tags `footnote` with 14 pt icons. With those sizes, every card is exactly its photo's height (152 pt), as in the design.
- `--text-input` (17 px, no line height) draws one line on iOS 26, so the TextInput rule now allows it.
- Back uses the `IconButton` primitive (opacity press), not `PressableScale`.
- Remaining differences: photos are Roam's own; the place pin is SF `mappin` (thin) where the design has a teardrop; the selected chip label isn't bolder; the tab bar is native (accepted in plan 06).
Lint, tsc, expo-doctor 18/18, drift greps and the env grep pass. All Verification queries were run against live data through the real parser and builder. The injection string is plain text. Screenshots: "Cabins in California", the long pet-friendly hot tub sentence, and the empty state. Sort menu taps, chip and heart taps, the error state, haptics and Android weren't exercised (no tap automation, no Android run).
