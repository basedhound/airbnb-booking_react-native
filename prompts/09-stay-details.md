# 09 · Stay details

Status: done

## Goal
Tapping a stay on Home or Search opens its details screen, matching the attached Property Details design. The screen shows a swipeable photo gallery, title, rating, place, amenity highlights, an "Ask about policies" card, the stay's cancellation policy, the host, and a fixed price bar with "Book this stay". Every value comes live from Sanity. The policies sheet shows the stay's house rules, its cancellation policy and Roam's other policies, word for word.

## Decisions
- Source: the Property Details design, attached in chat. Ask for it again when building in a new session. The phone frame is 669 px wide in the image. At a 402 pt frame (iPhone 17 Pro), that's about 1.66 px/pt. Values marked * are estimates.
- **Total (your answer):** `pricePerNight × minNights + (cleaningFee ?? 0)`, shown as `$673 total · 2 nights` (Lake Arrowhead: 289 × 2 + 95). It's computed in code from typed fields. With `minNights` 1 it reads `· 1 night`.
- **Ask about policies (your answer):** opens the Policies sheet. It shows, in order: House rules, then the stay's cancellation policy (title + body), then Roam's other policies (`kind != "cancellation"`, ordered check-in, pets, payment, damage, guest refund), each with its title and full body. Question answering (Context + Jev) is a later plan and takes over this card.
- **Cancellation card:** the title is the policy's `title` ("Moderate cancellation") and the subtitle is its `summary`, word for word. The design's "Free cancellation" / "7 days" is sample copy. Tapping opens the same Policies sheet scrolled to the cancellation section (`?section=cancellation`, scroll to the measured `onLayout` y).
- **Book this stay (your answer):** looks exactly as designed. Tapping fires `Haptics.impactAsync(Light)` and shows a native `Alert`: title "Booking opens soon", message "You can't book stays in Roam yet.", button "OK".
- **Host row (your answer):** opens a Host sheet showing the avatar, name, Superhost line, then `bio`, "Hosting since {Month YYYY}", "Responds {within an hour | within a few hours | within a day}" and "Speaks {English and Spanish}". Fields that are missing are left out. The row shows the host's first name ("Hosted by Maya").
- **Host photo:** no host in Sanity has a photo yet (12/12 empty). `Avatar` falls back to the initial on `primary-soft`. When photos are added, they show through `imageUrl(url, 200)` with no code change.
- **House rules text** is built in code from typed fields, one line each, in this order:
  - Check-in after 3:00 PM
  - Checkout before 11:00 AM
  - Quiet hours 10:00 PM to 8:00 AM (only if both are set)
  - Pets allowed, up to 2, $50 pet fee per stay / No pets
  - No smoking / Smoking allowed
  - No parties or events / Parties allowed
  - Then each `additionalRules` string verbatim.
  Times are formatted `HH:MM` → `h:mm AM/PM` in code.
- **Policy body:** a small Portable Text renderer in `src/components/stay/policy-body.tsx` for exactly what the schema allows (normal, h3, bullet list, strong). This avoids a new dependency. Unknown block types render their plain text.
- **Amenity row:** 4 items from the existing `stayTags(stay, emptyQuery, 4)` in `src/lib/search/query.ts`, so labels and glyphs match Search. Lake Arrowhead → Hot Tub, Pet Friendly, Fireplace, Fire Pit. The design's "Fast Wi-Fi" and "Forest Views" aren't in the data. With fewer than 4 tags, the columns stay left-aligned at a quarter width each. With none, the row and its divider are hidden.
- **Gallery:** a horizontal paging `FlatList` of `expo-image` photos (`imageUrl(url, 1200)`, `alt` as the accessibility label). The counter shows `{index + 1} / {count}` and updates on `onMomentumScrollEnd`. Data has 3–5 photos per stay; the design's "24" is sample data.
- **Share:** React Native's built-in `Share.share({ message: "{title} in {place}, ${price} a night on Roam" })`. There's no web URL to share yet, and no new dependency.
- **Heart:** the existing `useFavorite(id)`, the same session-only store as Search, so a stay hearted in either place shows hearted in both. `selectionAsync` once per toggle.
- **Route:** `src/app/stay/[slug]/index.tsx` (details), `policies.tsx` and `host.tsx` (sheets), registered in the root Stack inside the signed-in guard. The details screen is pushed over the tabs, so the tab bar is hidden, as in the design. Sheets use `presentation: "formSheet"`, `sheetGrabberVisible`, detents `[0.6, 1]` (policies) and `"fitToContents"` (host), with `sheetExpandsWhenScrolledToEdge` on policies. Check these option names against the v57 Stack docs during build.
- **Opening a stay:** Home's `PropertyCard` and Search's `ResultCard` become pressable, pushing `/stay/{slug}` with `PressableScale` (0.97, 120 ms). The heart on a result card keeps its own press and doesn't open the stay. Their "Cards don't open a stay yet" comments are removed. `HomeStay` already has `slug`, and so does `SearchStay`.
- **Data:** `STAY_QUERY` in `src/lib/sanity/queries.ts`, by `$slug` (param, never interpolated): typed fields, photos (`asset->url`, `alt`), `houseRules`, `host->{…}`, `cancellationPolicy->{title, summary, body}`, and `"policies": *[_type == "policy" && kind != "cancellation"]{kind, title, body}`. The new type `StayDetails` goes in `src/lib/stays.ts`. Hook `src/hooks/use-stay.ts` has a per-slug in-memory cache, `AbortController` and retry, following `use-home-stays.ts`. The sheets read the same cache, so they open instantly.
- **States:** Loading: the photo block in `bg-surface-muted` with the back button, plus 3 skeleton bars for title, place and amenities, and no price bar. Error: a muted line "We couldn't load this stay. Check your connection and try again." plus "Try again", with the back button still shown. Not found (`null` result): "This stay isn't available anymore." plus "Back".
- **Status bar:** light over the photo (`StatusBar style="light"`), since the photo runs under it.
- **PostHog:** `stay_viewed { slug, type }`, `stay_shared { slug }`, `stay_policies_opened { slug, from: "ask" | "cancellation" }`, `stay_host_opened { slug }`, `stay_book_tapped { slug }`. A slug is content, not personal data. Failures never block the screen (`posthog?.`).
- **Color deviations (no new tokens):** the design's star and "Book this stay" are orange (≈`#FFA90A`). They use `primary` (`#ffc629`), as everywhere else in Roam. The Superhost rosette is brown in the design and uses tone `subtle`. Tell me if you want an orange token instead.

### Motion (per the expo-animation skill)
| What | Purpose | Implementation |
| --- | --- | --- |
| Open a stay | spatial | Native Stack push (the platform default), with no JS animation |
| Policies / Host | spatial | Native form sheet |
| Gallery swipe | direct manipulation | Native paging scroll. Counter text swaps with no animation |
| Cards, back/share/heart, Ask/cancellation/host rows, Book | feedback | `PressableScale` (0.97, 120 ms). Rows also take `transitionProperty={["opacity"]}` |
| Content after loading | none | It appears in place. The skeleton holds the same layout, so nothing jumps |
Reduced motion: `PressableScale` already drops the scale.

### Layout (pt, 402 wide frame)
- Root: a `View flex-1 bg-surface`. The `ScrollView` (`contentInsetAdjustmentBehavior="never"`, so the photo runs under the status bar) has `pb` equal to the price bar height. The price bar is absolute at the bottom.
- **Gallery** `h-85`* (340), full width. Overlay buttons sit at `top: insets.top + 4`*: back on the left (`left-5`, 20*), and share + heart on the right (`right-5`, `gap-2.5`*). All are `IconButton` variant `surface` size `md` (56, icon 24) with `shadow-raised`. The heart uses `heartFill` tone `danger` when saved. The counter pill is `absolute right-3 bottom-3`*, `h-8.5`* (34) `px-3.5`* `rounded-full bg-ink/80`*, with `subtitle` tone `inverse` text "1 / 5".
- **Sheet body:** `-mt-2 rounded-t-sm bg-surface px-5 pt-5`* (radius 8*, overlaps the photo by 8).
  - Header row `flex-row items-start gap-4`: title in the new `stayTitle` variant (`flex-1`, 3 lines max). The rating box is `rounded-lg bg-surface-muted px-4 py-2.5 items-center`* (≈80×63): a row of `star` 20 tone `primary` and `title` "4.9" (`gap-1`), then `lead` tone `subtle` "(214)".
  - Place `mt-3`* `flex-row items-center gap-2`: `marker` 20 tone `ink`, `body` "Lake Arrowhead, CA".
  - Amenities `mt-5`* `flex-row`: 4 columns, each `w-1/4 items-center gap-2.5`*, with the icon at 28 tone `ink` and a `caption` label (1 line).
  - Divider `mt-5 h-px bg-border`.
  - Cards `-mx-1 mt-1.5 gap-2.5`* (cards inset 16 against the 20 text edge, as in the design). Each card is `flex-row items-center rounded-lg bg-lavender-soft py-4 pl-3 pr-4 gap-4`*, with a column of `flex-1`: `subtitle` title, then `caption` tone `muted` subtitle (2 lines max, `mt-0.5`), plus `chevronRight` 22 tone `accent`.
    - Ask: a `size-13.5`* (54) `rounded-md` tile in `bg-lavender-muted` (new) holding the `chat` icon at 28 tone `accent`. Its subtitle is "Cancellation, house rules, pets, check-in and more." (design copy).
    - Cancellation: the same 54 pt column with no tile, holding `policy` at 30 tone `accent` (the design has no tile here).
  - Divider `mt-2.5`*.
  - Host row `-mx-1 py-2`* `flex-row items-center gap-4`: `Avatar` size `md` (64) with `border-2 border-surface shadow-raised`. Then `subtitle` "Hosted by Maya", and a Superhost line `mt-0.5 gap-1.5`: `rosette` 16 tone `subtle` + `label` tone `subtle` "Superhost" (only if `isSuperhost`). Then `chevronRight` 22 tone `ink`.
- **Price bar:** absolute bottom, `bg-surface border-t border-border px-5 pt-4`*, `paddingBottom: insets.bottom`. It's a `flex-row items-center gap-4`. Left column `flex-1`: a baseline row with `heading` "$289" + `body` " / night", then `body` tone `subtle` "$673 total · 2 nights". Right: `Button` new size `lg` (`h-16` 64*, `px-8`) titled "Book this stay", `w-55`* (220). The price column shrinks before the button does.
- **Policies sheet:** `ScrollView px-5 pt-6 pb-10`. `heading` "Policies", then sections with a `title` heading and `mt-6` between them. House rules is a list of `body` lines with `gap-2`. Each policy shows its `title`, then `PolicyBody` (`body` paragraphs `mb-3`, `subtitle` h3, `•` bullets with `pl-4`, strong in `font-jakarta-semibold`). It ends with a footnote: "These are Roam's policies and this stay's own rules, shown as written. Questions? Contact Roam support."
- **Host sheet:** `px-5 pt-6 pb-8 gap-4`. A row of the size `lg` avatar + name (`title`) + Superhost line. Then `body` bio, then `label` tone `muted` lines for hosting since, response time and languages.

### Proposed new tokens and registry entries
- `--text-stay-title: 30px`*, `--text-stay-title--line-height: 1.0667` (32)*, `--text-stay-title--letter-spacing: -1px`*, plus `Text` variant `stayTitle` (`font-jakarta-bold`). `heading` (28/34) is too airy for the design's tight two-line title, and `headline` (40) is too large.
- `--color-lavender-muted: #e6dfff`* for the Ask icon tile, which is darker than `lavender-soft`.
- `Button` size `lg`: `h-16 px-8`, icon 22, text `button`.
- Icons:
  - `chat`: `bubble.left` / `chat_bubble_outline`
  - `policy`: `doc.text` / `description`
  - `rosette`: `rosette` / `workspace_premium`
  Check each SF name renders in the simulator. Substitute and mark any that don't.
- No new radii, spacing or shadows.

## Out of scope
- Policy question answering (Context endpoint, Jev, API route). Booking, dates, availability and real totals. Reviews list. Map. A full-screen photo viewer. Persisted favorites. A share URL / universal links. Changes to the Sanity schema or content (no host photos are added).

## Steps
### 1. Data
Add `StayDetails` (and `HouseRules`, `PolicyBlock`, `StayHost`) to `src/lib/stays.ts`, `STAY_QUERY` to `src/lib/sanity/queries.ts`, and `src/hooks/use-stay.ts` (per-slug cache, abort, retry, `null` for not found). Add pure helpers in `src/lib/stay-details.ts`: `formatTime`, `houseRuleLines(rules)`, `stayTotal(stay)` and `hostFacts(host)`. Run `STAY_QUERY` through MCP `query_documents` for `modern-cabin-with-hot-tub` and one stay with `additionalRules`. Lint and tsc pass.

### 2. Design-system pieces
Add the `stay-title` and `lavender-muted` tokens, the `stayTitle` variant, `Button` size `lg`, and the `chat`/`policy`/`rosette` icons. Add a "Stay" section to `/design-system` showing the title, the lavender cards and the lg button.

### 3. Components
`src/components/stay/`: `photo-gallery.tsx`, `rating-box.tsx`, `amenity-row.tsx`, `policy-card.tsx` (the lavender card, with tile/no-tile), `host-row.tsx`, `price-bar.tsx`, `policy-body.tsx`, and `stay-skeleton.tsx`.

### 4. Routes and wiring
Add `src/app/stay/[slug]/index.tsx`, `policies.tsx` and `host.tsx`, and register them in `src/app/_layout.tsx` inside the signed-in `Stack.Protected` with the sheet options (read the v57 Stack / form sheet docs first). Make `PropertyCard` (Home) and `ResultCard` (Search) push `/stay/{slug}`. Add events.

### 5. Compare with the design
`xcrun simctl openurl booted "airbnbrecord://stay/modern-cabin-with-hot-tub"`, then screenshot and compare the gallery and overlay buttons, counter, title/rating box, place, amenities, the two cards, host row and price bar. List each difference, fix it, and repeat. Also screenshot the Policies sheet (from both entries, including the cancellation scroll), the Host sheet, a stay with `additionalRules`, a stay without pets, loading (throttled), not found (`/stay/nope`) and the Book alert.

## Verification
- `npx expo lint`, `npx tsc --noEmit` and `npx expo-doctor` pass. Drift greps: no hex, `fontSize`/`fontFamily` literals or arbitrary `[..]` classes outside `src/global.css`.
- Data checks against live content: Lake Arrowhead shows $289, "$673 total · 2 nights", 4.9 (214), Hot Tub / Pet Friendly / Fireplace / Fire Pit, "Moderate cancellation" + its summary, "Hosted by Maya", and Superhost. The Policies sheet's cancellation text equals the Sanity body character for character (compare strings in a one-off script). The house rules lines match the typed fields for one pet stay, one no-pet stay and one stay with additional rules.
- Injection: `/stay/%22%5D%20%7C%20*%5B` returns not found, not a GROQ error.
- Simulator: Home card → details → back. Search card → details, and its heart doesn't open the stay. The heart state is shared between Search and details. The gallery swipes and the counter updates. Share opens the share sheet. Ask → Policies. Cancellation → Policies scrolled to cancellation. Host → Host sheet. Book → alert. The tab bar is hidden on details.
- Not judgeable here: haptics, Android, and the share sheet's targets. These are reported as ❌.

## AGENTS.md updates
- Content: stay details read one stay by slug from the CDN (`STAY_QUERY`, `src/hooks/use-stay.ts`). House rules show as lines built in code from typed fields. Policy bodies render word for word through `PolicyBody` (no Portable Text dependency).
- Design system: stays open at `/stay/[slug]` (pushed over the tabs; `policies` and `host` are form sheets). Home and Search cards open it. The total is `price × minNights + cleaningFee` until dates exist. "Ask about policies" opens the Policies sheet until policy Q&A is built.
- Remove "Cards don't open a stay yet" wherever it's implied.

## Result
Built as planned. Changes made while building:
- `useStay` keeps the loaded stay in state as well as in the module cache. With the React Compiler on, `cache.get(slug)` was memoized by slug, and the screen stayed on its skeleton forever.
- Price bar: the button takes the width the price leaves (`flex-1`, `Button` `lg` is `h-16 px-5`), so "$673 total · 2 nights" never truncates. Totals use thousands separators. The design's fixed ~220 pt button cut the nights off.
- The gallery is `h-87` (340 pt visible under the 8 pt overlap), and the lavender cards are `py-3` (≈87 pt), both measured against the design.
- The status bar turns dark once the page scrolls past the photo.
- The Host sheet uses detents `[0.5, 1]` with a ScrollView. `"fitToContents"` left the sheet's bottom edge see-through on iOS 26.
- The Search result card's pressable area and its heart are siblings, so VoiceOver reaches both.
- Overlay buttons are a `PhotoButton` (white `size-14`, `shadow-raised`, `PressableScale`). They stay pinned while the page scrolls.
- Remaining differences: Roam's own photos and copy (5 photos, real amenities, "Moderate cancellation"), the thin SF `mappin` instead of a teardrop, a bathtub glyph for Hot Tub, the yellow `primary` instead of orange, an initial avatar (no host photos in Sanity), and Plus Jakarta Sans setting the title slightly narrower than the design's typeface.
Lint, tsc, expo-doctor 18/18 and the drift greps pass. Live data checks used the real query and helpers: Lake Arrowhead, Palm Springs, Tokyo, Lisbon, Paris, Byron Bay, Bali, Mykonos, a not-found slug and the injection string. Simulator screenshots: details (Lake Arrowhead, and Paris scrolled), Policies from the top and scrolled to cancellation, the Host sheet, loading and not found. Taps (card → stay, Book alert, share, heart, swipe), haptics, the error state and Android weren't exercised (no tap automation, no Android run).
